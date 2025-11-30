const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/], methods: ['GET','POST'] }));

const KIE_BASE = 'https://api.kie.ai';
const KIE_API_KEY = process.env.KIE_API_KEY;

app.get('/health', (req, res) => {
  res.json({ ok: true, hasKey: !!KIE_API_KEY });
});

app.post('/api/kie/createTask', async (req, res) => {
  try {
    if (!KIE_API_KEY) {
      return res.status(501).json({ success: false, message: 'KIE_API_KEY not configured' });
    }
    const { prompt, aspect_ratio = '9:16', resolution = '2K', output_format = 'png', callBackUrl } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'prompt is required' });
    }
    const payload = {
      model: 'nano-banana-pro',
      ...(callBackUrl ? { callBackUrl } : {}),
      input: {
        prompt,
        aspect_ratio,
        resolution,
        output_format,
      },
    };
    const resp = await axios.post(`${KIE_BASE}/api/v1/jobs/createTask`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_API_KEY}`,
      },
      timeout: 30000,
    });
    const data = resp.data || {};
    if (data && data.code === 200 && data.data && data.data.taskId) {
      return res.json({ success: true, taskId: data.data.taskId });
    }
    return res.status(500).json({ success: false, message: 'Unexpected response', raw: data });
  } catch (err) {
    const status = err.response?.status || 500;
    return res.status(status).json({ success: false, message: err.message, raw: err.response?.data });
  }
});

const port = process.env.KIE_PROXY_PORT ? parseInt(process.env.KIE_PROXY_PORT, 10) : 5502;
app.listen(port, () => {
  console.log(`KIE proxy listening on http://localhost:${port}`);
});

