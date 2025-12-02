# 🚀 Vercel 部署指南

## 一、必须配置的环境变量

登录 [Vercel Dashboard](https://vercel.com) → 进入项目 `natalcodex` → Settings → Environment Variables

### 1️⃣ KIE API 配置（图片生成）

```bash
# API Key（已提供）
KIE_API_KEY=996c9f218f6339fefd23eeb688f4bfbe

# Callback URL（根据你的域名修改）
KIE_CALLBACK_URL=https://natalcodex.vercel.app/api/kie/callback

# Callback Token（生成一个随机安全token）
KIE_CALLBACK_TOKEN=nc_webhook_1733130000_k9Jx2mL8pQ
```

**如何生成安全的 CALLBACK_TOKEN**：
```bash
# 方法1：在本地终端运行
node -e "console.log('nc_webhook_' + Date.now() + '_' + Math.random().toString(36).slice(2))"

# 方法2：在浏览器Console运行
console.log('nc_webhook_' + Date.now() + '_' + Math.random().toString(36).slice(2))
```

**复制生成的token并设置到环境变量中！**

---

### 2️⃣ 数据库配置（Neon Postgres）

如果你使用了Neon数据库：

```bash
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.neon.tech/natalcodex?sslmode=require
DB_POOL_MAX=10
KIE_STORE_BACKEND=postgres
KIE_STORE_DUAL_WRITE=true
```

**获取 DATABASE_URL**：
1. 登录 [Neon Console](https://console.neon.tech/)
2. 选择你的项目
3. 点击 "Connection String"
4. 复制完整的连接字符串

---

### 3️⃣ 应用配置

```bash
NEXT_PUBLIC_BASE_URL=https://natalcodex.vercel.app
NEXT_PUBLIC_APP_ENV=production
```

---

## 二、环境变量配置步骤

### 方法1：通过Vercel Dashboard（推荐）

1. 进入项目设置：https://vercel.com/your-username/natalcodex/settings/environment-variables
2. 点击 "Add New"
3. 输入变量名和值
4. 选择环境：Production（生产环境）
5. 点击 "Save"
6. 重复以上步骤添加所有变量

### 方法2：通过Vercel CLI

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录
vercel login

# 添加环境变量
vercel env add KIE_API_KEY production
# 粘贴值：996c9f218f6339fefd23eeb688f4bfbe

vercel env add KIE_CALLBACK_URL production
# 粘贴值：https://natalcodex.vercel.app/api/kie/callback

vercel env add KIE_CALLBACK_TOKEN production
# 粘贴值：<你生成的token>
```

---

## 三、验证配置是否生效

### 1. 触发重新部署

配置环境变量后，需要重新部署才能生效：

```bash
# 方法1：通过git推送
git add .
git commit -m "fix: Update KIE API integration"
git push origin main

# 方法2：通过Vercel CLI
vercel --prod
```

### 2. 检查日志

部署完成后，查看实时日志：

```bash
# 通过CLI
vercel logs --follow

# 或在Dashboard中查看
# https://vercel.com/your-username/natalcodex/logs
```

**期望看到的日志**：
```
[KIE Query] Querying taskId: xxx
[KIE Query] Response: { httpStatus: 200, code: 200, state: 'success' }
[KIE Callback] Received request: { method: 'POST', ... }
[KIE Callback] Token validation: { match: true }
[KIE Callback] Successfully extracted resultUrl: https://cdn.kie.ai/...
```

---

## 四、故障排查

### 问题1：看不到图片，一直显示"polling..."

**可能原因**：
- ❌ `KIE_CALLBACK_TOKEN` 未设置或不匹配
- ❌ `KIE_CALLBACK_URL` 地址错误

**检查方法**：
1. 查看Vercel日志是否有 `[KIE Callback] Received request`
2. 如果没有，说明KIE API没有调用你的callback URL
3. 检查环境变量是否正确保存

**修复方法**：
```bash
# 重新设置环境变量
vercel env add KIE_CALLBACK_URL production
# 输入：https://natalcodex.vercel.app/api/kie/callback

vercel env add KIE_CALLBACK_TOKEN production
# 输入：<你生成的token>

# 重新部署
git commit --allow-empty -m "redeploy"
git push
```

---

### 问题2：Callback返回401 Unauthorized

**原因**：Token验证失败

**检查**：
```bash
# 查看日志
vercel logs --follow

# 应该看到
[KIE Callback] Token validation: { hasToken: true, hasExpected: true, ... }

# 如果显示 hasExpected: false
# 说明环境变量未正确设置
```

**修复**：
1. 重新设置 `KIE_CALLBACK_TOKEN`
2. 确保在 **Production** 环境设置
3. 重新部署

---

### 问题3：queryTask返回404

**原因**：已修复！之前使用了错误的GET方法

**当前版本使用正确的POST方法**，应该不会再出现此问题。

---

## 五、测试完整流程

### 1. 访问测试页面

```
https://natalcodex.vercel.app/result.html?test=1
```

### 2. 点击"Generate via KIE"按钮

### 3. 观察状态提示

正常流程应该显示：
```
Creating task...
Task xxx started. Polling...
Generated (callback) share:/api/kie/storeResult?shortId=xxx
```

### 4. 查看浏览器Console

按F12打开开发者工具，查看Network标签：

**期望看到的请求**：
- ✅ POST `/api/kie/createTask` → 200 OK
- ✅ GET `/api/kie/queryTask?taskId=xxx` → 200 OK
- ✅ GET `/api/kie/storeResult?taskId=xxx` → 200 OK

---

## 六、快速检查清单

部署前确认：

- [ ] `KIE_API_KEY` 已设置（996c9f218f6339fefd23eeb688f4bfbe）
- [ ] `KIE_CALLBACK_URL` 已设置（https://your-domain.vercel.app/api/kie/callback）
- [ ] `KIE_CALLBACK_TOKEN` 已设置（随机生成的安全token）
- [ ] 所有环境变量在 **Production** 环境已保存
- [ ] 已触发重新部署
- [ ] 查看日志确认无错误

---

## 七、成功标志

当一切正常时，你应该看到：

1. ✅ 用户点击"Generate via KIE"
2. ✅ 3-10秒后图片加载完成
3. ✅ 图片显示在页面上
4. ✅ 日志中有完整的callback记录

**恭喜！你的NatalCodex已经正常运行了！** 🎉

---

## 需要帮助？

如果遇到问题：
1. 检查Vercel日志：`vercel logs --follow`
2. 检查浏览器Console的错误信息
3. 确认环境变量已正确设置
4. 尝试重新部署

更多问题，请参考：
- [Vercel环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [KIE API文档](./kieapiusage.md)
