/**
 * Combined Auth API Handler
 * Handles: register, login, me (get current user)
 * 
 * Routes:
 * POST /api/auth?action=register
 * POST /api/auth?action=login
 * GET  /api/auth?action=me
 */

const db = require('../lib/db');
const auth = require('../lib/auth');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action;

  try {
    switch (action) {
      case 'register':
        return await handleRegister(req, res);
      case 'login':
        return await handleLogin(req, res);
      case 'me':
        return await handleMe(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use: register, login, or me',
          errorZh: '无效操作'
        });
    }
  } catch (error) {
    console.error('[Auth] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorZh: '服务器错误'
    });
  }
};

// ========== Register Handler ==========
async function handleRegister(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
      errorZh: '请输入邮箱和密码'
    });
  }

  if (!auth.isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format',
      errorZh: '邮箱格式不正确'
    });
  }

  if (!auth.isValidPassword(password)) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters',
      errorZh: '密码长度至少6位'
    });
  }

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

  const passwordHash = await auth.hashPassword(password);

  const result = await db.query(
    `INSERT INTO users (email, password_hash) 
     VALUES ($1, $2) 
     RETURNING id, email, created_at`,
    [email.toLowerCase(), passwordHash]
  );

  const user = result.rows[0];
  const token = auth.generateToken(user);

  console.log('[Auth] New user registered:', user.email);

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    messageZh: '注册成功',
    user: { id: user.id, email: user.email },
    token
  });
}

// ========== Login Handler ==========
async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
      errorZh: '请输入邮箱和密码'
    });
  }

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

  if (!user.is_active) {
    return res.status(401).json({
      success: false,
      error: 'Account is disabled',
      errorZh: '账户已被禁用'
    });
  }

  const isValidPassword = await auth.comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password',
      errorZh: '邮箱或密码错误'
    });
  }

  await db.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  const token = auth.generateToken(user);

  console.log('[Auth] User logged in:', user.email);

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    messageZh: '登录成功',
    user: { id: user.id, email: user.email },
    token
  });
}

// ========== Get Current User Handler ==========
async function handleMe(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const token = auth.extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
      errorZh: '请先登录'
    });
  }

  const decoded = auth.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      errorZh: '登录已过期，请重新登录'
    });
  }

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
}
