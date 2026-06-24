// =====================================================================
// Database connection pool
// =====================================================================
// We use a connection POOL (not a single client) because the API will
// serve many concurrent requests (multiple checkout counters scanning
// at the same time). The pool hands out a free connection per request
// and returns it when done.
//
// IMPORTANT: for the checkout transaction specifically, we must grab a
// single dedicated client with pool.connect() so that BEGIN / COMMIT /
// ROLLBACK all happen on the SAME underlying connection. See
// saleController.js for that usage.
// =====================================================================

require('dotenv').config();
const { Pool } = require('pg');

// Most cloud Postgres providers (Neon, Render, Railway, Supabase) give you
// ONE connection string instead of separate host/port/user/password values.
// We support both styles so the same code runs locally, in Docker, AND on
// a cloud host without any changes -- just set whichever env var(s) you have.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required by most managed Postgres providers
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,                     // max simultaneous connections in the pool
      idleTimeoutMillis: 30000,    // close idle connections after 30s
    });

pool.on('error', (err) => {
  // Catches unexpected errors on idle clients so the whole process doesn't crash
  console.error('Unexpected error on idle database client', err);
});

module.exports = pool;
