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

// 优惠码验证失败限制
const MAX_PROMO_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

module.exports = async (req, res) => {
  const action = req.query.action || req.body?.action;

  try {
    switch (action) {
      case 'create':
        return await handleCreate(req, res);
      case 'status':
        return await handleStatus(req, res);
      case 'notify':
        return await handleNotify(req, res);
      case 'validate-promo':
        return await handleValidatePromo(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action', validActions: ['create', 'status', 'notify', 'validate-promo'] });
    }
  } catch (error) {
    console.error('[Pay] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
  
  // 创建订单记录
  await query(
    `INSERT INTO orders (order_no, user_id, package_type, credits, original_price, promo_code, discount_percent, discount_amount, final_price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
    [orderNo, userId, packageType, priceInfo.credits, priceInfo.originalPrice, promoCode || null, discountPercent, priceInfo.discountAmount, priceInfo.finalPrice]
  );

  // 创建支付订单 (2024新版: POST请求获取二维码URL)
  try {
    const payment = await xunhupay.createPayment({
      orderNo,
      amount: priceInfo.finalPrice,
      title: `NatalCodex ${priceInfo.packageName}`
    });

    console.log('[Pay/Create] Order created:', orderNo, priceInfo);

    return res.json({
      success: true,
      orderNo,
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
 * 查询订单状态
 * 安全措施:
 * 1. 验证用户身份，只有订单所有者才能查看完整信息
 * 2. 速率限制防止轮询滥用
 */

// 订单状态查询速率限制 (内存存储，生产环境建议用 Redis)
const statusQueryLimits = new Map();
const STATUS_QUERY_LIMIT = 30;      // 每分钟最多 30 次
const STATUS_QUERY_WINDOW = 60000;  // 1 分钟窗口

function checkStatusQueryLimit(orderNo) {
  const now = Date.now();
  const record = statusQueryLimits.get(orderNo) || { count: 0, resetAt: now + STATUS_QUERY_WINDOW };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + STATUS_QUERY_WINDOW;
  } else {
    record.count++;
  }

  statusQueryLimits.set(orderNo, record);

  // 定期清理过期记录 (防止内存泄漏)
  if (statusQueryLimits.size > 1000) {
    for (const [key, val] of statusQueryLimits) {
      if (now > val.resetAt) statusQueryLimits.delete(key);
    }
  }

  return record.count <= STATUS_QUERY_LIMIT;
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
  if (!checkStatusQueryLimit(orderNo)) {
    return res.status(429).json({ error: 'Too many requests, please slow down' });
  }

  // 🔒 验证用户身份
  const authHeader = req.headers.authorization;
  let userId = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[Pay/Notify] Received:', JSON.stringify(req.body));

  // 处理回调
  const result = xunhupay.handleNotify(req.body);
  
  if (!result.success) {
    console.error('[Pay/Notify] Validation failed:', result.error);
    return res.status(400).send('fail');
  }

  const { orderNo, tradeNo, amount, paidAt } = result;

  // 查询订单
  const orderResult = await query(
    `SELECT * FROM orders WHERE order_no = $1`,
    [orderNo]
  );

  if (orderResult.rows.length === 0) {
    console.error('[Pay/Notify] Order not found:', orderNo);
    return res.status(400).send('fail');
  }

  const order = orderResult.rows[0];

  // 检查是否已处理
  if (order.status === 'paid') {
    console.log('[Pay/Notify] Order already paid:', orderNo);
    return res.send('success');
  }

  // 验证金额
  if (Math.abs(parseFloat(order.final_price) - amount) > 0.01) {
    console.error('[Pay/Notify] Amount mismatch:', order.final_price, amount);
    return res.status(400).send('fail');
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

  return res.send('success');
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
