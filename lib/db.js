/**
 * Database connection pool for Neon Postgres
 */

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: parseInt(process.env.DB_POOL_MAX) || 10
    });
  }
  return pool;
}

/**
 * Execute a query
 */
async function query(text, params) {
  const pool = getPool();
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('[DB] Query executed in', duration, 'ms');
  return res;
}

/**
 * Get a client from the pool
 */
async function getClient() {
  const pool = getPool();
  return pool.connect();
}

module.exports = {
  query,
  getClient,
  getPool
};
