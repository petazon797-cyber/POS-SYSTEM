// =====================================================================
// AUTH CONTROLLER
// =====================================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Public endpoint. Returns a JWT containing { id, username, role }.
 */
async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, username, password_hash, full_name, role, is_active FROM users WHERE username = $1',
      [username]
    );

    if (rows.length === 0) {
      // Same error for "not found" and "wrong password" -- don't leak which one
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Sign a token that carries the role -- this is what requireRole() checks later
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/register
 * Admin-only. Creates a new cashier/manager/admin account.
 * Body: { username, password, full_name, role }
 */
async function register(req, res) {
  const { username, password, full_name, role } = req.body;

  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: 'username, password, full_name and role are required.' });
  }

  if (!['cashier', 'manager', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be one of: cashier, manager, admin.' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10); // 10 salt rounds -- good default

    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, full_name, role, created_at`,
      [username, password_hash, full_name, role]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Postgres unique_violation
      return res.status(409).json({ error: 'Username already exists.' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/auth/me
 * Returns the currently logged-in user's profile (from the JWT).
 */
async function me(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { login, register, me };
