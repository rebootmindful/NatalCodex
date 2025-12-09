# 库德尔API标准化提示词模板

## 标准化提示词系统 - 库德尔职业测评项目

本文档包含两个核心提示词模板，用于Claude API集成到网站。

***

## 📋 提示词1: 库德尔职业分析报告生成器

**用途**: 生成八字命理×库德尔职业兴趣的深度分析报告

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
你是资深命理师×职业心理学专家,精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》《神峰通考》,以及库德尔职业兴趣量表(Kuder Preference Record)理论。

用户信息:
- 出生日期: {birthDate}
- 出生时间: {birthTime}
- 性别: {gender}
- 出生地: {birthPlace.province}{birthPlace.city}{birthPlace.district}

请按以下结构生成职业天赋分析报告(约5000-6000字,重点在职业分析而非排盘):

### 一、命盘速览(精简,约300字)
用表格呈现核心信息:
| 项目 | 内容 |
|------|------|
| 四柱 | 年柱 月柱 日柱 时柱 |
| 日主 | X(五行)，身强/身弱 |
| 格局 | XX格 |
| 用神 | X(五行) |
| 忌神 | X(五行) |
| 重要神煞 | 3-5个最重要的(如华盖、魁罡、驿马等) |
| 空亡 | XX |

### 二、库德尔十大领域推演(核心,约1500字)

**十大领域与十神对应:**
- 食神/伤官 → 5艺术、6文学、7音乐(泄秀表达)
- 正财/偏财 → 4说服、2计算(理财求财)
- 正官/七杀 → 8社会服务、3科学(管理分析)
- 正印/偏印 → 3科学、6文学(学习研究)
- 比肩/劫财 → 0户外、1机械(体力协作)

**输出格式:**
🥇 **前三强领域**(详细论述,每个约200字):
- 领域名称+分数(0-100)
- 命理依据(十神/神煞/五行)
- 具体天赋表现

⚠️ **后三弱领域**(明确指出,每个约100字):
- 领域名称+分数
- 弱势原因
- 规避建议

📊 **中间四域**(简要说明,一句话带过)

### 三、宿命职业称号(必须输出)
格式: "{神煞/十神特征}·{职业意象}"
要求: 结合命局核心特征,创造独特且贴切的称号
示例: "华盖魁罡·暗黑诗人" "羊刃杀印·征服者" "食神生财·疗愈师"

### 四、现代职业匹配TOP5(约1200字)
每个职业包含:
- 匹配度(百分比)
- 推荐理由(2-3条,简明扼要)
- 具体方向(细分岗位)
- 注意事项(1条性格短板提示)

### 五、人生发展建议(约800字)
1. 职业发展路径(按大运阶段,重点分析前3步)
2. 性格修炼建议(扬长避短)
3. 生活方式建议(颜色/方位/社交)

### 六、天赋金句(必须输出)
引用一句古籍原文,配现代翻译,高度概括此命的职业天赋。
格式: 「古文原句」——《书名》，译：现代白话

---报告总结开始---
(以下为结构化摘要,供图片生成提取,务必完整输出)
【八字】年柱 月柱 日柱 时柱
【日主】X行（旺/弱）
【用神】X行
【宿命职业称号】XXXXX·XXXX
【库德尔前三强】1.XX领域(XX分) 2.XX领域(XX分) 3.XX领域(XX分)
【库德尔后三弱】8.XX领域(XX分) 9.XX领域(XX分) 10.XX领域(XX分)
【TOP5职业】职业1、职业2、职业3、职业4、职业5
【天赋金句】「古文」——《书名》，译：翻译
---报告总结结束---

输出格式: Markdown,层次清晰,重分析轻排盘。
语气: 专业+激励,强调"天赋可发掘,职业可选择"。
```

### English Version Prompt:

```
You are a senior destiny analyst and career psychologist, expert in Chinese BaZi astrology from "Yuan Hai Zi Ping", "Di Tian Sui", "San Ming Tong Hui", "Qiong Tong Bao Jian", "Shen Feng Tong Kao", and Kuder Preference Record career interest theory.

User Information:
- Birth Date: {birthDate}
- Birth Time: {birthTime}
- Gender: {gender}
- Birth Place: {birthPlace.city}, {birthPlace.province}, {birthPlace.country}

Generate a career talent analysis report (approximately 4000-5000 words, focus on career analysis):

### I. Chart Overview (Concise, ~200 words)
Present core information in a table:
| Item | Content |
|------|---------|
| Four Pillars | Year Month Day Hour |
| Day Master | X (Element), Strong/Weak |
| Pattern | XX Pattern |
| Favorable God | X (Element) |
| Unfavorable God | X (Element) |
| Key Divine Stars | 3-5 most important |
| Void | XX |

### II. Kuder Ten Domains Analysis (Core, ~1200 words)

**Ten Domains & Ten Gods Mapping:**
- Output Stars (Eating God/Hurting Officer) → 5-Artistic, 6-Literary, 7-Musical
- Wealth Stars → 4-Persuasive, 2-Computational
- Authority Stars → 8-Social Service, 3-Scientific
- Resource Stars → 3-Scientific, 6-Literary
- Peer Stars → 0-Outdoor, 1-Mechanical

**Output Format:**
🥇 **Top 3 Strongest Domains** (detailed, ~150 words each):
- Domain name + Score (0-100)
- Chart evidence (Ten Gods/Divine Stars/Elements)
- Specific talent manifestation

⚠️ **Bottom 3 Weakest Domains** (~80 words each):
- Domain name + Score
- Weakness reason
- Avoidance advice

📊 **Middle 4 Domains** (brief, one sentence each)

### III. Destiny Career Title (Required)
Format: "{Divine Stars/Ten Gods Feature} · {Career Imagery}"
Create unique and fitting title based on chart core characteristics
Examples: "Canopy Warrior · Dark Poet" "Blade Authority · Conqueror" "Output Wealth · Healer"

### IV. Modern Career Match TOP5 (~1000 words)
Each career includes:
- Match rate (percentage)
- Recommendation reasons (2-3 points)
- Specific directions (sub-positions)
- Caution (1 personality weakness note)

### V. Life Development Advice (~600 words)
1. Career development path (by life phases, focus on first 3 stages)
2. Personality cultivation advice
3. Lifestyle suggestions (colors/directions/social)

### VI. Talent Golden Quote (Required)
Quote from classical text with modern interpretation, summarizing career talent essence.
Format: "Classical quote" — Book Name, Translation: Modern interpretation

---REPORT SUMMARY START---
(Structured summary for image generation, must output completely)
【BaZi】Year Month Day Hour
【Day Master】X Element (Strong/Weak)
【Favorable】X Element
【Destiny Career Title】XXXXX · XXXX
【Kuder Top 3】1.XX(XX) 2.XX(XX) 3.XX(XX)
【Kuder Bottom 3】8.XX(XX) 9.XX(XX) 10.XX(XX)
【TOP5 Careers】Career1, Career2, Career3, Career4, Career5
【Talent Quote】"Quote" — Book, Translation: interpretation
---REPORT SUMMARY END---

Output format: Markdown, clear hierarchy, career-analysis-focused.
Tone: Professional + encouraging, emphasize "talents can be discovered, careers can be chosen".
```

**输出规范**:

* 格式: Markdown纯文本
* 长度: 7000-9000字
* 结构: 必须包含上述5个章节
* 语言: 简体中文

***

## 🎨 提示词2: 库德尔宿命职业卡图片生成器

**用途**: 根据职业分析结果生成视觉化职业卡片

**输入参数**:

```json
{
  "destinyTitle": "string (如: 华盖魁罡·暗黑诗人)",
  "baziInfo": {
    "year": "庚寅",
    "month": "辛巳",
    "day": "戊辰",
    "time": "庚申",
    "tenGods": ["食神", "伤官", "日主", "食神"],
    "mainGod": "伤官辛金"
  },
  "kuderScores": {
    "top3": [
      {"name": "5-艺术", "score": 95},
      {"name": "6-文学", "score": 88},
      {"name": "7-音乐", "score": 82}
    ],
    "bottom3": [
      {"name": "8-社会服务", "score": 35},
      {"name": "9-文书", "score": 28},
      {"name": "2-计算", "score": 22}
    ]
  },
  "summaryText": "string (古籍箴言,30字内)"
}
```

### 中文图片提示词 (用于中文界面):

```
Create a vertical Kuder Destiny Career Card (9:16 aspect ratio) with steampunk-vaporwave fusion aesthetic.

VISUAL COMPOSITION:
- Background: Deep space indigo with golden star trails and vintage mechanical gears
- Overall style: Retro-futurism meets Chinese divination, holographic textures with industrial elements

TOP SECTION (15%):
- Golden metallic title text: "{name}的库德尔宿命职业卡"
- Seal script (篆书) style font with golden glow effect
- Decorative mechanical gear patterns flanking the title

LEFT PANEL (35%):
- Traditional ink-wash style circular BaZi chart
- Four Pillars displayed in Chinese: {baziPillars}
- Day Master "{dayMaster}" highlighted in center
- Favorable God "{yongShen}" marked in RED
- Chinese labels for Ten Gods
- Ink brush texture with subtle smoke effects

RIGHT PANEL (35%):
- Futuristic DECAGON radar chart (10-sided polygon)
- 10 vertices with Chinese labels for Kuder's 10 career interest areas
- Top 3 strengths glowing brightly: {top3Fields}
- Bottom 3 weaknesses dimmed: {bottom3Fields}
- Neon circuit patterns with Five Element colors
- Color scheme: Wood=cyan, Fire=crimson, Earth=amber, Metal=silver, Water=indigo

CENTER FOCAL POINT (25%):
- LARGEST element on card
- Destiny Title: "{destinyTitle}" in ornate golden seal script (Chinese)
- Rose gold metallic finish with holographic shimmer
- Radiating golden light rays with gear motifs

BOTTOM BANNER (15%):
- Vintage scroll style horizontal banner
- Quote text in Chinese: "{talentQuote}"
- Aged parchment texture with golden border

STYLE REQUIREMENTS:
- Color palette: Deep indigo, vaporwave purple, electric blue, neon pink, gold accents
- Textures: Holographic foil, metallic gold, mechanical gears, cosmic nebula
- ALL TEXT IN CHINESE CHARACTERS (简体中文)
- High information density but clear visual hierarchy
- Steampunk ceremonial atmosphere with futuristic elements
- NO watermarks, NO logos, NO signatures

Quality: Ultra-detailed, sharp focus, professional card design
```

### English Image Prompt (for English interface):

```
Create a vertical Kuder Destiny Career Card (9:16 aspect ratio) with steampunk-vaporwave fusion aesthetic.

VISUAL COMPOSITION:
- Background: Deep space indigo with golden star trails and vintage mechanical gears
- Overall style: Retro-futurism meets Chinese divination, holographic textures with industrial elements

TOP SECTION (15%):
- Golden metallic title text: "{name}'s Kuder Destiny Career Card"
- Elegant serif font with golden glow effect
- Decorative mechanical gear patterns flanking the title

LEFT PANEL (35%):
- Traditional circular BaZi chart with modern styling
- Four Pillars displayed: {baziPillars}
- Day Master "{dayMaster}" ({dayElement} Element) highlighted in center
- Favorable Element "{yongShen}" marked in RED
- English labels: Year/Month/Day/Hour Pillar
- Ink brush texture with mystical aesthetic

RIGHT PANEL (35%):
- Futuristic DECAGON radar chart (10-sided polygon)
- 10 vertices with English labels: Outdoor, Mechanical, Computational, Scientific, Persuasive, Artistic, Literary, Musical, Social Service, Clerical
- Top 3 strengths glowing brightly: {top3Fields}
- Bottom 3 weaknesses dimmed: {bottom3Fields}
- Neon circuit patterns with Five Element colors
- Color scheme: Wood=cyan, Fire=crimson, Earth=amber, Metal=silver, Water=indigo

CENTER FOCAL POINT (25%):
- LARGEST element on card
- Destiny Title: "{destinyTitle}" in elegant golden typography
- Rose gold metallic finish with holographic shimmer
- Radiating golden light rays with gear motifs

BOTTOM BANNER (15%):
- Vintage scroll style horizontal banner
- Quote text in English: "{talentQuote}"
- Aged parchment texture with golden border

STYLE REQUIREMENTS:
- Color palette: Deep indigo, vaporwave purple, electric blue, neon pink, gold accents
- Textures: Holographic foil, metallic gold, mechanical gears, cosmic nebula
- ALL TEXT IN ENGLISH
- High information density but clear visual hierarchy
- Steampunk ceremonial atmosphere with futuristic elements
- NO watermarks, NO logos, NO signatures

Quality: Ultra-detailed, sharp focus, professional card design
```

**提示词设计说明 (gemini-3-pro-image-preview 特性)**:

1. **双语支持**: 中文版全中文文字,英文版全英文文字(包括库德尔十大领域名称)
2. **明确比例**: 使用 9:16 而非像素尺寸,API会自动处理
3. **十边形雷达图**: 明确说明是decagon(十边形),区别于MBTI的八边形
4. **语言标记**: 明确指定 "ALL TEXT IN CHINESE/ENGLISH"
5. **蒸汽波风格关键词**: steampunk, vaporwave, mechanical gears, retro-futurism
6. **负面提示**: 明确排除水印、logo等干扰元素

**输出规范**:

* 尺寸: 1080×3400px (竖版超长)
* 格式: WebP/PNG
* 分辨率: 300 DPI

***

## 🔧 API集成规范

### 调用流程

```
用户输入 → 验证参数 → 调用提示词1(生成报告)
→ 解析报告提取关键信息 → 调用提示词2(生成图片)
→ 返回报告+图片+纯文字总结
```

### 提示词优化要点

**为避免API错误,已做如下优化:**

1. **长度控制**
   * 提示词1: 控制在580 tokens以内
   * 提示词2: 控制在520 tokens以内
   * 总输入: <1200 tokens
2. **结构简化**
   * 库德尔十大领域用编号+简称代替详细描述
   * 十神对应规律用简洁映射表
   * 推演逻辑用关键词提示而非全部展开
3. **输出约束**
   * 明确字数限制(7000-9000字)
   * 明确图片布局百分比分配
   * 避免开放式输出

### 错误处理

**常见API错误及应对:**

| 错误类型                  | 原因      | 解决方案                  |
| --------------------- | ------- | --------------------- |
| 400 Bad Request       | 提示词格式错误 | 检查JSON参数转义            |
| 413 Request Too Large | 输入过长    | 分批调用,先报告后图片           |
| 500 Internal Error    | 输出超限    | 添加max\_tokens=12000限制 |
| 529 Overloaded        | 并发过高    | 添加请求队列和重试             |

**推荐参数设置:**

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 12000,
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
  destinyTitle: parseReportSection("宿命职业称号创建"),
  baziInfo: parseReportSection("八字命盘与基础分析"),
  kuderScores: {
    top3: parseReportSection("前三强领域"),
    bottom3: parseReportSection("后三弱领域")
  },
  summaryText: parseReportSection("人生建议", "一句话天赋金句")
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
  "cardImageUrl": "https://cdn.example.com/kuder-card-xxx.png",
  "downloadUrl": "高清图下载链接",
  "textSummary": {
    "bazi": "庚寅 辛巳 戊辰 庚申",
    "top3Fields": ["5-艺术(95分)", "6-文学(88分)", "7-音乐(82分)"],
    "bottom3Fields": ["8-社会服务(35分)", "9-文书(28分)", "2-计算(22分)"],
    "top5Jobs": ["编剧/小说家", "独立音乐人", "艺术总监", "自媒体创作者", "游戏策划"],
    "destinyTitle": "华盖魁罡·暗黑诗人",
    "goldenSentence": "华盖逢印,尊居翰苑;魁罡得用,声播四方"
  }
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
[职业天赋分析中...] (35秒,显示"AI大师正在推演您的天赋密码")
↓
[生成专属职业卡中...] (25秒,显示"正在绘制您的宿命职业卡")
↓
[完成! 展示报告+图片+纯文字总结]
```

### 结果页面布局

```
+----------------------------------+
|   [超长库德尔职业卡图片]           |
|   (支持放大查看雷达图细节)         |
+----------------------------------+
|   [下载高清图] [分享到朋友圈]      |
+----------------------------------+
|   📊 库德尔十大领域得分           |
|   (可交互雷达图,点击查看详情)      |
+----------------------------------+
|   💼 TOP5匹配职业                |
|   (折叠/展开,每项含详细说明)       |
+----------------------------------+
|   📖 完整职业天赋分析报告         |
|   (分章节显示,可折叠)             |
+----------------------------------+
|   📋 纯文字总结(一键复制)         |
+----------------------------------+
```

***

## 📊 成本估算

基于Claude API定价 (2024年):

* **提示词1** (输入580+输出9000 tokens): \~$0.13/次
* **提示词2** (输入520+输出1 tokens): \~$0.01/次
* **图片生成** (Nano Banana Pro): \~$0.06/张

**单次完整生成成本**: 约 $0.20 USD (≈1.4元人民币)

**定价建议**:

* 免费版: 只生成简版报告(3000字),无图片
* 付费版: 完整报告+图片+纯文字总结, 定价19.9-29.9元
* VIP版: 报告+图片+1对1职业规划咨询, 定价199-399元

***

## ✅ 部署检查清单

* [ ] Claude API密钥配置
* [ ] 图片生成API配置(Nano Banana Pro)
* [ ] 参数验证中间件
* [ ] 真太阳时计算函数(经纬度库)
* [ ] 库德尔十大领域数据结构定义
* [ ] 报告解析正则表达式(提取称号/分数/职业)
* [ ] 图片CDN存储配置
* [ ] 用户请求频率限制(防刷)
* [ ] 错误日志监控
* [ ] 生成队列管理
* [ ] 支付接口集成(可选)
* [ ] 纯文字总结格式化输出

***

## 🆚 与灵魂契合卡的区别

| 对比项  | 灵魂契合卡          | 库德尔职业卡        |
| ---- | -------------- | ------------- |
| 核心理论 | 八字+MBTI        | 八字+库德尔量表      |
| 主要输出 | 性格分析+人生建议      | 职业天赋+岗位匹配     |
| 视觉风格 | 赛博道教+全息光影      | 赛博复古+蒸汽波      |
| 图表类型 | MBTI雷达图(8功能)   | 库德尔十边形图(10领域) |
| 报告长度 | 8000-12000字    | 7000-9000字    |
| 应用场景 | 自我认知+社交分享      | 职业规划+求职指导     |
| 目标人群 | 18-35岁追求自我的年轻人 | 学生/职场人士/转型者   |

***

**提示词版本**: v1.0

**最后更新**: 2024-12

**适用API**: Claude 3.5 Sonnet + Nano Banana Pro

