const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/saleController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

router.post('/checkout', ctrl.checkout);                                  // any logged-in role (cashier+)
router.get('/', requireRole('manager', 'admin'), ctrl.listSales);
router.get('/:id', requireRole('manager', 'admin'), ctrl.getSale);
router.post('/:id/void', requireRole('manager', 'admin'), ctrl.voidSale);

module.exports = router;
