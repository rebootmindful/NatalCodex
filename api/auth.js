/**
 * Combined Auth API Handler
 * Handles: register, login, me, google, google-callback
 * 
 * Routes:
 * POST /api/auth?action=register
 * POST /api/auth?action=login
 * GET  /api/auth?action=me
 * GET  /api/auth?action=google (redirect to Google)
 * GET  /api/auth?action=google-callback (handle OAuth callback)
 */

const db = require('../lib/db');
const auth = require('../lib/auth');

// Google OAuth config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://www.natalcodex.com/api/auth?action=google-callback';

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
      case 'google':
        return handleGoogleRedirect(req, res);
      case 'google-callback':
        return await handleGoogleCallback(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use: register, login, me, google, or google-callback',
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

  // 获取推广期免费次数
  const freeCredits = await getPromoFreeCredits();

  const result = await db.query(
    `INSERT INTO users (email, password_hash, remaining_credits) 
     VALUES ($1, $2, $3) 
     RETURNING id, email, created_at, remaining_credits`,
    [email.toLowerCase(), passwordHash, freeCredits]
  );

  const user = result.rows[0];
  const token = auth.generateToken(user);

  console.log('[Auth] New user registered:', user.email, 'free credits:', freeCredits);

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

// ========== Google OAuth Redirect ==========
function handleGoogleRedirect(req, res) {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      success: false,
      error: 'Google OAuth not configured',
      errorZh: 'Google登录未配置'
    });
  }

  const scope = encodeURIComponent('openid email profile');
  const redirectUri = encodeURIComponent(GOOGLE_REDIRECT_URI);
  const state = Math.random().toString(36).substring(7);
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  
  res.redirect(302, googleAuthUrl);
}

// ========== Google OAuth Callback ==========
async function handleGoogleCallback(req, res) {
  const { code, error } = req.query;

  // Redirect URL for frontend
  const frontendUrl = 'https://www.natalcodex.com/generate.html';

  if (error) {
    console.error('[Auth] Google OAuth error:', error);
    return res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}?auth_error=no_code`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('[Auth] Token exchange failed:', tokenData);
      return res.redirect(`${frontendUrl}?auth_error=token_exchange_failed`);
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    const googleUser = await userInfoResponse.json();

    if (!googleUser.email) {
      return res.redirect(`${frontendUrl}?auth_error=no_email`);
    }

    console.log('[Auth] Google user:', googleUser.email);

    // Check if user exists by google_id or email
    let result = await db.query(
      'SELECT id, email, google_id, is_active FROM users WHERE google_id = $1 OR email = $2',
      [googleUser.id, googleUser.email.toLowerCase()]
    );

    let user;

    if (result.rows.length > 0) {
      // Existing user - update google_id if needed
      user = result.rows[0];
      
      if (!user.is_active) {
        return res.redirect(`${frontendUrl}?auth_error=account_disabled`);
      }

      // Update user info from Google
      await db.query(
        `UPDATE users SET 
          google_id = $1, 
          name = COALESCE(name, $2), 
          avatar_url = COALESCE(avatar_url, $3),
          last_login_at = NOW()
        WHERE id = $4`,
        [googleUser.id, googleUser.name, googleUser.picture, user.id]
      );
    } else {
      // New user - create account
      const freeCredits = await getPromoFreeCredits();
      const insertResult = await db.query(
        `INSERT INTO users (email, google_id, name, avatar_url, password_hash, remaining_credits) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, email`,
        [googleUser.email.toLowerCase(), googleUser.id, googleUser.name, googleUser.picture, 'GOOGLE_OAUTH', freeCredits]
      );
      user = insertResult.rows[0];
      console.log('[Auth] New Google user created:', user.email, 'free credits:', freeCredits);
    }

    // Generate JWT token
    const token = auth.generateToken(user);

    // Redirect to frontend with token
    res.redirect(`${frontendUrl}?auth_token=${token}&auth_email=${encodeURIComponent(user.email)}`);

  } catch (err) {
    console.error('[Auth] Google callback error:', err);
    return res.redirect(`${frontendUrl}?auth_error=server_error`);
  }
}

// ========== Get Promo Free Credits ==========
async function getPromoFreeCredits() {
  try {
    const result = await db.query(`
      SELECT config_key, config_value FROM system_config 
      WHERE config_key IN ('promo_free_credits', 'promo_start_at', 'promo_end_at')
    `);

    const config = {};
    result.rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    const now = new Date();
    
    // 检查是否在推广期内
    if (config.promo_start_at && config.promo_end_at) {
      const startAt = new Date(config.promo_start_at);
      const endAt = new Date(config.promo_end_at);
      if (now >= startAt && now <= endAt) {
        const credits = parseInt(config.promo_free_credits);
        if (!isNaN(credits) && credits > 0) {
          return credits;
        }
      }
    }
    
    return 1; // 默认1次
  } catch (e) {
    console.error('[Auth] Get promo free credits error:', e);
    return 1;
  }
}
