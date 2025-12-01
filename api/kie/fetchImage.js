module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') { res.status(405).json({ success:false, message:'Method Not Allowed' }); return; }
    const u = new URL(req.url, 'http://localhost');
    const url = u.searchParams.get('url') || '';
    if (!url) { res.status(400).json({ success:false, message:'url required' }); return; }
    if (!/^https?:\/\//i.test(url)) { res.status(400).json({ success:false, message:'invalid scheme' }); return; }
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 30000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(to);
    if (!resp.ok) { res.status(resp.status).json({ success:false, message:'fetch failed', status: resp.status }); return; }
    const ct = resp.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', ct);
    // allow download
    const fn = 'image.' + (ct.includes('png') ? 'png' : ct.includes('jpeg') ? 'jpg' : 'bin');
    res.setHeader('Content-Disposition', 'inline; filename="'+fn+'"');
    const buf = await resp.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ success:false, message:String(e && e.message || 'unknown') });
  }
};
