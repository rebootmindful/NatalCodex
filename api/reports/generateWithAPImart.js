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
  const { bazi, mbti, soul_title, summary } = analysis;

  return `# ${birthData.name}的灵魂契合卡报告

## 基本信息
- 出生：${birthData.date} ${birthData.time}
- 地点：${birthData.location}
- 性别：${birthData.gender}

## 八字命盘
**四柱：** ${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour}

**十神：** ${bazi.shishen.join('  ')}

**格局：** ${bazi.geju}

**用神：** ${bazi.yongshen}

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

## 灵魂称号
**${soul_title}**

## 综合评价
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

    // Build prompts
    const systemPrompt = `你是精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和荣格MBTI八功能理论的顶尖命理+心理学双料大师。

你的任务是分析用户的出生信息，输出结构化的JSON数据。

⚠️ 重要：你的回复必须是纯JSON格式，不要包含任何其他文字、解释或markdown代码块。直接输出JSON对象。

输出JSON格式要求：
{
  "bazi": {
    "year": "年柱（如：甲子）",
    "month": "月柱（如：丙寅）",
    "day": "日柱（如：戊辰）",
    "hour": "时柱（如：庚午）",
    "shishen": ["年十神", "月十神", "日十神", "时十神"],
    "yongshen": "用神（如：水）",
    "geju": "格局名称（如：食神生财格）",
    "wuxing_strength": {
      "wood": 15,
      "fire": 35,
      "earth": 20,
      "metal": 10,
      "water": 20
    }
  },
  "mbti": {
    "type": "MBTI类型（如：INTJ）",
    "functions": ["主导功能", "辅助功能", "第三功能", "劣势功能"],
    "radar_scores": {
      "EI": 30,
      "SN": 80,
      "TF": 70,
      "JP": 65
    },
    "description": "认知功能栈的简短描述"
  },
  "soul_title": "专属灵魂称号（如：戊土建筑师·INTJ）",
  "wuxing_colors": {
    "wood": "#00FF7F",
    "fire": "#FF4500",
    "earth": "#FFD700",
    "metal": "#FFFFFF",
    "water": "#1E90FF"
  },
  "summary": "一句话总结命格人格，引用古籍+现代翻译（100字以内）"
}

重要提示：
1. 必须使用真太阳时校正
2. 十神、神煞、用神必须准确
3. MBTI推导需要详细逻辑，不能乱猜
4. 灵魂称号要结合五行+MBTI（如"庚金剑修·INTJ"、"癸水玄女·INFP"）
5. 必须返回完整的JSON对象，不要包含其他文字`;

    const userPrompt = `请分析我的出生信息：

姓名：${birthData.name || '未提供'}
性别：${birthData.gender || '未提供'}
出生日期：${birthData.date || ''}
出生时间：${birthData.time || ''}
出生地点：${birthData.location || ''}
坐标：${birthData.lat || ''}, ${birthData.lon || ''}
时区：${birthData.timezone || ''}

请严格按照系统提示的JSON格式输出分析结果。`;

    // Call APIMart Chat API directly
    const chatResponse = await fetch(`${config.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.MODELS.CHAT,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        stream: false
      })
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('[GenerateWithAPImart] Chat API Error:', chatResponse.status, errorText);
      throw new Error(`Chat API returned ${chatResponse.status}: ${errorText}`);
    }

    const chatData = await chatResponse.json();
    console.log('[GenerateWithAPImart] API Response received');

    // Extract and parse JSON from response
    let content = chatData.choices[0].message.content;
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('[GenerateWithAPImart] JSON Parse Error:', parseError);
      console.error('[GenerateWithAPImart] Content preview:', content.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON: ' + parseError.message);
    }

    console.log('[GenerateWithAPImart] Analysis completed:', analysis.soul_title);

    // Step 2: Build report content
    console.log('[GenerateWithAPImart] Step 2/4: Building report...');
    const reportContent = buildReportFromAnalysis(analysis, birthData);

    // Step 3: Create image generation task
    console.log('[GenerateWithAPImart] Step 3/4: Creating image task...');

    // Build image prompt
    const imagePrompt = `Create a mystical Chinese astrology card in vertical 9:16 portrait orientation with cyberpunk Taoist aesthetic:

**TOP SECTION:**
- Massive golden Chinese seal script title: "${birthData.name}的灵魂契合卡"
- Holographic effect with purple-black starry gradient background
- Glowing neon particles

**LEFT PANEL (Traditional Chinese Style):**
- Circular BaZi fortune wheel showing:
  * Year pillar: ${analysis.bazi.year}
  * Month pillar: ${analysis.bazi.month}
  * Day pillar: ${analysis.bazi.day}
  * Hour pillar: ${analysis.bazi.hour}
- Ten Gods (Shishen) labeled around wheel: ${analysis.bazi.shishen.join(', ')}
- Red highlighted element: ${analysis.bazi.yongshen}
- Pattern type: ${analysis.bazi.geju}
- Traditional ink wash painting style
- Ancient calligraphy fonts

**RIGHT PANEL (Cyberpunk Style):**
- MBTI ${analysis.mbti.type} radar chart with neon glow
- Eight cognitive functions as glowing progress bars:
  ${analysis.mbti.functions.join(' → ')}
- Color scheme using five-elements:
  * Wood: bright green (#00FF7F)
  * Fire: vibrant red (#FF4500)
  * Earth: golden yellow (#FFD700)
  * Metal: pure white (#FFFFFF)
  * Water: deep blue (#1E90FF)

**CENTER ELEMENT (Most Prominent):**
- Gigantic golden Chinese seal script text: "${analysis.soul_title}"
- Holographic metallic shine effect
- Radiant glow emanating outward

**MIDDLE CONNECTION:**
- Horizontal five-elements energy band
- Glowing particle stream flowing left to right
- Gradient colors representing all five elements
- "Destiny gear" rotating effect
- Connecting traditional BaZi wheel to modern MBTI chart

**BOTTOM BANNER:**
- Ancient Chinese scroll style
- Summary text in elegant calligraphy: "${analysis.summary}"
- Traditional seal stamp in corner

**OVERALL VISUAL STYLE:**
- Background: Black-to-purple starry gradient
- Lighting: Neon five-element glow effects throughout
- Texture: Laser holographic metallic finish
- Layout: High information density but clearly layered
- Aesthetic: Cyberpunk meets traditional Chinese Taoism
- Resolution: Print-quality detail (4K+)
- All Chinese text rendered clearly
- Font mix: Seal script titles, Song/Hei body text, neon-outlined keywords

Generate a stunning vertical card that combines ancient wisdom with futuristic aesthetics.`;

    // Call APIMart Image API directly
    const imageResponse = await fetch(`${config.BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.MODELS.IMAGE,
        prompt: imagePrompt,
        size: '1024x1792',
        quality: 'hd',
        n: 1
      })
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('[GenerateWithAPImart] Image API Error:', imageResponse.status, errorText);
      throw new Error(`Image API returned ${imageResponse.status}: ${errorText}`);
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
    const maxAttempts = 30; // 60 seconds timeout (2s interval)

    while (attempts < maxAttempts) {
      // Wait 2 seconds before checking
      await new Promise(resolve => setTimeout(resolve, 2000));
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
      // Timeout, but return report anyway
      console.warn('[GenerateWithAPImart] Image generation timeout, returning report only');
      return res.json({
        success: true,
        orderId,
        reportContent,
        imageUrl: null,
        analysis,
        taskId,  // Return taskId so frontend can continue polling
        status: 'partial',
        message: 'Report ready, image still processing'
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
