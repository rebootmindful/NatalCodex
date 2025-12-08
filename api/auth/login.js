/**
 * User Login API
 * POST /api/auth/login
 */

const db = require('../../lib/db');
const auth = require('../../lib/auth');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        errorZh: '请输入邮箱和密码'
      });
    }

    // Find user
    const result = await db.query(
      'SELECT id, email, password_hash, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        errorZh: '邮箱或密码错误'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is disabled',
        errorZh: '账户已被禁用'
      });
    }

    // Verify password
    const isValidPassword = await auth.comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        errorZh: '邮箱或密码错误'
      });
    }

    // Update last login time
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = auth.generateToken(user);

    console.log('[Auth] User logged in:', user.email);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      messageZh: '登录成功',
      user: {
        id: user.id,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed',
      errorZh: '登录失败，请稍后重试'
    });
  }
};
