/**
 * 支付系统统一 API
 * 
 * GET  /api/pay?action=status&order=xxx     - 查询订单状态
 * POST /api/pay?action=create               - 创建支付订单
 * POST /api/pay?action=notify               - 虎皮椒支付回调
 * POST /api/pay?action=validate-promo       - 验证优惠码
 */

const { query } = require('../lib/db');
const xunhupay = require('../lib/xunhupay');
const { JWT_SECRET } = require('../lib/auth');
const { rateLimit } = require('../lib/cache');

// 优惠码验证失败限制
const MAX_PROMO_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

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
  const action = req.query.action || req.body?.action;

  const corsOk = applyCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (!corsOk) return res.status(403).end();
    return res.status(200).end();
  }

  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
      details: process.env.NODE_ENV !== 'production' ? 'JWT_SECRET not set' : undefined
    });
  }

  try {
    switch (action) {
      case 'create':
        return await handleCreate(req, res);
      case 'retry':
        return await handleRetry(req, res);
      case 'status':
        return await handleStatus(req, res);
      case 'notify':
        return await handleNotify(req, res);
      case 'validate-promo':
        return await handleValidatePromo(req, res);
      case 'test-notify':
        // 测试端点，验证回调URL是否可达
        console.log('[Pay/TestNotify] Test callback received');
        return res.json({ success: true, message: 'Notify endpoint is reachable', timestamp: new Date().toISOString() });
      case 'check-config':
        // 检查配置（仅开发环境）
        return res.json({
          notifyUrl: xunhupay.config.notifyUrl,
          appIdSet: !!process.env.XUNHUPAY_APPID,
          appSecretSet: !!process.env.XUNHUPAY_APPSECRET,
          appSecretLength: process.env.XUNHUPAY_APPSECRET?.length || 0
        });
      default:
        return res.status(400).json({ error: 'Invalid action', validActions: ['create', 'retry', 'status', 'notify', 'validate-promo'] });
    }
  } catch (error) {
    console.error('[Pay] Error:', error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (error && error.message) || 'Error'
    });
  }
};

/**
 * 创建支付订单
 */
async function handleCreate(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { packageType, promoCode } = req.body;
  
  // 获取用户信息
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  const jwt = require('jsonwebtoken');
  
  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.id;  // lib/auth.js uses 'id' not 'userId'
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // 验证套餐类型
  if (!['PACK_6', 'PACK_20'].includes(packageType)) {
    return res.status(400).json({ error: 'Invalid package type', validTypes: ['PACK_6', 'PACK_20'] });
  }

  // 计算价格
  let discountPercent = 0;
  
  // 验证优惠码
  if (promoCode) {
    const promoResult = await query(
      `SELECT * FROM promo_codes 
       WHERE code = $1 AND is_used = false AND expires_at > NOW()`,
      [promoCode.toUpperCase()]
    );
    
    if (promoResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired promo code' });
    }
    
    discountPercent = promoResult.rows[0].discount_percent;
  }

  // 计算最终价格
  const priceInfo = xunhupay.calculatePrice(packageType, discountPercent);
  
  // 生成订单号
  const orderNo = xunhupay.generateOrderNo();
  
  const pendingResult = await query(
    `SELECT order_no, created_at FROM orders 
     WHERE user_id = $1 AND package_type = $2 AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`,
    [userId, packageType]
  );
  let useOrderNo = orderNo;
  if (pendingResult.rows.length > 0) {
    const createdAt = new Date(pendingResult.rows[0].created_at);
    const diffMinutes = (Date.now() - createdAt.getTime()) / 60000;
    if (diffMinutes <= 30) {
      useOrderNo = pendingResult.rows[0].order_no;
    }
  }
  if (useOrderNo === orderNo) {
    await query(
      `INSERT INTO orders (order_no, user_id, package_type, credits, original_price, promo_code, discount_percent, discount_amount, final_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [orderNo, userId, packageType, priceInfo.credits, priceInfo.originalPrice, promoCode || null, discountPercent, priceInfo.discountAmount, priceInfo.finalPrice]
    );
  }

  // 创建支付订单 (2024新版: POST请求获取二维码URL)
  try {
    const payment = await xunhupay.createPayment({
      orderNo: useOrderNo,
      amount: priceInfo.finalPrice,
      title: `NatalCodex ${priceInfo.packageName}`
    });

    console.log('[Pay/Create] Order created:', useOrderNo, priceInfo);

    return res.json({
      success: true,
      orderNo: useOrderNo,
      qrCodeUrl: payment.qrCodeUrl,   // PC端二维码URL
      mobileUrl: payment.mobileUrl,    // 移动端跳转URL
      priceInfo
    });
  } catch (paymentError) {
    console.error('[Pay/Create] Payment API error:', paymentError);
    // 更新订单状态为失败
    await query(
      `UPDATE orders SET status = 'failed' WHERE order_no = $1`,
      [orderNo]
    );
    return res.status(500).json({
      success: false,
      error: paymentError.message || '支付接口调用失败'
    });
  }
}

/**
 * 重试支付 - 为 pending/expired 订单重新生成二维码
 * 策略:
 * 1. pending 订单 (30分钟内): 复用原订单，重新调用支付接口
 * 2. expired 订单: 创建新订单，金额/套餐继承原订单
 */
async function handleRetry(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderNo } = req.body;

  if (!orderNo) {
    return res.status(400).json({ error: 'Missing orderNo' });
  }

  const RETRY_LIMIT = 5;
  const RETRY_WINDOW = 60 * 60 * 1000;
  const rlOk = await rateLimit(`order_retry:${orderNo}`, RETRY_LIMIT, RETRY_WINDOW);
  if (!rlOk) {
    return res.status(429).json({ error: 'Too many retries' });
  }

  // 获取用户信息
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const jwt = require('jsonwebtoken');

  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.id;
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // 查询原订单
  const orderResult = await query(
    `SELECT * FROM orders WHERE order_no = $1`,
    [orderNo]
  );

  if (orderResult.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = orderResult.rows[0];

  // 验证订单所有者
  if (order.user_id !== userId) {
    return res.status(403).json({ error: 'Not your order' });
  }

  // 已支付订单不能重试
  if (order.status === 'paid') {
    return res.status(400).json({ error: 'Order already paid' });
  }

  // 检查订单是否在 30 分钟内 (可复用)
  const createdAt = new Date(order.created_at);
  const now = new Date();
  const diffMinutes = (now - createdAt) / (1000 * 60);
  const canReuseOrder = diffMinutes <= 30 && order.status === 'pending';

  try {
    let newOrderNo = orderNo;
    let amount = parseFloat(order.final_price);

    if (!canReuseOrder) {
      // 订单过期或已失败，创建新订单
      newOrderNo = xunhupay.generateOrderNo();

      await query(
        `INSERT INTO orders (order_no, user_id, package_type, credits, original_price, promo_code, discount_percent, discount_amount, final_price, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
        [
          newOrderNo,
          userId,
          order.package_type,
          order.credits,
          order.original_price,
          order.promo_code,
          order.discount_percent,
          order.discount_amount,
          order.final_price
        ]
      );

      console.log('[Pay/Retry] Created new order from expired:', orderNo, '->', newOrderNo);
    } else {
      console.log('[Pay/Retry] Reusing pending order:', orderNo);
    }

    // 重新调用支付接口获取新二维码
    const packageNames = { PACK_6: '6次套餐', PACK_20: '20次套餐' };
    const payment = await xunhupay.createPayment({
      orderNo: newOrderNo,
      amount: amount,
      title: `NatalCodex ${packageNames[order.package_type] || order.package_type}`
    });

    return res.json({
      success: true,
      orderNo: newOrderNo,
      qrCodeUrl: payment.qrCodeUrl,
      mobileUrl: payment.mobileUrl,
      isNewOrder: newOrderNo !== orderNo
    });

  } catch (paymentError) {
    console.error('[Pay/Retry] Payment API error:', paymentError);
    return res.status(500).json({
      success: false,
      error: paymentError.message || '支付接口调用失败，请稍后重试'
    });
  }
}

/**
 * 查询订单状态
 * 安全措施:
 * 1. 验证用户身份，只有订单所有者才能查看完整信息
 * 2. 速率限制防止轮询滥用
 */

const STATUS_QUERY_LIMIT = 30;      // 每分钟最多 30 次
const STATUS_QUERY_WINDOW = 60000;  // 1 分钟窗口

async function checkStatusQueryLimit(orderNo) {
  return rateLimit(`order_status:${orderNo}`, STATUS_QUERY_LIMIT, STATUS_QUERY_WINDOW);
}

async function handleStatus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const orderNo = req.query.order;
  if (!orderNo) {
    return res.status(400).json({ error: 'Missing order number' });
  }

  // 🔒 速率限制检查
  if (!(await checkStatusQueryLimit(orderNo))) {
    return res.status(429).json({ error: 'Too many requests, please slow down' });
  }

  // 🔒 验证用户身份
  const authHeader = req.headers.authorization;
  let userId = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (e) {
      // token 无效，继续但限制返回信息
    }
  }

  const result = await query(
    `SELECT order_no, user_id, package_type, credits, original_price, discount_amount, final_price, status, created_at, paid_at
     FROM orders WHERE order_no = $1`,
    [orderNo]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }

  let order = result.rows[0];

  // 🕐 检查并标记过期订单 (pending 状态超过 30 分钟)
  if (order.status === 'pending') {
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const diffMinutes = (now - createdAt) / (1000 * 60);

    if (diffMinutes > 30) {
      // 标记为过期
      await query(
        `UPDATE orders SET status = 'expired' WHERE order_no = $1 AND status = 'pending'`,
        [orderNo]
      );
      order.status = 'expired';
      console.log('[Pay/Status] Order expired:', orderNo);
    }
  }

  // 🔒 权限检查: 非订单所有者只能查看状态
  if (!userId || userId !== order.user_id) {
    return res.json({
      success: true,
      order: {
        orderNo: order.order_no,
        status: order.status
      }
    });
  }

  // 订单所有者返回完整信息
  return res.json({
    success: true,
    order: {
      orderNo: order.order_no,
      packageType: order.package_type,
      credits: order.credits,
      originalPrice: order.original_price,
      discountAmount: order.discount_amount,
      finalPrice: order.final_price,
      status: order.status,
      createdAt: order.created_at,
      paidAt: order.paid_at
    }
  });
}

/**
 * 虎皮椒支付回调
 */
async function handleNotify(req, res) {
  // 设置响应头，确保返回纯文本
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  // 支持 GET 和 POST (虎皮椒可能用任一方式)
  const body = req.method === 'GET' ? req.query : req.body;

  console.log('[Pay/Notify] ====== CALLBACK RECEIVED ======');
  console.log('[Pay/Notify] Method:', req.method);
  console.log('[Pay/Notify] Body/Query:', JSON.stringify(body));

  // 检查是否有必要参数
  if (!body || !body.trade_order_id) {
    console.error('[Pay/Notify] Missing required params');
    return res.status(200).send('fail');
  }

  // 处理回调
  const result = xunhupay.handleNotify(body);

  if (!result.success) {
    console.error('[Pay/Notify] Validation failed:', result.error);
    console.error('[Pay/Notify] Received hash:', body.hash);
    console.error('[Pay/Notify] Config appSecret length:', xunhupay.config.appSecret?.length);
    // 虎皮椒要求返回 200 状态码
    return res.status(200).send('fail');
  }

  const { orderNo, tradeNo, amount, paidAt } = result;

  // 查询订单
  const orderResult = await query(
    `SELECT * FROM orders WHERE order_no = $1`,
    [orderNo]
  );

  if (orderResult.rows.length === 0) {
    console.error('[Pay/Notify] Order not found:', orderNo);
    return res.status(200).send('fail');
  }

  const order = orderResult.rows[0];

  // 检查是否已处理
  if (order.status === 'paid') {
    console.log('[Pay/Notify] Order already paid:', orderNo);
    return res.status(200).send('success');
  }

  // 验证金额
  if (Math.abs(parseFloat(order.final_price) - amount) > 0.01) {
    console.error('[Pay/Notify] Amount mismatch:', order.final_price, amount);
    return res.status(200).send('fail');
  }

  // 更新订单状态
  await query(
    `UPDATE orders SET status = 'paid', trade_no = $1, paid_at = $2 WHERE order_no = $3`,
    [tradeNo, paidAt, orderNo]
  );

  // 给用户加次数
  await query(
    `UPDATE users SET 
       remaining_credits = remaining_credits + $1,
       total_purchased = total_purchased + $1
     WHERE id = $2`,
    [order.credits, order.user_id]
  );

  // 标记优惠码已使用
  if (order.promo_code) {
    await query(
      `UPDATE promo_codes SET is_used = true, used_by_user_id = $1, used_at = NOW() WHERE code = $2`,
      [order.user_id, order.promo_code]
    );
  }

  console.log('[Pay/Notify] Payment success:', orderNo, 'credits added:', order.credits);

  return res.status(200).send('success');
}

/**
 * 验证优惠码
 */
async function handleValidatePromo(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { promoCode, packageType } = req.body;
  
  if (!promoCode || !packageType) {
    return res.status(400).json({ error: 'Missing promoCode or packageType' });
  }

  // 获取客户端IP
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';

  // 检查是否被锁定
  const recentAttempts = await query(
    `SELECT COUNT(*) as count FROM promo_validation_attempts 
     WHERE ip_address = $1 AND success = false AND created_at > NOW() - INTERVAL '${LOCKOUT_MINUTES} minutes'`,
    [clientIp]
  );

  if (parseInt(recentAttempts.rows[0].count) >= MAX_PROMO_ATTEMPTS) {
    return res.status(429).json({ 
      error: 'Too many failed attempts. Please try again later.',
      lockoutMinutes: LOCKOUT_MINUTES
    });
  }

  // 查询优惠码
  const promoResult = await query(
    `SELECT * FROM promo_codes 
     WHERE code = $1 AND is_used = false AND expires_at > NOW()`,
    [promoCode.toUpperCase()]
  );

  // 记录验证尝试
  const isValid = promoResult.rows.length > 0;
  await query(
    `INSERT INTO promo_validation_attempts (ip_address, attempted_code, success) VALUES ($1, $2, $3)`,
    [clientIp, promoCode.toUpperCase(), isValid]
  );

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid or expired promo code' });
  }

  const promo = promoResult.rows[0];
  
  // 计算折后价格
  const priceInfo = xunhupay.calculatePrice(packageType, promo.discount_percent);

  return res.json({
    success: true,
    promoCode: promo.code,
    discountType: promo.discount_type,
    discountPercent: promo.discount_percent,
    expiresAt: promo.expires_at,
    priceInfo
  });
}
