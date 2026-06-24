const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/promotionController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', ctrl.listPromotions); // cashier can read active promo list to apply at checkout
router.post('/', requireRole('manager', 'admin'), ctrl.createPromotion);
router.put('/:id/deactivate', requireRole('manager', 'admin'), ctrl.deactivatePromotion);

module.exports = router;
