// =====================================================================
// PRODUCT CONTROLLER
// Handles product CRUD, barcode lookup (for the scanner), low-stock
// alerts, and expiry-date alerts.
// =====================================================================
const pool = require('../config/db');

/** GET /api/products?search=&category_id= */
async function listProducts(req, res) {
  const { search, category_id } = req.query;
  const conditions = ['is_active = TRUE'];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(name ILIKE $${values.length} OR sku ILIKE $${values.length} OR barcode ILIKE $${values.length})`);
  }
  if (category_id) {
    values.push(category_id);
    conditions.push(`category_id = $${values.length}`);
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM products WHERE ${conditions.join(' AND ')} ORDER BY name`,
      values
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/** GET /api/products/barcode/:barcode  -- used by the checkout scanner */
async function getByBarcode(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE barcode = $1 AND is_active = TRUE',
      [req.params.barcode]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No product found for this barcode.' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/** GET /api/products/:id */
async function getProduct(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/** POST /api/products  (manager/admin only) */
async function createProduct(req, res) {
  const { sku, barcode, name, category_id, supplier_id, cost_price, selling_price,
          quantity_in_stock = 0, reorder_level = 10, expiry_date } = req.body;

  if (!sku || !name || cost_price == null || selling_price == null) {
    return res.status(400).json({ error: 'sku, name, cost_price and selling_price are required.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO products
        (sku, barcode, name, category_id, supplier_id, cost_price, selling_price,
         quantity_in_stock, reorder_level, expiry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [sku, barcode, name, category_id, supplier_id, cost_price, selling_price,
       quantity_in_stock, reorder_level, expiry_date]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU or barcode already exists.' });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/** PUT /api/products/:id  (manager/admin only) */
async function updateProduct(req, res) {
  const fields = ['sku', 'barcode', 'name', 'category_id', 'supplier_id', 'cost_price',
                   'selling_price', 'reorder_level', 'expiry_date', 'is_active'];
  const updates = [];
  const values = [];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      values.push(req.body[field]);
      updates.push(`${field} = $${values.length}`);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided to update.' });
  }

  values.push(req.params.id); // for the WHERE clause
  updates.push(`updated_at = NOW()`);

  try {
    const { rows } = await pool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/** DELETE /api/products/:id  (admin only) -- soft delete, never hard-delete sold products */
async function deleteProduct(req, res) {
  try {
    const { rows } = await pool.query(
      'UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
    return res.json({ message: 'Product deactivated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/** GET /api/products/alerts/low-stock  (manager/admin) */
async function lowStockAlerts(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, sku, name, quantity_in_stock, reorder_level
       FROM products
       WHERE is_active = TRUE AND quantity_in_stock <= reorder_level
       ORDER BY quantity_in_stock ASC`
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/** GET /api/products/alerts/expiring?days=30  (manager/admin) */
async function expiringAlerts(req, res) {
  const days = parseInt(req.query.days, 10) || 30;
  try {
    const { rows } = await pool.query(
      `SELECT id, sku, name, expiry_date, quantity_in_stock
       FROM products
       WHERE is_active = TRUE
         AND expiry_date IS NOT NULL
         AND expiry_date <= CURRENT_DATE + $1::INT
       ORDER BY expiry_date ASC`,
      [days]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = {
  listProducts, getByBarcode, getProduct, createProduct,
  updateProduct, deleteProduct, lowStockAlerts, expiringAlerts,
};
