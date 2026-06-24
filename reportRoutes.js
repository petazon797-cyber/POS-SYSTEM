const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('manager', 'admin')); // reports are manager+ only

router.get('/sales', ctrl.salesReport);
router.get('/profit-margin', ctrl.profitMarginReport);
router.get('/best-selling', ctrl.bestSellingReport);
router.get('/slow-moving', ctrl.slowMovingReport);
router.get('/export/sales.xlsx', ctrl.exportSalesExcel);
router.get('/export/sales.pdf', ctrl.exportSalesPdf);

module.exports = router;
