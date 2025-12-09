const { withRetry } = require('../../lib/retry');

module.exports = async (req, res) => {
  const trace = [];
  try {
    if (req.method !== 'POST') { res.status(405).end('Method Not Allowed'); return; }
    const body = req.body || {};
    const orderId = String(body.orderId || '');
    const birth = body.birthData || {};
    const name = String(birth.name || '');
    const gender = String(birth.gender || '');
    const date = String(birth.date || '');
    const time = String(birth.time || '');
    const location = String(birth.location || '');
    const lat = String(birth.lat || '');
    const lon = String(birth.lon || '');
    const timezone = String(birth.timezone || '');

    trace.push({ step: 'validate', orderId, have: { name: !!name, gender: !!gender, date: !!date, time: !!time, location: !!location, lat: !!lat, lon: !!lon, timezone: !!timezone } });
    if (!orderId) { res.status(400).json({ success: false, status: 'failed', error: 'orderId required', trace }); return; }
    if (!date || !time || !location || !timezone) { res.status(400).json({ success: false, status: 'failed', error: 'missing birth fields', trace }); return; }

    const prompt = buildPrompt({ name, gender, date, time, location, lat, lon, timezone });
    trace.push({ step: 'buildPrompt', length: prompt.length });

    const endpoint = process.env.REPORT_LLM_ENDPOINT || '';
    const apiKey = process.env.REPORT_LLM_API_KEY || '';

    async function callLLM() {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 30000);
      try {
        if (!endpoint || !apiKey) {
          return { ok: true, text: mockReport({ orderId, name, gender, date, time, location, lat, lon, timezone }) };
        }
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j && (j.text || j.report)) {
          return { ok: true, text: String(j.text || j.report) };
        }
        const msg = j && (j.error || j.message) ? String(j.error || j.message) : `HTTP ${r.status}`;
        throw new Error(msg);
      } finally { clearTimeout(to); }
    }

    let content = '';
    try {
      content = await withRetry(async () => {
        const out = await callLLM();
        trace.push({ step: 'attempt', ok: out.ok });
        if (!out.ok) throw new Error('LLM not ok');
        return out.text;
      }, 3, 1000);
    } catch (e) {
      console.error('Generate report error:', e && e.message ? e.message : e);
      res.status(500).json({ success: false, status: 'failed', error: String(e && e.message || 'unknown'), trace });
      return;
    }

    res.json({ success: true, status: 'ok', reportContent: content, trace });
  } catch (err) {
    console.error('Generate report fatal:', err && err.message ? err.message : err);
    res.status(500).json({ success: false, status: 'failed', error: String(err && err.message || 'fatal'), trace });
  }
};

function buildPrompt(d) {
  return [
    'You are Eastern Echo, an expert fusing Chinese metaphysics and modern psychology.',
    `Name: ${d.name}`,
    `Gender: ${d.gender}`,
    `Birth: ${d.date} ${d.time} (${d.timezone})`,
    `Location: ${d.location} (${d.lat},${d.lon})`,
    'Please generate a 2000-word markdown report including:',
    '- Core energy and elemental balance (Wood/Fire/Earth/Metal/Water)',
    '- Day Master analysis and personality patterns',
    '- Career matrix and growth advice',
    '- Relationship patterns and communication tips',
    '- Lifestyle rhythm and wellbeing suggestions',
  ].join('\n');
}

function mockReport(d) {
  return `# Soul Codex Report\n\nOrder: ${d.orderId}\n\nBirth: ${d.date} ${d.time}\nLocation: ${d.location} (${d.lat},${d.lon}) ${d.timezone}\n\n## Core Energy\nBalanced elements inferred.\n\n## Career Matrix\nAdvice tailored to ${d.gender || 'individual'}.\n\n## Love Algorithms\nPatterns and communication tips.\n\n## Lifestyle\nDaily rhythm suggestions.`;
}
