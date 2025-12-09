/**
 * Health Check API
 * 用于诊断系统配置和数据库连接
 *
 * GET /api/health
 */

module.exports = async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  // 1. 检查环境变量
  checks.checks.envVars = {
    JWT_SECRET: !!process.env.JWT_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
    APIMART_API_KEY: !!process.env.APIMART_API_KEY,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    XUNHUPAY_APPID: !!process.env.XUNHUPAY_APPID
  };

  // 2. 检查数据库连接
  try {
    const { query } = require('../lib/db');
    const result = await query('SELECT NOW() as current_time');
    checks.checks.database = {
      connected: true,
      currentTime: result.rows[0].current_time,
      responseTime: 'OK'
    };
  } catch (dbError) {
    checks.checks.database = {
      connected: false,
      error: dbError.message,
      code: dbError.code
    };
  }

  // 3. 检查 JWT 功能
  try {
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign({ test: true }, process.env.JWT_SECRET || 'test', { expiresIn: '1s' });
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'test');
    checks.checks.jwt = {
      working: !!decoded.test,
      error: null
    };
  } catch (jwtError) {
    checks.checks.jwt = {
      working: false,
      error: jwtError.message
    };
  }

  // 4. 整体健康状态
  const allChecks = Object.values(checks.checks);
  const hasErrors = allChecks.some(check =>
    (check.connected === false) ||
    (check.working === false) ||
    Object.values(check).some(v => v === false)
  );

  checks.status = hasErrors ? 'unhealthy' : 'healthy';

  // 返回结果
  const statusCode = hasErrors ? 503 : 200;
  return res.status(statusCode).json(checks);
};
