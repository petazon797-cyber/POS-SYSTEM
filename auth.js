// =====================================================================
// Authentication & Role-Based Access Control (RBAC) middleware
// =====================================================================
// Roles in this system, from least to most privileged:
//   cashier  -> can only operate the checkout screen
//   manager  -> cashier permissions + inventory + reports
//   admin    -> everything, including user management
// =====================================================================

const jwt = require('jsonwebtoken');

/**
 * verifyToken
 * Reads the "Authorization: Bearer <token>" header, verifies it,
 * and attaches the decoded user payload to req.user.
 * Every protected route runs this FIRST.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded contains: { id, username, role }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * requireRole(...allowedRoles)
 * Usage: router.post('/products', verifyToken, requireRole('manager', 'admin'), handler)
 * Must run AFTER verifyToken so req.user is already set.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires one of: ${allowedRoles.join(', ')}.`,
      });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
