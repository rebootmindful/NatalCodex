module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.status(405).end('Method Not Allowed'); return; }
  const key = process.env.KIE_API_KEY || '';
  if (!key) { res.status(500).json({ success: false, message: 'KIE_API_KEY missing' }); return; }
  const u = new URL(req.url, 'http://localhost');
  const taskId = u.searchParams.get('taskId') || '';
  if (!taskId) { res.status(400).json({ success: false, message: 'taskId required' }); return; }
  const resp = await fetch(`https://api.kie.ai/api/v1/jobs/queryTask?taskId=${encodeURIComponent(taskId)}`, {
    method: 'GET', headers: { 'Authorization': `Bearer ${key}` }
  });
  const data = await resp.json();
  const state = data && data.data && data.data.state ? data.data.state : 'unknown';
  let resultUrl = '';
  try { const parsed = JSON.parse(data && data.data && data.data.resultJson ? data.data.resultJson : '{}'); resultUrl = parsed && parsed.resultUrls ? parsed.resultUrls[0] || '' : ''; } catch {}
  res.json({ success: true, state, resultUrl, raw: data });
};

