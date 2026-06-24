const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supplierController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('manager', 'admin')); // entire supplier module is manager+ only

router.get('/', ctrl.listSuppliers);
router.post('/', ctrl.createSupplier);
router.put('/:id', ctrl.updateSupplier);

router.get('/purchase-orders/all', ctrl.listPurchaseOrders);
router.get('/purchase-orders/:id', ctrl.getPurchaseOrder);
router.post('/purchase-orders', ctrl.createPurchaseOrder);
router.post('/purchase-orders/:id/receive', ctrl.receivePurchaseOrder);

module.exports = router;
