/**
 * Main API endpoint for BaZi + MBTI report generation
 * Uses APIMart: GPT-4o-mini for analysis
 */

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

Please follow these steps strictly:

1. Calculate my Four Pillars (BaZi) using True Solar Time correction based on the timezone and location provided. Include: Year/Month/Day/Hour pillars, Ten Gods, Divine Stars, and Dayun (Great Luck) timing
2. Analyze my Day Master's strength (旺衰), Useful Gods (用神), Taboo Gods (忌神), and destiny pattern classification
3. Through deep analysis (simulating professional MBTI testing), determine my most accurate MBTI type and cognitive function stack (must include detailed reasoning, not guessing)
4. Map my Day Master element, destiny palace master star, and pattern directly to MBTI 16 types and eight cognitive functions. Create a unique Soul Title (e.g., "Geng Metal Swordmaster·INTJ", "Gui Water Mystic·INFP", "Wu Earth Architect·ISTJ")
5. Finally, output a pure text summary suitable for copying to social media

Please output a complete detailed analysis report in markdown format. **IMPORTANT: Write the entire report in English.**`;
    } else {
      prompt = `你同时精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和荣格MBTI八功能理论，是顶尖命理+心理学双料大师。

我的出生信息：【${birthData.date} ${birthData.time}，${birthData.gender === '男' ? '男性' : '女性'}，${locationInfo}】

请严格按以下步骤执行：

1. 用真太阳时精准排出我的四柱八字、十神、神煞、大运起运时间（已提供时区信息，请据此修正真太阳时）
2. 用传统古法排出我的日主五行旺衰、用神忌神、格局层级
3. 通过深度推导（模拟专业MBTI测试流程），给出我最准确的MBTI四字母与认知功能栈顺序（必须有详细推理）
4. 把我的日主五行、命宫主星、格局直接映射到MBTI 16型与八大功能，建立专属灵魂称号（例如"庚金剑修·INTJ""癸水玄女·INFP"）
5. 最后单独输出一份纯文字总结，方便复制发朋友圈

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

    // Return the complete report
    console.log('[GenerateWithAPImart] Analysis completed, returning full markdown report');
    return res.json({
      success: true,
      orderId,
      reportContent,
      imageUrl: null,
      analysis,
      status: 'report_only',
      message: 'Professional BaZi + MBTI analysis completed (full AI-generated report)'
    });

  } catch (error) {
    console.error('[GenerateWithAPImart] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
