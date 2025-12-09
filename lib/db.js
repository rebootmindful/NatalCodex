/**
 * Database connection pool for Neon Postgres
 */

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        },
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        connectionTimeoutMillis: 10000, // 10 seconds
        idleTimeoutMillis: 30000 // 30 seconds
      });

      // 测试连接
      pool.on('error', (err) => {
        console.error('[DB] Unexpected pool error:', err);
      });

      console.log('[DB] Pool created successfully');
    } catch (error) {
      console.error('[DB] Failed to create pool:', error.message);
      throw error;
    }
  }
  return pool;
}

/**
 * Execute a query
 */
async function query(text, params) {
  try {
    const pool = getPool();
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[DB] Query executed in', duration, 'ms');
    return res;
  } catch (error) {
    console.error('[DB] Query failed:', error.message);
    console.error('[DB] Query text:', text);
    console.error('[DB] Error code:', error.code);
    throw error;
  }
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
