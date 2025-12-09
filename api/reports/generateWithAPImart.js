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
      prompt = `You are a senior destiny analyst, expert in Chinese BaZi (Four Pillars) astrology from classical texts "Yuan Hai Zi Ping", "Di Tian Sui", "San Ming Tong Hui", "Qiong Tong Bao Jian" and MBTI psychology.

User Information:
- Birth Date: ${birthData.date}
- Birth Time: ${birthData.time}
- Gender: ${birthData.gender === '男' ? 'Male' : 'Female'}
- Birth Place: ${locationInfo}

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

用户信息:
- 出生日期: ${birthData.date}
- 出生时间: ${birthData.time}
- 性别: ${birthData.gender === '男' ? '男性' : '女性'}
- 出生地: ${locationInfo}

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

---

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
语气: 专业+温和,避免宿命论,强调"趋势可知,命运可改"。`;
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
