/**
 * KUDER Career Analysis API endpoint
 * Uses APIMart: GPT-4o-mini for BaZi + Kuder Preference Record analysis
 * Includes caching for identical birth data requests
 */

const cache = require('../../lib/cache');

// APIMart Configuration
const config = {
  API_KEY: process.env.APIMART_API_KEY || '',
  BASE_URL: 'https://api.apimart.ai/v1',
  MODEL: 'gpt-4o-mini'
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

    console.log('[GenerateKuder] Analyzing with GPT-4o-mini...');

    let locationInfo = `${birthData.location}`;
    if (timezone) {
      locationInfo += ` (时区: ${timezone})`;
    }

    // KUDER prompt - optimized for career guidance analysis
    // Use system message to set professional context and avoid content filter issues
    let systemMessage;
    let userMessage;
    
    if (isEnglish) {
      systemMessage = `You are a senior destiny analyst and career psychologist, expert in Chinese BaZi astrology from "Yuan Hai Zi Ping", "Di Tian Sui", "San Ming Tong Hui", "Qiong Tong Bao Jian", "Shen Feng Tong Kao", and Kuder Preference Record career interest theory.

Your role is to provide educational and entertainment-focused career guidance reports for personal development and self-discovery purposes.`;

      userMessage = `User Information:
- Birth Date: ${birthData.date}
- Birth Time: ${birthData.time}
- Gender: ${birthData.gender === '男' ? 'Male' : 'Female'}
- Birth Place: ${locationInfo}

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

**重要**: 每个八字都蕴含独特的职业天赋密码。请深入挖掘此命的独特职业潜能,避免套话和模板化表达。用具体、有洞察力的语言,让读者感受到"这份职业分析就是为我量身定制的"。`;

      userMessage = `用户信息:
- 出生日期: ${birthData.date}
- 出生时间: ${birthData.time}
- 性别: ${birthData.gender === '男' ? '男性' : '女性'}
- 出生地: ${locationInfo}

请按以下结构生成职业天赋分析报告(约5000-6000字,重点在职业分析而非排盘):

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

### 二、库德尔十大领域推演
**十大领域与十神对应:**
- 食神/伤官 → 5艺术、6文学、7音乐(泄秀表达)
- 正财/偏财 → 4说服、2计算(理财求财)
- 正官/七杀 → 8社会服务、3科学(管理分析)
- 正印/偏印 → 3科学、6文学(学习研究)
- 比肩/劫财 → 0户外、1机械(体力协作)

根据此命的十神配置,给出个性化的领域分数和分析:
🥇 **前三强领域**: 领域名称+分数(0-100)+命理依据+具体天赋表现
⚠️ **后三弱领域**: 领域名称+分数+弱势原因+规避建议
📊 **中间四域**: 简要说明

### 三、宿命职业称号(必须输出)
格式: "{神煞/十神特征}·{职业意象}"
要求: 根据此命独特的十神组合创造专属称号,要有画面感,不要套用常见词汇

### 四、现代职业匹配TOP5
根据此命特点推荐5个最适合的职业,每个包含:
- 匹配度(百分比)
- 推荐理由(要具体到此命的特点)
- 具体方向(细分岗位)
- 注意事项(针对此命的性格短板)

### 五、人生发展建议
1. 职业发展路径(结合大运分析关键转折期)
2. 性格修炼建议(针对此命具体的优缺点)
3. 生活方式建议(颜色/方位/社交)

### 六、天赋金句(必须输出)
从古籍中选一句最契合此命职业天赋的话,配现代翻译。
格式: 「古文原句」——《书名》，译：现代白话

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

输出格式: Markdown,层次清晰。
语气: 专业+激励,强调"天赋可发掘,职业可选择"。
**切记**: 让每份报告都独一无二,读者能感受到这是专属于TA的职业分析。`;
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
            temperature: 0.78,
            max_tokens: 4500,
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
