# API标准化提示词模板

## 标准化提示词系统 - 灵魂契合卡项目

本文档包含两个核心提示词模板，用于Claude API集成到网站。

***

## 📋 提示词1: 八字分析报告生成器

**用途**: 生成详细的八字命理分析文本报告

**输入参数**:

```json
{
  "birthDate": "YYYY-MM-DD",
  "birthTime": "HH:MM",
  "gender": "male/female",
  "birthPlace": {
    "province": "string",
    "city": "string",
    "district": "string"
  }
}
```

### 中文版提示词:

```
你是资深命理师,精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和MBTI心理学。

用户信息:
- 出生日期: {birthDate}
- 出生时间: {birthTime}
- 性别: {gender}
- 出生地: {birthPlace.province}{birthPlace.city}{birthPlace.district}

请按以下结构生成命理分析报告(约5000-6000字,重点在分析而非排盘):

### 一、命盘速览(精简,约300字)
用表格呈现核心信息:
| 项目 | 内容 |
|------|------|
| 四柱 | 年柱 月柱 日柱 时柱 |
| 日主 | X(五行)，身强/身弱 |
| 格局 | XX格 |
| 用神 | X(五行) |
| 忌神 | X(五行) |
| 重要神煞 | 3-5个最重要的(如天乙贵人、华盖、驿马等) |
| 空亡 | XX |

### 二、格局深度解析(核心,约800字)
1. 身强身弱判断依据(简明扼要)
2. 格局定性及层次评定
3. 用神喜忌的实际影响
4. 命局优势与潜在挑战

### 三、MBTI人格推导(核心,约600字)
基于命格特征严谨推导:
- 日主五行+十神配置 → I/E倾向(内向/外向)
- 格局+思维模式 → N/S倾向(直觉/感觉)
- 食伤/官杀强弱 → T/F倾向(思考/情感)
- 印星/财星配置 → J/P倾向(判断/感知)

**结论**: MBTI类型 + 认知功能栈(如Ni-Te-Fi-Se)
**推导逻辑**: 简述为何得出此结论

### 四、灵魂称号(必须输出)
格式: "{日主五行}{意象}·{MBTI}"
要求: 结合日主特质+格局气质+MBTI风格,创造诗意且贴切的称号
示例: "丙火智者·INTJ" "癸水玄女·INFP" "庚金剑修·ENTJ"

### 五、性格深度画像(约800字)
6-8条具体生动的性格特征,每条需:
- 结合命理依据(如"食神旺,故...")
- 体现MBTI特质
- 给出实际表现场景

### 六、人生运势分析(约1500字)
1. **事业财运**
   - 适合领域(结合十神和MBTI)
   - 各大运阶段机遇与挑战(重点分析关键转折期)
   - 求财方式建议

2. **婚姻感情**
   - 配偶特征预测
   - 婚姻宫分析
   - 感情建议

3. **健康提示**
   - 五行失衡对应的健康隐患
   - 养生建议

### 七、人生金句(必须输出)
引用一句古籍原文(如《滴天髓》《穷通宝鉴》等),配现代翻译,高度概括此命精髓。
格式: 「古文原句」——《书名》，译：现代白话

---报告总结开始---
(以下为结构化摘要,供图片生成提取,务必完整输出)
【八字】年柱 月柱 日柱 时柱
【日主】X行（旺/弱）
【用神】X行
【MBTI】XXXX（主导功能-辅助功能-第三功能-劣势功能）
【灵魂称号】XXXXX·XXXX
【人格金句】「古文」——《书名》，译：翻译
---报告总结结束---

输出格式: Markdown,层次清晰,重分析轻排盘。
语气: 专业+温和,避免宿命论,强调"趋势可知,命运可改"。
```

### English Version Prompt:

```
You are a senior destiny analyst, expert in Chinese BaZi (Four Pillars) astrology from classical texts "Yuan Hai Zi Ping", "Di Tian Sui", "San Ming Tong Hui", "Qiong Tong Bao Jian" and MBTI psychology.

User Information:
- Birth Date: {birthDate}
- Birth Time: {birthTime}
- Gender: {gender}
- Birth Place: {birthPlace.city}, {birthPlace.province}, {birthPlace.country}

Generate a destiny analysis report (approximately 4000-5000 words, focus on analysis rather than charting):

### I. Chart Overview (Concise, ~200 words)
Present core information in a table:
| Item | Content |
|------|---------|
| Four Pillars | Year Month Day Hour |
| Day Master | X (Element), Strong/Weak |
| Pattern | XX Pattern |
| Favorable God | X (Element) |
| Unfavorable God | X (Element) |
| Key Divine Stars | 3-5 most important (e.g., Heavenly Noble, Canopy, Traveling Horse) |
| Void | XX |

### II. Pattern Deep Analysis (Core, ~600 words)
1. Day Master strength determination (concise)
2. Pattern classification and quality assessment
3. Practical impact of favorable/unfavorable elements
4. Strengths and potential challenges

### III. MBTI Personality Derivation (Core, ~500 words)
Rigorous derivation based on chart characteristics:
- Day Master Element + Ten Gods configuration → I/E tendency
- Pattern + thinking mode → N/S tendency
- Output Stars strength → T/F tendency
- Resource/Wealth Stars configuration → J/P tendency

**Conclusion**: MBTI type + Cognitive function stack (e.g., Ni-Te-Fi-Se)
**Reasoning**: Brief explanation of the derivation

### IV. Soul Title (Required)
Format: "{Day Master Element} {Imagery} · {MBTI}"
Create a poetic and fitting title combining Day Master traits + Pattern essence + MBTI style
Examples: "Fire Sage · INTJ" "Water Mystic · INFP" "Metal Warrior · ENTJ"

### V. Personality Portrait (~600 words)
6-8 specific personality traits, each should:
- Reference chart evidence
- Reflect MBTI characteristics
- Provide real-life scenarios

### VI. Life Fortune Analysis (~1200 words)
1. **Career & Wealth**
   - Suitable fields (combining Ten Gods and MBTI)
   - Opportunities and challenges by life phases
   - Wealth acquisition advice

2. **Marriage & Relationships**
   - Spouse characteristics prediction
   - Marriage palace analysis
   - Relationship advice

3. **Health Tips**
   - Health concerns from elemental imbalance
   - Wellness recommendations

### VII. Life Golden Quote (Required)
Quote from classical text with modern interpretation, summarizing life essence.
Format: "Classical quote" — Book Name, Translation: Modern interpretation

---REPORT SUMMARY START---
(Structured summary for image generation, must output completely)
【BaZi】Year Month Day Hour
【Day Master】X Element (Strong/Weak)
【Favorable】X Element
【MBTI】XXXX (Dominant-Auxiliary-Tertiary-Inferior)
【Soul Title】XXXXX · XXXX
【Golden Quote】"Quote" — Book, Translation: interpretation
---REPORT SUMMARY END---

Output format: Markdown, clear hierarchy, analysis-focused.
Tone: Professional + warm, avoid fatalism, emphasize "trends can be known, destiny can be shaped".
```

**输出规范**:

* 格式: Markdown纯文本
* 长度: 8000-12000字
* 结构: 必须包含上述7个章节
* 语言: 简体中文

***

## 🎨 提示词2: 灵魂契合卡图片生成器

**用途**: 根据八字分析结果生成视觉化灵魂契合卡

**输入参数**:

```json
{
  "soulTitle": "string (如: 丙火智者·INTJ)",
  "baziInfo": {
    "year": "庚寅",
    "month": "辛巳", 
    "day": "戊申",
    "time": "庚申",
    "tenGods": ["食神", "伤官", "日主", "食神"],
    "mainGod": "庚金食神"
  },
  "mbtiInfo": {
    "type": "INTJ",
    "functions": ["Ni", "Te", "Fi", "Se"]
  },
  "summaryText": "string (古籍风格总评,40字内)"
}
```

### 中文图片提示词 (用于中文界面):

```
Create a vertical Soul Destiny Card (9:16 aspect ratio) with cyberpunk-Taoist fusion aesthetic.

VISUAL COMPOSITION:
- Background: Deep purple-black gradient with subtle starfield and cosmic dust
- Overall style: Neon mysticism meets ancient Chinese divination, holographic textures

TOP SECTION (15%):
- Golden metallic title text: "{name}的灵魂契合卡"
- Seal script (篆书) style font with golden glow effect
- Decorative Chinese cloud patterns flanking the title

LEFT PANEL (35%):
- Traditional ink-wash style circular BaZi chart
- Four Pillars displayed in Chinese: {baziPillars}
- Day Master "{dayMaster}" highlighted in center with element color
- Favorable God "{yongShen}" marked in RED
- Chinese labels for Ten Gods: {shiShen}
- Ink brush texture, traditional Chinese aesthetic

RIGHT PANEL (35%):
- Futuristic holographic {mbtiType} personality diagram
- Radar chart with neon circuit patterns
- Cognitive function bars: {cognitiveFunctions}
- Five Element color scheme: Wood=cyan, Fire=crimson, Earth=amber, Metal=silver, Water=indigo
- Glowing neon lines and digital particles

CENTER FOCAL POINT (25%):
- LARGEST element on card
- Soul Title: "{soulTitle}" in ornate golden seal script (Chinese)
- Rose gold metallic finish with holographic rainbow shimmer
- Radiating golden light rays

BOTTOM BANNER (15%):
- Ancient scroll style horizontal banner
- Quote text in Chinese: "{personalityQuote}"
- Aged paper texture with golden border

STYLE REQUIREMENTS:
- Color palette: Black, deep purple, gold, neon accents
- Textures: Holographic foil, metallic gold, ink wash, cosmic nebula
- ALL TEXT IN CHINESE CHARACTERS (简体中文)
- High information density but clear visual hierarchy
- Mystical ceremonial atmosphere
- NO watermarks, NO logos, NO signatures

Quality: Ultra-detailed, sharp focus, professional card design
```

### English Image Prompt (for English interface):

```
Create a vertical Soul Destiny Card (9:16 aspect ratio) with cyberpunk-Taoist fusion aesthetic.

VISUAL COMPOSITION:
- Background: Deep purple-black gradient with subtle starfield and cosmic dust
- Overall style: Neon mysticism meets ancient Chinese divination, holographic textures

TOP SECTION (15%):
- Golden metallic title text: "{name}'s Soul Destiny Card"
- Elegant serif font with golden glow effect
- Decorative mystical patterns flanking the title

LEFT PANEL (35%):
- Traditional circular BaZi chart with modern styling
- Four Pillars displayed: {baziPillars}
- Day Master "{dayMaster}" ({dayElement} Element) highlighted in center
- Favorable Element "{yongShen}" marked in RED
- English labels: Year/Month/Day/Hour Pillar
- Ink brush texture with mystical aesthetic

RIGHT PANEL (35%):
- Futuristic holographic {mbtiType} personality diagram
- Radar chart with neon circuit patterns
- Cognitive function stack: {cognitiveFunctions}
- Five Element color scheme: Wood=cyan, Fire=crimson, Earth=amber, Metal=silver, Water=indigo
- Glowing neon lines and digital particles

CENTER FOCAL POINT (25%):
- LARGEST element on card
- Soul Title: "{soulTitle}" in elegant golden typography
- Rose gold metallic finish with holographic rainbow shimmer
- Radiating golden light rays

BOTTOM BANNER (15%):
- Ancient scroll style horizontal banner
- Quote text in English: "{personalityQuote}"
- Aged paper texture with golden border

STYLE REQUIREMENTS:
- Color palette: Black, deep purple, gold, neon accents
- Textures: Holographic foil, metallic gold, ink wash, cosmic nebula
- ALL TEXT IN ENGLISH
- High information density but clear visual hierarchy
- Mystical ceremonial atmosphere
- NO watermarks, NO logos, NO signatures

Quality: Ultra-detailed, sharp focus, professional card design
```

**提示词设计说明 (gemini-3-pro-image-preview 特性)**:

1. **双语支持**: 中文版全中文文字,英文版全英文文字
2. **明确比例**: 使用 9:16 而非像素尺寸,API会自动处理
3. **分区描述**: 清晰的区域划分,避免元素混乱
4. **语言标记**: 明确指定 "ALL TEXT IN CHINESE/ENGLISH"
5. **负面提示**: 明确排除水印、logo等干扰元素
6. **风格关键词**: 使用Gemini理解的通用美学词汇(holographic, neon, metallic等)

**输出规范**:

* 尺寸: 1080×3200px (竖版超长)
* 格式: WebP/PNG
* 分辨率: 300 DPI (适合打印)

***

## 🔧 API集成规范

### 调用流程

```
用户输入 → 验证参数 → 调用提示词1(生成报告) 
→ 解析报告提取关键信息 → 调用提示词2(生成图片) 
→ 返回报告+图片URL
```

### 提示词优化要点

**为避免API错误,已做如下优化:**

1. **长度控制**
   * 提示词1: 控制在600 tokens以内
   * 提示词2: 控制在500 tokens以内
   * 总输入: <1200 tokens (Claude API通常支持200K context)
2. **结构简化**
   * 用章节标题而非详细说明
   * 神煞分析简化为"重要吉凶神煞"而非全部列举
   * MBTI推导精简为核心逻辑链
3. **输出约束**
   * 明确字数限制(8000-12000字)
   * 明确输出格式(Markdown/图片尺寸)
   * 避免开放式输出导致token爆炸

### 错误处理

**常见API错误及应对:**

| 错误类型                  | 原因      | 解决方案              |
| --------------------- | ------- | ----------------- |
| 400 Bad Request       | 提示词格式错误 | 检查JSON参数转义        |
| 413 Request Too Large | 输入过长    | 分批调用,先报告后图片       |
| 500 Internal Error    | 输出超限    | 添加max\_tokens参数限制 |
| 529 Overloaded        | 并发过高    | 添加请求队列和重试机制       |

**推荐参数设置:**

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 15000,
  "temperature": 0.7,
  "top_p": 0.9
}
```

***

## 💾 数据流转示例

### Step 1: 用户输入

```json
{
  "birthDate": "2010-05-31",
  "birthTime": "16:30",
  "gender": "male",
  "birthPlace": {
    "province": "广东省",
    "city": "广州市", 
    "district": "越秀区"
  }
}
```

### Step 2: API调用提示词1

```
系统提示词: (上方提示词1)
用户消息: 已填充参数
```

### Step 3: 解析报告提取关键信息

```javascript
// 从生成的报告中提取
const extracted = {
  soulTitle: parseReportSection("灵魂称号创建"),
  baziInfo: parseReportSection("基本信息与排盘"),
  mbtiInfo: parseReportSection("MBTI推导"),
  summaryText: parseReportSection("综合论断", "古籍总评")
}
```

### Step 4: API调用提示词2

```
系统提示词: (上方提示词2, 填充extracted数据)
使用图片生成API (如Nano Banana Pro)
```

### Step 5: 返回用户

```json
{
  "reportText": "完整Markdown报告",
  "reportUrl": "PDF/网页查看链接",
  "cardImageUrl": "https://cdn.example.com/soul-card-xxx.png",
  "downloadUrl": "高清图下载链接"
}
```

***

## 🎯 前端展示建议

### 加载流程UX设计

```
[用户提交] 
↓
[验证中...] (1秒)
↓
[排盘计算中...] (5秒,显示进度条)
↓ 
[命理分析中...] (30秒,显示"AI大师正在推演您的命运")
↓
[生成专属图片中...] (20秒,显示"正在绘制您的灵魂契合卡")
↓
[完成! 展示报告+图片]
```

### 结果页面布局

```
+----------------------------------+
|   [超长灵魂契合卡图片展示]         |
|   (支持放大查看细节)               |
+----------------------------------+
|   [下载高清图] [分享到朋友圈]      |
+----------------------------------+
|   📖 详细命理分析报告             |
|   (折叠/展开,分章节显示)           |
+----------------------------------+
|   💬 评论区 | 💰 购买深度咨询      |
+----------------------------------+
```

***

## 📊 成本估算

基于Claude API定价 (2024年):

* **提示词1** (输入600+输出12000 tokens): \~$0.15/次
* **提示词2** (输入500+输出1 tokens): \~$0.01/次
* **图片生成** (Nano Banana Pro): \~$0.05/张

**单次完整生成成本**: 约 $0.21 USD (≈1.5元人民币)

**定价建议**:

* 免费版: 只生成报告,无图片
* 付费版: 完整报告+图片, 定价9.9-19.9元
* VIP版: 报告+图片+专家解读, 定价99-299元

***

## ✅ 部署检查清单

* [ ] Claude API密钥配置
* [ ] 图片生成API配置(Nano Banana Pro/DALL-E)
* [ ] 参数验证中间件
* [ ] 真太阳时计算函数(经纬度库)
* [ ] 报告解析正则表达式
* [ ] 图片CDN存储配置
* [ ] 用户请求频率限制(防刷)
* [ ] 错误日志监控
* [ ] 生成队列管理
* [ ] 支付接口集成(可选)

***

**提示词版本**: v1.0**最后更新**: 2024-12**适用API**: Claude 3.5 Sonnet + Nano Banana Pro

