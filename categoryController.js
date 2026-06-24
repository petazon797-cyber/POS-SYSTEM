// =====================================================================
// CATEGORIES CONTROLLER
// =====================================================================
const pool = require('../config/db');

async function listCategories(req, res) {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY name');
  return res.json(rows);
}

async function createCategory(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required.' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Category already exists.' });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { listCategories, createCategory };
