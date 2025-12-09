module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.status(405).end('Method Not Allowed'); return; }
  const key = process.env.KIE_API_KEY || '';
  if (!key) { res.status(500).json({ success: false, message: 'KIE_API_KEY missing' }); return; }
  const u = new URL(req.url, 'http://localhost');
  const taskId = u.searchParams.get('taskId') || '';
  if (!taskId) { res.status(400).json({ success: false, message: 'taskId required' }); return; }

  console.log('[KIE Query] Querying taskId:', taskId);

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 30000);
  let data = null; let parseError = ''; let httpStatus = 0;
  try {
    // Use POST method directly (official KIE API standard)
    const resp = await fetch('https://api.kie.ai/api/v1/jobs/queryTask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ taskId }),
      signal: controller.signal
    });
    httpStatus = resp.status;
    data = await resp.json();

    console.log('[KIE Query] Response:', {
      httpStatus,
      code: data && data.code,
      state: data && data.data && data.data.state,
      hasResultJson: !!(data && data.data && data.data.resultJson)
    });
  } catch (e) {
    console.error('[KIE Query] Error:', e && e.message ? e.message : e);
    clearTimeout(to);
    res.status(500).json({ success: false, message: 'query error', error: String(e && e.message || 'unknown') });
    return;
  }
  clearTimeout(to);

  const state = data && data.data && data.data.state ? data.data.state : 'unknown';
  let resultUrl = '';
  try {
    const resultJson = data && data.data && data.data.resultJson ? data.data.resultJson : '{}';
    const parsed = JSON.parse(resultJson);
    resultUrl = parsed && parsed.resultUrls ? parsed.resultUrls[0] || '' : '';

    if (resultUrl) {
      console.log('[KIE Query] Extracted resultUrl:', resultUrl);
    }
  } catch (e) {
    parseError = String(e && e.message || 'parse error');
    console.error('[KIE Query] Parse error:', parseError);
  }

  const ok = (httpStatus===200) || (data && data.code===200);
  if (!ok) {
    res.status(502).json({ success: false, state, resultUrl, raw: data, diagnostics: { parseError, httpStatus } });
    return;
  }
  res.json({ success: true, state, resultUrl, raw: data, diagnostics: { parseError, httpStatus } });
};
