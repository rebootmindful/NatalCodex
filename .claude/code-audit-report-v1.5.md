# NatalCodex v1.5 代码审计报告

**审计日期**: 2025-12-09
**审计版本**: v1.5 (Commit: b3fc354)
**审计人**: Claude Sonnet 4.5

---

## 执行摘要

本次审计针对 NatalCodex v1.5 的**认证、支付、数据库、安全、并发**等关键领域进行全面评估。共发现 **23 个问题**，其中：
- 🔴 **高危 (Critical)**: 3 个
- 🟠 **中危 (High)**: 8 个
- 🟡 **中危 (Medium)**: 7 个
- 🔵 **低危 (Low)**: 5 个

---

## 1. 认证与授权安全

### 🔴 C-1: JWT Secret 使用默认值
**文件**: `lib/auth.js:8`
**问题**:
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'natalcodex-jwt-secret-change-in-production';
```
- 如果 `JWT_SECRET` 环境变量未设置，使用硬编码默认值
- 攻击者可伪造任意用户 token

**影响**: 账户完全接管
**修复**:
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}
```

---

### 🟠 H-1: Google OAuth 回调缺少 CSRF 防护
**文件**: `api/auth.js:273`
**问题**:
```javascript
const state = Math.random().toString(36).substring(7);
// state 生成但未验证
```
- OAuth redirect 时生成 `state` 参数但 callback 中未验证
- 易受 CSRF 攻击，攻击者可绑定自己的 Google 账号到受害者账户

**修复建议**:
1. 在 session/cookie 中存储 state
2. callback 中验证 `req.query.state` 与存储值匹配

---

### 🟠 H-2: 密码强度过弱
**文件**: `lib/auth.js:76`
**问题**:
```javascript
function isValidPassword(password) {
  return password && password.length >= 6;
}
```
- 仅要求 6 位长度，无复杂度要求
- 易受暴力破解

**修复建议**:
```javascript
function isValidPassword(password) {
  // 至少 8 位，包含大小写字母、数字
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
}
```

---

### 🟡 M-1: Token 过期时间过长
**文件**: `lib/auth.js:9`
**问题**:
```javascript
const JWT_EXPIRES_IN = '7d';
```
- 7 天过期时间过长，token 泄露风险期长

**修复建议**:
- 改为 `1d` 或 `2d`
- 实现 refresh token 机制

---

## 2. 支付系统安全

### 🔴 C-2: 支付回调签名验证不完整
**文件**: `lib/xunhupay.js:148-161`
**问题**:
```javascript
function verifySign(params) {
  const receivedHash = params.hash;
  delete params.hash;
  const calculatedHash = generateSign(params);
  return receivedHash === calculatedHash;
}
```
- **缺少时间戳验证**：攻击者可重放旧的支付回调
- **缺少 IP 白名单**：任何人都能调用 `/api/pay?action=notify`

**影响**: 攻击者可伪造支付成功通知
**修复**:
1. 添加时间戳验证（5 分钟窗口）
2. 添加 IP 白名单检查（虎皮椒服务器 IP）
3. 添加订单状态检查（pending → paid 单向）

```javascript
// 在 api/pay.js handleNotify 中添加
const ALLOWED_IPS = ['虎皮椒服务器IP'];
const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
if (!ALLOWED_IPS.includes(clientIp)) {
  return res.status(403).send('FAIL');
}

// 时间戳验证
const timestamp = parseInt(params.time);
const now = Math.floor(Date.now() / 1000);
if (Math.abs(now - timestamp) > 300) { // 5分钟
  return res.status(400).send('FAIL');
}
```

---

### 🟠 H-3: 订单金额可被篡改
**文件**: `api/pay.js:54-69`
**问题**:
```javascript
const { packageType, promoCode } = req.body;
const pkg = xunhupay.PACKAGES[packageType];
// 直接信任前端传入的 packageType
```
- 前端可修改 `packageType` 为不存在的值或篡改价格
- 缺少服务端二次验证优惠码折扣

**修复建议**:
```javascript
// 1. 验证 packageType 合法性
if (!['PACK_6', 'PACK_20'].includes(packageType)) {
  return res.status(400).json({ error: 'Invalid package type' });
}

// 2. 服务端重新计算折扣，不信任前端
const priceInfo = xunhupay.calculatePrice(packageType, promo);
// 对比 req.body 传入的价格（如果有）与计算结果
```

---

### 🟠 H-4: 支付重试无防重放机制
**文件**: `api/pay.js:139-247`
**问题**:
```javascript
async function handleRetry(req, res) {
  const { orderNo } = req.body;
  // 缺少重试次数限制
  // 可无限重试创建新订单
}
```
- 攻击者可对同一订单无限重试
- 可能导致订单表膨胀

**修复建议**:
```javascript
// 在 usage_logs 或 orders 表添加 retry_count 字段
const MAX_RETRY = 5;
if (order.retry_count >= MAX_RETRY) {
  return res.status(400).json({ error: 'Max retry limit reached' });
}

// 更新重试次数
await query(
  `UPDATE orders SET retry_count = retry_count + 1 WHERE order_no = $1`,
  [orderNo]
);
```

---

### 🟡 M-2: 订单状态速率限制存储在内存
**文件**: `api/pay.js:257-282`
**问题**:
```javascript
const statusQueryLimits = new Map();
```
- 多实例部署时速率限制失效
- 进程重启后限制重置
- 内存泄漏风险（虽有清理逻辑）

**修复建议**:
- 使用 Redis 存储速率限制计数
- 使用 Vercel KV 或 Upstash Redis

---

### 🟡 M-3: 优惠码验证失败锁定机制可绕过
**文件**: `api/pay.js` (优惠码验证)
**问题**:
- 文档提到"优惠码验证：失败5次锁定IP 10分钟"
- 但代码中**未发现此逻辑实现**
- IP 可伪造（`X-Forwarded-For` 头）

**修复建议**:
1. 实现速率限制
2. 使用 `req.headers['x-real-ip']` 或 `req.connection.remoteAddress`
3. 考虑按用户 ID + IP 双重限制

---

## 3. 数据库安全

### 🟢 PASS: SQL 注入防护良好
**评估**: ✅
- 所有查询使用参数化（`$1`, `$2`）
- 未发现字符串拼接 SQL

---

### 🟠 H-5: 数据库连接池配置不安全
**文件**: `lib/db.js:14`
**问题**:
```javascript
ssl: {
  rejectUnauthorized: false
}
```
- 禁用 SSL 证书验证，易受中间人攻击
- 虽然 Neon 使用安全连接，但此配置降低安全性

**修复**:
```javascript
ssl: {
  rejectUnauthorized: true, // 启用证书验证
  ca: process.env.DB_SSL_CA // 如果需要自定义 CA
}
```

---

### 🟡 M-4: 缺少数据库连接池错误处理
**文件**: `lib/db.js:25`
**问题**:
```javascript
async function query(text, params) {
  const pool = getPool();
  const res = await pool.query(text, params);
  return res;
}
```
- 数据库连接失败时无 retry 机制
- 错误未分类处理（连接错误 vs 查询错误）

**修复建议**:
```javascript
async function query(text, params, retries = 3) {
  const pool = getPool();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' && retries > 0) {
      console.warn('[DB] Connection failed, retrying...', retries);
      await new Promise(r => setTimeout(r, 1000));
      return query(text, params, retries - 1);
    }
    throw error;
  }
}
```

---

### 🟡 M-5: 敏感日志泄漏
**文件**: `lib/db.js:30`
**问题**:
```javascript
console.log('[DB] Query executed in', duration, 'ms');
```
- 生产环境可能泄漏 SQL 查询内容到日志
- 如果日志被攻击者访问，可获取数据库结构

**修复建议**:
```javascript
if (process.env.NODE_ENV !== 'production') {
  console.log('[DB] Query executed in', duration, 'ms');
}
```

---

## 4. 并发与竞态条件

### 🔴 C-3: 次数扣减存在竞态条件
**文件**: `api/user.js:112-142`
**问题**:
```javascript
// 查询次数
const credits = userResult.rows[0].remaining_credits;
if (credits < 1) {
  return res.status(403).json({ error: 'Insufficient credits' });
}

// 扣减次数
await query('BEGIN');
await query(`UPDATE users SET remaining_credits = remaining_credits - 1 WHERE id = $1`, [userId]);
await query('COMMIT');
```
- **Check-Then-Act** 反模式
- 高并发下两个请求可能同时通过检查，导致**负次数**

**影响**: 用户可免费使用服务
**修复**:
```javascript
// 使用 PostgreSQL 原子操作 + 约束检查
await query('BEGIN');
const result = await query(
  `UPDATE users
   SET remaining_credits = remaining_credits - 1
   WHERE id = $1 AND remaining_credits >= 1
   RETURNING remaining_credits`,
  [userId]
);

if (result.rows.length === 0) {
  await query('ROLLBACK');
  return res.status(403).json({ error: 'Insufficient credits' });
}

// 创建使用记录...
await query('COMMIT');
```

同时在数据库层添加约束：
```sql
ALTER TABLE users ADD CONSTRAINT remaining_credits_non_negative CHECK (remaining_credits >= 0);
```

---

### 🟠 H-6: 订单创建存在重复下单风险
**文件**: `api/pay.js:54-131`
**问题**:
- 用户快速点击"支付"按钮可能创建多个相同订单
- 缺少**幂等性保证**

**修复建议**:
```javascript
// 方案1: 添加唯一索引（推荐）
// 在数据库 orders 表添加
CREATE UNIQUE INDEX idx_orders_unique_pending
ON orders (user_id, package_type, status)
WHERE status = 'pending';

// 方案2: 前端防抖（不可靠但有帮助）
let isSubmitting = false;
document.getElementById('purchaseBtn').addEventListener('click', async () => {
  if (isSubmitting) return;
  isSubmitting = true;
  try {
    // 支付逻辑
  } finally {
    isSubmitting = false;
  }
});
```

---

## 5. 前端安全

### 🟠 H-7: XSS 风险 - 用户输入未转义
**文件**: `generate.html` (多处)
**问题**:
```javascript
document.getElementById('orderNo').textContent = orderNo;  // ✅ 安全
document.getElementById('qrcodeAmount').textContent = `¥${amount}`;  // ⚠️ 如果 amount 来自用户输入
```
- 大部分使用 `textContent` 正确
- 但有些地方使用 `innerHTML`（报告显示部分）

**审计发现**:
```javascript
// 可能存在风险的位置（需确认数据来源）
reportContainer.innerHTML = reportData.html;  // 如果 API 返回恶意 HTML
```

**修复建议**:
1. 使用 DOMPurify 清理 HTML
```javascript
const clean = DOMPurify.sanitize(reportData.html);
reportContainer.innerHTML = clean;
```

2. 设置 CSP (Content Security Policy) 头
```javascript
// 在 Vercel 配置 vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        }
      ]
    }
  ]
}
```

---

### 🟡 M-6: CSRF 防护缺失
**问题**:
- POST 请求（如 `/api/pay?action=create`）无 CSRF token
- 虽然使用 JWT 验证，但如果 token 存储在 localStorage，仍可能被跨站请求伪造

**修复建议**:
1. 将 token 存储在 HttpOnly Cookie（需重构）
2. 或添加自定义 CSRF token 到请求头

---

### 🔵 L-1: 敏感信息暴露在前端
**文件**: `generate.html:2707`
**问题**:
```javascript
function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
```
- 虽不直接是安全问题，但前端逻辑可被绕过
- 攻击者可修改 User-Agent 绕过移动端/PC 端检测

**修复建议**:
- 服务端也应验证设备类型（通过 User-Agent）
- 关键逻辑不应依赖前端判断

---

## 6. 错误处理与日志

### 🟡 M-7: 错误信息过于详细
**文件**: `api/*.js` (多处)
**问题**:
```javascript
return res.status(500).json({ success: false, error: error.message });
```
- 生产环境泄漏内部错误信息
- 可能暴露数据库结构、文件路径

**修复建议**:
```javascript
console.error('[API] Internal error:', error);
return res.status(500).json({
  success: false,
  error: process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message
});
```

---

### 🔵 L-2: 缺少请求 ID 追踪
**问题**:
- 日志无法关联同一请求的多个操作
- 难以排查问题

**修复建议**:
```javascript
// 在每个 API 入口添加
const requestId = crypto.randomUUID();
console.log(`[${requestId}] Request received:`, req.method, req.url);

// 在后续日志中使用
console.log(`[${requestId}] User deduct:`, userId);
```

---

### 🔵 L-3: 缺少监控告警
**问题**:
- 无支付失败监控
- 无异常登录检测（如短时间多次失败）

**修复建议**:
- 集成 Sentry 或 LogRocket
- 添加关键指标监控（支付成功率、API 错误率）

---

## 7. 业务逻辑问题

### 🟠 H-8: 图片生成重试逻辑可被滥用
**文件**: `api/user.js:272-278`
**问题**:
```javascript
const MAX_RETRY = 3;
if (log.image_retry_count >= MAX_RETRY) {
  return res.json({ allowed: false, error: 'Max retry limit reached' });
}
```
- 图片生成失败 3 次后无法再尝试
- 但**未扣除额外次数**，用户可能一直失败

**修复建议**:
1. 第 3 次重试失败后提示用户联系客服
2. 或提供"使用新次数重新生成"选项

---

### 🔵 L-4: 订单过期时间不一致
**问题**:
- 代码中订单 30 分钟过期
- 但 QR 码倒计时只有 5 分钟
- 用户体验混乱

**修复建议**:
- 统一为 5 分钟或明确告知用户两个时间的含义

---

### 🔵 L-5: 缺少订单清理任务
**问题**:
- pending/expired 订单永久保留
- 可能导致数据库膨胀

**修复建议**:
```javascript
// 添加定时任务（Vercel Cron Jobs）
// api/cron/cleanup-orders.js
module.exports = async (req, res) => {
  // 删除 30 天前的 expired 订单
  await query(`
    DELETE FROM orders
    WHERE status = 'expired'
    AND created_at < NOW() - INTERVAL '30 days'
  `);
  res.json({ success: true });
};
```

---

## 8. 性能问题

### 🟡 M-8: 缺少数据库索引
**问题**:
- 订单查询按 `user_id` + `status` 可能较慢
- 优惠码查询按 `code` 无索引

**修复建议**:
```sql
-- 订单表索引
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_order_no ON orders(order_no);

-- 优惠码表索引
CREATE UNIQUE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_status ON promo_codes(is_used, expires_at);

-- 使用记录表索引
CREATE INDEX idx_usage_logs_user_report ON usage_logs(user_id, report_id);
CREATE INDEX idx_usage_logs_report ON usage_logs(report_id);
```

---

## 9. 推荐优化项（非安全问题）

### 1. 环境变量管理
- 使用 `.env.example` 文件记录所需环境变量
- 添加启动时环境变量检查

### 2. API 版本控制
- 当前 API 无版本号
- 未来升级时考虑 `/api/v1/pay`

### 3. 用户反馈机制
- 添加报告生成失败时的用户反馈渠道
- 记录用户遇到的错误供分析

### 4. 测试覆盖
- 添加单元测试（支付逻辑、次数扣减）
- 添加集成测试（完整购买流程）

### 5. 文档完善
- API 文档自动生成（Swagger/OpenAPI）
- 添加部署文档

---

## 10. 修复优先级建议

### 🚨 立即修复（本周内）
1. **C-1**: JWT Secret 默认值
2. **C-2**: 支付回调签名验证
3. **C-3**: 次数扣减竞态条件

### ⚡ 高优先级（2 周内）
1. **H-1**: Google OAuth CSRF
2. **H-2**: 密码强度
3. **H-3**: 订单金额验证
4. **H-5**: SSL 证书验证
5. **H-6**: 订单重复下单
6. **H-7**: XSS 防护

### 📅 中优先级（1 个月内）
1. **M-1** 至 **M-8**: 所有中危问题

### 🔄 长期优化
1. **L-1** 至 **L-5**: 所有低危问题
2. 推荐优化项

---

## 11. 总结

NatalCodex v1.5 的核心功能架构合理，但存在以下关键风险：

### ✅ 做得好的地方
1. SQL 注入防护完善（全部参数化查询）
2. JWT 认证体系基本完善
3. 支付系统基本流程正确
4. 数据库事务使用得当

### ❌ 需要改进的地方
1. **并发安全**：次数扣减存在竞态条件（最高风险）
2. **支付安全**：回调验证不完整，可伪造支付成功
3. **认证安全**：JWT Secret 可能使用默认值
4. **前端安全**：缺少 CSP、CSRF 防护

### 📊 风险等级分布
```
Critical (3)  ████████████ 13%
High (8)      ████████████████████████████████ 35%
Medium (7)    ████████████████████████ 30%
Low (5)       ████████████████ 22%
```

**建议**: 优先修复 3 个 Critical 问题和 8 个 High 问题，预计需要 **3-5 个工作日**完成核心安全加固。
