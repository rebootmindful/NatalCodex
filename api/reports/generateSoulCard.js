/**
 * Soul Card Image Generation API
 * Uses APIMart: gemini-3-pro-image-preview for image generation
 *
 * Supported sizes: 1024x1024, 1536x1024, 1024x1536
 * Image links valid for 24 hours
 *
 * API is asynchronous:
 * 1. Submit task -> get task_id
 * 2. Poll task status until completed
 * 3. Return image URL
 */

const config = {
  API_KEY: process.env.APIMART_API_KEY || '',
  BASE_URL: 'https://api.apimart.ai/v1',
  IMAGE_MODEL: 'gemini-3-pro-image-preview'  // Switched back from doubao-seedance-4-5
};

// Polling configuration
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_TIME = 120000; // 2 minutes max

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

    // Build the image generation prompt - focus on visual description, no style watermarks
    const mbtiType = extractedInfo.mbti || 'INFJ';
    const soulTitle = extractedInfo.soulTitle || `${name}之魂`;
    const baziInfo = extractedInfo.bazi || '命理八字';

    let imagePrompt;
    if (isEnglish) {
      imagePrompt = `A mystical vertical tarot-style "Soul Card" design:
- Dark purple cosmic background with stars and nebula
- Top center: Elegant gold Chinese calligraphy title "${name}'s Soul Card"
- Left side: Traditional Chinese ink wash painting style showing BaZi fortune symbols
- Right side: Futuristic holographic display showing "${mbtiType}" personality type with glowing circuits
- Center focal point: Large ornate golden seal with text "${soulTitle}"
- Five Elements (Wood, Fire, Earth, Metal, Water) represented as glowing colored energy streams connecting the elements
- Style: Blend of ancient Eastern mysticism and modern cyberpunk aesthetics
- NO watermarks, NO logos, NO English text except MBTI type`;
    } else {
      imagePrompt = `神秘风格竖版塔罗牌式「灵魂契合卡」设计：
- 深紫色宇宙星空背景，星云缭绕
- 顶部居中：金色书法标题「${name}的灵魂契合卡」
- 左侧区域：中国传统水墨画风格，展示八字命盘符号「${baziInfo}」
- 右侧区域：未来科技全息投影风格，显示人格类型「${mbtiType}」，配以发光电路纹理
- 中央焦点：华丽金色印章，刻有「${soulTitle}」
- 五行元素（木火土金水）以发光彩色能量流形式连接各区域
- 风格：古老东方神秘主义与现代赛博朋克美学融合
- 不要添加任何水印或无关文字`;
    }

    console.log('[GenerateSoulCard] Image prompt length:', imagePrompt.length);
    console.log('[GenerateSoulCard] Submitting image generation task...');

    // Step 1: Submit task to get task_id
    const submitResponse = await fetch(`${config.BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.IMAGE_MODEL,
        prompt: imagePrompt,
        size: '1024x1536',  // Vertical for Soul Card (Gemini supports: 1024x1024, 1536x1024, 1024x1536)
        n: 1
      })
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('[GenerateSoulCard] Submit Error:', submitResponse.status, errorText);
      throw new Error(`Submit failed: ${submitResponse.status} - ${errorText.substring(0, 200)}`);
    }

    const submitData = await submitResponse.json();
    console.log('[GenerateSoulCard] Submit response:', JSON.stringify(submitData, null, 2));

    // Extract task_id from response
    const taskId = submitData.data?.[0]?.task_id;
    if (!taskId) {
      console.error('[GenerateSoulCard] No task_id in response:', submitData);
      throw new Error('No task_id returned from API');
    }

    console.log('[GenerateSoulCard] Task ID:', taskId);

    // Step 2: Poll for task completion
    const imageUrl = await pollTaskResult(taskId);

    console.log('[GenerateSoulCard] Success! Image URL:', imageUrl.substring(0, 100) + '...');

    return res.json({
      success: true,
      imageUrl,
      extractedInfo,
      taskId
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
 * Poll task status until completed or timeout
 */
async function pollTaskResult(taskId) {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME) {
    console.log('[GenerateSoulCard] Polling task:', taskId);

    const queryResponse = await fetch(`${config.BASE_URL}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error('[GenerateSoulCard] Query Error:', queryResponse.status, errorText);
      throw new Error(`Query failed: ${queryResponse.status}`);
    }

    const queryData = await queryResponse.json();
    console.log('[GenerateSoulCard] Task response:', JSON.stringify(queryData, null, 2));

    // Extract all possible status indicators
    const status = queryData.data?.status || queryData.status;
    const code = queryData.code || queryData.data?.code;
    const failCode = queryData.data?.failCode || queryData.failCode;
    const failMsg = queryData.data?.failMsg || queryData.failMsg;
    const error = queryData.error || queryData.data?.error;

    console.log('[GenerateSoulCard] Parsed status:', { status, code, failCode, failMsg, error });

    // Try to find image URL in any location (check this first!)
    // Seedream 4.5 returns: data.result.images[0].url[0] (url is an array!)
    let imageUrl = queryData.data?.result?.images?.[0]?.url?.[0] ||  // Seedream 4.5 format
                   queryData.data?.result?.images?.[0]?.url ||        // If url is string
                   queryData.data?.output?.image_url ||
                   queryData.data?.output?.url ||
                   queryData.data?.result?.url ||
                   queryData.data?.result?.image_url ||
                   queryData.data?.url ||
                   queryData.data?.image_url ||
                   queryData.data?.output?.[0]?.url ||
                   queryData.data?.output?.[0]?.image_url ||
                   queryData.data?.images?.[0]?.url?.[0] ||
                   queryData.data?.images?.[0]?.url ||
                   queryData.data?.images?.[0] ||
                   queryData.output?.url ||
                   queryData.result?.url ||
                   queryData.url ||
                   queryData.image_url;

    // Handle case where url might be an array
    if (Array.isArray(imageUrl)) {
      imageUrl = imageUrl[0];
    }

    // If we found an image URL, return it immediately
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      console.log('[GenerateSoulCard] Found image URL:', imageUrl);
      return imageUrl;
    }

    // Check for explicit failure FIRST
    if (failCode || failMsg || error || status === 'failed' || status === 'error') {
      const errorMsg = failMsg || error || failCode || 'Task failed';
      console.error('[GenerateSoulCard] Task failed with:', errorMsg);
      throw new Error(`Generation failed: ${typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg}`);
    }

    // Check for processing/pending status BEFORE checking completion
    // (code: 200 is API response status, NOT task completion status)
    if (status === 'processing' || status === 'pending' || status === 'submitted' || status === 'running') {
      console.log('[GenerateSoulCard] Task still processing, status:', status);
      await sleep(POLL_INTERVAL);
      continue;
    }

    // Check for success status but no image (task truly completed but missing URL)
    if (status === 'completed' || status === 'success') {
      console.error('[GenerateSoulCard] Task completed but no image URL. Checking all data paths...');
      console.error('[GenerateSoulCard] queryData.data:', JSON.stringify(queryData.data, null, 2));
      throw new Error('Task completed but image URL not found. Check logs for response structure.');
    }

    // Unknown status - log and continue polling
    console.log('[GenerateSoulCard] Unknown status:', status, '- continuing to poll...');

    // Still processing - wait and poll again
    await sleep(POLL_INTERVAL);
  }

  throw new Error('Image generation timeout (2 minutes)');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
