/**
 * Get Current User API
 * GET /api/auth/me
 * Validates token and returns user info
 */

const db = require('../../lib/db');
const auth = require('../../lib/auth');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Extract token
    const token = auth.extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        errorZh: '请先登录'
      });
    }

    // Verify token
    const decoded = auth.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        errorZh: '登录已过期，请重新登录'
      });
    }

    // Get user from database
    const result = await db.query(
      'SELECT id, email, name, avatar_url, created_at, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        errorZh: '用户不存在'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is disabled',
        errorZh: '账户已被禁用'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('[Auth] Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user info',
      errorZh: '获取用户信息失败'
    });
  }
};
