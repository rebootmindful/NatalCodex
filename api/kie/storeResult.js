const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

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

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      const taskId = String(b.taskId || '');
      const imageUrl = String(b.imageUrl || '');
      if (!taskId || !imageUrl) { res.status(400).json({ success:false, message:'taskId and imageUrl required' }); return; }
      if (!/^https?:\/\//i.test(imageUrl)) { res.status(400).json({ success:false, message:'invalid imageUrl' }); return; }
      const data = load();
      let existing = data.items.find(x => x.taskId === taskId) || data.items.find(x => x.imageUrl === imageUrl);
      if (existing) { res.json({ success:true, taskId: existing.taskId, imageUrl: existing.imageUrl, shortId: existing.shortId, shortUrl: baseUrl(req) ? `${baseUrl(req)}/api/kie/storeResult?shortId=${existing.shortId}` : '' }); return; }
      const shortId = makeShortId(taskId, imageUrl);
      const item = { taskId, imageUrl, shortId, createdAt: Date.now() };
      data.items.push(item);
      save(data);
      res.json({ success:true, taskId, imageUrl, shortId, shortUrl: baseUrl(req) ? `${baseUrl(req)}/api/kie/storeResult?shortId=${shortId}` : '' });
      return;
    }
    if (req.method === 'GET') {
      const u = new URL(req.url, 'http://localhost');
      const shortId = String(u.searchParams.get('shortId') || '');
      const taskId = String(u.searchParams.get('taskId') || '');
      const data = load();
      let item = null;
      if (shortId) item = data.items.find(x => x.shortId === shortId) || null;
      if (!item && taskId) item = data.items.find(x => x.taskId === taskId) || null;
      if (!item) { res.status(404).json({ success:false, message:'not found' }); return; }
      res.json({ success:true, taskId: item.taskId, imageUrl: item.imageUrl, shortId: item.shortId });
      return;
    }
    res.status(405).json({ success:false, message:'Method Not Allowed', allow:'GET,POST' });
  } catch (e) {
    res.status(500).json({ success:false, message:String(e && e.message || 'unknown') });
  }
};
