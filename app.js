// =====================================================================
// EXPRESS APP SETUP
// =====================================================================
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const saleRoutes = require('./routes/saleRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const reportRoutes = require('./routes/reportRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();

app.use(cors());
app.use(express.json()); // parse JSON request bodies

// Simple health check -- useful for deployment monitoring / load balancers
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/categories', categoryRoutes);

// ---------------------------------------------------------------------
// Serve the frontend (index.html / app.js / style.css) from the SAME
// server + SAME origin as the API. This means:
//   - Only ONE service needs to be deployed (simpler on Render/Railway/etc).
//   - The frontend can call the API with a relative path ('/api/...')
//     instead of a hardcoded host, so it works unchanged whether you're
//     running locally, in Docker, or on a cloud URL.
// ---------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// 404 for unmatched /api/* routes (anything else falls through to the static file above)
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found.' }));

// Global error handler (catches anything that slips past individual try/catch blocks)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
