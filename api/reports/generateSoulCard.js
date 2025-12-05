/**
 * Soul Card Image Generation API
 * Uses APIMart: gemini-3-pro-image-preview for image generation
 *
 * Supported sizes: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
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
    console.log('[GenerateSoulCard] Extracted info:', JSON.stringify(extractedInfo, null, 2));
    console.log('[GenerateSoulCard] Four Pillars:', extractedInfo.fourPillars);
    console.log('[GenerateSoulCard] Day Master:', extractedInfo.dayMaster);
    console.log('[GenerateSoulCard] ShiShen:', extractedInfo.shiShen);
    console.log('[GenerateSoulCard] ShenSha:', extractedInfo.shenSha);

    // Build comprehensive data from extracted info
    const mbtiType = extractedInfo.mbti || 'INFJ';
    const soulTitle = extractedInfo.soulTitle || `${name}之魂`;
    const fp = extractedInfo.fourPillars;
    const baziPillars = fp.year && fp.month && fp.day && fp.hour
      ? `${fp.year} ${fp.month} ${fp.day} ${fp.hour}`
      : (extractedInfo.bazi || '己卯 戊申 丁未 戊午');
    const dayMaster = extractedInfo.dayMaster || '丁';
    const shiShen = extractedInfo.shiShen.length > 0 ? extractedInfo.shiShen.join('、') : '正官、食神、伤官';
    const yongShen = extractedInfo.yongShen || '木';
    const shenSha = extractedInfo.shenSha.length > 0 ? extractedInfo.shenSha.join('、') : '天乙贵人、文昌';

    // Map day master to element
    const dayMasterElements = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
      '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
    };
    const dayElement = dayMasterElements[dayMaster] || '火';

    let imagePrompt;
    if (isEnglish) {
      imagePrompt = `Ultra-detailed vertical Soul Card (9:16 ratio), cyberpunk Taoist fusion style:

LAYOUT:
- TOP: Giant golden seal script title "${name}'s Soul Card" with metallic glow
- LEFT HALF (Traditional Chinese): Circular BaZi chart wheel showing Four Pillars "${baziPillars}", Day Master ${dayMaster}(${dayElement}), Ten Gods: ${shiShen}, Favorable Element: ${yongShen} in RED, Special Stars: ${shenSha}
- RIGHT HALF (Cyber-tech): Holographic ${mbtiType} radar diagram with neon circuits, cognitive function bars (Ni/Ne/Si/Se/Ti/Te/Fi/Fe) in Five Element colors
- CENTER: Massive gilded seal script showing soul title "${soulTitle}" with golden rays
- MIDDLE: Five Element energy streams (Wood=cyan, Fire=red, Earth=yellow, Metal=white, Water=black) connecting both sides like destiny gears
- BOTTOM: Ancient scroll style summary text

STYLE: Black-purple gradient starfield, neon Five Element colors, partial gold foil, holographic laser texture, maximum information density, NO watermarks`;
    } else {
      imagePrompt = `超精细竖版「灵魂契合卡」(9:16比例)，赛博道教融合风格：

【布局要求】
■ 顶部：巨大鎏金篆体标题「${name}的灵魂契合卡」，金属质感发光
■ 左半区(传统水墨风)：
  - 八字命盘圆盘图，四柱：${baziPillars}
  - 日主${dayMaster}(${dayElement})居中
  - 十神标注：${shiShen}
  - 用神「${yongShen}」用红色高亮标出
  - 神煞：${shenSha}
■ 右半区(赛博紫电风)：
  - ${mbtiType}人格雷达图，霓虹电路纹理
  - 认知功能栈进度条(Ni/Ne/Si/Se/Ti/Te/Fi/Fe)
  - 用五行颜色渐变：木青、火红、土黄、金白、水黑
■ 正中央最显眼：超大鎏金篆体灵魂称号「${soulTitle}」，金光四射
■ 中间横贯：五行能量光带连接左右，形成命运齿轮转动感
■ 底部：古籍卷轴风格命格总评

【风格要求】
黑紫渐变星空底，霓虹五行色，局部烫金，镭射全息质感，信息密度极高但层次分明
所有文字中文，标题篆体，正文宋体黑体搭配，关键词荧光描边
不要水印不要logo`;
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
        size: '9:16',  // Vertical for Soul Card (supported: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9)
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
 * Extract comprehensive BaZi, MBTI, and Soul info from report content
 */
function extractInfoFromReport(content, isEnglish) {
  const result = {
    bazi: null,
    mbti: null,
    soulTitle: null,
    // Enhanced extraction fields
    fourPillars: {
      year: null,   // 年柱
      month: null,  // 月柱
      day: null,    // 日柱
      hour: null    // 时柱
    },
    dayMaster: null,      // 日主
    shiShen: [],          // 十神
    yongShen: null,       // 用神
    shenSha: [],          // 神煞
    fiveElements: null,   // 五行强弱
    cognitiveFunctions: null,  // MBTI认知功能
    summary: null         // 总评
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
    /专属称号[：:]\s*[「"']?([^「"'\n]+)[」"']?/,
    /Soul Title[：:]\s*[「"']?([^「"'\n]+)[」"']?/i,
    /([甲乙丙丁戊己庚辛壬癸][金木水火土][^\s·，。]+[·][A-Z]{4})/,
    /称号[：:]\s*[「"']*([^「"'\n，。]+)[」"']*/
  ];

  for (const pattern of soulTitlePatterns) {
    const match = content.match(pattern);
    if (match) {
      result.soulTitle = match[1].trim().replace(/[*#]/g, '');
      break;
    }
  }

  // Extract Four Pillars (四柱八字) - year/month/day/hour
  const yearPillarMatch = content.match(/年柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/);
  const monthPillarMatch = content.match(/月柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/);
  const dayPillarMatch = content.match(/日柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/);
  const hourPillarMatch = content.match(/时柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/);

  if (yearPillarMatch) result.fourPillars.year = yearPillarMatch[1];
  if (monthPillarMatch) result.fourPillars.month = monthPillarMatch[1];
  if (dayPillarMatch) result.fourPillars.day = dayPillarMatch[1];
  if (hourPillarMatch) result.fourPillars.hour = hourPillarMatch[1];

  // Build combined bazi string
  const pillars = [result.fourPillars.year, result.fourPillars.month, result.fourPillars.day, result.fourPillars.hour].filter(Boolean);
  if (pillars.length > 0) {
    result.bazi = pillars.join(' ');
  }

  // Extract Day Master (日主)
  const dayMasterMatch = content.match(/日主[：:]\s*([甲乙丙丁戊己庚辛壬癸])/);
  if (dayMasterMatch) {
    result.dayMaster = dayMasterMatch[1];
  }

  // Extract ShiShen (十神)
  const shiShenPatterns = [
    /十神[：:][^\n]*?(正官|偏官|正财|偏财|正印|偏印|食神|伤官|比肩|劫财)/g,
    /(正官|偏官|正财|偏财|正印|偏印|食神|伤官|比肩|劫财)/g
  ];
  const shiShenSet = new Set();
  for (const pattern of shiShenPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      shiShenSet.add(match[1]);
    }
  }
  result.shiShen = Array.from(shiShenSet).slice(0, 6);

  // Extract YongShen (用神)
  const yongShenMatch = content.match(/用神[：:]\s*([金木水火土])/);
  if (yongShenMatch) {
    result.yongShen = yongShenMatch[1];
  }

  // Extract ShenSha (神煞)
  const shenShaPatterns = [
    /(太极贵人|天乙贵人|文昌|华盖|桃花|红鸾|天德贵人|月德贵人|驿马|将星|金舆|天厨|学堂|词馆|国印)/g
  ];
  const shenShaSet = new Set();
  for (const pattern of shenShaPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      shenShaSet.add(match[1]);
    }
  }
  result.shenSha = Array.from(shenShaSet).slice(0, 5);

  // Extract Five Elements analysis (五行)
  const fiveElementsMatch = content.match(/五行[：:][^\n]*(木|火|土|金|水)[^\n]*/);
  if (fiveElementsMatch) {
    result.fiveElements = fiveElementsMatch[0].substring(0, 60);
  }

  // Extract MBTI cognitive functions
  const cognitiveFunctionsMatch = content.match(/(Ni|Ne|Si|Se|Ti|Te|Fi|Fe).*?(主导|辅助|第三|劣势)/g);
  if (cognitiveFunctionsMatch) {
    result.cognitiveFunctions = cognitiveFunctionsMatch.slice(0, 4).join(', ');
  }

  // Extract summary/总评
  const summaryPatterns = [
    /总评[：:]\s*([^\n]+)/,
    /综合分析[：:]\s*([^\n]+)/,
    /命格特点[：:]\s*([^\n]+)/
  ];
  for (const pattern of summaryPatterns) {
    const match = content.match(pattern);
    if (match) {
      result.summary = match[1].substring(0, 80);
      break;
    }
  }

  return result;
}
