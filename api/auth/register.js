/**
 * User Registration API
 * POST /api/auth/register
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

    // Validate email format
    if (!auth.isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        errorZh: '邮箱格式不正确'
      });
    }

    // Validate password strength
    if (!auth.isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
        errorZh: '密码长度至少6位'
      });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
        errorZh: '该邮箱已注册'
      });
    }

    // Hash password
    const passwordHash = await auth.hashPassword(password);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash) 
       VALUES ($1, $2) 
       RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    // Generate token
    const token = auth.generateToken(user);

    console.log('[Auth] New user registered:', user.email);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      messageZh: '注册成功',
      user: {
        id: user.id,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('[Auth] Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
      errorZh: '注册失败，请稍后重试'
    });
  }
};
