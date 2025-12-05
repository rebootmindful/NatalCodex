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

    // KUDER prompt - optimized to match MBTI format
    let prompt;
    if (isEnglish) {
      prompt = `You are a master of both classical Chinese BaZi astrology (《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》《神峰通考》) and the Kuder Preference Record (1934-2024 all versions), expertly mapping the Ten Career Interest Domains (0-Outdoor, 1-Mechanical, 2-Computational, 3-Scientific, 4-Persuasive, 5-Artistic, 6-Literary, 7-Musical, 8-Social Service, 9-Clerical) to the Five Elements and Ten Gods.

My birth information: ${birthData.date} ${birthData.time}, ${birthData.gender === '男' ? 'Male' : 'Female'}, ${locationInfo}

Please follow these 6 steps strictly:

1. Calculate my Four Pillars (BaZi) using True Solar Time correction. Include: Year/Month/Day/Hour pillars, Ten Gods, Divine Stars, Dayun timing, Empty Void positions
2. Analyze Day Master strength, Useful Gods, Taboo Gods, destiny pattern classification, favorable colors
3. Based on Kuder's ten domains and their official definitions, combined with my Ten Gods, Divine Stars, Palace positions, and Dayun flow, derive my TOP 3 strongest and BOTTOM 3 weakest interest domains (must include detailed reasoning with scores 0-100)
4. Map BaZi characteristics to Kuder's ten domains deeply, create my unique "Destiny Career Title", such as:
   - Shang Guan + Hua Gai + Empty Void → Art/Music extremely strong → "Crimson Shang Guan · Born Artist"
   - Qi Sha + Yang Ren + Lu Shen → Outdoor/Mechanical extremely strong → "Yang Ren Qi Sha · Conqueror"
   - Zheng Cai + Shi Shen + Tian De → Social Service/Clerical extremely strong → "Shi Shen Sheng Cai · Healer"
5. Output a pure text summary including: complete BaZi, Kuder top 3 + bottom 3 domains with scores, 3-5 matching modern careers, Destiny Career Title, one-sentence talent quote - for easy social sharing
6. Generate the complete report directly, no confirmation needed

Please output a complete detailed analysis report in markdown format. **IMPORTANT: Write the entire report in English.**`;
    } else {
      prompt = `你同时精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》《神峰通考》，并精通库德尔职业兴趣量表（Kuder Preference Record）1934-2024全部版本的十大兴趣领域（0户外、1机械、2计算、3科学、4说服、5艺术、6文学、7音乐、8社会服务、9文书）及其与五行十神的经典对应，是顶尖命理+职业兴趣双料大师。

我的出生信息：【${birthData.date} ${birthData.time}，${birthData.gender === '男' ? '男性' : '女性'}，${locationInfo}】

请严格按以下6步执行：

1. 用真太阳时精准排出我的四柱八字、十神、神煞、大运起运时间、空亡（已提供时区信息，请据此修正真太阳时）
2. 用传统古法排出日主五行旺衰、用神忌神、格局层级、喜忌颜色
3. 按照库德尔量表十大领域的官方定义与评分逻辑，结合我的十神组合、神煞、宫位、大运流向，进行深度推导，得出我天生的前三强兴趣领域与后三弱领域（必须列出详细推理过程和分数0-100，不能乱猜）
4. 把八字特征与库德尔十大领域深度映射，建立我的专属"宿命职业称号"，例如：
   - 伤官+华盖+空亡 → 5艺术/7音乐极强 → "红艳伤官·天生艺术家"
   - 七杀+羊刃+禄神 → 0户外/1机械极强 → "羊刃杀印·征服者"
   - 正财+食神+天德 → 8社会服务/9文书极强 → "食神生财·疗愈师"
   给出最贴合我的宿命职业称号
5. 最后单独输出一份纯文字总结，包含：
   - 完整八字
   - 库德尔前三强+后三弱领域（带分数）
   - 最匹配的3-5个现代职业
   - 宿命职业称号
   - 一句话天赋金句（引用古籍原文+现代翻译，如"《穷通宝鉴》云：'xxx'，译：xxx"）
   方便直接复制发朋友圈
6. 直接生成完整报告，不需要二次确认

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
            max_tokens: 3500,
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
