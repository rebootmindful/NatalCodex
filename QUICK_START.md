# ⚡ 快速开始 - 5分钟部署指南

## 🎯 目标

让用户在 natalcodex.vercel.app 上输入信息后，能看到：
- ✅ AI生成的2000字报告
- ✅ 精美的灵魂契合卡图片

---

## 📋 前置检查

- [x] 代码已修复并提交到Git
- [ ] 你有Vercel账号并能访问Dashboard
- [ ] 你有权限配置环境变量

---

## 🚀 开始部署（只需5分钟）

### 第1步：推送代码 (30秒)

```bash
git push origin main
```

✅ **完成后**: Vercel会自动开始部署，等待30-60秒

---

### 第2步：配置环境变量 (2分钟)

#### A. 访问Vercel设置页面

https://vercel.com/你的用户名/natalcodex/settings/environment-variables

#### B. 添加3个必需变量

点击 **"Add New"**，逐个添加：

**变量1**: KIE API密钥
```
Name: KIE_API_KEY
Value: 996c9f218f6339fefd23eeb688f4bfbe
Environment: Production
```

**变量2**: Callback URL
```
Name: KIE_CALLBACK_URL
Value: https://natalcodex.vercel.app/api/kie/callback
Environment: Production
```

**变量3**: Callback Token（使用下面生成的）
```
Name: KIE_CALLBACK_TOKEN
Value: nc_webhook_1764660083757_2ohigyhs63d
Environment: Production
```

> ⚠️ **重要**: 每个变量都要选择 **Production** 环境！

---

### 第3步：重新部署 (30秒)

环境变量保存后，需要重新部署：

**方法1（推荐）**: 在Vercel Dashboard找到最新部署，点击右侧的 **"⋯"** → **"Redeploy"**

**方法2**: 通过git推送
```bash
git commit --allow-empty -m "trigger redeploy"
git push
```

---

### 第4步：测试验证 (1分钟)

1. 打开浏览器访问：
   ```
   https://natalcodex.vercel.app/result.html?test=1
   ```

2. 点击 **"Generate via KIE"** 按钮

3. 观察状态变化：
   ```
   Creating task...
   → Task xxx started. Polling...
   → Generated (callback) share:...
   → 图片显示
   ```

4. 同时打开浏览器Console (F12)，确认无错误

---

### 第5步：查看日志（确认成功）

访问Vercel日志页面：
```
https://vercel.com/你的用户名/natalcodex/logs
```

**应该看到的日志**：
```
[KIE Query] Querying taskId: xxx
[KIE Query] Response: { httpStatus: 200, code: 200 }
[KIE Callback] Received request: { method: 'POST' }
[KIE Callback] Token validation: { match: true }
[KIE Callback] Successfully extracted resultUrl: ...
```

---

## ✅ 成功标志

如果你看到：
- ✅ 图片在10秒内加载完成
- ✅ 图片清晰显示在页面上
- ✅ 日志中有 `[KIE Callback]` 记录
- ✅ 浏览器Console无错误

**恭喜！部署成功！** 🎉

---

## ❌ 如果失败了？

### 症状1：一直显示"Polling..."，最后超时

**原因**: Callback未触发

**检查**:
1. Vercel环境变量中 `KIE_CALLBACK_TOKEN` 是否正确设置
2. Vercel日志中是否有 `[KIE Callback]` 开头的日志
3. 如果没有，说明KIE API没有调用你的callback

**修复**:
```bash
# 重新生成token
node -e "console.log('nc_webhook_' + Date.now() + '_' + Math.random().toString(36).slice(2))"

# 在Vercel重新设置 KIE_CALLBACK_TOKEN
# 然后Redeploy
```

---

### 症状2：显示"Task failed: 500 - ..."

**原因**: KIE API生成失败（可能是prompt问题）

**检查**:
1. 浏览器Console → Application → Local Storage → `nc_kie_last_error`
2. 查看详细错误信息

**修复**: 暂时无法修复（需要KIE API方排查），但至少你现在知道具体错误了

---

### 症状3：图片URL是空的

**原因**: `resultJson` 解析失败

**检查**: Vercel日志中搜索 `[KIE Query] Parse error`

**修复**: 已在代码中增强容错，如果还有问题请查看完整的 `raw` 数据

---

## 📞 获取帮助

如果以上都不行：

1. **查看详细文档**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
2. **查看修复总结**: [FIX_SUMMARY.md](./FIX_SUMMARY.md)
3. **运行本地测试**: `npm test`
4. **查看完整日志**: `vercel logs natalcodex --follow`

---

## 🎓 下一步

部署成功后，你可以：

1. **正式测试**: 去掉URL中的 `?test=1`，使用真实数据
2. **分享链接**: 每个生成的图片都有短链，可以分享
3. **监控日志**: 定期查看Vercel日志，确保无异常
4. **优化性能**: 参考 [FIX_SUMMARY.md](./FIX_SUMMARY.md) 中的后续优化建议

---

**准备好了？开始第1步吧！** 🚀

记住：**整个过程只需要5分钟！**
