const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const MEM_KEY = '__nc_kie_store__';
function storePath() { return path.join(os.tmpdir(), 'kie-results.json'); }
function ensureStore() { const p = storePath(); try { if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({ items: [] }, null, 2)); } catch (_) {} return p; }
function load() { if (globalThis[MEM_KEY]) return globalThis[MEM_KEY]; const p = ensureStore(); let data = { items: [] }; try { data = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) {} globalThis[MEM_KEY] = data; return data; }
function save(data) { globalThis[MEM_KEY] = data; try { const p = ensureStore(); fs.writeFileSync(p, JSON.stringify(data, null, 2)); } catch (_) {} }
function makeShortId(taskId, imageUrl) { const h = crypto.createHash('sha256').update(String(taskId)+'|'+String(imageUrl)).digest('base64url'); return h.slice(0, 10); }
function baseUrl(req) { const host = req.headers['host'] || ''; const proto = 'https://'; return host ? (proto + host) : ''; }

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ success:false, message:'Method Not Allowed', allow:'POST' }); return; }
  const u = new URL(req.url, 'http://localhost');
  const token = u.searchParams.get('token') || '';
  const expect = process.env.KIE_CALLBACK_TOKEN || '';
  if (!token || !expect || token !== expect) { console.error('KIE callback unauthorized'); res.status(401).json({ success: false, message: 'unauthorized' }); return; }
  const b = req.body || {};
  const data = b.data || {};
  const state = String(data.state || '');
  const taskId = String(data.taskId || '');
  let resultUrl = '';
  try { const parsed = JSON.parse(String(data.resultJson || '')); resultUrl = parsed && parsed.resultUrls ? parsed.resultUrls[0] || '' : ''; } catch (e) { console.error('KIE callback parse error:', e && e.message ? e.message : e); }
  let shortId = '';
  let shortUrl = '';
  try {
    if (taskId && resultUrl) {
      const store = load();
      let existing = store.items.find(x => x.taskId === taskId) || store.items.find(x => x.imageUrl === resultUrl);
      if (!existing) {
        shortId = makeShortId(taskId, resultUrl);
        existing = { taskId, imageUrl: resultUrl, shortId, createdAt: Date.now() };
        store.items.push(existing);
        save(store);
      } else {
        shortId = existing.shortId;
      }
      shortUrl = baseUrl(req) ? `${baseUrl(req)}/api/kie/storeResult?shortId=${shortId}` : '';
    }
  } catch (e) { console.error('KIE callback store error:', e && e.message ? e.message : e); }
  res.json({ success: true, state, taskId, resultUrl, shortId, shortUrl });
};
