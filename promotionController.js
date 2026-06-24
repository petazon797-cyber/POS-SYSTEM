// =====================================================================
// PROMOTIONS / COUPONS CONTROLLER  (manager/admin manage these)
// =====================================================================
const pool = require('../config/db');

async function listPromotions(req, res) {
  const { rows } = await pool.query('SELECT * FROM promotions ORDER BY start_date DESC');
  return res.json(rows);
}

/** POST /api/promotions
 * Body: { code, name, discount_type: 'percent'|'fixed', discount_value,
 *         applicable_product_id?, applicable_category_id?, start_date, end_date }
 */
async function createPromotion(req, res) {
  const { code, name, discount_type, discount_value, applicable_product_id,
          applicable_category_id, start_date, end_date } = req.body;

  if (!code || !name || !discount_type || discount_value == null || !start_date || !end_date) {
    return res.status(400).json({ error: 'code, name, discount_type, discount_value, start_date and end_date are required.' });
  }
  if (!['percent', 'fixed'].includes(discount_type)) {
    return res.status(400).json({ error: 'discount_type must be "percent" or "fixed".' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO promotions
        (code, name, discount_type, discount_value, applicable_product_id, applicable_category_id, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [code, name, discount_type, discount_value, applicable_product_id, applicable_category_id, start_date, end_date]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Promotion code already exists.' });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/** PUT /api/promotions/:id/deactivate */
async function deactivatePromotion(req, res) {
  const { rows } = await pool.query(
    'UPDATE promotions SET is_active = FALSE WHERE id = $1 RETURNING id',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Promotion not found.' });
  return res.json({ message: 'Promotion deactivated.' });
}

module.exports = { listPromotions, createPromotion, deactivatePromotion };
