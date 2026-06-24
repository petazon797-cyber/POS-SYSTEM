// =====================================================================
// REPORTS & ANALYTICS CONTROLLER
// =====================================================================
const pool = require('../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/** GET /api/reports/sales?period=daily|weekly|monthly */
async function salesReport(req, res) {
  const period = req.query.period || 'daily';
  const bucketExpr = {
    daily: "date_trunc('day', created_at)",
    weekly: "date_trunc('week', created_at)",
    monthly: "date_trunc('month', created_at)",
  }[period];

  if (!bucketExpr) {
    return res.status(400).json({ error: 'period must be daily, weekly or monthly.' });
  }

  const { rows } = await pool.query(
    `SELECT ${bucketExpr} AS period_start,
            COUNT(*) AS total_sales,
            SUM(total_amount) AS total_revenue,
            SUM(discount_total) AS total_discount
     FROM sales
     WHERE status = 'completed'
     GROUP BY period_start
     ORDER BY period_start DESC`
  );
  return res.json(rows);
}

/** GET /api/reports/profit-margin?from=&to=  -> (selling price - cost price) per product sold */
async function profitMarginReport(req, res) {
  const { from, to } = req.query;
  const conditions = ["s.status = 'completed'"];
  const values = [];

  if (from) { values.push(from); conditions.push(`s.created_at >= $${values.length}`); }
  if (to)   { values.push(to);   conditions.push(`s.created_at <= $${values.length}`); }

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.sku,
            SUM(si.quantity) AS units_sold,
            SUM(si.line_total) AS revenue,
            SUM(si.quantity * p.cost_price) AS total_cost,
            SUM(si.line_total) - SUM(si.quantity * p.cost_price) AS profit
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY p.id, p.name, p.sku
     ORDER BY profit DESC`,
    values
  );
  return res.json(rows);
}

/** GET /api/reports/best-selling?limit=10 */
async function bestSellingReport(req, res) {
  const limit = parseInt(req.query.limit, 10) || 10;
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.sku, SUM(si.quantity) AS units_sold
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id AND s.status = 'completed'
     JOIN products p ON p.id = si.product_id
     GROUP BY p.id, p.name, p.sku
     ORDER BY units_sold DESC
     LIMIT $1`,
    [limit]
  );
  return res.json(rows);
}

/** GET /api/reports/slow-moving?days=30 -- products with zero/low sales in the last N days */
async function slowMovingReport(req, res) {
  const days = parseInt(req.query.days, 10) || 30;
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.sku, p.quantity_in_stock,
            COALESCE(SUM(si.quantity), 0) AS units_sold_recently
     FROM products p
     LEFT JOIN sale_items si ON si.product_id = p.id
     LEFT JOIN sales s ON s.id = si.sale_id
        AND s.status = 'completed'
        AND s.created_at >= CURRENT_DATE - $1::INT
     WHERE p.is_active = TRUE
     GROUP BY p.id, p.name, p.sku, p.quantity_in_stock
     HAVING COALESCE(SUM(si.quantity), 0) < 5
     ORDER BY units_sold_recently ASC`,
    [days]
  );
  return res.json(rows);
}

/** GET /api/reports/export/sales.xlsx?from=&to=  -- Excel export */
async function exportSalesExcel(req, res) {
  const { from, to } = req.query;
  const conditions = ["status = 'completed'"];
  const values = [];
  if (from) { values.push(from); conditions.push(`created_at >= $${values.length}`); }
  if (to)   { values.push(to);   conditions.push(`created_at <= $${values.length}`); }

  const { rows } = await pool.query(
    `SELECT sale_number, created_at, subtotal, discount_total, total_amount
     FROM sales WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    values
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sales');
  sheet.columns = [
    { header: 'Sale Number', key: 'sale_number', width: 25 },
    { header: 'Date', key: 'created_at', width: 22 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Discount', key: 'discount_total', width: 15 },
    { header: 'Total', key: 'total_amount', width: 15 },
  ];
  rows.forEach((r) => sheet.addRow(r));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
}

/** GET /api/reports/export/sales.pdf?from=&to= -- PDF export */
async function exportSalesPdf(req, res) {
  const { from, to } = req.query;
  const conditions = ["status = 'completed'"];
  const values = [];
  if (from) { values.push(from); conditions.push(`created_at >= $${values.length}`); }
  if (to)   { values.push(to);   conditions.push(`created_at <= $${values.length}`); }

  const { rows } = await pool.query(
    `SELECT sale_number, created_at, total_amount
     FROM sales WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    values
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(16).text('Sales Report', { align: 'center' });
  doc.moveDown();
  rows.forEach((r) => {
    doc.fontSize(10).text(`${r.sale_number}   |   ${r.created_at.toISOString().slice(0, 10)}   |   ${r.total_amount}`);
  });
  doc.end();
}

module.exports = {
  salesReport, profitMarginReport, bestSellingReport,
  slowMovingReport, exportSalesExcel, exportSalesPdf,
};
