/**
 * KUDER Career Analysis API endpoint
 * Uses APIMart: Doubao-Seed-1.6 for BaZi + Kuder Preference Record analysis
 * Includes caching for identical birth data requests
 */

const cache = require('../../lib/cache');

// APIMart Configuration
const config = {
  API_KEY: process.env.APIMART_API_KEY || '',
  BASE_URL: 'https://api.apimart.ai/v1',
  MODEL: 'doubao-seed-1-6-251015'
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, birthData } = req.body;

  if (!birthData) {
    return res.status(400).json({ error: 'birthData required' });
  }

  const language = birthData.language || 'zh';
  const isEnglish = language === 'en';
  const timezone = birthData.timezone || 'Asia/Shanghai';
  const coordinates = birthData.coordinates || null;

  console.log('[GenerateKuder] Starting KUDER analysis for:', birthData.name);
  console.log('[GenerateKuder] Language:', language);
  console.log('[GenerateKuder] Timezone:', timezone);

  try {
    // Check cache first
    const cacheKey = { ...birthData, type: 'kuder' };
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log('[GenerateKuder] CACHE HIT - returning cached result');
      return res.json({
        ...cachedResult,
        orderId,
        cached: true
      });
    }

    console.log('[GenerateKuder] Analyzing with Doubao-Seed-1.6...');

    // Generate random seed for unique responses
    const randomSeed = Math.random().toString(36).substring(2, 10);

    // Calculate current age
    const birthYear = parseInt(birthData.date.split('-')[0]);
    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - birthYear;

    let locationInfo = `${birthData.location}`;
    if (timezone) {
      locationInfo += ` (时区: ${timezone})`;
    }
    let coordinatesInfo = '';
    if (coordinates && coordinates.lon) {
      coordinatesInfo = `\n- 经度: ${coordinates.lon}° (用于计算真太阳时)`;
    }

    // KUDER prompt - optimized for career guidance analysis
    // Use system message to set professional context and avoid content filter issues
    let systemMessage;
    let userMessage;

    if (isEnglish) {
      systemMessage = `You are a senior destiny analyst and career psychologist, expert in Chinese BaZi astrology from "Yuan Hai Zi Ping", "Di Tian Sui", "San Ming Tong Hui", "Qiong Tong Bao Jian", "Shen Feng Tong Kao", and Kuder Preference Record career interest theory.

Your role is to provide educational and entertainment-focused career guidance reports for personal development and self-discovery purposes.

**IMPORTANT - True Solar Time Calculation:**
The birth time provided is standard clock time (Beijing Time for China). You MUST convert it to True Solar Time before calculating the BaZi chart.
Formula: True Solar Time = Clock Time + (Longitude - 120°) × 4 minutes
For example: If birth location is at 104°E longitude, correction = (104-120) × 4 = -64 minutes`;

      userMessage = `User Information:
- Birth Date: ${birthData.date}
- Birth Time: ${birthData.time} (Standard Clock Time, needs True Solar Time conversion)
- Gender: ${birthData.gender === '男' ? 'Male' : 'Female'}
- Birth Place: ${locationInfo}${coordinates ? `\n- Longitude: ${coordinates.lon}° (for True Solar Time calculation)` : ''}

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

---

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
Tone: Professional + encouraging, emphasize "talents can be discovered, careers can be chosen".`;
    } else {
      systemMessage = `你是资深命理师×职业心理学专家，精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》《神峰通考》，以及库德尔职业兴趣量表(Kuder Preference Record)理论。

你的职责是提供教育性和娱乐性的职业指导报告，用于个人发展和自我探索目的。

**重要 - 真太阳时计算:**
用户提供的出生时间是钟表时间（北京时间）。排盘前必须先换算成真太阳时！
公式: 真太阳时 = 钟表时间 + (出生地经度 - 120°) × 4分钟
例如: 出生地经度104°E，修正值 = (104-120) × 4 = -64分钟，即比北京时间慢64分钟

**核心要求 - 千人千面:**
本次分析编号: ${randomSeed}
每份报告必须独一无二！严禁使用以下套话：
- ❌ "您是一个..." / "你是一个有..."
- ❌ "总的来说" / "综上所述"
- ❌ "建议您..." / "希望您..."
- ❌ 任何放之四海皆准的泛泛描述
用第二人称"你"直接对话，像老友聊天般自然。`;

      userMessage = `用户信息:
- 姓名: ${birthData.name || '缘主'}
- 出生日期: ${birthData.date}
- 出生时间: ${birthData.time} (钟表时间，需换算真太阳时)
- 性别: ${birthData.gender === '男' ? '男性' : '女性'}
- 当前年龄: ${currentAge}岁
- 出生地: ${locationInfo}${coordinatesInfo}

请为【${birthData.name || '缘主'}】生成专属职业天赋分析报告(约5000-6000字):

### 一、命盘速览
用表格呈现核心信息:
| 项目 | 内容 |
|------|------|
| 四柱 | 年柱 月柱 日柱 时柱 |
| 日主 | X(五行)，身强/身弱 |
| 格局 | XX格 |
| 用神 | X(五行) |
| 忌神 | X(五行) |
| 重要神煞 | 3-5个最重要的 |
| 空亡 | XX |
| 当前大运 | XX岁-XX岁 XX运 |

### 二、库德尔十大领域推演
**十大领域与十神对应:**
- 食神/伤官 → 5艺术、6文学、7音乐(泄秀表达)
- 正财/偏财 → 4说服、2计算(理财求财)
- 正官/七杀 → 8社会服务、3科学(管理分析)
- 正印/偏印 → 3科学、6文学(学习研究)
- 比肩/劫财 → 0户外、1机械(体力协作)

根据【${birthData.name || '缘主'}】的十神配置,给出个性化的领域分数和分析:
🥇 **前三强领域**: 领域名称+分数(0-100)+命理依据+具体天赋表现
⚠️ **后三弱领域**: 领域名称+分数+弱势原因+规避建议
📊 **中间四域**: 简要说明

### 三、宿命职业称号(必须输出)
格式: "{神煞/十神特征}·{职业意象}"
要求:
- 根据此命独特的十神组合创造专属称号
- 要有画面感和诗意
- 避免"XX之人"这类平庸表达
- 示例: "华盖孤鹤·文曲星" "伤官透杀·破局者" "食神生财·创意商人"

### 四、现代职业匹配TOP5
为【${birthData.name || '缘主'}】推荐5个最适合的具体职业:
- 匹配度(百分比)
- 推荐理由(2-3点，必须结合此命特点)
- 具体方向(细分岗位，如"产品经理-ToB方向"而非泛泛说"产品")
- 性格短板提醒(针对此命具体弱点)

### 五、人生发展建议
结合【${birthData.name || '缘主'}】当前${currentAge}岁的人生阶段:
1. **职业发展路径**
   - 当前大运对职业的影响
   - 未来3-5年的关键机遇期
   - ${currentAge < 30 ? '30岁前应完成的职业积累' : currentAge < 40 ? '当前阶段的职业突破方向' : '经验变现与价值最大化建议'}

2. **性格修炼建议**
   - 此命最需要克服的1-2个职场短板
   - 具体的提升方法

3. **生活方式建议**
   - 有利的办公方位和颜色
   - 适合的社交圈层

### 六、天赋金句(必须输出)
从古籍中选一句最契合【${birthData.name || '缘主'}】职业天赋的话:
格式: 「古文原句」——《书名》，译：现代白话
要求: 这句话必须与此人职业命格高度相关，不能是万能金句

---

---报告总结开始---

【八字】年柱 月柱 日柱 时柱
【日主】X行（旺/弱）
【用神】X行
【宿命职业称号】XXXXX·XXXX
【库德尔前三强】1.XX领域(XX分) 2.XX领域(XX分) 3.XX领域(XX分)
【库德尔后三弱】8.XX领域(XX分) 9.XX领域(XX分) 10.XX领域(XX分)
【TOP5职业】职业1、职业2、职业3、职业4、职业5
【天赋金句】「古文」——《书名》，译：翻译

---报告总结结束---

输出格式: Markdown，层次清晰，重点加粗。
语气: 专业但温暖，像一位智慧的职业导师在聊天。
**切记**: 这是为【${birthData.name || '缘主'}】量身定制的唯一职业分析报告！`;
    }

    // Call APIMart Chat API with retry logic
    let chatResponse;
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        chatResponse = await fetch(`${config.BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: config.MODEL,
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.9,
            max_tokens: 5000,
            stream: false
          })
        });

        if (chatResponse.ok) {
          break;
        }

        if (chatResponse.status === 504 && retries < maxRetries) {
          console.log(`[GenerateKuder] 504 timeout, retrying... (${retries + 1}/${maxRetries})`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        const errorText = await chatResponse.text();
        console.error('[GenerateKuder] Chat API Error:', chatResponse.status, errorText);
        throw new Error(`Chat API returned ${chatResponse.status}: ${errorText.substring(0, 200)}`);

      } catch (fetchError) {
        if (retries < maxRetries && (fetchError.message.includes('504') || fetchError.message.includes('timeout'))) {
          console.log(`[GenerateKuder] Fetch error, retrying... (${retries + 1}/${maxRetries})`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw fetchError;
      }
    }

    if (!chatResponse || !chatResponse.ok) {
      throw new Error('Failed to get response from Chat API after retries');
    }

    // Handle both JSON and SSE stream responses
    const responseText = await chatResponse.text();
    let chatData;

    if (responseText.startsWith('data:')) {
      // APImart returned SSE stream format, parse it
      console.log('[GenerateKuder] Received SSE stream response, parsing...');
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

    console.log('[GenerateKuder] API Response received');

    const finishReason = chatData.choices?.[0]?.finish_reason;
    let content = chatData.choices?.[0]?.message?.content || '';

    if (finishReason === 'length') {
      console.error('[GenerateKuder] Response truncated due to token limit!');
      return res.status(500).json({
        success: false,
        error: 'AI response was truncated due to token limit.',
        details: { finishReason, contentLength: content.length }
      });
    }

    if (!content || content.length === 0) {
      console.error('[GenerateKuder] Empty response from API!');
      return res.status(500).json({
        success: false,
        error: 'API returned empty content.'
      });
    }

    console.log('[GenerateKuder] Content length:', content.length);

    // Build report content
    let reportContent;
    if (isEnglish) {
      reportContent = `# ${birthData.name}'s BaZi & Kuder Career Analysis Report

## Basic Information
- Birth: ${birthData.date} ${birthData.time}
- Location: ${birthData.location}
- Timezone: ${timezone}
- Gender: ${birthData.gender === '男' ? 'Male' : 'Female'}

---

${content}

---
*This report is AI-generated, combining traditional Chinese BaZi astrology with Kuder Preference Record career analysis*
*Generated: ${new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC' })}*
*Order ID: ${orderId}*`;
    } else {
      reportContent = `# ${birthData.name}的八字命理与库德尔职业分析报告

## 基本信息
- 出生：${birthData.date} ${birthData.time}
- 地点：${birthData.location}
- 时区：${timezone}
- 性别：${birthData.gender}

---

${content}

---
*本报告由AI生成，融合中国传统八字命理与库德尔职业兴趣量表分析*
*生成时间：${new Date().toLocaleString('zh-CN', { timeZone: timezone || 'Asia/Shanghai' })}*
*订单号：${orderId}*`;
    }

    const analysis = {
      raw_content: content,
      type: 'kuder',
      metadata: {
        birthDate: birthData.date,
        birthTime: birthData.time,
        location: birthData.location,
        gender: birthData.gender
      }
    };

    const result = {
      success: true,
      reportContent,
      imageUrl: null,
      analysis,
      reportType: 'kuder',
      status: 'report_only',
      message: 'Professional BaZi + Kuder career analysis completed'
    };

    // Save to cache
    cache.set(cacheKey, result);

    console.log('[GenerateKuder] Analysis completed');
    return res.json({
      ...result,
      orderId,
      cached: false
    });

  } catch (error) {
    console.error('[GenerateKuder] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
