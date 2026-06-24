const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken); // every product route requires login

router.get('/', ctrl.listProducts);                                          // any role
router.get('/alerts/low-stock', requireRole('manager', 'admin'), ctrl.lowStockAlerts);
router.get('/alerts/expiring', requireRole('manager', 'admin'), ctrl.expiringAlerts);
router.get('/barcode/:barcode', ctrl.getByBarcode);                          // cashier uses this at checkout
router.get('/:id', ctrl.getProduct);
router.post('/', requireRole('manager', 'admin'), ctrl.createProduct);
router.put('/:id', requireRole('manager', 'admin'), ctrl.updateProduct);
router.delete('/:id', requireRole('admin'), ctrl.deleteProduct);

module.exports = router;
