/**
 * Main API endpoint for BaZi + MBTI report generation
 * Uses APIMart: GPT-4o-mini for analysis
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

  // Extract language preference (default to Chinese)
  const language = birthData.language || 'zh';
  const isEnglish = language === 'en';

  // Extract timezone and coordinates if available
  const timezone = birthData.timezone || 'Asia/Shanghai';
  const coordinates = birthData.coordinates || null;

  console.log('[GenerateWithAPImart] Starting complete flow for:', birthData.name);
  console.log('[GenerateWithAPImart] Language:', language);
  console.log('[GenerateWithAPImart] Timezone:', timezone);
  if (coordinates) {
    console.log('[GenerateWithAPImart] Coordinates:', coordinates.lat, coordinates.lon);
  }

  try {
    // Check cache first (same birth data = same analysis result)
    const cachedResult = cache.get(birthData);
    if (cachedResult) {
      console.log('[GenerateWithAPImart] CACHE HIT - returning cached result');
      // Update orderId for the new request
      return res.json({
        ...cachedResult,
        orderId,
        cached: true
      });
    }

    // Step 1: Analyze with GPT-4o-mini (BaZi + MBTI)
    console.log('[GenerateWithAPImart] Step 1/4: Analyzing with GPT-4o-mini...');

    // Build location info with timezone
    let locationInfo = `${birthData.location}`;
    if (timezone) {
      locationInfo += ` (时区: ${timezone})`;
    }

    // Full professional prompt - bilingual support
    let prompt;
    if (isEnglish) {
      prompt = `You are a master of both classical Chinese BaZi astrology (《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》) and Jungian MBTI cognitive function theory.

My birth information: ${birthData.date} ${birthData.time}, ${birthData.gender === '男' ? 'Male' : 'Female'}, ${locationInfo}

Please follow these 6 steps strictly:

1. Calculate my Four Pillars (BaZi) using True Solar Time correction based on the timezone and location provided. Include:
   - Year/Month/Day/Hour pillars with Hidden Stems (地支藏干)
   - Ten Gods (十神) for each pillar
   - Divine Stars (神煞)
   - Empty Void positions (空亡)
   - Dayun (Great Luck) starting age and cycle

2. Analyze using traditional methods:
   - Day Master's Five Element and strength (旺衰)
   - Useful Gods (用神) and Taboo Gods (忌神)
   - Destiny pattern classification and level (格局层级)

3. Through deep analysis (simulating professional MBTI testing), determine my most accurate MBTI type and cognitive function stack order (Ni/Ne/Si/Se/Ti/Te/Fi/Fe). Must include detailed reasoning, not guessing.

4. Map my Day Master element, destiny palace master star, and pattern directly to MBTI 16 types and eight cognitive functions. Create a unique Soul Title (e.g., "Geng Metal Swordmaster·INTJ", "Gui Water Mystic·INFP", "Wu Earth Architect·ISTJ")

5. Output a pure text summary in the EXACT format below for easy social media sharing:

---SOCIAL MEDIA SUMMARY START---
【BaZi】Year-Pillar Month-Pillar Day-Pillar Hour-Pillar
【Day Master】X Element (strength)
【Useful God】X Element
【MBTI】XXXX (Dominant-Auxiliary-Tertiary-Inferior functions)
【Soul Title】XXX·XXXX
【Personality Quote】「Ancient text quote」erta—erta《Book Name》, Translation: modern interpretation
---SOCIAL MEDIA SUMMARY END---

6. Generate the complete report directly, no confirmation needed!

Please output a complete detailed analysis report in markdown format. **IMPORTANT: Write the entire report in English.**`;
    } else {
      prompt = `你同时精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和荣格MBTI八功能理论，是顶尖命理+心理学双料大师。

我的出生信息：【${birthData.date} ${birthData.time}，${birthData.gender === '男' ? '男性' : '女性'}，${locationInfo}】

请严格按以下6步执行：

1. 用真太阳时精准排出我的四柱八字（已提供时区信息，请据此修正真太阳时），必须包含：
   - 年柱、月柱、日柱、时柱（含地支藏干）
   - 各柱十神
   - 神煞（天乙贵人、文昌、华盖、桃花、驿马等）
   - 空亡位置
   - 大运起运年龄及大运排列

2. 用传统古法分析：
   - 日主五行及旺衰状态
   - 用神、忌神
   - 格局名称及层级（上/中/下等）

3. 通过深度问答式推导（模拟最专业MBTI测试流程），给出我最准确的MBTI四字母与认知功能栈顺序（Ni/Ne/Si/Se/Ti/Te/Fi/Fe的排列）。必须有详细推理过程，不能乱猜。

4. 把我的日主五行、命宫主星、格局直接映射到MBTI 16型与八大功能，建立专属灵魂称号（例如"庚金剑修·INTJ""癸水玄女·INFP""戊土建筑师·ISTJ"等）

5. 最后单独输出一份【朋友圈文案】，必须严格按以下格式输出：

---朋友圈文案开始---
【八字】年柱 月柱 日柱 时柱
【日主】X行（旺/弱）
【用神】X行
【MBTI】XXXX（主导功能-辅助功能-第三功能-劣势功能）
【灵魂称号】XXX·XXXX
【人格金句】「古籍原文」——《书名》，译：现代白话翻译
---朋友圈文案结束---

6. 直接生成完整报告，不需要二次确认！

请用markdown格式输出完整详细的分析报告。`;
    }

    // Call APIMart Chat API directly with retry logic
    let chatResponse;
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        // Use balanced settings: low temperature for consistency, sufficient tokens for complete response
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
            max_tokens: 3000,  // GPT-4o-mini can handle longer outputs reliably
            stream: false
          })
        });

        if (chatResponse.ok) {
          break; // Success, exit retry loop
        }

        // If 504 timeout, retry
        if (chatResponse.status === 504 && retries < maxRetries) {
          console.log(`[GenerateWithAPImart] 504 timeout, retrying... (${retries + 1}/${maxRetries})`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          continue;
        }

        // Other errors, throw immediately
        const errorText = await chatResponse.text();
        console.error('[GenerateWithAPImart] Chat API Error:', chatResponse.status, errorText);
        throw new Error(`Chat API returned ${chatResponse.status}: ${errorText.substring(0, 200)}`);

      } catch (fetchError) {
        if (retries < maxRetries && (fetchError.message.includes('504') || fetchError.message.includes('timeout'))) {
          console.log(`[GenerateWithAPImart] Fetch error, retrying... (${retries + 1}/${maxRetries})`);
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
    console.log('[GenerateWithAPImart] API Response received');
    console.log('[GenerateWithAPImart] Response structure:', {
      hasChoices: !!chatData.choices,
      choicesLength: chatData.choices?.length,
      hasMessage: !!chatData.choices?.[0]?.message,
      hasContent: !!chatData.choices?.[0]?.message?.content,
      contentLength: chatData.choices?.[0]?.message?.content?.length,
      finishReason: chatData.choices?.[0]?.finish_reason
    });

    // Check if response was truncated due to length limit
    const finishReason = chatData.choices?.[0]?.finish_reason;
    let content = chatData.choices?.[0]?.message?.content || '';

    console.log('[GenerateWithAPImart] Response finish_reason:', finishReason);
    console.log('[GenerateWithAPImart] Content length:', content.length);

    if (finishReason === 'length') {
      console.error('[GenerateWithAPImart] Response truncated due to token limit!');
      console.error('[GenerateWithAPImart] finishReason:', finishReason);
      console.error('[GenerateWithAPImart] Content length:', content.length);

      return res.status(500).json({
        success: false,
        error: 'AI response was truncated due to token limit. The prompt may be too long or max_tokens too small.',
        details: {
          finishReason,
          contentLength: content.length,
          prompt_length: prompt.length
        }
      });
    }

    if (!content || content.length === 0) {
      console.error('[GenerateWithAPImart] Empty response from API!');
      console.error('[GenerateWithAPImart] Full API response:', JSON.stringify(chatData, null, 2));

      return res.status(500).json({
        success: false,
        error: 'API returned empty content. Please check API key and model availability.',
        details: {
          finishReason,
          hasChoices: !!chatData.choices,
          choicesLength: chatData.choices?.length
        }
      });
    }
    console.log('[GenerateWithAPImart] Raw content length:', content.length);
    console.log('[GenerateWithAPImart] Content preview:', content.substring(0, 500));  // Log first 500 chars

    // Use AI's markdown output directly as the report - bilingual headers
    let reportContent;
    if (isEnglish) {
      reportContent = `# ${birthData.name}'s BaZi & MBTI Personality Analysis Report

## Basic Information
- Birth: ${birthData.date} ${birthData.time}
- Location: ${birthData.location}
- Timezone: ${timezone}
- Gender: ${birthData.gender === '男' ? 'Male' : 'Female'}

---

${content}

---
*This report is AI-generated, combining traditional Chinese BaZi astrology with modern MBTI psychology*
*Generated: ${new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC' })}*
*Order ID: ${orderId}*`;
    } else {
      reportContent = `# ${birthData.name}的八字命理与MBTI人格分析报告

## 基本信息
- 出生：${birthData.date} ${birthData.time}
- 地点：${birthData.location}
- 时区：${timezone}
- 性别：${birthData.gender}

---

${content}

---
*本报告由AI生成，融合中国传统八字命理与现代MBTI心理学*
*生成时间：${new Date().toLocaleString('zh-CN', { timeZone: timezone || 'Asia/Shanghai' })}*
*订单号：${orderId}*`;
    }

    // Create a minimal analysis object for compatibility
    const analysis = {
      raw_content: content,
      metadata: {
        birthDate: birthData.date,
        birthTime: birthData.time,
        location: birthData.location,
        gender: birthData.gender
      }
    };

    // Prepare result object
    const result = {
      success: true,
      reportContent,
      imageUrl: null,
      analysis,
      reportType: 'mbti',  // Add reportType for frontend type matching
      status: 'report_only',
      message: 'Professional BaZi + MBTI analysis completed (full AI-generated report)'
    };

    // Save to cache for future identical requests
    cache.set(birthData, result);

    // Return the complete report
    console.log('[GenerateWithAPImart] Analysis completed, returning full markdown report');
    return res.json({
      ...result,
      orderId,
      cached: false
    });

  } catch (error) {
    console.error('[GenerateWithAPImart] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
