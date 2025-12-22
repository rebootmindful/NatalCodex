const { query } = require('../../lib/db');
const crypto = require('crypto');

async function readRawBody(req, maxBytes) {
  if (!req || typeof req !== 'object') return null;

  const fromRawBody = req.rawBody;
  if (Buffer.isBuffer(fromRawBody)) return fromRawBody;
  if (typeof fromRawBody === 'string') return Buffer.from(fromRawBody, 'utf8');

  const fromBody = req.body;
  if (Buffer.isBuffer(fromBody)) return fromBody;
  if (typeof fromBody === 'string') return Buffer.from(fromBody, 'utf8');

  if (typeof req.on !== 'function') return null;

  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    function cleanup() {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      req.off('aborted', onAborted);
    }

    function onData(chunk) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buf.length;
      if (size > maxBytes) {
        cleanup();
        reject(new Error('payload_too_large'));
        return;
      }
      chunks.push(buf);
    }

    function onEnd() {
      cleanup();
      resolve(Buffer.concat(chunks));
    }

    function onError(err) {
      cleanup();
      reject(err);
    }

    function onAborted() {
      cleanup();
      reject(new Error('aborted'));
    }

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    req.on('aborted', onAborted);
  });
}

function normalizeHexSignature(signature) {
  const s = String(signature || '').trim();
  if (!s) return null;
  const cleaned = s.toLowerCase().startsWith('sha256=') ? s.slice(7).trim() : s.trim();
  if (!/^[0-9a-f]+$/i.test(cleaned)) return null;
  if (cleaned.length % 2 !== 0) return null;
  return cleaned.toLowerCase();
}

function verifySignature(payloadBuffer, signature) {
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }

  try {
    const computed = crypto
      .createHmac('sha256', secret)
      .update(payloadBuffer)
      .digest('hex');
    const sig = normalizeHexSignature(signature);
    if (!sig) return false;
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(sig, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (error) {
    console.error('[CreemWebhook] Signature verification error:', error);
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!process.env.CREEM_WEBHOOK_SECRET) {
    return res.status(500).json({ success: false, error: 'Creem webhook not configured' });
  }

  const signatureHeader =
    req.headers['creem-signature'] ||
    req.headers['Creem-Signature'] ||
    req.headers['CREEM-SIGNATURE'] ||
    '';

  if (!signatureHeader) {
    return res.status(400).json({ success: false, error: 'Missing creem-signature header' });
  }

  let payloadBuffer;
  try {
    payloadBuffer = await readRawBody(req, 2 * 1024 * 1024);
  } catch (error) {
    const msg = error && error.message === 'payload_too_large' ? 'Payload too large' : 'Failed to read raw body';
    return res.status(400).json({ success: false, error: msg });
  }

  if (!payloadBuffer || payloadBuffer.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing raw body' });
  }

  if (!verifySignature(payloadBuffer, signatureHeader)) {
    console.error('[CreemWebhook] Invalid signature');
    return res.status(400).json({ success: false, error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(payloadBuffer.toString('utf8'));
  } catch (error) {
    console.error('[CreemWebhook] Failed to parse payload:', error);
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }

  const eventType = event?.eventType;

  if (eventType === 'checkout.completed') {
    const metadata = event?.object?.metadata || {};
    const orderNo = metadata.orderNo;
    const userId = metadata.userId;

    if (!orderNo || !userId) {
      console.error('[CreemWebhook] Missing orderNo or userId in metadata');
      return res.status(400).json({ success: false, error: 'Missing metadata' });
    }

    try {
      const orderResult = await query(
        `SELECT * FROM orders WHERE order_no = $1`,
        [orderNo]
      );

      if (orderResult.rows.length === 0) {
        console.error('[CreemWebhook] Order not found:', orderNo);
        return res.status(200).json({ success: false });
      }

      const order = orderResult.rows[0];

      if (order.status === 'paid') {
        return res.status(200).json({ success: true });
      }

      await query(
        `UPDATE orders SET status = 'paid', payment_method = 'creem', trade_no = $1, paid_at = NOW() WHERE order_no = $2`,
        [event.object?.id || order.trade_no, orderNo]
      );

      await query(
        `UPDATE users SET 
           remaining_credits = remaining_credits + $1,
           total_purchased = total_purchased + $1
         WHERE id = $2`,
        [order.credits, order.user_id]
      );

      if (order.promo_code) {
        await query(
          `UPDATE promo_codes SET is_used = true, used_by_user_id = $1, used_at = NOW() WHERE code = $2`,
          [order.user_id, order.promo_code]
        );
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[CreemWebhook] Error handling checkout.completed:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  return res.status(200).json({ success: true });
};

