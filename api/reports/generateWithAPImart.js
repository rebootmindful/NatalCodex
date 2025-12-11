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

    // Build location info with timezone and coordinates
    let locationInfo = `${birthData.location}`;
    if (timezone) {
      locationInfo += ` (时区: ${timezone})`;
    }
    let coordinatesInfo = '';
    if (coordinates && coordinates.lon) {
      coordinatesInfo = `\n- 经度: ${coordinates.lon}° (用于计算真太阳时)`;
    }

    // Full professional prompt - bilingual support
    let prompt;
    if (isEnglish) {
      prompt = `You are a senior destiny analyst, expert in Chinese BaZi (Four Pillars) astrology from classical texts "Yuan Hai Zi Ping", "Di Tian Sui", "San Ming Tong Hui", "Qiong Tong Bao Jian" and MBTI psychology.

**IMPORTANT - True Solar Time Calculation:**
The birth time provided is standard clock time (Beijing Time for China). You MUST convert it to True Solar Time before calculating the BaZi chart.
Formula: True Solar Time = Clock Time + (Longitude - 120°) × 4 minutes
For example: If birth location is at 104°E longitude, correction = (104-120) × 4 = -64 minutes

User Information:
- Birth Date: ${birthData.date}
- Birth Time: ${birthData.time} (Standard Clock Time, needs True Solar Time conversion)
- Gender: ${birthData.gender === '男' ? 'Male' : 'Female'}
- Birth Place: ${locationInfo}${coordinates ? `\n- Longitude: ${coordinates.lon}° (for True Solar Time calculation)` : ''}

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

---

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
Tone: Professional + warm, avoid fatalism, emphasize "trends can be known, destiny can be shaped".`;
    } else {
      prompt = `你是资深命理师,精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和MBTI心理学。

**重要 - 真太阳时计算:**
用户提供的出生时间是钟表时间（北京时间）。排盘前必须先换算成真太阳时！
公式: 真太阳时 = 钟表时间 + (出生地经度 - 120°) × 4分钟
例如: 出生地经度104°E，修正值 = (104-120) × 4 = -64分钟，即比北京时间慢64分钟

**重要**: 每个八字组合都是独一无二的宇宙密码。请深入分析此命的独特之处,避免套话和模板化表达。用生动、具体、有洞察力的语言,让读者感受到"这就是在说我"。

用户信息:
- 出生日期: ${birthData.date}
- 出生时间: ${birthData.time} (钟表时间，需换算真太阳时)
- 性别: ${birthData.gender === '男' ? '男性' : '女性'}
- 出生地: ${locationInfo}${coordinatesInfo}

请按以下结构生成命理分析报告(约5000-6000字,重点在分析而非排盘):

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

### 二、格局深度解析
分析此命格局的独特之处:
- 身强身弱的具体表现
- 格局的层次与特点
- 用神喜忌如何影响人生走向
- 此命独有的优势与需要注意的挑战

### 三、MBTI人格推导
基于命格特征推导(注意:不同八字应得出不同结论):
- 日主五行+十神配置 → I/E倾向
- 格局+思维模式 → N/S倾向
- 食伤/官杀强弱 → T/F倾向
- 印星/财星配置 → J/P倾向

**结论**: MBTI类型 + 认知功能栈
**推导逻辑**: 具体说明为何此八字对应此类型

### 四、灵魂称号(必须输出)
格式: "{日主五行}{意象}·{MBTI}"
要求: 根据此命的核心特质创造独特称号,不要使用常见词汇组合,要有诗意和画面感

### 五、性格深度画像
描绘此人独特的性格特征(6-8条):
- 每条要具体生动,有场景感
- 结合命理依据和MBTI特质
- 写出只有这个八字才会有的特点,避免泛泛而谈

### 六、人生运势分析
1. **事业财运**: 适合什么领域?关键转折期在何时?如何求财?
2. **婚姻感情**: 配偶可能是什么样的人?感情中的优势与挑战?
3. **健康提示**: 需要注意什么?如何养生?

### 七、人生金句(必须输出)
从古籍中选一句最契合此命的话,配现代翻译。
格式: 「古文原句」——《书名》，译：现代白话

---

---报告总结开始---

【八字】年柱 月柱 日柱 时柱
【日主】X行（旺/弱）
【用神】X行
【MBTI】XXXX（主导功能-辅助功能-第三功能-劣势功能）
【灵魂称号】XXXXX·XXXX
【人格金句】「古文」——《书名》，译：翻译

---报告总结结束---

输出格式: Markdown,层次清晰。
语气: 专业+温和,避免宿命论,强调"趋势可知,命运可改"。
**切记**: 让每份报告都独一无二,读者能感受到这是专属于TA的分析。`;
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
            temperature: 0.78,
            max_tokens: 4000,  // Increased for comprehensive BaZi advice including fortune analysis
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

    // Handle both JSON and SSE stream responses
    const responseText = await chatResponse.text();
    let chatData;

    if (responseText.startsWith('data:')) {
      // APImart returned SSE stream format, parse it
      console.log('[GenerateWithAPImart] Received SSE stream response, parsing...');
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
