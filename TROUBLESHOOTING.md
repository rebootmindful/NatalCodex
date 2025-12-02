# 🔍 故障排查指南 - 图片无法显示

## 当前症状

✅ 显示：`Task 9ec12f9dda59ee49fa27b51b0b4505d3 started. Polling...`
❌ 但是：图片一直没有出现

---

## 🎯 可能的原因

### 原因1：Callback没有被KIE API调用（最可能）

**检查方法**：

1. 访问Vercel日志：https://vercel.com/rebootmindful/natalcodex/logs
2. 搜索关键词：`[KIE Callback]`
3. 查看是否有 `Received request` 记录

**如果没有日志** = Callback没有触发，原因：
- ❌ `KIE_CALLBACK_URL` 未设置
- ❌ `KIE_CALLBACK_TOKEN` 未设置
- ❌ KIE API 没有调用你的callback URL

---

### 原因2：QueryTask API返回404（我刚测试发现的）

**测试命令**：
```bash
curl -X POST "https://api.kie.ai/api/v1/jobs/queryTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 996c9f218f6339fefd23eeb688f4bfbe" \
  -d '{"taskId": "9ec12f9dda59ee49fa27b51b0b4505d3"}'
```

**我刚才测试结果**：
```json
{
  "timestamp":1764661808290,
  "status":404,
  "error":"Not Found",
  "message":"No message available",
  "path":"/api/v1/jobs/queryTask"
}
```

这说明：
1. **任务可能还在处理中**（pending/running状态）
2. **或者taskId不存在**（已经过期）
3. **或者API路径有问题**

---

## 🔧 立即修复方案

### 修复步骤1：确认环境变量（最重要！）

访问：https://vercel.com/rebootmindful/natalcodex/settings/environment-variables

**必须有这3个变量（在Production环境）**：

```
KIE_API_KEY = 996c9f218f6339fefd23eeb688f4bfbe
KIE_CALLBACK_URL = https://natalcodex.vercel.app/api/kie/callback
KIE_CALLBACK_TOKEN = nc_webhook_1764660083757_2ohigyhs63d
```

**检查要点**：
- [ ] 3个变量都存在
- [ ] 每个变量都勾选了 ✅ **Production**
- [ ] `KIE_CALLBACK_TOKEN` 的值完全匹配（注意复制粘贴时不要有空格）

---

### 修复步骤2：查看CreateTask日志

访问：https://vercel.com/rebootmindful/natalcodex/logs

**搜索**：`[KIE Create]`

**应该看到**：
```
[KIE Create] Starting task creation: {
  hasPrompt: true,
  promptLength: xxx,
  hasCallbackUrl: true,
  callbackUrl: 'https://natalcodex.vercel.app/api/kie/callback?token=...'
}
[KIE Create] API Response: {
  code: 200,
  hasTaskId: true,
  taskId: '9ec12f9dda59ee49fa27b51b0b4505d3'
}
```

**如果 hasCallbackUrl 是 false**：
- ❌ 说明环境变量没有生效
- ✅ 解决：重新设置环境变量并 Redeploy

---

### 修复步骤3：等待Callback触发

**正常流程时间线**：
```
0秒：创建任务成功
3-10秒：KIE API处理图片
10秒：调用你的callback URL
10秒：前端检测到callback存储的结果
11秒：图片显示
```

**如果超过30秒还没有显示**：
- 查看Vercel日志是否有 `[KIE Callback] Received request`
- 如果没有，说明KIE API没有调用callback

---

### 修复步骤4：手动测试Callback（验证配置）

在你的本地终端运行：

```bash
curl -X POST "https://natalcodex.vercel.app/api/kie/callback?token=nc_webhook_1764660083757_2ohigyhs63d" \
  -H "Content-Type: application/json" \
  -d '{
    "code": 200,
    "data": {
      "taskId": "test123",
      "state": "success",
      "resultJson": "{\"resultUrls\":[\"https://example.com/test.png\"]}"
    },
    "msg": "test"
  }'
```

**期望结果**：
```json
{
  "success": true,
  "state": "success",
  "taskId": "test123",
  "resultUrl": "https://example.com/test.png",
  "shortId": "xxx",
  "shortUrl": "https://natalcodex.vercel.app/api/kie/storeResult?shortId=xxx"
}
```

**同时在Vercel日志应该看到**：
```
[KIE Callback] Received request: { method: 'POST' }
[KIE Callback] Token validation: { match: true }
[KIE Callback] Successfully extracted resultUrl: https://example.com/test.png
```

**如果返回401 Unauthorized**：
- ❌ Token不匹配
- ✅ 检查 `KIE_CALLBACK_TOKEN` 环境变量

---

## 🆘 紧急解决方案（如果上面都不行）

### 方案A：使用轮询模式（临时）

暂时移除callback，改用纯轮询：

1. 在Vercel删除 `KIE_CALLBACK_URL` 环境变量
2. Redeploy
3. 重新测试

**缺点**：需要等待更长时间（最多3分钟），会频繁调用queryTask API

---

### 方案B：增加详细的前端日志

修改 `result.html`，在 pollKieTask 函数中增加console.log：

```javascript
console.log('[Polling] Checking storeResult for taskId:', taskId);
// ...
console.log('[Polling] QueryTask response:', data);
```

然后在浏览器按F12查看Console输出

---

## 📊 诊断清单

请按顺序检查：

- [ ] Vercel环境变量：3个都存在且在Production环境
- [ ] Vercel日志中有 `[KIE Create]` 且 `hasCallbackUrl: true`
- [ ] Vercel日志中有 `[KIE Callback] Received request`
- [ ] 手动测试callback URL返回200 OK
- [ ] 浏览器Console无红色错误
- [ ] TaskId `9ec12f9dda59ee49fa27b51b0b4505d3` 是新创建的（不是旧的过期任务）

---

## 🔄 最可能的解决方案

根据你的症状，**90%概率是环境变量没有生效**。

**请执行**：

1. 访问：https://vercel.com/rebootmindful/natalcodex/settings/environment-variables
2. 确认3个变量存在
3. **点击 Redeploy** 按钮（这一步很关键！）
4. 等待部署完成（30秒）
5. 重新测试：https://natalcodex.vercel.app/result.html?test=1
6. 点击 "Generate via KIE"
7. 查看Vercel日志

---

## 📞 还是不行？

请提供以下信息：

1. Vercel日志中搜索 `[KIE Create]` 的完整输出
2. Vercel日志中是否有 `[KIE Callback]` 记录
3. 浏览器Console的截图或输出
4. 环境变量配置的截图（隐藏token后几位）

我会根据具体日志给出针对性的解决方案。

---

**最重要的一步：确认环境变量后一定要 Redeploy！** 🔄
