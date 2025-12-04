/**
 * Soul Card Image Generation API
 * Uses APIMart: gemini-3-pro-image-preview for image generation
 */

const config = {
  API_KEY: process.env.APIMART_API_KEY || '',
  BASE_URL: 'https://api.apimart.ai/v1',
  IMAGE_MODEL: 'gemini-3-pro-image-preview'
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, gender, reportContent, rawAnalysis, language } = req.body;

  if (!name || !reportContent) {
    return res.status(400).json({ error: 'name and reportContent required' });
  }

  const isEnglish = language === 'en';

  console.log('[GenerateSoulCard] Starting for:', name);
  console.log('[GenerateSoulCard] Language:', language);

  try {
    // Extract key info from report for the image prompt
    const extractedInfo = extractInfoFromReport(rawAnalysis || reportContent, isEnglish);
    console.log('[GenerateSoulCard] Extracted info:', extractedInfo);

    // Build the image generation prompt
    let imagePrompt;
    if (isEnglish) {
      imagePrompt = `Generate a tall vertical "Soul Card" (1080x3200+) in nanobanana pro style:
- Top: Golden seal script title "【${name}】's Soul Card"
- Left: Ink wash style BaZi chart: ${extractedInfo.bazi || 'Four Pillars destiny'}
- Right: Cyber style MBTI: ${extractedInfo.mbti || 'Personality type'} cognitive stack
- Center: Gilded seal script: "${extractedInfo.soulTitle || name + ' Soul'}"
- Five element light bands connecting, destiny gear aesthetic
- Colors: Black-purple starry background + neon five-element colors + gold foil
- Style: Cyber Taoist fusion, mystical tech aesthetic`;
    } else {
      imagePrompt = `用 nanobanana pro 风格生成一张超长竖版「灵魂契合卡」（尺寸 1080×3200 以上），布局：
- 顶部金色篆体标题：【${name}】的灵魂契合卡
- 左侧水墨风八字命盘：${extractedInfo.bazi || '四柱八字'}
- 右侧赛博风MBTI：${extractedInfo.mbti || '人格类型'}认知功能栈
- 中央鎏金篆体：「${extractedInfo.soulTitle || name + '之魂'}」
- 五行光带连接，命运齿轮感
- 配色：黑紫星空底+霓虹五行色+烫金，赛博道教风`;
    }

    console.log('[GenerateSoulCard] Image prompt length:', imagePrompt.length);
    console.log('[GenerateSoulCard] Calling image API...');

    // Call APIMart Image Generation API
    const imageResponse = await fetch(`${config.BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.IMAGE_MODEL,
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024', // Will be adjusted by model if it supports custom sizes
        response_format: 'url'
      })
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('[GenerateSoulCard] Image API Error:', imageResponse.status, errorText);
      throw new Error(`Image API returned ${imageResponse.status}: ${errorText.substring(0, 200)}`);
    }

    const imageData = await imageResponse.json();
    console.log('[GenerateSoulCard] Image API response:', JSON.stringify(imageData, null, 2));

    // Extract image URL from response
    const imageUrl = imageData.data?.[0]?.url || imageData.data?.[0]?.b64_json;

    if (!imageUrl) {
      console.error('[GenerateSoulCard] No image URL in response:', imageData);
      throw new Error('No image URL returned from API');
    }

    console.log('[GenerateSoulCard] Success! Image URL:', imageUrl.substring(0, 100) + '...');

    return res.json({
      success: true,
      imageUrl,
      extractedInfo
    });

  } catch (error) {
    console.error('[GenerateSoulCard] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Extract BaZi, MBTI, and Soul Title from report content
 */
function extractInfoFromReport(content, isEnglish) {
  const result = {
    bazi: null,
    mbti: null,
    soulTitle: null
  };

  if (!content) return result;

  // Extract MBTI type (e.g., INTJ, ENFP, etc.)
  const mbtiMatch = content.match(/\b([IE][NS][TF][JP])\b/i);
  if (mbtiMatch) {
    result.mbti = mbtiMatch[1].toUpperCase();
  }

  // Extract Soul Title - look for patterns like "庚金剑修·INTJ" or similar
  const soulTitlePatterns = [
    /灵魂称号[：:]\s*[「"']?([^「"'\n]+)[」"']?/,
    /Soul Title[：:]\s*[「"']?([^「"'\n]+)[」"']?/i,
    /([甲乙丙丁戊己庚辛壬癸][金木水火土][^\s·]+·[A-Z]{4})/,
    /专属称号[：:]\s*[「"']?([^「"'\n]+)[」"']?/
  ];

  for (const pattern of soulTitlePatterns) {
    const match = content.match(pattern);
    if (match) {
      result.soulTitle = match[1].trim();
      break;
    }
  }

  // Extract BaZi (Four Pillars) - look for year/month/day/hour pillars
  const baziPatterns = [
    /四柱[：:]\s*([^\n]+)/,
    /八字[：:]\s*([^\n]+)/,
    /Year Pillar[：:]\s*([^\n]+)/i,
    /([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]\s*){2,4}/
  ];

  for (const pattern of baziPatterns) {
    const match = content.match(pattern);
    if (match) {
      result.bazi = match[1] || match[0];
      // Limit length
      if (result.bazi.length > 50) {
        result.bazi = result.bazi.substring(0, 50) + '...';
      }
      break;
    }
  }

  return result;
}
