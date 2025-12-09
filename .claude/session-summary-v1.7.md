# NatalCodex v1.7 Session Summary

**日期**: 2025-12-09
**版本**: v1.7
**基于版本**: v1.6
**Commit**: 4baa0fa

---

## 一、问题诊断与修复

### 问题现象
报告生成失败，错误信息：
```
生成失败：Server returned an error page instead of JSON
```

Vercel 日志显示：
```
Vercel Runtime Timeout Error: Task timed out after 10 seconds
```

### 根本原因
1. **Vercel maxDuration 设置为 10 秒**
   - Commit `443ab1b` 将 `maxDuration` 从 30s 改为 10s（当时是 Hobby plan）
   - 用户已升级到 Pro plan，但配置未更新

2. **APImart 返回 SSE 流式响应**
   - 即使设置 `stream: false`，APImart 仍返回 SSE 格式
   - 代码使用 `response.json()` 解析失败

### 修复内容

#### 1. vercel.json
```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60,  // 10 -> 60 (Pro plan)
      "memory": 1024
    }
  }
}
```

#### 2. generateWithAPImart.js (第 297-329 行)
添加 SSE 流式响应解析：
```javascript
// Handle both JSON and SSE stream responses
const responseText = await chatResponse.text();
let chatData;

if (responseText.startsWith('data:')) {
  // APImart returned SSE stream format, parse it
  console.log('[GenerateWithAPImart] Received SSE stream response, parsing...');
  let content = '';
  const lines = responseText.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content || '';
        content += delta;
      } catch (e) {
        // Ignore parse errors for individual chunks
      }
    }
  }
  // Convert to standard format
  chatData = {
    choices: [{
      message: { content },
      finish_reason: 'stop'
    }]
  };
} else {
  // Standard JSON response
  chatData = JSON.parse(responseText);
}
```

#### 3. generateKuder.js (第 292-324 行)
同样添加 SSE 流式响应解析（与上述相同逻辑）

---

## 二、本地测试结果

使用 `test-apimart.js` 测试 APImart 响应时间：

| 测试项 | 耗时 | 说明 |
|--------|------|------|
| 简单请求 | 1.7s | "你好，回复OK" |
| 中等请求 (500字) | 13.4s | 性格分析 |
| 完整报告 (5000字) | 46.1s | 完整命理报告 |

**结论**: APImart GPT-4o-mini 生成完整报告需要约 46 秒，必须使用 Pro plan (60s limit)

---

## 三、Vercel 计划对比

| 计划 | maxDuration | 月费 | 适用性 |
|------|-------------|------|--------|
| Hobby | 10s | 免费 | ❌ 不够 |
| Pro | 60s | $20 | ✅ 足够 |

---

## 四、关键配置检查清单

部署前务必确认：

- [x] `vercel.json` 中 `maxDuration: 60`
- [x] Vercel Dashboard 显示 Pro plan
- [x] API 文件包含 SSE 响应解析逻辑
- [x] 环境变量 `APIMART_API_KEY` 已配置

---

## 五、历史问题追溯

| Commit | 日期 | 改动 | 影响 |
|--------|------|------|------|
| `443ab1b` | 2025-12-09 | maxDuration 30->10 | 导致超时 |
| `4baa0fa` | 2025-12-09 | maxDuration 10->60 + SSE解析 | 修复问题 |

**教训**: 升级 Vercel 计划后，必须同步更新 `vercel.json` 配置

---

## 六、文件变更列表

```
api/reports/
├── generateWithAPImart.js  # +33 行 SSE 解析
└── generateKuder.js        # +33 行 SSE 解析

vercel.json                 # maxDuration: 60

test-apimart.js             # 新增：本地测试脚本（未提交）
```

---

## 七、下次修改注意事项

1. **修改 vercel.json 前**：确认当前 Vercel 计划
2. **APImart API 调用**：始终处理 SSE 和 JSON 两种响应格式
3. **超时问题排查**：先检查 Vercel 日志中的实际超时时间
4. **测试**：使用 `test-apimart.js` 本地测试 API 响应时间

---

**Session End: 2025-12-09**
**Status: ✅ 问题已修复，报告生成正常**
