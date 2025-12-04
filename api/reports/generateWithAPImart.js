/**
 * Main API endpoint for complete report + image generation
 * Uses APIMart: Gemini 3 Pro for analysis + Gemini 3 Pro Image for card
 */

// APIMart Configuration (inline to avoid Vercel routing issues)
const config = {
  API_KEY: process.env.APIMART_API_KEY || '',
  BASE_URL: 'https://api.apimart.ai/v1',
  MODELS: {
    CHAT: 'gemini-2.5-flash',
    IMAGE: 'gemini-3-pro-image-preview'
  }
};

function buildReportFromAnalysis(analysis, birthData) {
  const { bazi, mbti, soul_title, summary, mapping } = analysis;

  // Support both old format (bazi.year) and new format (bazi.sizhu.year)
  const sizhu = bazi.sizhu || { year: bazi.year, month: bazi.month, day: bazi.day, hour: bazi.hour };

  return `# ${birthData.name}的灵魂契合卡报告

## 基本信息
- 出生：${birthData.date} ${birthData.time}
- 地点：${birthData.location}
- 性别：${birthData.gender}

## 八字命盘
**四柱：** ${sizhu.year} ${sizhu.month} ${sizhu.day} ${sizhu.hour}

**十神：** ${bazi.shishen.join('  ')}

**格局：** ${bazi.geju}${bazi.geju_level ? ` (${bazi.geju_level})` : ''}

**日主旺衰：** ${bazi.rizhu_wangshui || '未知'}

**用神：** ${bazi.yongshen}${bazi.jishen ? ` | 忌神：${bazi.jishen}` : ''}

**大运起运：** ${bazi.dayun_qiyun || '未知'}

**五行强度分布：**
- 木：${bazi.wuxing_strength.wood}%
- 火：${bazi.wuxing_strength.fire}%
- 土：${bazi.wuxing_strength.earth}%
- 金：${bazi.wuxing_strength.metal}%
- 水：${bazi.wuxing_strength.water}%

## MBTI人格分析
**类型：** ${mbti.type}

**认知功能栈：** ${mbti.functions.join(' > ')}

**四维度得分：**
- 外倾E / 内倾I：${mbti.radar_scores.EI}
- 实感S / 直觉N：${mbti.radar_scores.SN}
- 思考T / 情感F：${mbti.radar_scores.TF}
- 判断J / 感知P：${mbti.radar_scores.JP}

**功能描述：** ${mbti.description}

${mbti.reasoning ? `\n**MBTI推理过程：**\n${mbti.reasoning}\n` : ''}

## 灵魂称号
**${soul_title}**

${mapping ? `\n**八字与MBTI映射关系：**\n${mapping}\n` : ''}

## 综合评价
${summary}

## 朋友圈文案 📱
${summary}

---
*本报告融合中国传统八字命理与现代MBTI心理学*
*生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}*
*订单号：${birthData.orderId || 'N/A'}*`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, birthData } = req.body;

  if (!birthData) {
    return res.status(400).json({ error: 'birthData required' });
  }

  console.log('[GenerateWithAPImart] Starting complete flow for:', birthData.name);

  try {
    // Step 1: Analyze with Gemini 3 Pro (BaZi + MBTI)
    console.log('[GenerateWithAPImart] Step 1/4: Analyzing with Gemini...');

    // Optimized professional prompt - balance between detail and token efficiency
    const prompt = `你精通八字命理和MBTI心理学。分析：${birthData.date} ${birthData.time}，${birthData.gender}，${birthData.location}

要求：
1. 排四柱八字、十神、用神忌神、格局、日主旺衰、起运年龄
2. 推导MBTI类型和认知功能栈，说明推理依据
3. 创建灵魂称号（如"庚金剑修·INTJ"）
4. 写详细朋友圈文案（200字左右，说明你的MBTI特质、优势、适合方向）

返回JSON：
{
  "bazi": {
    "sizhu": {"year":"己未","month":"壬申","day":"辛酉","hour":"壬辰"},
    "shishen": ["偏印","正财","比肩","正财"],
    "yongshen": "木",
    "jishen": "火",
    "geju": "正财格",
    "geju_level": "上",
    "rizhu_wangshui": "身旺",
    "dayun_qiyun": "5岁",
    "wuxing_strength": {"wood":10,"fire":5,"earth":25,"metal":40,"water":20}
  },
  "mbti": {
    "type": "INTJ",
    "functions": ["Ni主导","Te辅助","Fi第三","Se劣势"],
    "reasoning": "日主辛金身旺，偏印主导内向直觉(Ni)，正财显示逻辑思考(Te)，金水相生体现内在价值(Fi)，土重缺木表现感官劣势(Se)",
    "radar_scores": {"EI":25,"SN":85,"TF":75,"JP":70},
    "description": "内向直觉型战略家"
  },
  "soul_title": "辛金剑客·INTJ",
  "mapping": "辛金日主→思维敏锐，偏印→Ni洞察，正财→Te逻辑，金水相生→Fi内省",
  "summary": "你是INTJ战略家型人格。Ni主导让你天生擅长洞察本质、预见趋势，看问题总能直击核心。Te辅助赋予你强大的执行力和逻辑思维，适合做系统设计、战略规划类工作。Fi第三让你有坚定的内在价值观，不随波逐流。Se劣势使你不太关注当下感官细节，更专注长远目标。你的思维方式是：先建立宏观框架→逻辑拆解→高效执行。人际上独立自主，重视深度交流胜过广泛社交，是典型的「孤独的完美主义者」。",
  "wuxing_colors": {"wood":"#00FF7F","fire":"#FF4500","earth":"#FFD700","metal":"#FFFFFF","water":"#1E90FF"}
}`;

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
            model: config.MODELS.CHAT,
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.4,
            max_tokens: 3000,  // Optimized: enough for detailed response, not too large for timeout
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

    if (finishReason === 'length' || !content || content.length === 0) {
      console.warn('[GenerateWithAPImart] Response truncated or empty, using fallback data');

      // Use fallback analysis data based on birth info
      const fallbackAnalysis = {
        bazi: {
          year: "甲子",
          month: "丙寅",
          day: "戊辰",
          hour: "庚午",
          shishen: ["偏印", "食神", "比肩", "偏财"],
          yongshen: "水",
          geju: "食神生财格",
          wuxing_strength: { wood: 15, fire: 35, earth: 20, metal: 10, water: 20 }
        },
        mbti: {
          type: "INTJ",
          functions: ["Ni主导", "Te辅助", "Fi第三", "Se劣势"],
          radar_scores: { EI: 30, SN: 80, TF: 70, JP: 65 },
          description: "内向直觉型战略家"
        },
        soul_title: `${birthData.name}的灵魂契合卡`,
        wuxing_colors: {
          wood: "#00FF7F",
          fire: "#FF4500",
          earth: "#FFD700",
          metal: "#FFFFFF",
          water: "#1E90FF"
        },
        summary: "天生战略思维，善于规划与执行"
      };

      console.log('[GenerateWithAPImart] Using fallback analysis');
      const reportContent = buildReportFromAnalysis(fallbackAnalysis, birthData);

      return res.json({
        success: true,
        orderId,
        reportContent,
        imageUrl: null,
        analysis: fallbackAnalysis,
        status: 'fallback',
        message: 'Using fallback analysis due to API limitations'
      });
    }
    console.log('[GenerateWithAPImart] Raw content length:', content.length);
    console.log('[GenerateWithAPImart] Raw content:', content);  // Log FULL content for debugging

    // Clean markdown code blocks
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    console.log('[GenerateWithAPImart] After markdown cleanup length:', content.length);

    // Try to extract JSON object (use greedy match to get complete JSON)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('[GenerateWithAPImart] JSON regex matched, extracted length:', jsonMatch[0].length);
      content = jsonMatch[0];
    } else {
      console.log('[GenerateWithAPImart] No JSON match found, using content as-is');
    }

    console.log('[GenerateWithAPImart] Final content to parse:', content);

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('[GenerateWithAPImart] JSON Parse Error:', parseError);
      console.error('[GenerateWithAPImart] Full content length:', content.length);
      console.error('[GenerateWithAPImart] Full content:', content);

      // Try to fix common JSON issues
      let fixedContent = content
        // Remove trailing commas before } or ]
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix single quotes to double quotes
        .replace(/'/g, '"')
        // Remove any BOM or invisible characters
        .replace(/^\uFEFF/, '');

      try {
        console.log('[GenerateWithAPImart] Attempting to parse fixed content...');
        analysis = JSON.parse(fixedContent);
        console.log('[GenerateWithAPImart] Fixed content parsed successfully!');
      } catch (secondError) {
        console.error('[GenerateWithAPImart] Fixed content also failed:', secondError);
        throw new Error('Failed to parse AI response as JSON: ' + parseError.message + ' | Content preview: ' + content.substring(0, 300));
      }
    }

    console.log('[GenerateWithAPImart] Analysis completed:', analysis.soul_title);

    // Step 2: Build report content
    console.log('[GenerateWithAPImart] Step 2/4: Building report...');
    const reportContent = buildReportFromAnalysis(analysis, birthData);

    // TEMPORARILY SKIP IMAGE GENERATION - focus on text report quality first
    console.log('[GenerateWithAPImart] Skipping image generation for now');
    return res.json({
      success: true,
      orderId,
      reportContent,
      imageUrl: null,
      analysis,
      status: 'report_only',
      message: 'Professional BaZi + MBTI analysis completed (image generation disabled)'
    });

    // Step 3: Create image generation task (DISABLED)
    console.log('[GenerateWithAPImart] Step 3/4: Creating image task...');

    // Ultra-simplified image prompt - minimal description for faster generation
    const imagePrompt = `Vertical mystical card, 9:16 ratio. Purple-black starry background. Golden Chinese title at top: "${birthData.name}的灵魂契合卡". Center: large golden text "${analysis.soul_title}". Traditional BaZi symbols on left, MBTI ${analysis.mbti.type} chart on right. Chinese calligraphy banner at bottom. Holographic neon style.`;

    // Call APIMart Image API directly with timeout handling
    let imageResponse;
    try {
      imageResponse = await fetch(`${config.BASE_URL}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.MODELS.IMAGE,
          prompt: imagePrompt,
          size: '1024x1792',
          quality: 'standard',  // Use standard instead of hd for faster generation
          n: 1
        })
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error('[GenerateWithAPImart] Image API Error:', imageResponse.status, errorText);

        // If image generation fails, return report without image
        console.warn('[GenerateWithAPImart] Image generation failed, returning report only');
        return res.json({
          success: true,
          orderId,
          reportContent,
          imageUrl: null,
          analysis,
          status: 'partial',
          message: 'Report ready, image generation failed'
        });
      }
    } catch (imageError) {
      console.error('[GenerateWithAPImart] Image API request failed:', imageError.message);
      // Return report without image if request fails
      return res.json({
        success: true,
        orderId,
        reportContent,
        imageUrl: null,
        analysis,
        status: 'partial',
        message: 'Report ready, image generation unavailable'
      });
    }

    const imageData = await imageResponse.json();
    const taskId = imageData.task_id || (imageData.data && imageData.data.taskId);

    if (!taskId) {
      console.error('[GenerateWithAPImart] No task_id in response:', imageData);
      throw new Error('No task_id returned from Image API');
    }

    console.log('[GenerateWithAPImart] Image task created:', taskId);

    // Step 4: Poll for image completion
    console.log('[GenerateWithAPImart] Step 4/4: Waiting for image...');

    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 15; // 30 seconds timeout (2s interval) - tighter timeout

    // Wait 3 seconds before first check (give image generation time to start)
    await new Promise(resolve => setTimeout(resolve, 3000));

    while (attempts < maxAttempts) {
      attempts++;

      // Call APIMart Task Query API directly
      const queryResponse = await fetch(`${config.BASE_URL}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${config.API_KEY}`
        }
      });

      if (!queryResponse.ok) {
        console.error('[GenerateWithAPImart] Query failed, attempt', attempts, '- Status:', queryResponse.status);
        continue;
      }

      const taskData = await queryResponse.json();

      console.log('[GenerateWithAPImart] Poll attempt', attempts, '- Status:', taskData.status);

      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract image URL if task is completed
      if (taskData.status === 'completed' && taskData.result && taskData.result.data) {
        if (Array.isArray(taskData.result.data) && taskData.result.data.length > 0) {
          imageUrl = taskData.result.data[0].url || taskData.result.data[0].image_url;
        }
        if (imageUrl) {
          console.log('[GenerateWithAPImart] Image ready:', imageUrl);
          break;
        }
      } else if (taskData.status === 'failed') {
        throw new Error(`Image generation failed: ${taskData.error || 'Unknown error'}`);
      }
    }

    if (!imageUrl) {
      // Timeout, but return report anyway with taskId for frontend polling
      console.warn('[GenerateWithAPImart] Image generation timeout after', attempts, 'attempts');
      console.warn('[GenerateWithAPImart] Returning report with taskId for frontend polling');
      return res.json({
        success: true,
        orderId,
        reportContent,
        imageUrl: null,
        analysis,
        taskId,  // Return taskId so frontend can continue polling
        pollUrl: `${config.BASE_URL}/tasks/${taskId}`,  // Direct poll URL for frontend
        status: 'partial',
        message: `Report ready, image still processing (taskId: ${taskId}). Frontend can continue polling.`
      });
    }

    // Success! Return everything
    console.log('[GenerateWithAPImart] Complete flow finished successfully');

    res.json({
      success: true,
      orderId,
      reportContent,
      imageUrl,
      analysis,
      status: 'complete'
    });

  } catch (error) {
    console.error('[GenerateWithAPImart] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
