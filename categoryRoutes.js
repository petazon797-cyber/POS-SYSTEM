const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/categoryController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', ctrl.listCategories);
router.post('/', requireRole('manager', 'admin'), ctrl.createCategory);

module.exports = router;
