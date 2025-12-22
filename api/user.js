/**
 * 用户次数管理 API
 * 
 * GET  /api/user?action=credits              - 获取剩余次数
 * POST /api/user?action=deduct               - 扣减次数（生成报告时）
 * POST /api/user?action=refund               - 退还次数（报告失败时）
 * GET  /api/user?action=check-image          - 检查是否可生成图片
 */

const { query, getClient } = require('../lib/db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET } = require('../lib/auth');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (!corsOk) return res.status(403).end();
    return res.status(200).end();
  }

  const action = req.query.action || req.body?.action;

  // 检查必需的环境变量
  if (!process.env.DATABASE_URL) {
    console.error('[User] FATAL: DATABASE_URL not set');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
      details: process.env.NODE_ENV !== 'production' ? 'DATABASE_URL not set' : undefined
    });
  }

  if (!JWT_SECRET) {
    console.error('[User] FATAL: JWT_SECRET not set');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
      details: process.env.NODE_ENV !== 'production' ? 'JWT_SECRET not set' : undefined
    });
  }

  // 验证 JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  let userId;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.id;  // lib/auth.js uses 'id' not 'userId'
  } catch (e) {
    console.error('[User] JWT verification failed:', e.message);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }

  try {
    switch (action) {
      case 'credits':
        return await handleGetCredits(req, res, userId);
      case 'deduct':
        return await handleDeduct(req, res, userId);
      case 'refund':
        return await handleRefund(req, res, userId);
      case 'check-image':
        return await handleCheckImage(req, res, userId);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          validActions: ['credits', 'deduct', 'refund', 'check-image']
        });
    }
  } catch (error) {
    console.error('[User] Error:', error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

/**
 * 获取用户剩余次数
 */
async function handleGetCredits(req, res, userId) {
  const result = await query(
    `SELECT remaining_credits, total_purchased FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    success: true,
    credits: result.rows[0].remaining_credits,
    totalPurchased: result.rows[0].total_purchased
  });
}

/**
 * 扣减次数（生成报告时调用）
 * Body: { reportType: 'mbti' | 'kuder' }
 * 返回: { reportId } 用于后续图片生成绑定
 */
async function handleDeduct(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reportType } = req.body;
  
  if (!['mbti', 'kuder'].includes(reportType)) {
    return res.status(400).json({ error: 'Invalid reportType', validTypes: ['mbti', 'kuder'] });
  }

  // 检查剩余次数
  const userResult = await query(
    `SELECT remaining_credits FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const credits = userResult.rows[0].remaining_credits;
  
  if (credits < 1) {
    return res.status(403).json({ 
      error: 'Insufficient credits',
      credits: 0,
      needPurchase: true
    });
  }

  // 生成报告ID
  const reportId = uuidv4();

  // 扣减次数并创建使用记录
  const client = await getClient();
  try {
    await client.query('BEGIN');
    // 扣次数
    await client.query(
      `UPDATE users SET remaining_credits = remaining_credits - 1 WHERE id = $1`,
      [userId]
    );

    // 创建使用记录
    await client.query(
      `INSERT INTO usage_logs (user_id, report_id, report_type, report_status, credits_deducted)
       VALUES ($1, $2, $3, 'pending', 1)`,
      [userId, reportId, reportType]
    );

    await client.query('COMMIT');

    console.log('[User/Deduct] Credit deducted:', userId, reportType, reportId);

    return res.json({
      success: true,
      reportId,
      reportType,
      remainingCredits: credits - 1
    });

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 退还次数（报告生成失败时调用）
 * Body: { reportId }
 */
async function handleRefund(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reportId } = req.body;
  
  if (!reportId) {
    return res.status(400).json({ error: 'Missing reportId' });
  }

  // 查找使用记录
  const logResult = await query(
    `SELECT * FROM usage_logs WHERE report_id = $1 AND user_id = $2`,
    [reportId, userId]
  );

  if (logResult.rows.length === 0) {
    return res.status(404).json({ error: 'Usage log not found' });
  }

  const log = logResult.rows[0];

  // 检查是否已退款或已成功
  if (log.credits_refunded) {
    return res.status(400).json({ error: 'Already refunded' });
  }

  if (log.report_status === 'success') {
    return res.status(400).json({ error: 'Cannot refund successful report' });
  }

  // 执行退款
  const client = await getClient();
  try {
    await client.query('BEGIN');
    // 加回次数
    await client.query(
      `UPDATE users SET remaining_credits = remaining_credits + 1 WHERE id = $1`,
      [userId]
    );

    // 更新使用记录
    await client.query(
      `UPDATE usage_logs SET credits_refunded = true, report_status = 'failed', updated_at = NOW() WHERE report_id = $1`,
      [reportId]
    );

    await client.query('COMMIT');

    console.log('[User/Refund] Credit refunded:', userId, reportId);

    // 获取最新次数
    const userResult = await query(
      `SELECT remaining_credits FROM users WHERE id = $1`,
      [userId]
    );

    return res.json({
      success: true,
      reportId,
      remainingCredits: userResult.rows[0].remaining_credits
    });

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 检查是否可以生成图片
 * Query: reportId, reportType
 * 校验: 报告存在、类型匹配、未生成过图片、重试次数未超限
 */
async function handleCheckImage(req, res, userId) {
  const { reportId, reportType } = req.query;
  
  if (!reportId || !reportType) {
    return res.status(400).json({ error: 'Missing reportId or reportType' });
  }

  // 查找使用记录
  const logResult = await query(
    `SELECT * FROM usage_logs WHERE report_id = $1 AND user_id = $2`,
    [reportId, userId]
  );

  if (logResult.rows.length === 0) {
    return res.json({
      allowed: false,
      error: 'No report found. Please generate report first.'
    });
  }

  const log = logResult.rows[0];

  // 校验1：类型匹配
  if (log.report_type !== reportType) {
    return res.json({
      allowed: false,
      error: `Type mismatch. Expected ${log.report_type}, got ${reportType}`
    });
  }

  // 校验2：报告已成功
  if (log.report_status !== 'success') {
    return res.json({
      allowed: false,
      error: 'Report not completed yet'
    });
  }

  // 校验3：图片未生成或可重试
  if (log.image_status === 'success') {
    return res.json({
      allowed: false,
      error: 'Image already generated',
      imageUrl: log.image_url
    });
  }

  // 校验4：重试次数
  const MAX_RETRY = 3;
  if (log.image_retry_count >= MAX_RETRY) {
    return res.json({
      allowed: false,
      error: `Max retry limit (${MAX_RETRY}) reached`
    });
  }

  return res.json({
    allowed: true,
    reportId,
    reportType,
    retryCount: log.image_retry_count,
    maxRetry: MAX_RETRY
  });
}
