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

    // User's custom prompt - AI will return free-form markdown report
    const prompt = `你同时精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和荣格MBTI八功能理论，是顶尖命理+心理学双料大师。

我的出生信息：【${birthData.date} ${birthData.time}，${birthData.gender === '男' ? '男性' : '女性'}，${birthData.location}】

请严格按以下7步执行：

1. 用真太阳时精准排出我的四柱八字、十神、神煞、大运起运时间
2. 用传统古法排出我的日主五行旺衰、用神忌神、格局层级
3. 通过深度问答式推导（模拟最专业的MBTI测试流程），给出我最准确的MBTI四字母与认知功能栈顺序（必须有详细推理，不能乱猜）
4. 把我的日主五行、命宫主星、格局直接映射到MBTI 16型与八大功能，建立专属灵魂称号（例如"庚金剑修·INTJ""癸水玄女·INFP""戊土建筑师·ISTJ"等）
5. 最后再单独输出一张纯文字版总结，方便我复制发朋友圈

请用markdown格式输出完整详细的分析报告。`;

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
            temperature: 0.5,
            max_tokens: 8192,  // Increased for comprehensive free-form report
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
    console.log('[GenerateWithAPImart] Content preview:', content.substring(0, 500));  // Log first 500 chars

    // Use AI's markdown output directly as the report
    const reportContent = `# ${birthData.name}的八字命理与MBTI人格分析报告

## 基本信息
- 出生：${birthData.date} ${birthData.time}
- 地点：${birthData.location}
- 性别：${birthData.gender}

---

${content}

---
*本报告由AI生成，融合中国传统八字命理与现代MBTI心理学*
*生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}*
*订单号：${orderId}*`;

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
