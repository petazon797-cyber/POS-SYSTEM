const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/login', auth.login);                                    // public
router.post('/register', verifyToken, requireRole('admin'), auth.register); // admin only
router.get('/me', verifyToken, auth.me);

module.exports = router;
