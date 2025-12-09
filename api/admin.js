/**
 * 管理后台 API
 * 仅限管理员 (rebootmindful@gmail.com)
 * 
 * GET  /api/admin?action=users              - 用户列表
 * GET  /api/admin?action=user&id=xxx        - 用户详情+使用记录
 * PUT  /api/admin?action=update-credits     - 修改用户次数
 * POST /api/admin?action=generate-promo     - 批量生成优惠码
 * GET  /api/admin?action=promo-list         - 优惠码列表
 * DELETE /api/admin?action=delete-promo     - 作废优惠码
 * GET  /api/admin?action=stats              - 统计数据
 * GET  /api/admin?action=promo-config       - 获取推广期配置
 * PUT  /api/admin?action=update-promo-config - 更新推广期配置
 */

const { query } = require('../lib/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ADMIN_EMAIL = 'rebootmindful@gmail.com';

module.exports = async (req, res) => {
  // 验证管理员权限
  const authResult = await verifyAdmin(req);
  if (!authResult.success) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const action = req.query.action || req.body?.action;

  try {
    switch (action) {
      case 'users':
        return await handleUsersList(req, res);
      case 'user':
        return await handleUserDetail(req, res);
      case 'update-credits':
        return await handleUpdateCredits(req, res);
      case 'orders':
        return await handleOrdersList(req, res);
      case 'generate-promo':
        return await handleGeneratePromo(req, res);
      case 'promo-list':
        return await handlePromoList(req, res);
      case 'delete-promo':
        return await handleDeletePromo(req, res);
      case 'stats':
        return await handleStats(req, res);
      case 'promo-config':
        return await handlePromoConfig(req, res);
      case 'update-promo-config':
        return await handleUpdatePromoConfig(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          validActions: ['users', 'user', 'update-credits', 'orders', 'generate-promo', 'promo-list', 'delete-promo', 'stats', 'promo-config', 'update-promo-config']
        });
    }
  } catch (error) {
    console.error('[Admin] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 验证管理员权限
 */
async function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, status: 401, error: 'Unauthorized' };
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 查询用户是否为管理员 (token 使用 'id' 而非 'userId')
    const result = await query(
      `SELECT email, is_admin FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return { success: false, status: 401, error: 'User not found' };
    }

    const user = result.rows[0];

    // 检查是否为指定管理员或has is_admin flag
    if (user.email !== ADMIN_EMAIL && !user.is_admin) {
      return { success: false, status: 403, error: 'Admin access required' };
    }

    return { success: true, userId: decoded.id, email: user.email };

  } catch (e) {
    return { success: false, status: 401, error: 'Invalid token' };
  }
}

/**
 * 用户列表
 */
async function handleUsersList(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [limit, offset];
  
  if (search) {
    whereClause = 'WHERE email ILIKE $3';
    params.push(`%${search}%`);
  }

  const countResult = await query(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    search ? [`%${search}%`] : []
  );

  const usersResult = await query(
    `SELECT id, email, name, remaining_credits, total_purchased, is_admin, created_at
     FROM users ${whereClause}
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );

  return res.json({
    success: true,
    users: usersResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].total),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    }
  });
}

/**
 * 用户详情+使用记录
 */
async function handleUserDetail(req, res) {
  const userId = req.query.id;
  if (!userId) {
    return res.status(400).json({ error: 'Missing user id' });
  }

  const userResult = await query(
    `SELECT id, email, name, remaining_credits, total_purchased, is_admin, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  // 获取使用记录
  const usageResult = await query(
    `SELECT * FROM usage_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );

  // 获取订单记录
  const ordersResult = await query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );

  return res.json({
    success: true,
    user: userResult.rows[0],
    usageLogs: usageResult.rows,
    orders: ordersResult.rows
  });
}

/**
 * 订单列表
 */
async function handleOrdersList(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status || '';
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND o.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND o.order_no ILIKE $${paramIndex}`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Count query
  const countResult = await query(
    `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`,
    params
  );

  // Data query with user email join
  const ordersResult = await query(
    `SELECT o.*, u.email as user_email
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     WHERE ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return res.json({
    success: true,
    orders: ordersResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].total),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    }
  });
}

/**
 * 修改用户次数
 */
async function handleUpdateCredits(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, credits, action: creditAction } = req.body;
  
  if (!userId || credits === undefined) {
    return res.status(400).json({ error: 'Missing userId or credits' });
  }

  const creditsNum = parseInt(credits);
  if (isNaN(creditsNum) || creditsNum < 0) {
    return res.status(400).json({ error: 'Invalid credits value' });
  }

  let updateQuery;
  if (creditAction === 'set') {
    // 直接设置
    updateQuery = `UPDATE users SET remaining_credits = $1 WHERE id = $2 RETURNING remaining_credits`;
  } else if (creditAction === 'add') {
    // 增加
    updateQuery = `UPDATE users SET remaining_credits = remaining_credits + $1 WHERE id = $2 RETURNING remaining_credits`;
  } else {
    // 默认直接设置
    updateQuery = `UPDATE users SET remaining_credits = $1 WHERE id = $2 RETURNING remaining_credits`;
  }

  const result = await query(updateQuery, [creditsNum, userId]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  console.log('[Admin] Credits updated:', userId, creditAction || 'set', creditsNum);

  return res.json({
    success: true,
    userId,
    newCredits: result.rows[0].remaining_credits
  });
}

/**
 * 批量生成优惠码
 */
async function handleGeneratePromo(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { discountType, count, expiresInDays } = req.body;

  if (!['HALF', 'TWENTY'].includes(discountType)) {
    return res.status(400).json({ error: 'Invalid discountType. Use HALF or TWENTY' });
  }

  const codeCount = Math.min(parseInt(count) || 1, 100); // 最多100个
  const days = parseInt(expiresInDays) || 30;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const discountPercent = discountType === 'HALF' ? 50 : 20;
  const prefix = discountType === 'HALF' ? 'H' : 'E';

  const generatedCodes = [];

  for (let i = 0; i < codeCount; i++) {
    const code = generatePromoCode(prefix);
    
    try {
      await query(
        `INSERT INTO promo_codes (code, discount_type, discount_percent, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [code, discountType, discountPercent, expiresAt, ADMIN_EMAIL]
      );
      generatedCodes.push(code);
    } catch (e) {
      // 如果重复，重试
      if (e.code === '23505') {
        i--;
        continue;
      }
      throw e;
    }
  }

  console.log('[Admin] Promo codes generated:', generatedCodes.length, discountType);

  return res.json({
    success: true,
    codes: generatedCodes,
    discountType,
    discountPercent,
    expiresAt
  });
}

/**
 * 生成优惠码
 * 格式: [前缀] + [5位随机字符]
 */
function generatePromoCode(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除容易混淆的 I O 0 1
  let code = prefix;
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
}

/**
 * 优惠码列表
 */
async function handlePromoList(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const status = req.query.status; // 'active', 'used', 'expired'
  const offset = (page - 1) * limit;

  let whereClause = '';
  if (status === 'active') {
    whereClause = 'WHERE is_used = false AND expires_at > NOW()';
  } else if (status === 'used') {
    whereClause = 'WHERE is_used = true';
  } else if (status === 'expired') {
    whereClause = 'WHERE is_used = false AND expires_at <= NOW()';
  }

  const countResult = await query(
    `SELECT COUNT(*) as total FROM promo_codes ${whereClause}`
  );

  const promoResult = await query(
    `SELECT pc.*, u.email as used_by_email
     FROM promo_codes pc
     LEFT JOIN users u ON pc.used_by_user_id = u.id
     ${whereClause}
     ORDER BY pc.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return res.json({
    success: true,
    promoCodes: promoResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].total),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    }
  });
}

/**
 * 作废优惠码
 */
async function handleDeletePromo(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const promoId = req.query.id || req.body?.id;
  if (!promoId) {
    return res.status(400).json({ error: 'Missing promo id' });
  }

  const result = await query(
    `DELETE FROM promo_codes WHERE id = $1 AND is_used = false RETURNING code`,
    [promoId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Promo code not found or already used' });
  }

  console.log('[Admin] Promo code deleted:', result.rows[0].code);

  return res.json({
    success: true,
    deletedCode: result.rows[0].code
  });
}

/**
 * 统计数据
 */
async function handleStats(req, res) {
  // 用户统计
  const usersStats = await query(`
    SELECT 
      COUNT(*) as total_users,
      SUM(remaining_credits) as total_remaining_credits,
      SUM(total_purchased) as total_purchased_credits
    FROM users
  `);

  // 订单统计
  const ordersStats = await query(`
    SELECT 
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_orders,
      SUM(CASE WHEN status = 'paid' THEN final_price ELSE 0 END) as total_revenue
    FROM orders
  `);

  // 使用统计
  const usageStats = await query(`
    SELECT 
      COUNT(*) as total_usage,
      COUNT(CASE WHEN report_type = 'mbti' THEN 1 END) as mbti_count,
      COUNT(CASE WHEN report_type = 'kuder' THEN 1 END) as kuder_count
    FROM usage_logs
    WHERE report_status = 'success'
  `);

  // 优惠码统计
  const promoStats = await query(`
    SELECT 
      COUNT(*) as total_codes,
      COUNT(CASE WHEN is_used THEN 1 END) as used_codes,
      COUNT(CASE WHEN NOT is_used AND expires_at > NOW() THEN 1 END) as active_codes
    FROM promo_codes
  `);

  return res.json({
    success: true,
    stats: {
      users: usersStats.rows[0],
      orders: ordersStats.rows[0],
      usage: usageStats.rows[0],
      promoCodes: promoStats.rows[0]
    }
  });
}

/**
 * 获取推广期配置
 */
async function handlePromoConfig(req, res) {
  const result = await query(`
    SELECT config_key, config_value FROM system_config 
    WHERE config_key IN ('promo_free_credits', 'promo_start_at', 'promo_end_at')
  `);

  const config = {};
  result.rows.forEach(row => {
    config[row.config_key] = row.config_value;
  });

  // 判断是否在推广期内
  const now = new Date();
  let isActive = false;
  if (config.promo_start_at && config.promo_end_at) {
    const startAt = new Date(config.promo_start_at);
    const endAt = new Date(config.promo_end_at);
    isActive = now >= startAt && now <= endAt;
  }

  return res.json({
    success: true,
    config: {
      freeCredits: parseInt(config.promo_free_credits) || 1,
      startAt: config.promo_start_at || null,
      endAt: config.promo_end_at || null,
      isActive
    }
  });
}

/**
 * 更新推广期配置
 */
async function handleUpdatePromoConfig(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { freeCredits, startAt, endAt } = req.body;

  // 验证免费次数
  const credits = parseInt(freeCredits);
  if (isNaN(credits) || credits < 1 || credits > 100) {
    return res.status(400).json({ error: 'freeCredits must be between 1 and 100' });
  }

  // 验证时间
  if (startAt && endAt) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (end <= start) {
      return res.status(400).json({ error: 'endAt must be after startAt' });
    }
  }

  // 更新配置
  await query(
    `UPDATE system_config SET config_value = $1, updated_at = NOW(), updated_by = $2 WHERE config_key = 'promo_free_credits'`,
    [credits.toString(), ADMIN_EMAIL]
  );

  await query(
    `UPDATE system_config SET config_value = $1, updated_at = NOW(), updated_by = $2 WHERE config_key = 'promo_start_at'`,
    [startAt || null, ADMIN_EMAIL]
  );

  await query(
    `UPDATE system_config SET config_value = $1, updated_at = NOW(), updated_by = $2 WHERE config_key = 'promo_end_at'`,
    [endAt || null, ADMIN_EMAIL]
  );

  console.log('[Admin] Promo config updated:', { freeCredits: credits, startAt, endAt });

  return res.json({
    success: true,
    config: {
      freeCredits: credits,
      startAt: startAt || null,
      endAt: endAt || null
    }
  });
}
