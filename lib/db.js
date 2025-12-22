/**
 * Database connection pool for Neon Postgres
 */

const { Pool } = require('pg');
const crypto = require('crypto');

let pool = null;

const DEFAULT_LOG_SLOW_MS = process.env.NODE_ENV === 'production' ? 1000 : 200;
const LOG_SLOW_MS = (() => {
  const raw = process.env.DB_LOG_SLOW_MS;
  if (!raw) return DEFAULT_LOG_SLOW_MS;
  const ms = parseInt(raw, 10);
  return Number.isFinite(ms) && ms >= 0 ? ms : DEFAULT_LOG_SLOW_MS;
})();
const LOG_ALL_QUERIES = process.env.DB_LOG_QUERIES === '1';

function getQueryId(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex').slice(0, 12);
}

function getQueryPreview(text) {
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  const redacted = normalized
    .replace(/E?'(?:''|[^'])*'/g, "'***'")
    .replace(/\b([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi, '***@***')
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, '***JWT***')
    .replace(/\b[0-9a-f]{32,}\b/gi, '***HEX***')
    .replace(/\b(password|pass|pwd|secret|token|api[_-]?key|authorization)\b\s*=\s*'\\*\\*\\*'/gi, '$1=\'***\'');

  return redacted.slice(0, 200);
}

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

      if (process.env.NODE_ENV !== 'production') {
        console.log('[DB] Pool created successfully');
      }
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
  const queryId = getQueryId(text);
  try {
    const pool = getPool();
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (LOG_ALL_QUERIES || duration >= LOG_SLOW_MS) {
      console.log('[DB] Query executed:', { queryId, durationMs: duration });
    }
    return res;
  } catch (error) {
    console.error('[DB] Query failed:', error.message);
    console.error('[DB] Query id:', queryId);
    console.error('[DB] Error code:', error.code);
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DB] Query preview:', getQueryPreview(text));
    }
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
