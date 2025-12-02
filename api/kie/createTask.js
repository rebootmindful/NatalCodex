module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).end('Method Not Allowed'); return; }
  const key = process.env.KIE_API_KEY || '';
  if (!key) { res.status(500).json({ success: false, message: 'KIE_API_KEY missing' }); return; }
  const b = req.body || {};
  const prompt = String(b.prompt || '');
  const aspect_ratio = String(b.aspect_ratio || '9:16');
  const resolution = String(b.resolution || '2K');
  const output_format = String(b.output_format || 'png');
  const callBackUrl = process.env.KIE_CALLBACK_URL ? `${process.env.KIE_CALLBACK_URL}?token=${process.env.KIE_CALLBACK_TOKEN||''}` : undefined;

  console.log('[KIE Create] Starting task creation:', {
    hasPrompt: !!prompt,
    promptLength: prompt.length,
    aspect_ratio,
    resolution,
    output_format,
    hasCallbackUrl: !!callBackUrl,
    callbackUrl: callBackUrl
  });

  if (!prompt) { res.status(400).json({ success: false, message: 'prompt required' }); return; }
  const payload = { model: 'nano-banana-pro', input: { prompt, aspect_ratio, resolution, output_format } };
  if (callBackUrl) payload.callBackUrl = callBackUrl;
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 30000);
  let data = null;
  try {
    const resp = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(payload), signal: controller.signal
    });
    data = await resp.json();
  } catch (e) {
    console.error('KIE create error:', e && e.message ? e.message : e);
    clearTimeout(to);
    res.status(500).json({ success: false, message: 'create error', error: String(e && e.message || 'unknown') });
    return;
  }
  clearTimeout(to);

  console.log('[KIE Create] API Response:', {
    code: data && data.code,
    hasTaskId: !!(data && data.data && data.data.taskId),
    taskId: data && data.data && data.data.taskId,
    state: data && data.data && data.data.state
  });

  if (data && data.code === 200 && data.data && data.data.taskId) {
    console.log('[KIE Create] Task created successfully:', data.data.taskId);
    res.json({ success: true, taskId: data.data.taskId });
    return;
  }

  console.error('[KIE Create] Unexpected response:', data);
  res.status(500).json({ success: false, message: 'Unexpected response', raw: data });
};
