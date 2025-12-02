# APIMart集成方案：Gemini + Nano Banana Pro

## 📋 方案概述

将当前KIE API替换为APIMart平台，使用：
1. **Gemini 2.0 Flash** - 生成八字命理报告
2. **Gemini-3-Pro-Image-preview (Nano banana2)** - 生成灵魂契合卡图片

---

## 🔄 工作流程

```
用户输入出生信息
    ↓
[Gemini 2.0 Flash] 分析八字 + MBTI
    ↓
生成详细报告文本 + 提取关键信息
    ↓
[Gemini-3-Pro-Image] 根据优化后的prompt生成图片
    ↓
返回报告PDF + 图片
```

---

## 🔑 APIMart API 集成要点

### 1. 认证方式

```javascript
headers: {
  'Authorization': 'Bearer YOUR_APIMART_API_KEY',
  'Content-Type': 'application/json'
}
```

### 2. Gemini Chat API (生成报告)

**端点**: `POST https://api.apimart.ai/v1/chat/completions`

**请求示例**:
```javascript
{
  "model": "gemini-2.0-flash-exp",
  "messages": [
    {
      "role": "system",
      "content": "你是精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和荣格MBTI八功能理论的顶尖命理+心理学双料大师。"
    },
    {
      "role": "user",
      "content": "请分析我的出生信息：1995年8月8日 14:30，男，北京..."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 4000
}
```

**响应格式**:
```javascript
{
  "choices": [{
    "message": {
      "content": "完整的八字分析报告..."
    }
  }],
  "usage": {...}
}
```

### 3. Image Generation API (生成图片)

**端点**: `POST https://api.apimart.ai/v1/images/generations`

**请求示例**:
```javascript
{
  "model": "Gemini-3-Pro-Image-preview",
  "prompt": "优化后的图片生成提示词...",
  "size": "1024x1792",  // 9:16竖版
  "quality": "hd",
  "n": 1
}
```

**响应格式** (异步任务):
```javascript
{
  "task_id": "task_abc123xyz",
  "status": "pending"
}
```

### 4. Task Status Query (查询图片生成结果)

**端点**: `GET https://api.apimart.ai/v1/tasks/{task_id}`

**响应示例**:
```javascript
{
  "task_id": "task_abc123xyz",
  "status": "completed",  // pending/processing/completed/failed
  "result": {
    "data": [{
      "url": "https://cdn.apimart.ai/xxx.png"
    }]
  }
}
```

---

## 📝 Prompt优化策略

### 原prompt的问题（与之前KIE相同）

当前提示词要求AI：
1. 排八字命盘（复杂计算）
2. 推导MBTI类型（逻辑推理）
3. 生成超复杂图片布局

**图片生成模型无法完成前两步的逻辑推理！**

### 解决方案：两步法

#### Step 1: Gemini生成结构化数据

使用Gemini 2.0 Flash完成逻辑推理，输出JSON格式：

**Prompt**:
```
你同时精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和荣格MBTI八功能理论。

用户出生信息：【{date} {time}，{gender}，{location}】

请严格执行以下分析，并以JSON格式输出：

1. 排出四柱八字、十神、神煞
2. 分析日主五行、用神忌神、格局
3. 推导MBTI四字母和认知功能栈
4. 生成专属灵魂称号（如"庚金剑修·INTJ"）

输出JSON格式：
{
  "bazi": {
    "year": "甲子", "month": "丙寅", "day": "戊辰", "hour": "庚午",
    "shishen": ["偏印", "食神", ...],
    "yongshen": "水",
    "geju": "食神生财格"
  },
  "mbti": {
    "type": "INTJ",
    "functions": ["Ni", "Te", "Fi", "Se"],
    "radar_scores": {"E/I": 30, "S/N": 80, "T/F": 70, "J/P": 65}
  },
  "soul_title": "戊土建筑师·INTJ",
  "wuxing_colors": {
    "wood": "#00FF7F", "fire": "#FF4500", "earth": "#FFD700",
    "metal": "#FFFFFF", "water": "#1E90FF"
  },
  "summary": "日主戊土生于寅月，木旺土衰，喜火土相生。格局清奇，INTJ理性谋略..."
}
```

#### Step 2: 简化图片Prompt（纯视觉描述）

基于Step 1的JSON数据，构建**纯视觉的**图片生成prompt：

**优化后的Prompt模板**:
```javascript
function buildImagePrompt(jsonData) {
  const { bazi, mbti, soul_title, wuxing_colors, summary } = jsonData;

  return `
Create a mystical Chinese astrology card, vertical 9:16 portrait orientation, cyberpunk Taoist aesthetic:

TOP SECTION:
- Golden seal script title in Chinese: "${jsonData.userName}的灵魂契合卡"
- Glowing holographic effect with purple-black gradient background

LEFT PANEL (Traditional Style):
- Circular BaZi fortune wheel with Chinese characters:
  Year: ${bazi.year}, Month: ${bazi.month}, Day: ${bazi.day}, Hour: ${bazi.hour}
- Ten Gods (Shishen) labeled: ${bazi.shishen.join(', ')}
- Highlighted element in red: ${bazi.yongshen}
- Ink wash painting style, traditional calligraphy

RIGHT PANEL (Cyberpunk Style):
- MBTI radar chart showing: ${mbti.type}
- Eight cognitive functions as neon progress bars:
  ${mbti.functions.map((f, i) => `${f}: ${mbti.radar_scores[f]}%`).join(', ')}
- Color scheme: wood-green, fire-red, earth-gold, metal-white, water-blue

CENTER ELEMENT:
- Massive golden title in Chinese seal script: "${soul_title}"
- Shining metallic holographic effect

MIDDLE CONNECTION:
- Five-elements energy band connecting left and right panels
- Glowing particle effect showing energy flow
- Gradient using five element colors

BOTTOM BANNER:
- Ancient Chinese text scroll style
- Summary quote: "${summary}"
- Traditional calligraphy with modern translation

OVERALL STYLE:
- Black-purple starry gradient background
- Neon five-elements glow effects
- Laser holographic texture
- High information density but layered clearly
- Cyberpunk meets traditional Chinese aesthetic
- All text must be in Chinese
- Font: seal script for titles, Song/Hei for body text, neon outline for keywords

Generate in high resolution suitable for printing.
`.trim();
}
```

---

## 🏗️ 代码架构

### 新文件结构

```
api/
├── apimart/
│   ├── chat.js           # Gemini chat completion (生成报告)
│   ├── generateImage.js  # 创建图片生成任务
│   ├── queryTask.js      # 查询任务状态
│   └── config.js         # API配置
└── reports/
    └── generateWithImage.js  # 主流程：报告+图片
```

### 核心代码示例

#### 1. api/apimart/config.js

```javascript
module.exports = {
  API_KEY: process.env.APIMART_API_KEY,
  BASE_URL: 'https://api.apimart.ai/v1',
  MODELS: {
    CHAT: 'gemini-2.0-flash-exp',
    IMAGE: 'Gemini-3-Pro-Image-preview'
  }
};
```

#### 2. api/apimart/chat.js

```javascript
const config = require('./config');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { birthData } = req.body;

  // 构建系统提示词
  const systemPrompt = `你是精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和荣格MBTI八功能理论的顶尖命理+心理学双料大师。

请分析用户出生信息并以JSON格式输出结果，包含：
1. 八字四柱、十神、用神、格局
2. MBTI类型和认知功能栈
3. 专属灵魂称号
4. 五行配色方案
5. 简短总结`;

  const userPrompt = `我的出生信息：
姓名：${birthData.name}
性别：${birthData.gender}
出生：${birthData.date} ${birthData.time}
地点：${birthData.location}（${birthData.lat}, ${birthData.lon}）
时区：${birthData.timezone}

请严格按照要求分析并返回JSON格式数据。`;

  try {
    const response = await fetch(`${config.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.MODELS.CHAT,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }  // 强制JSON输出
      })
    });

    const data = await response.json();
    const analysisResult = JSON.parse(data.choices[0].message.content);

    res.json({
      success: true,
      analysis: analysisResult
    });

  } catch (error) {
    console.error('[APIMart Chat] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

#### 3. api/apimart/generateImage.js

```javascript
const config = require('./config');

function buildImagePrompt(analysisData, userName) {
  const { bazi, mbti, soul_title, wuxing_colors, summary } = analysisData;

  return `Create a mystical Chinese astrology card, vertical 9:16 portrait orientation, cyberpunk Taoist aesthetic:

TOP SECTION:
- Golden seal script title: "${userName}的灵魂契合卡"
- Holographic purple-black gradient background

LEFT PANEL (Traditional):
- Circular BaZi wheel: Year ${bazi.year}, Month ${bazi.month}, Day ${bazi.day}, Hour ${bazi.hour}
- Ten Gods: ${bazi.shishen.join(', ')}
- Highlighted: ${bazi.yongshen} in red
- Ink wash style

RIGHT PANEL (Cyberpunk):
- MBTI ${mbti.type} radar chart
- Neon progress bars: ${mbti.functions.join(', ')}
- Five-element colors

CENTER:
- Massive golden seal script: "${soul_title}"
- Holographic shine effect

ENERGY BAND:
- Five-elements gradient connecting left-right panels
- Glowing particle flow

BOTTOM:
- Ancient scroll style
- Summary: "${summary}"

STYLE: Black-purple starry background, neon glow, laser holographic, high info density, cyberpunk + traditional Chinese, all Chinese text, seal/Song/Hei fonts with neon outline.`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { analysisData, userName } = req.body;

  const prompt = buildImagePrompt(analysisData, userName);

  try {
    const response = await fetch(`${config.BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.MODELS.IMAGE,
        prompt: prompt,
        size: '1024x1792',  // 9:16 vertical
        quality: 'hd',
        n: 1
      })
    });

    const data = await response.json();

    res.json({
      success: true,
      taskId: data.task_id
    });

  } catch (error) {
    console.error('[APIMart Image] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

#### 4. api/apimart/queryTask.js

```javascript
const config = require('./config');

module.exports = async (req, res) => {
  const { taskId } = req.query;

  if (!taskId) {
    return res.status(400).json({ error: 'taskId required' });
  }

  try {
    const response = await fetch(`${config.BASE_URL}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`
      }
    });

    const data = await response.json();

    res.json({
      success: true,
      status: data.status,  // pending/processing/completed/failed
      imageUrl: data.status === 'completed' ? data.result.data[0].url : null,
      error: data.status === 'failed' ? data.error : null
    });

  } catch (error) {
    console.error('[APIMart Query] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

#### 5. api/reports/generateWithImage.js (主流程)

```javascript
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, birthData } = req.body;

  try {
    // Step 1: 使用Gemini生成分析报告
    console.log('[Generate] Step 1: Analyzing with Gemini...');
    const chatResponse = await fetch(`${req.headers.host}/api/apimart/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthData })
    });
    const { analysis } = await chatResponse.json();

    // Step 2: 生成详细报告文本
    console.log('[Generate] Step 2: Building report...');
    const reportContent = buildReportFromAnalysis(analysis, birthData);

    // Step 3: 创建图片生成任务
    console.log('[Generate] Step 3: Creating image task...');
    const imageResponse = await fetch(`${req.headers.host}/api/apimart/generateImage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisData: analysis,
        userName: birthData.name
      })
    });
    const { taskId } = await imageResponse.json();

    // Step 4: 轮询等待图片生成完成
    console.log('[Generate] Step 4: Waiting for image...');
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 30; // 60秒超时

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

      const queryResponse = await fetch(
        `${req.headers.host}/api/apimart/queryTask?taskId=${taskId}`
      );
      const taskData = await queryResponse.json();

      if (taskData.status === 'completed') {
        imageUrl = taskData.imageUrl;
        break;
      } else if (taskData.status === 'failed') {
        throw new Error(`Image generation failed: ${taskData.error}`);
      }

      attempts++;
    }

    if (!imageUrl) {
      throw new Error('Image generation timeout');
    }

    // Step 5: 返回完整结果
    res.json({
      success: true,
      orderId,
      reportContent,
      imageUrl,
      analysis
    });

  } catch (error) {
    console.error('[Generate] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

function buildReportFromAnalysis(analysis, birthData) {
  return `# ${birthData.name}的灵魂契合卡报告

## 基本信息
- 出生：${birthData.date} ${birthData.time}
- 地点：${birthData.location}

## 八字命盘
${analysis.bazi.year} ${analysis.bazi.month} ${analysis.bazi.day} ${analysis.bazi.hour}

格局：${analysis.bazi.geju}
用神：${analysis.bazi.yongshen}

## MBTI分析
类型：${analysis.mbti.type}
认知功能栈：${analysis.mbti.functions.join(' > ')}

## 灵魂称号
**${analysis.soul_title}**

## 综合评价
${analysis.summary}

---
生成时间：${new Date().toLocaleString('zh-CN')}
订单号：${birthData.orderId}`;
}
```

---

## 🔐 环境变量配置

在Vercel Dashboard中设置：

```env
# APIMart API Key
APIMART_API_KEY=your_apimart_api_key_here

# 其他保持不变
DATABASE_URL=...
VERTEX_AI_PROJECT_ID=...
```

---

## 📊 成本对比

### KIE API（当前）
- 图片生成：约 $0.10 per image
- **问题**：任务创建成功但无callback、queryTask返回404

### APIMart（推荐）
- Gemini 2.0 Flash Chat：约 $0.01-0.02 per request
- Gemini-3-Pro-Image：约 $0.05-0.08 per image
- **总计**：约 $0.06-0.10 per complete flow

**优势**：
- ✅ 更便宜（统一平台价格优惠）
- ✅ OpenAI兼容API（迁移容易）
- ✅ 异步任务机制成熟
- ✅ 支持webhook（可选）
- ✅ 24小时图片链接有效期

---

## 🚀 迁移步骤

### Phase 1: 创建测试分支（1小时）
```bash
git checkout -b apimart-integration
```

1. 安装APIMart依赖
2. 创建 `api/apimart/` 目录结构
3. 实现基础API封装

### Phase 2: 实现Gemini分析（2小时）
1. 创建 `api/apimart/chat.js`
2. 优化prompt让Gemini输出JSON
3. 测试八字分析输出格式

### Phase 3: 实现图片生成（2小时）
1. 创建 `api/apimart/generateImage.js`
2. 优化图片prompt（纯视觉描述）
3. 实现任务轮询机制

### Phase 4: 集成测试（1小时）
1. 完整流程端到端测试
2. 调试prompt效果
3. 性能优化

### Phase 5: 部署上线（30分钟）
1. 设置Vercel环境变量
2. Merge到main分支
3. 验证生产环境

**总预计时间：6-7小时**

---

## ⚠️ 注意事项

### Prompt优化的关键

1. **Gemini分析prompt**：
   - ✅ 要求输出JSON格式
   - ✅ 明确字段结构
   - ✅ 包含所有可视化需要的数据

2. **图片生成prompt**：
   - ✅ 纯视觉描述，不要逻辑推理
   - ✅ 明确布局、颜色、风格
   - ✅ 使用英文（图片模型理解更好）
   - ❌ 不要要求"计算""分析""推导"

3. **异步任务处理**：
   - 图片生成通常需要5-15秒
   - 轮询间隔建议2秒
   - 超时时间建议60秒
   - 考虑添加进度提示

---

## 🎯 预期效果

### 当前KIE方案的问题
❌ Prompt太复杂导致422错误
❌ Callback从未被触发
❌ QueryTask持续返回404
❌ 没有任务执行记录

### APIMart方案的优势
✅ Gemini处理逻辑推理（八字+MBTI）
✅ 图片模型只做纯视觉生成
✅ 异步任务机制成熟可靠
✅ OpenAI兼容API易于集成
✅ 成本更低且功能更强

---

## 📞 下一步行动

1. **注册APIMart账号**
   - 访问 https://apimart.ai
   - 获取API Key
   - 查看定价和配额

2. **测试API可用性**
   ```bash
   # 测试chat API
   curl -X POST https://api.apimart.ai/v1/chat/completions \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gemini-2.0-flash-exp","messages":[{"role":"user","content":"Hello"}]}'

   # 测试image API
   curl -X POST https://api.apimart.ai/v1/images/generations \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"Gemini-3-Pro-Image-preview","prompt":"a beautiful sunset","size":"1024x1024"}'
   ```

3. **确认后开始实施**
   - 我可以立即开始编写代码
   - 预计6-7小时完成完整迁移
   - 包含测试和部署

---

**准备好了吗？告诉我你的APIMart API Key，我就开始实施！** 🚀
