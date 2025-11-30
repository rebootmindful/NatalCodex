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
  res.json({ success: true, state, taskId, resultUrl });
};
