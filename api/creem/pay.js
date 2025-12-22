const { query } = require('../../lib/db');
const { JWT_SECRET } = require('../../lib/auth');
const xunhupay = require('../../lib/xunhupay');
const jwt = require('jsonwebtoken');

const CREEM_API_KEY = process.env.CREEM_API_KEY;
const CREEM_SERVER_URL =
  process.env.CREEM_SERVER_URL ||
  (CREEM_API_KEY && CREEM_API_KEY.startsWith('creem_test_')
    ? 'https://test-api.creem.io'
    : 'https://api.creem.io');

const CREEM_PRODUCTS = {
  PACK_6: process.env.CREEM_PRODUCT_PACK_6,
  PACK_20: process.env.CREEM_PRODUCT_PACK_20
};

function applyCors(req, res) {
  const origin = req.headers.origin;
  const raw = process.env.CORS_ALLOWED_ORIGINS || '';
  const allowStar = process.env.NODE_ENV !== 'production' && raw.trim() === '';
  const allowed = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  res.setHeader('Vary', 'Origin');
  if (allowStar) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return true;
  }
  if (!origin) return true;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    return true;
  }
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    return true;
  }
  return false;
}

module.exports = async (req, res) => {
  const corsOk = applyCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (!corsOk) return res.status(403).end();
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!CREEM_API_KEY) {
    return res.status(500).json({ success: false, error: 'Creem is not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.id;
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }

  const { packageType, promoCode } = req.body || {};

  if (!['PACK_6', 'PACK_20'].includes(packageType)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid package type',
      validTypes: ['PACK_6', 'PACK_20']
    });
  }

  let discountPercent = 0;

  if (promoCode) {
    const promoResult = await query(
      `SELECT * FROM promo_codes 
       WHERE code = $1 AND is_used = false AND expires_at > NOW()`,
      [promoCode.toUpperCase()]
    );

    if (promoResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired promo code' });
    }

    discountPercent = promoResult.rows[0].discount_percent;
  }

  const priceInfo = xunhupay.calculatePrice(packageType, discountPercent);
  const orderNo = xunhupay.generateOrderNo();

  await query(
    `INSERT INTO orders (order_no, user_id, package_type, credits, original_price, promo_code, discount_percent, discount_amount, final_price, status, payment_method)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 'creem')`,
    [
      orderNo,
      userId,
      packageType,
      priceInfo.credits,
      priceInfo.originalPrice,
      promoCode || null,
      discountPercent,
      priceInfo.discountAmount,
      priceInfo.finalPrice
    ]
  );

  const productId = CREEM_PRODUCTS[packageType];
  if (!productId) {
    return res.status(500).json({
      success: false,
      error: `Creem product not configured for ${packageType}`
    });
  }

  const userResult = await query(
    'SELECT email FROM users WHERE id = $1',
    [userId]
  );

  const userEmail = userResult.rows[0]?.email || null;

  try {
    const { Creem } = await import('creem');
    const creem = new Creem({
      serverURL: CREEM_SERVER_URL
    });

    const successUrlBase =
      process.env.CREEM_SUCCESS_URL ||
      'https://www.natalcodex.com/pay/result.html';
    const successUrl = `${successUrlBase}${successUrlBase.includes('?') ? '&' : '?'}provider=creem&order=${encodeURIComponent(orderNo)}`;

    const checkoutData = {
      productId,
      customer: userEmail ? { email: userEmail } : undefined,
      successUrl,
      metadata: {
        orderNo,
        userId,
        packageType
      }
    };

    const checkoutResult = await creem.createCheckout({
      xApiKey: CREEM_API_KEY,
      createCheckoutRequest: checkoutData
    });

    if (!checkoutResult || !checkoutResult.checkoutUrl) {
      throw new Error('Failed to create Creem checkout session');
    }

    if (checkoutResult.id) {
      await query(
        `UPDATE orders SET trade_no = $1 WHERE order_no = $2`,
        [checkoutResult.id, orderNo]
      );
    }

    return res.json({
      success: true,
      paymentProvider: 'creem',
      orderNo,
      paymentUrl: checkoutResult.checkoutUrl
    });
  } catch (error) {
    await query(
      `UPDATE orders SET status = 'failed' WHERE order_no = $1`,
      [orderNo]
    );

    const debugInfo = {
      message: error && error.message,
      name: error && error.name,
      status: error && (error.status || (error.response && error.response.status)),
      serverURL: CREEM_SERVER_URL,
      productId,
      apiKeyPrefix: CREEM_API_KEY ? CREEM_API_KEY.slice(0, 10) : null
    };

    console.error('[CreemPay] Error creating checkout', debugInfo);

    return res.status(500).json({
      success: false,
      error: error && error.message ? error.message : 'Creem payment creation failed',
      debug: debugInfo
    });
  }
};
