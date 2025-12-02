# ✅ 部署前检查清单

## 立即行动（5分钟内完成）

### 1️⃣ 生成 Callback Token

在本地终端或浏览器Console运行：

```bash
node -e "console.log('nc_webhook_' + Date.now() + '_' + Math.random().toString(36).slice(2))"
```

**输出示例**: `nc_webhook_1733130456_k9Jx2mL8pQ`

📋 **复制这个token，待会要用！**

---

### 2️⃣ 推送代码到GitHub

```bash
# 已经commit完成，现在推送
git push origin main
```

⏳ **等待Vercel自动部署（约30-60秒）**

---

### 3️⃣ 配置Vercel环境变量

访问：https://vercel.com/你的用户名/natalcodex/settings/environment-variables

**必须设置的3个变量**：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `KIE_API_KEY` | `996c9f218f6339fefd23eeb688f4bfbe` | Production |
| `KIE_CALLBACK_URL` | `https://natalcodex.vercel.app/api/kie/callback` | Production |
| `KIE_CALLBACK_TOKEN` | `<步骤1生成的token>` | Production |

**可选但推荐**：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | 如果使用Neon数据库 |
| `KIE_STORE_BACKEND` | `postgres` | 推荐使用数据库存储 |

---

### 4️⃣ 触发重新部署

环境变量保存后，需要重新部署才能生效：

**方法1（推荐）**：在Vercel Dashboard点击 "Redeploy"

**方法2**：通过git推送
```bash
git commit --allow-empty -m "chore: trigger redeploy with env vars"
git push
```

---

### 5️⃣ 验证部署成功

#### A. 检查日志

```bash
# 如果安装了Vercel CLI
vercel logs --follow

# 或在Dashboard查看
# https://vercel.com/你的用户名/natalcodex/logs
```

#### B. 测试生成流程

1. 访问：`https://natalcodex.vercel.app/result.html?test=1`
2. 点击 **"Generate via KIE"** 按钮
3. 等待3-10秒

**期望结果**：
- ✅ 显示 "Task xxx started. Polling..."
- ✅ 10秒内显示 "Generated (callback) share:..."
- ✅ 图片加载显示

**如果失败**：
- ❌ 按F12打开浏览器Console查看错误
- ❌ 检查Vercel日志是否有报错
- ❌ 确认环境变量已正确保存

---

## 🎯 成功标志

全部打勾说明部署成功：

- [ ] Git已推送到main分支
- [ ] Vercel已自动部署完成（绿色勾号）
- [ ] 3个必需环境变量已设置
- [ ] 重新部署已触发
- [ ] 测试页面能生成图片
- [ ] Vercel日志中看到 `[KIE Callback] Received request`

---

## 🔍 故障排查快速指南

### 问题：一直显示"Polling..."，超时后显示"Timeout"

**原因**：Callback未触发或token不匹配

**修复**：
1. 检查 `KIE_CALLBACK_TOKEN` 是否设置
2. 检查 `KIE_CALLBACK_URL` 是否正确（不要有多余的空格）
3. 重新部署
4. 查看Vercel日志，搜索 "KIE Callback"

---

### 问题：显示"Task failed: 500 - Internal server error"

**原因**：KIE API内部错误（可能是prompt太长或格式问题）

**修复**：
1. 查看浏览器Console的完整错误
2. 检查localStorage中的 `nc_kie_last_error`
3. 简化prompt重试

---

### 问题：图片URL是空的

**原因**：resultJson解析失败

**修复**：
1. 查看Vercel日志中的 `[KIE Query] Response`
2. 确认 `resultJson` 字段存在且格式正确
3. 如果是JSON格式问题，已在代码中增强了容错处理

---

## 📞 需要帮助？

如果遇到其他问题：

1. **查看详细日志**：
   ```bash
   vercel logs natalcodex --follow
   ```

2. **检查环境变量**：
   ```bash
   vercel env ls
   ```

3. **验证API可达性**：
   ```bash
   curl -X POST "https://api.kie.ai/api/v1/jobs/queryTask" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer 996c9f218f6339fefd23eeb688f4bfbe" \
     -d '{"taskId": "test123"}'
   ```

4. **参考完整文档**：
   - [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
   - [kieapiusage.md](./kieapiusage.md)

---

**准备好了？开始部署吧！** 🚀
