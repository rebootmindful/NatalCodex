const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const { withRetry } = require('../../lib/retry');

const MEM_KEY = '__nc_kie_store__';
function storePath() { return path.join(os.tmpdir(), 'kie-results.json'); }
function ensureStore() {
  const p = storePath();
  try {
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({ items: [] }, null, 2));
  } catch (_) {}
  return p;
}
function load() {
  if (globalThis[MEM_KEY]) return globalThis[MEM_KEY];
  const p = ensureStore();
  let data = { items: [] };
  try { data = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) {}
  globalThis[MEM_KEY] = data;
  return data;
}
function save(data) {
  globalThis[MEM_KEY] = data;
  try { const p = ensureStore(); fs.writeFileSync(p, JSON.stringify(data, null, 2)); } catch (_) {}
}
function makeShortId(taskId, imageUrl) {
  const h = crypto.createHash('sha256').update(String(taskId)+'|'+String(imageUrl)).digest('base64url');
  return h.slice(0, 10);
}
function baseUrl(req) {
  const host = req.headers['host'] || '';
  const proto = 'https://';
  return host ? (proto + host) : '';
}

function getTenant(req) {
  const u = new URL(req.url, 'http://localhost');
  const q = String(u.searchParams.get('tenant') || '');
  const h = String((req.headers && req.headers['x-tenant-id']) || '');
  const d = String(process.env.KIE_DEFAULT_TENANT || 'default');
  return q || h || d;
}

let pool = null;
let dbReady = false;
async function ensureDb() {
  if (dbReady) return;
  const url = process.env.DATABASE_URL || '';
  if (!url) return;
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: url, max: parseInt(process.env.DB_POOL_MAX || '10', 10), idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
  await withRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query(`CREATE TABLE IF NOT EXISTS kie_results (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        short_id VARCHAR(16) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tenant_id, task_id),
        UNIQUE(tenant_id, short_id)
      )`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_kie_results_created ON kie_results(created_at)`);
    } finally {
      client.release();
    }
  }, 5, 500);
  dbReady = true;
}

async function dbGetByTaskId(tenantId, taskId) {
  if (!pool) return null;
  return await withRetry(async () => {
    const r = await pool.query('SELECT task_id,image_url,short_id,EXTRACT(EPOCH FROM created_at)*1000 AS created_at FROM kie_results WHERE tenant_id=$1 AND task_id=$2 LIMIT 1', [tenantId, taskId]);
    if (r.rows.length) return { taskId: r.rows[0].task_id, imageUrl: r.rows[0].image_url, shortId: r.rows[0].short_id, createdAt: Math.round(r.rows[0].created_at) };
    return null;
  }, 3, 300);
}

async function dbGetByShortId(tenantId, shortId) {
  if (!pool) return null;
  return await withRetry(async () => {
    const r = await pool.query('SELECT task_id,image_url,short_id,EXTRACT(EPOCH FROM created_at)*1000 AS created_at FROM kie_results WHERE tenant_id=$1 AND short_id=$2 LIMIT 1', [tenantId, shortId]);
    if (r.rows.length) return { taskId: r.rows[0].task_id, imageUrl: r.rows[0].image_url, shortId: r.rows[0].short_id, createdAt: Math.round(r.rows[0].created_at) };
    return null;
  }, 3, 300);
}

async function dbUpsert(tenantId, taskId, imageUrl, shortId) {
  if (!pool) return null;
  return await withRetry(async () => {
    const r = await pool.query(
      'INSERT INTO kie_results(tenant_id,task_id,image_url,short_id) VALUES($1,$2,$3,$4) ON CONFLICT (tenant_id,task_id) DO UPDATE SET image_url=EXCLUDED.image_url, short_id=EXCLUDED.short_id RETURNING task_id,image_url,short_id,EXTRACT(EPOCH FROM created_at)*1000 AS created_at',
      [tenantId, taskId, imageUrl, shortId]
    );
    const row = r.rows[0];
    return { taskId: row.task_id, imageUrl: row.image_url, shortId: row.short_id, createdAt: Math.round(row.created_at) };
  }, 3, 300);
}

async function kvGetByTaskId(tenantId, taskId) {
  const url = process.env.KV_REST_API_URL || '';
  const token = process.env.KV_REST_API_TOKEN || '';
  if (!url || !token) return null;
  const key = `kie:task:${tenantId}:${taskId}`;
  const r = await axios.get(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  const sid = r && r.data && r.data.result || '';
  if (!sid) return null;
  return await kvGetByShortId(tenantId, String(sid));
}

async function kvGetByShortId(tenantId, shortId) {
  const url = process.env.KV_REST_API_URL || '';
  const token = process.env.KV_REST_API_TOKEN || '';
  if (!url || !token) return null;
  const key = `kie:short:${tenantId}:${shortId}`;
  const r = await axios.get(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  const v = r && r.data && r.data.result || '';
  if (!v) return null;
  try {
    const obj = JSON.parse(v);
    return obj;
  } catch (_) {
    return null;
  }
}

async function kvUpsert(tenantId, taskId, imageUrl, shortId) {
  const url = process.env.KV_REST_API_URL || '';
  const token = process.env.KV_REST_API_TOKEN || '';
  if (!url || !token) return null;
  const item = { taskId, imageUrl, shortId, createdAt: Date.now() };
  const ops = [
    axios.post(`${url}/set/${encodeURIComponent(`kie:task:${tenantId}:${taskId}`)}`, { value: shortId }, { headers: { Authorization: `Bearer ${token}` } }),
    axios.post(`${url}/set/${encodeURIComponent(`kie:short:${tenantId}:${shortId}`)}`, { value: JSON.stringify(item) }, { headers: { Authorization: `Bearer ${token}` } })
  ];
  await Promise.all(ops).catch(() => {});
  return item;
}

const cacheByShort = new Map();
const cacheByTask = new Map();
function cacheGet(map, key) {
  const it = map.get(key);
  if (!it) return null;
  if (Date.now() > it.exp) { map.delete(key); return null; }
  return it.val;
}
function cacheSet(map, key, val, ttlMs) {
  map.set(key, { val, exp: Date.now() + ttlMs });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      const taskId = String(b.taskId || '');
      const imageUrl = String(b.imageUrl || '');
      if (!taskId || !imageUrl) { res.status(400).json({ success:false, message:'taskId and imageUrl required' }); return; }
      if (!/^https?:\/\//i.test(imageUrl)) { res.status(400).json({ success:false, message:'invalid imageUrl' }); return; }
      const tenantId = getTenant(req);
      await ensureDb();
      let existing = cacheGet(cacheByTask, tenantId+'|'+taskId);
      if (!existing) {
        if (pool) existing = await dbGetByTaskId(tenantId, taskId);
        if (!existing) existing = await kvGetByTaskId(tenantId, taskId);
        if (!existing) {
          const data = load();
          existing = data.items.find(x => x.taskId === taskId) || data.items.find(x => x.imageUrl === imageUrl) || null;
        }
      }
      if (existing) { res.json({ success:true, taskId: existing.taskId, imageUrl: existing.imageUrl, shortId: existing.shortId, shortUrl: baseUrl(req) ? `${baseUrl(req)}/api/kie/storeResult?shortId=${existing.shortId}` : '' }); return; }
      const shortId = makeShortId(taskId, imageUrl);
      let stored = null;
      const backend = (process.env.KIE_STORE_BACKEND || (process.env.DATABASE_URL ? 'postgres' : 'file')).toLowerCase();
      if (backend === 'postgres' && pool) stored = await dbUpsert(tenantId, taskId, imageUrl, shortId);
      else if (backend === 'vercelkv') stored = await kvUpsert(tenantId, taskId, imageUrl, shortId);
      if (!stored) {
        const data = load();
        const item = { taskId, imageUrl, shortId, createdAt: Date.now(), tenantId };
        data.items.push(item);
        save(data);
        stored = { taskId, imageUrl, shortId, createdAt: item.createdAt };
      }
      const dual = String(process.env.KIE_STORE_DUAL_WRITE || 'true').toLowerCase() === 'true';
      if (dual) {
        const data = load();
        const exists = data.items.find(x => x.taskId === taskId);
        if (!exists) {
          data.items.push({ taskId, imageUrl, shortId, createdAt: stored.createdAt, tenantId });
          save(data);
        }
      }
      cacheSet(cacheByTask, tenantId+'|'+taskId, stored, 60000);
      cacheSet(cacheByShort, tenantId+'|'+shortId, stored, 60000);
      res.json({ success:true, taskId: stored.taskId, imageUrl: stored.imageUrl, shortId: stored.shortId, shortUrl: baseUrl(req) ? `${baseUrl(req)}/api/kie/storeResult?shortId=${stored.shortId}` : '' });
      return;
    }
    if (req.method === 'GET') {
      const u = new URL(req.url, 'http://localhost');
      const action = String(u.searchParams.get('action') || '');
      const shortId = String(u.searchParams.get('shortId') || '');
      const taskId = String(u.searchParams.get('taskId') || '');
      const tenantId = getTenant(req);
      if (action === 'export') {
        await ensureDb();
        if (pool) {
          const r = await pool.query('SELECT task_id,image_url,short_id,EXTRACT(EPOCH FROM created_at)*1000 AS created_at FROM kie_results WHERE tenant_id=$1 ORDER BY created_at DESC', [tenantId]);
          res.json({ success:true, items: r.rows.map(x => ({ taskId: x.task_id, imageUrl: x.image_url, shortId: x.short_id, createdAt: Math.round(x.created_at) })) });
          return;
        }
        const data = load();
        const items = data.items.filter(x => String(x.tenantId||'default')===tenantId).map(x => ({ taskId: x.taskId, imageUrl: x.imageUrl, shortId: x.shortId, createdAt: x.createdAt }));
        res.json({ success:true, items });
        return;
      }
      if (action === 'verify') {
        await ensureDb();
        const data = load();
        const f = data.items.find(x => x.taskId === taskId) || null;
        const d = pool ? await dbGetByTaskId(tenantId, taskId) : null;
        const same = !!(f && d && f.shortId === d.shortId && f.imageUrl === d.imageUrl);
        res.json({ success:true, same, file: f || null, db: d || null });
        return;
      }
      let item = null;
      const cachedShort = shortId ? cacheGet(cacheByShort, tenantId+'|'+shortId) : null;
      const cachedTask = taskId ? cacheGet(cacheByTask, tenantId+'|'+taskId) : null;
      item = cachedShort || cachedTask || null;
      await ensureDb();
      if (!item && shortId) item = pool ? await dbGetByShortId(tenantId, shortId) : null;
      if (!item && taskId) item = pool ? await dbGetByTaskId(tenantId, taskId) : null;
      if (!item && shortId) item = await kvGetByShortId(tenantId, shortId);
      if (!item && taskId) item = await kvGetByTaskId(tenantId, taskId);
      if (!item) {
        const data = load();
        if (shortId) item = data.items.find(x => x.shortId === shortId) || null;
        if (!item && taskId) item = data.items.find(x => x.taskId === taskId) || null;
      }
      if (!item) { res.status(404).json({ success:false, message:'not found' }); return; }
      cacheSet(cacheByTask, tenantId+'|'+item.taskId, item, 60000);
      cacheSet(cacheByShort, tenantId+'|'+item.shortId, item, 60000);
      res.json({ success:true, taskId: item.taskId, imageUrl: item.imageUrl, shortId: item.shortId });
      return;
    }
    res.status(405).json({ success:false, message:'Method Not Allowed', allow:'GET,POST' });
  } catch (e) {
    res.status(500).json({ success:false, message:String(e && e.message || 'unknown') });
  }
};
