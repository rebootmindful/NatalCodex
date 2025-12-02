const config = require('./config');

/**
 * APIMart Gemini Chat API
 * Uses Gemini 3 Pro to analyze BaZi (八字) and MBTI
 * Non-streaming mode, returns JSON format
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { birthData } = req.body;

  if (!birthData) {
    return res.status(400).json({ error: 'birthData required' });
  }

  // System prompt for BaZi + MBTI analysis
  const systemPrompt = `你是精通《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》和荣格MBTI八功能理论的顶尖命理+心理学双料大师。

你的任务是分析用户的出生信息，输出结构化的JSON数据。

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

  console.log('[APIMart Chat] Starting BaZi + MBTI analysis...');
  console.log('[APIMart Chat] Birth data:', {
    name: birthData.name,
    date: birthData.date,
    time: birthData.time,
    location: birthData.location
  });

  try {
    const response = await fetch(`${config.BASE_URL}/chat/completions`, {
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
        stream: false  // Non-streaming mode
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[APIMart Chat] API Error:', response.status, errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[APIMart Chat] API Response received');

    // Extract content from response
    let content = data.choices[0].message.content;

    // Remove markdown code blocks if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Parse JSON
    let analysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      console.error('[APIMart Chat] JSON Parse Error:', parseError);
      console.error('[APIMart Chat] Content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    console.log('[APIMart Chat] Analysis completed:', {
      hasBazi: !!analysisResult.bazi,
      hasMbti: !!analysisResult.mbti,
      soulTitle: analysisResult.soul_title
    });

    res.json({
      success: true,
      analysis: analysisResult,
      usage: data.usage
    });

  } catch (error) {
    console.error('[APIMart Chat] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
