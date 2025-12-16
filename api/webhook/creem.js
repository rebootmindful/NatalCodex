const { query } = require('../../lib/db');
const crypto = require('crypto');

const CREEM_WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET;

function verifySignature(payload, signature) {
  if (!CREEM_WEBHOOK_SECRET) {
    return false;
  }

  try {
    const computed = crypto
      .createHmac('sha256', CREEM_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    return computed === signature;
  } catch (error) {
    console.error('[CreemWebhook] Signature verification error:', error);
    return false;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, creem-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!CREEM_WEBHOOK_SECRET) {
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

  const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});

  if (!verifySignature(payload, signatureHeader)) {
    console.error('[CreemWebhook] Invalid signature');
    return res.status(400).json({ success: false, error: 'Invalid signature' });
  }

  let event;
  try {
    event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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

