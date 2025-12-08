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
      systemMessage = `You are a professional career counselor and Chinese metaphysics consultant. Your expertise includes:
1. Traditional Chinese BaZi (Four Pillars) destiny analysis
2. Kuder Career Interest Inventory assessment methodology
3. Integrating Eastern wisdom with Western career psychology

Your role is to provide educational and entertainment-focused career guidance reports. This is for personal development and self-discovery purposes only.`;

      userMessage = `Please create a career analysis report for a client with the following birth information:
- Date: ${birthData.date}
- Time: ${birthData.time}
- Gender: ${birthData.gender === '男' ? 'Male' : 'Female'}
- Location: ${locationInfo}

Generate a comprehensive report following this structure:

## Part 1: BaZi Analysis
Calculate the Four Pillars using True Solar Time. Include:
- Year/Month/Day/Hour pillars with hidden stems
- Ten Gods for each pillar
- Notable stars and empty void positions
- Major luck cycles

## Part 2: Five Elements Analysis
- Day Master element and strength
- Favorable and unfavorable elements
- Pattern classification
- Lucky colors based on elements

## Part 3: Kuder Career Domains Mapping
Map the BaZi characteristics to Kuder's 10 career interest domains:
(Outdoor, Mechanical, Computational, Scientific, Persuasive, Artistic, Literary, Musical, Social Service, Clerical)

Identify TOP 3 strongest domains and BOTTOM 3 weakest domains with reasoning and scores (0-100).

## Part 4: Career Title & Recommendations
Create a unique career title combining BaZi characteristics with career strengths.
Recommend 5 specific modern careers that align with the analysis.

## Part 5: Life Guidance Summary
Format this section exactly as shown:

---SUMMARY START---
【BaZi】Year Month Day Hour pillars
【Day Master】Element (strength)
【Useful Element】X
【Lucky Colors】Color1, Color2
【Top 3 Domains】①Name(score) ②Name(score) ③Name(score)
【Bottom 3 Domains】①Name(score) ②Name(score) ③Name(score)
【Career Title】Title

【TOP 5 Career Matches】
1. Career - Why it suits (1 sentence)
2. Career - Why it suits (1 sentence)
3. Career - Why it suits (1 sentence)
4. Career - Why it suits (1 sentence)
5. Career - Why it suits (1 sentence)

【Career Path】Development advice (2-3 sentences)
【Personal Growth】Areas to develop (2-3 sentences)
【Lifestyle】Recommendations (2-3 sentences)
【Wealth】Financial approach (2-3 sentences)
【Relationships】Compatible types and advice (2-3 sentences)
【Conclusion】Inspiring summary of life direction (2-3 sentences)
【Wisdom Quote】A relevant classical quote with translation
---SUMMARY END---

Output the complete report in markdown format in English.`;
    } else {
      systemMessage = `你是一位专业的职业规划顾问和中国传统命理咨询师。你的专长包括：
1. 中国传统八字命理分析
2. 库德尔职业兴趣量表评估方法
3. 将东方智慧与西方职业心理学相结合

你的职责是提供教育性和娱乐性的职业指导报告。这仅用于个人发展和自我探索目的。`;

      userMessage = `请为以下客户生成职业分析报告：
- 出生日期：${birthData.date}
- 出生时间：${birthData.time}
- 性别：${birthData.gender === '男' ? '男性' : '女性'}
- 出生地点：${locationInfo}

请按以下结构生成完整报告：

## 第一部分：八字排盘
根据时区计算真太阳时，精准排出四柱八字：
- 年柱、月柱、日柱、时柱（含地支藏干）
- 各柱十神
- 神煞（天乙贵人、文昌、华盖等）
- 空亡位置
- 大运起运年龄及排列

## 第二部分：五行分析
- 日主五行及旺衰状态
- 用神、忌神
- 格局名称及层级
- 喜用颜色、忌讳颜色

## 第三部分：库德尔职业领域映射
将八字特征映射到库德尔十大职业兴趣领域：
（户外、机械、计算、科学、说服、艺术、文学、音乐、社会服务、文书）

分析前三强领域和后三弱领域，给出推理过程和分数（0-100分）。

## 第四部分：职业称号与推荐
创建独特的职业称号，结合八字特征与职业优势。
推荐5个具体的现代职业。

## 第五部分：人生指导总结
请严格按以下格式输出：

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

【职业发展路径】职业发展建议和晋升方向（2-3句话）
【性格修炼建议】需要修炼的性格方面（2-3句话）
【生活方式建议】适合的生活方式和习惯（2-3句话）
【财富观念】理财方式和财富积累建议（2-3句话）
【感情婚姻】适合的伴侣类型和相处建议（2-3句话）
【结语·宿命觉醒】激励性总结，点明人生方向（2-3句话）
【天赋金句】「古籍原文」——《书名》，译：现代白话翻译
---朋友圈文案结束---

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
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
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
