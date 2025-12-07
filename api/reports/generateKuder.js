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

    // KUDER prompt - optimized to match MBTI format with 7 steps
    let prompt;
    if (isEnglish) {
      prompt = `You are a master of both classical Chinese BaZi astrology (《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》《神峰通考》) and the Kuder Preference Record (1934-2024 all versions), expertly mapping the Ten Career Interest Domains (0-Outdoor, 1-Mechanical, 2-Computational, 3-Scientific, 4-Persuasive, 5-Artistic, 6-Literary, 7-Musical, 8-Social Service, 9-Clerical) to the Five Elements and Ten Gods.

My birth information: ${birthData.date} ${birthData.time}, ${birthData.gender === '男' ? 'Male' : 'Female'}, ${locationInfo}

Please follow these 7 steps strictly:

1. Calculate my Four Pillars (BaZi) using True Solar Time correction. Must include:
   - Year/Month/Day/Hour pillars with Hidden Stems (地支藏干)
   - Ten Gods (十神) for each pillar
   - Divine Stars (神煞)
   - Empty Void positions (空亡)
   - Dayun (Great Luck) starting age and cycle

2. Analyze using traditional methods:
   - Day Master's Five Element and strength (旺衰)
   - Useful Gods (用神) and Taboo Gods (忌神)
   - Destiny pattern classification and level (格局层级)
   - Favorable/Unfavorable Colors (喜忌颜色) based on Five Elements

3. Based on Kuder's ten domains and their official definitions, combined with my Ten Gods, Divine Stars, Palace positions, and Dayun flow, derive my TOP 3 strongest and BOTTOM 3 weakest interest domains. Must include detailed reasoning and scores (0-100 scale), no guessing.

4. Map BaZi characteristics to Kuder's ten domains deeply, create my unique "Destiny Career Title", such as:
   - Shang Guan + Hua Gai + Empty Void → Art/Music extremely strong → "Crimson Shang Guan · Born Artist"
   - Qi Sha + Yang Ren + Lu Shen → Outdoor/Mechanical extremely strong → "Yang Ren Qi Sha · Conqueror"
   - Zheng Cai + Shi Shen + Tian De → Social Service/Clerical extremely strong → "Shi Shen Sheng Cai · Healer"

5. Recommend 3-5 specific modern careers that best match my BaZi profile and Kuder strengths.

6. Output a pure text summary in the EXACT format below for easy social media sharing:

---SOCIAL MEDIA SUMMARY START---
【BaZi】Year-Pillar Month-Pillar Day-Pillar Hour-Pillar
【Day Master】X Element (strength)
【Useful God】X Element
【Favorable Color】Color1, Color2
【Top 3 Domains】①Domain(score) ②Domain(score) ③Domain(score)
【Bottom 3 Domains】①Domain(score) ②Domain(score) ③Domain(score)
【Destiny Career Title】XXX·XXX

【Modern Career Matches · TOP 5】
1. Career Name - Brief explanation of why it suits you (1 sentence)
2. Career Name - Brief explanation of why it suits you (1 sentence)
3. Career Name - Brief explanation of why it suits you (1 sentence)
4. Career Name - Brief explanation of why it suits you (1 sentence)
5. Career Name - Brief explanation of why it suits you (1 sentence)

【Career Development Path】Based on BaZi pattern and Kuder strengths, provide career development advice and advancement direction (2-3 sentences)

【Personality Cultivation】Based on BaZi weaknesses and Kuder weak domains, suggest areas for personal growth (2-3 sentences)

【Lifestyle Suggestions】Based on Five Elements preferences and career characteristics, provide suitable lifestyle and habit recommendations (2-3 sentences)

【Wealth Philosophy】Based on BaZi wealth stars and pattern, analyze suitable financial management and wealth accumulation strategies (2-3 sentences)

【Love & Marriage】Analyze compatible partner types, relationship dynamics, and areas needing attention (2-3 sentences)

【Conclusion · Destiny Awakening】An inspiring summary highlighting your innate mission and life direction (2-3 sentences)

【Talent Quote】「Ancient text quote」—《Book Name》, Translation: modern interpretation
---SOCIAL MEDIA SUMMARY END---

7. Generate the complete report directly, no confirmation needed!

Please output a complete detailed analysis report in markdown format. **IMPORTANT: Write the entire report in English.**`;
    } else {
      prompt = `你同时精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》《神峰通考》，并精通库德尔职业兴趣量表（Kuder Preference Record）1934-2024全部版本的十大兴趣领域（0户外、1机械、2计算、3科学、4说服、5艺术、6文学、7音乐、8社会服务、9文书）及其与五行十神的经典对应，是顶尖命理+职业兴趣双料大师。

我的出生信息：【${birthData.date} ${birthData.time}，${birthData.gender === '男' ? '男性' : '女性'}，${locationInfo}】

请严格按以下7步执行：

1. 用真太阳时精准排出我的四柱八字（已提供时区信息，请据此修正真太阳时），必须包含：
   - 年柱、月柱、日柱、时柱（含地支藏干）
   - 各柱十神
   - 神煞（天乙贵人、文昌、华盖、桃花、驿马、羊刃、禄神等）
   - 空亡位置
   - 大运起运年龄及大运排列

2. 用传统古法分析：
   - 日主五行及旺衰状态
   - 用神、忌神
   - 格局名称及层级（上/中/下等）
   - 喜用颜色、忌讳颜色（根据五行喜忌推导）

3. 按照库德尔量表十大领域的官方定义与评分逻辑，结合我的十神组合、神煞、宫位、大运流向，进行深度推导，得出我天生的前三强兴趣领域与后三弱领域。必须列出详细推理过程和分数（0-100分制），不能乱猜。

4. 把八字特征与库德尔十大领域深度映射，建立我的专属"宿命职业称号"，例如：
   - 伤官+华盖+空亡 → 5艺术/7音乐极强 → "红艳伤官·天生艺术家"
   - 七杀+羊刃+禄神 → 0户外/1机械极强 → "羊刃杀印·征服者"
   - 正财+食神+天德 → 8社会服务/9文书极强 → "食神生财·疗愈师"
   给出最贴合我的宿命职业称号

5. 推荐3-5个最匹配我八字和库德尔优势领域的具体现代职业

6. 最后单独输出一份【朋友圈文案】，必须严格按以下格式输出：

---朋友圈文案开始---
【八字】年柱 月柱 日柱 时柱
【日主】X行（旺/弱）
【用神】X行
【喜用颜色】颜色1、颜色2
【前三强领域】①XX(分数) ②XX(分数) ③XX(分数)
【后三弱领域】①XX(分数) ②XX(分数) ③XX(分数)
【宿命职业称号】XXX·XXX

【现代职业匹配·TOP5推荐】
1. 职业名称 - 简要说明为何适合（1句话）
2. 职业名称 - 简要说明为何适合（1句话）
3. 职业名称 - 简要说明为何适合（1句话）
4. 职业名称 - 简要说明为何适合（1句话）
5. 职业名称 - 简要说明为何适合（1句话）

【职业发展路径】基于八字格局和库德尔优势领域，给出职业发展建议和晋升方向（2-3句话）

【性格修炼建议】根据八字中的不足和库德尔弱势领域，给出需要修炼的性格方面（2-3句话）

【生活方式建议】基于五行喜忌和职业特点，给出适合的生活方式和习惯建议（2-3句话）

【财富观念】根据八字财星和格局，分析适合的理财方式和财富积累建议（2-3句话）

【感情婚姻】分析适合的伴侣类型、感情相处模式和需要注意的问题（2-3句话）

【结语·宿命觉醒】一段激励性的总结，点明天赋使命和人生方向（2-3句话）

【天赋金句】「古籍原文」——《书名》，译：现代白话翻译
---朋友圈文案结束---

7. 直接生成完整报告，不需要二次确认！

请用markdown格式输出完整详细的分析报告。`;
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
              { role: 'user', content: prompt }
            ],
            temperature: 0.6,
            max_tokens: 4500,  // Increased for comprehensive career analysis with TOP5 and lifestyle advice
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

    const chatData = await chatResponse.json();
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
