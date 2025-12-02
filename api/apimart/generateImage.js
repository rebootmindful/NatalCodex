const config = require('./config');

/**
 * Build optimized image generation prompt from analysis data
 * Pure visual description, no logical reasoning required
 */
function buildImagePrompt(analysisData, userName) {
  const { bazi, mbti, soul_title, wuxing_colors, summary } = analysisData;

  // Convert to visual English prompt for better model understanding
  const prompt = `Create a mystical Chinese astrology card in vertical 9:16 portrait orientation with cyberpunk Taoist aesthetic:

**TOP SECTION:**
- Massive golden Chinese seal script title: "${userName}的灵魂契合卡"
- Holographic effect with purple-black starry gradient background
- Glowing neon particles

**LEFT PANEL (Traditional Chinese Style):**
- Circular BaZi fortune wheel showing:
  * Year pillar: ${bazi.year}
  * Month pillar: ${bazi.month}
  * Day pillar: ${bazi.day}
  * Hour pillar: ${bazi.hour}
- Ten Gods (Shishen) labeled around wheel: ${bazi.shishen.join(', ')}
- Red highlighted element: ${bazi.yongshen}
- Pattern type: ${bazi.geju}
- Traditional ink wash painting style
- Ancient calligraphy fonts

**RIGHT PANEL (Cyberpunk Style):**
- MBTI ${mbti.type} radar chart with neon glow
- Eight cognitive functions as glowing progress bars:
  ${mbti.functions.join(' → ')}
- Color scheme using five-elements:
  * Wood: bright green (#00FF7F)
  * Fire: vibrant red (#FF4500)
  * Earth: golden yellow (#FFD700)
  * Metal: pure white (#FFFFFF)
  * Water: deep blue (#1E90FF)

**CENTER ELEMENT (Most Prominent):**
- Gigantic golden Chinese seal script text: "${soul_title}"
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
- Summary text in elegant calligraphy: "${summary}"
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

  return prompt;
}

/**
 * APIMart Image Generation API
 * Uses Gemini 3 Pro Image (Nano banana2) for card creation
 * Returns task_id for async polling
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { analysisData, userName } = req.body;

  if (!analysisData || !userName) {
    return res.status(400).json({ error: 'analysisData and userName required' });
  }

  const prompt = buildImagePrompt(analysisData, userName);

  console.log('[APIMart Image] Starting image generation...');
  console.log('[APIMart Image] User:', userName);
  console.log('[APIMart Image] Soul title:', analysisData.soul_title);
  console.log('[APIMart Image] Prompt length:', prompt.length);

  try {
    const response = await fetch(`${config.BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.MODELS.IMAGE,
        prompt: prompt,
        size: '1024x1792',  // 9:16 vertical format
        quality: 'hd',
        n: 1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[APIMart Image] API Error:', response.status, errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // APIMart returns task_id for async processing
    const taskId = data.task_id || (data.data && data.data.taskId);

    if (!taskId) {
      console.error('[APIMart Image] No task_id in response:', data);
      throw new Error('No task_id returned from API');
    }

    console.log('[APIMart Image] Task created:', taskId);

    res.json({
      success: true,
      taskId: taskId
    });

  } catch (error) {
    console.error('[APIMart Image] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
