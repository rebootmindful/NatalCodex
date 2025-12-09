# 解决 Credits API 500 错误

## 问题描述
访问 https://www.natalcodex.com/generate.html 时，次数显示为 0，控制台报错：

```
Failed to load resource: the server responded with a status of 500 ()
Failed to load credits: SyntaxError: Unexpected token 'A', "A server e"... is not valid JSON
```

## 根本原因

API 返回的是 **HTML 错误页面**而不是 JSON，这通常是因为：

### 1. 环境变量未在 Vercel 中设置

必需的环境变量：
- `JWT_SECRET` - JWT token 签名密钥
- `DATABASE_URL` - PostgreSQL 数据库连接字符串

### 2. 可能的其他原因
- 数据库连接失败
- 函数执行超时
- 依赖包缺失

## 解决步骤

### 步骤 1: 检查 Vercel 环境变量

1. 登录 Vercel Dashboard: https://vercel.com/
2. 进入项目 `natalcodex`
3. 点击 **Settings** → **Environment Variables**
4. 确认以下变量已设置：

#### 必需变量
```bash
# JWT Secret（生产环境必须设置）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 数据库连接（从 Neon 获取）
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/natalcodex?sslmode=require

# APIMart API Key
APIMART_API_KEY=sk-xxxxxxxxxxxxx
```

#### 可选但推荐
```bash
# Google OAuth（如果使用 Google 登录）
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=https://natalcodex.com/api/auth?action=google-callback

# 虎皮椒支付（如果使用支付功能）
XUNHUPAY_APPID=your-appid
XUNHUPAY_APPSECRET=your-secret
XUNHUPAY_NOTIFY_URL=https://natalcodex.com/api/pay?action=notify
XUNHUPAY_RETURN_URL=https://natalcodex.com/pay/result.html

# Node 环境
NODE_ENV=production
```

### 步骤 2: 重新部署

在 Vercel Dashboard 中：
1. 进入 **Deployments** 页面
2. 点击最新部署的 **...** 菜单
3. 选择 **Redeploy**
4. 勾选 **Use existing Build Cache** (可选)
5. 点击 **Redeploy**

或者通过 Git 推送触发部署：
```bash
git commit --allow-empty -m "Redeploy to pick up env vars"
git push
```

### 步骤 3: 验证修复

1. 等待部署完成（约 1-2 分钟）
2. 访问 https://www.natalcodex.com/generate.html
3. 打开浏览器控制台（F12）
4. 查看日志输出：

#### 成功的日志
```
[Credits] Response status: 200 Content-Type: application/json; charset=utf-8
[Credits] API response: { success: true, credits: 1, totalPurchased: 0 }
[Credits] ✅ Loaded successfully: 1
```

#### 仍然失败的日志
```
[Credits] Non-JSON response: ...
[Credits] This usually means environment variables are not set in Vercel
[Credits] Check: JWT_SECRET and DATABASE_URL in Vercel dashboard
```

如果仍然看到 "Non-JSON response"，说明环境变量未生效，需要：
- 确认环境变量拼写正确（区分大小写）
- 确认变量应用于 **Production** 环境
- 再次重新部署

### 步骤 4: 检查数据库连接

如果环境变量已设置但仍然报错，检查数据库：

1. 登录 Neon Console: https://console.neon.tech/
2. 确认数据库在线
3. 确认 `DATABASE_URL` 正确（包含密码）
4. 测试连接：

```bash
# 在本地测试（需要 PostgreSQL 客户端）
psql "postgresql://user:password@ep-xxx.neon.tech/natalcodex?sslmode=require"

# 或者使用 Node.js 脚本
node scripts/check-user-credits.js your_email@example.com
```

## 本次修复的代码改动

### 1. `api/user.js` - 添加环境变量检查
```javascript
// 检查必需的环境变量
if (!process.env.JWT_SECRET) {
  console.error('[User] FATAL: JWT_SECRET not set');
  return res.status(500).json({
    success: false,
    error: 'Server configuration error',
    details: process.env.NODE_ENV !== 'production' ? 'JWT_SECRET not set' : undefined
  });
}

if (!process.env.DATABASE_URL) {
  console.error('[User] FATAL: DATABASE_URL not set');
  return res.status(500).json({
    success: false,
    error: 'Server configuration error',
    details: process.env.NODE_ENV !== 'production' ? 'DATABASE_URL not set' : undefined
  });
}
```

### 2. `generate.html` - 改进错误处理
```javascript
// 检查响应类型
const contentType = response.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  const text = await response.text();
  console.error('[Credits] Non-JSON response:', text.substring(0, 200));
  console.error('[Credits] This usually means environment variables are not set in Vercel');
  return;
}
```

## 如何避免此问题

### 1. 使用 `.env.example` 文件
项目根目录有 [.env.example](.env.example) 文件，列出所有需要的环境变量。

### 2. 启动时检查环境变量
在 `lib/auth.js` 中添加强制检查：
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}
```

### 3. CI/CD 集成
在 GitHub Actions 中添加环境变量检查步骤。

## 相关资源

- [Vercel Environment Variables 文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [Neon PostgreSQL 文档](https://neon.tech/docs/introduction)
- [Code Audit Report](.claude/code-audit-report-v1.5.md) - 查看 C-1 问题

## 联系支持

如果问题仍未解决，请：
1. 检查 Vercel 部署日志
2. 检查 Vercel Function 日志（Runtime Logs）
3. 运行诊断脚本：`node scripts/check-user-credits.js <email>`
