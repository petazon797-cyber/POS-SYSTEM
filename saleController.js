// =====================================================================
// SALE / CHECKOUT CONTROLLER
// =====================================================================
// This is the heart of the POS system. The checkout() function below
// is wrapped in a single ATOMIC database transaction so that:
//
//   1. Stock is never deducted unless the sale is fully recorded.
//   2. Two cashiers can't both sell the last unit of a product
//      (handled by `SELECT ... FOR UPDATE` row locking).
//   3. If the network/connection drops or any step throws an error
//      partway through, EVERYTHING rolls back -- no half-finished
//      sale, no incorrectly-deducted stock.
//
// This directly satisfies the requirement: "လိုင်းကျသွားရင် စတော့စာရင်း
// မှားမသွားအောင် Atomic Database Transaction သုံးပါ"
// =====================================================================

const pool = require('../config/db');
const { generateSaleNumber } = require('../utils/helpers');

/**
 * Looks up an active promotion by code and calculates the discount
 * amount it produces on the given subtotal. Throws if the code is
 * invalid/expired so the cashier gets clear feedback (rather than
 * silently applying $0 discount).
 */
async function calculateDiscount(client, promoCode, subtotal, saleItemsData) {
  const { rows } = await client.query(
    `SELECT * FROM promotions
     WHERE code = $1 AND is_active = TRUE
       AND CURRENT_DATE BETWEEN start_date AND end_date`,
    [promoCode]
  );

  if (rows.length === 0) {
    throw { status: 400, message: `Promotion code "${promoCode}" is invalid or expired.` };
  }

  const promo = rows[0];
  let base = subtotal;

  // If the promotion is scoped to one product or one category,
  // only that portion of the cart counts toward the discount.
  if (promo.applicable_product_id || promo.applicable_category_id) {
    base = saleItemsData
      .filter((item) => item.product_id === promo.applicable_product_id)
      .reduce((sum, item) => sum + item.line_total, 0);
  }

  if (promo.discount_type === 'percent') {
    return Math.min(base * (promo.discount_value / 100), base);
  }
  // 'fixed' amount discount, capped so it can't exceed the eligible base
  return Math.min(promo.discount_value, base);
}

/**
 * POST /api/sales/checkout
 * Body: {
 *   items: [{ product_id, quantity }],
 *   payments: [{ method: 'cash'|'kpay'|'wavepay'|'card', amount, reference_number }],
 *   promo_code: string | null
 * }
 * Requires: any authenticated role (cashier, manager, admin)
 */
async function checkout(req, res) {
  const { items, payments, promo_code } = req.body;
  const cashierId = req.user.id; // From the verified JWT, not from the request body

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty.' });
  }
  if (!Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({ error: 'At least one payment is required.' });
  }

  // pool.connect() gives us ONE dedicated connection. BEGIN/COMMIT/ROLLBACK
  // must all run on this same connection -- using pool.query() instead
  // would risk each statement going to a different connection.
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let subtotal = 0;
    const saleItemsData = [];

    // ---- STEP 1: Validate & LOCK every product row in the cart ----
    // FOR UPDATE locks each row until COMMIT/ROLLBACK. This is what
    // prevents two cashiers from both "successfully" selling the same
    // last unit at the exact same moment.
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        throw { status: 400, message: 'Each item needs a valid product_id and quantity > 0.' };
      }

      const { rows } = await client.query(
        `SELECT id, name, selling_price, quantity_in_stock
         FROM products
         WHERE id = $1 AND is_active = TRUE
         FOR UPDATE`,
        [item.product_id]
      );

      if (rows.length === 0) {
        throw { status: 404, message: `Product ID ${item.product_id} not found or inactive.` };
      }

      const product = rows[0];

      if (product.quantity_in_stock < item.quantity) {
        // Abort the ENTIRE sale -- we don't sell what's not in stock,
        // even if other items in the cart were fine.
        throw {
          status: 409,
          message: `Insufficient stock for "${product.name}". Available: ${product.quantity_in_stock}, requested: ${item.quantity}.`,
        };
      }

      const lineTotal = Number(product.selling_price) * item.quantity;
      subtotal += lineTotal;

      saleItemsData.push({
        product_id: product.id,
        quantity: item.quantity,
        unit_price: product.selling_price,
        line_total: lineTotal,
      });
    }

    // ---- STEP 2: Apply promotion / coupon (optional) ----
    let discountTotal = 0;
    if (promo_code) {
      discountTotal = await calculateDiscount(client, promo_code, subtotal, saleItemsData);
    }

    const totalAmount = Math.round((subtotal - discountTotal) * 100) / 100;

    // ---- STEP 3: Validate payments add up (supports split payments) ----
    const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (Math.abs(paidAmount - totalAmount) > 0.01) {
      throw {
        status: 400,
        message: `Total paid (${paidAmount}) does not match order total (${totalAmount}).`,
      };
    }

    // ---- STEP 4: Insert the sale header ----
    const saleNumber = generateSaleNumber();
    const saleResult = await client.query(
      `INSERT INTO sales (sale_number, cashier_id, subtotal, discount_total, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'completed')
       RETURNING id, created_at`,
      [saleNumber, cashierId, subtotal, discountTotal, totalAmount]
    );
    const saleId = saleResult.rows[0].id;

    // ---- STEP 5: Insert line items + deduct stock + log the movement ----
    for (const line of saleItemsData) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [saleId, line.product_id, line.quantity, line.unit_price, line.line_total]
      );

      // Safe to deduct now -- this row was locked back in STEP 1,
      // so we know for certain the stock was still available.
      await client.query(
        `UPDATE products SET quantity_in_stock = quantity_in_stock - $1, updated_at = NOW()
         WHERE id = $2`,
        [line.quantity, line.product_id]
      );

      // Audit trail entry (negative = stock going OUT)
      await client.query(
        `INSERT INTO stock_movements (product_id, change_type, quantity_change, reference_id, created_by)
         VALUES ($1, 'sale', $2, $3, $4)`,
        [line.product_id, -line.quantity, saleId, cashierId]
      );
    }

    // ---- STEP 6: Record payment(s) ----
    for (const p of payments) {
      if (!['cash', 'kpay', 'wavepay', 'card'].includes(p.method)) {
        throw { status: 400, message: `Unsupported payment method: ${p.method}` };
      }
      // NOTE: For 'kpay' / 'wavepay' / 'card', in production you would
      // call out to the payment gateway HERE (before COMMIT) and only
      // proceed if it returns success. That call is mocked out below.
      await client.query(
        `INSERT INTO payments (sale_id, method, amount, reference_number, status)
         VALUES ($1, $2, $3, $4, 'success')`,
        [saleId, p.method, p.amount, p.reference_number || null]
      );
    }

    // ---- STEP 7: Commit. Everything above is now permanent. ----
    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Checkout successful.',
      sale_id: saleId,
      sale_number: saleNumber,
      subtotal,
      discount_total: discountTotal,
      total_amount: totalAmount,
      created_at: saleResult.rows[0].created_at,
    });
  } catch (err) {
    // Anything that throws above -- bad stock, bad payment, dropped
    // connection, DB constraint violation -- lands here. ROLLBACK
    // undoes every INSERT/UPDATE made since BEGIN.
    await client.query('ROLLBACK');
    console.error('Checkout failed, transaction rolled back:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Checkout failed. No changes were saved.' });
  } finally {
    // ALWAYS release the connection back to the pool, success or failure.
    client.release();
  }
}

/** GET /api/sales?from=&to=  (manager/admin) -- sales history */
async function listSales(req, res) {
  const { from, to } = req.query;
  const conditions = [];
  const values = [];

  if (from) { values.push(from); conditions.push(`created_at >= $${values.length}`); }
  if (to)   { values.push(to);   conditions.push(`created_at <= $${values.length}`); }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT s.*, u.full_name AS cashier_name
     FROM sales s JOIN users u ON u.id = s.cashier_id
     ${whereClause}
     ORDER BY s.created_at DESC`,
    values
  );
  return res.json(rows);
}

/** GET /api/sales/:id -- full receipt detail */
async function getSale(req, res) {
  const saleResult = await pool.query('SELECT * FROM sales WHERE id = $1', [req.params.id]);
  if (saleResult.rows.length === 0) return res.status(404).json({ error: 'Sale not found.' });

  const itemsResult = await pool.query(
    `SELECT si.*, p.name AS product_name, p.sku
     FROM sale_items si JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = $1`,
    [req.params.id]
  );
  const paymentsResult = await pool.query('SELECT * FROM payments WHERE sale_id = $1', [req.params.id]);

  return res.json({ ...saleResult.rows[0], items: itemsResult.rows, payments: paymentsResult.rows });
}

/**
 * POST /api/sales/:id/void  (manager/admin only)
 * Reverses a completed sale: restores stock and marks it voided.
 * Also wrapped in a transaction for the same reasons as checkout().
 */
async function voidSale(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const saleResult = await client.query(
      `SELECT * FROM sales WHERE id = $1 AND status = 'completed' FOR UPDATE`,
      [req.params.id]
    );
    if (saleResult.rows.length === 0) {
      throw { status: 404, message: 'Sale not found or already voided.' };
    }

    const itemsResult = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [req.params.id]);

    for (const item of itemsResult.rows) {
      // Restore stock
      await client.query(
        `UPDATE products SET quantity_in_stock = quantity_in_stock + $1, updated_at = NOW() WHERE id = $2`,
        [item.quantity, item.product_id]
      );
      // Log it as a 'return' movement (positive = stock coming back in)
      await client.query(
        `INSERT INTO stock_movements (product_id, change_type, quantity_change, reference_id, created_by)
         VALUES ($1, 'return', $2, $3, $4)`,
        [item.product_id, item.quantity, req.params.id, req.user.id]
      );
    }

    await client.query(`UPDATE sales SET status = 'voided' WHERE id = $1`, [req.params.id]);

    await client.query('COMMIT');
    return res.json({ message: 'Sale voided and stock restored.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Void sale failed:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to void sale.' });
  } finally {
    client.release();
  }
}

module.exports = { checkout, listSales, getSale, voidSale };
