// =====================================================================
// SUPPLIER & PURCHASE ORDER CONTROLLER
// =====================================================================
const pool = require('../config/db');
const { generatePoNumber } = require('../utils/helpers');

// ---------- Suppliers ----------

async function listSuppliers(req, res) {
  const { rows } = await pool.query('SELECT * FROM suppliers ORDER BY name');
  return res.json(rows);
}

async function createSupplier(req, res) {
  const { name, contact_person, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO suppliers (name, contact_person, phone, email, address)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, contact_person, phone, email, address]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function updateSupplier(req, res) {
  const { name, contact_person, phone, email, address } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE suppliers SET name=$1, contact_person=$2, phone=$3, email=$4, address=$5
       WHERE id=$6 RETURNING *`,
      [name, contact_person, phone, email, address, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Supplier not found.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

// ---------- Purchase Orders (restocking) ----------

/**
 * POST /api/purchase-orders
 * Body: { supplier_id, expected_date, items: [{ product_id, quantity_ordered, unit_cost }] }
 * Creates a PO header + line items. Does NOT touch stock yet -- stock
 * only changes when the order is actually received (see receivePO).
 */
async function createPurchaseOrder(req, res) {
  const client = await pool.connect();
  try {
    const { supplier_id, expected_date, items } = req.body;
    if (!supplier_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'supplier_id and at least one item are required.' });
    }

    await client.query('BEGIN');

    const poNumber = generatePoNumber();
    const poResult = await client.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, ordered_by, expected_date)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [poNumber, supplier_id, req.user.id, expected_date]
    );
    const poId = poResult.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_cost)
         VALUES ($1,$2,$3,$4)`,
        [poId, item.product_id, item.quantity_ordered, item.unit_cost]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ id: poId, po_number: poNumber });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ error: 'Failed to create purchase order.' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/purchase-orders/:id/receive
 * Body: { items: [{ purchase_order_item_id, quantity_received }] }
 * This is where stock actually INCREASES. Wrapped in a transaction so
 * a partial failure can't leave stock counts inconsistent.
 */
async function receivePurchaseOrder(req, res) {
  const client = await pool.connect();
  try {
    const poId = req.params.id;
    const { items } = req.body;

    await client.query('BEGIN');

    for (const item of items) {
      // Lock the line item and the product row before updating either
      const lineResult = await client.query(
        `SELECT product_id, quantity_ordered, quantity_received
         FROM purchase_order_items WHERE id = $1 AND purchase_order_id = $2 FOR UPDATE`,
        [item.purchase_order_item_id, poId]
      );
      if (lineResult.rows.length === 0) {
        throw { status: 404, message: `PO line item ${item.purchase_order_item_id} not found.` };
      }
      const line = lineResult.rows[0];

      // Increase stock on the product
      await client.query(
        `UPDATE products SET quantity_in_stock = quantity_in_stock + $1, updated_at = NOW()
         WHERE id = $2`,
        [item.quantity_received, line.product_id]
      );

      // Update how much of this line has been received so far
      await client.query(
        `UPDATE purchase_order_items SET quantity_received = quantity_received + $1
         WHERE id = $2`,
        [item.quantity_received, item.purchase_order_item_id]
      );

      // Record it in the audit ledger
      await client.query(
        `INSERT INTO stock_movements (product_id, change_type, quantity_change, reference_id, created_by)
         VALUES ($1, 'purchase_receive', $2, $3, $4)`,
        [line.product_id, item.quantity_received, poId, req.user.id]
      );
    }

    // Mark PO as received/partially received depending on totals
    await client.query(
      `UPDATE purchase_orders SET status =
         CASE WHEN (SELECT SUM(quantity_ordered) FROM purchase_order_items WHERE purchase_order_id = $1)
                   = (SELECT SUM(quantity_received) FROM purchase_order_items WHERE purchase_order_id = $1)
              THEN 'received' ELSE 'partially_received' END
       WHERE id = $1`,
      [poId]
    );

    await client.query('COMMIT');
    return res.json({ message: 'Stock received and updated successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Receive PO failed:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to receive purchase order.' });
  } finally {
    client.release();
  }
}

async function listPurchaseOrders(req, res) {
  const { rows } = await pool.query(
    `SELECT po.*, s.name AS supplier_name
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
     ORDER BY po.created_at DESC`
  );
  return res.json(rows);
}

/** GET /api/suppliers/purchase-orders/:id -- PO header + line items (used by the "Receive" UI) */
async function getPurchaseOrder(req, res) {
  try {
    const poResult = await pool.query(
      `SELECT po.*, s.name AS supplier_name
       FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1`,
      [req.params.id]
    );
    if (poResult.rows.length === 0) return res.status(404).json({ error: 'Purchase order not found.' });

    const itemsResult = await pool.query(
      `SELECT poi.id, poi.product_id, p.name AS product_name, poi.quantity_ordered, poi.quantity_received, poi.unit_cost
       FROM purchase_order_items poi JOIN products p ON p.id = poi.product_id
       WHERE poi.purchase_order_id = $1`,
      [req.params.id]
    );

    return res.json({ ...poResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = {
  listSuppliers, createSupplier, updateSupplier,
  createPurchaseOrder, receivePurchaseOrder, listPurchaseOrders, getPurchaseOrder,
};
