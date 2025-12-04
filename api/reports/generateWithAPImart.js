/**
 * Main API endpoint for complete report + image generation
 * Uses APIMart: Gemini 3 Pro for analysis + Gemini 3 Pro Image for card
 */

// APIMart Configuration (inline to avoid Vercel routing issues)
const config = {
  API_KEY: process.env.APIMART_API_KEY || '',
  BASE_URL: 'https://api.apimart.ai/v1',
  MODELS: {
    CHAT: 'gpt-4o-mini',  // Switch to GPT-4o-mini - Gemini has token issues
    IMAGE: 'gemini-3-pro-image-preview'
  }
};

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

    // Full professional prompt - user's original requirements
    const prompt = `你同时精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和荣格MBTI八功能理论，是顶尖命理+心理学双料大师。

我的出生信息：【${birthData.date} ${birthData.time}，${birthData.gender === '男' ? '男性' : '女性'}，${birthData.location}】

请严格按以下步骤执行：

1. 用真太阳时精准排出我的四柱八字、十神、神煞、大运起运时间
2. 用传统古法排出我的日主五行旺衰、用神忌神、格局层级
3. 通过深度推导（模拟专业MBTI测试流程），给出我最准确的MBTI四字母与认知功能栈顺序（必须有详细推理）
4. 把我的日主五行、命宫主星、格局直接映射到MBTI 16型与八大功能，建立专属灵魂称号（例如"庚金剑修·INTJ""癸水玄女·INFP"）
5. 最后单独输出一份纯文字总结，方便复制发朋友圈

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
