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

    // Personality quote for bottom summary
    const personalityQuote = extractedInfo.personalityQuote || '命中藏锦绣，待时而发光';
    const kongWang = extractedInfo.kongWang || '';
    const cognitiveFunctions = extractedInfo.cognitiveFunctions || 'Ni-Fe-Ti-Se';

    // Map day master to element
    const dayMasterElements = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
      '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
    };
    const dayElement = dayMasterElements[dayMaster] || '火';

    // Build image prompt based on language selection
    let imagePrompt;
    if (isEnglish) {
      // English version - all text in English
      imagePrompt = `Create a vertical Soul Destiny Card (9:16 aspect ratio) with cyberpunk-Taoist fusion aesthetic.

VISUAL COMPOSITION:
- Background: Deep purple-black gradient with subtle starfield and cosmic dust
- Overall style: Neon mysticism meets ancient Chinese divination, holographic textures

TOP SECTION (15%):
- Golden metallic title text: "${name}'s Soul Destiny Card"
- Elegant serif font with golden glow effect
- Decorative mystical patterns flanking the title

LEFT PANEL (35%):
- Traditional circular BaZi chart with modern styling
- Four Pillars displayed: ${baziPillars}
- Day Master "${dayMaster}" (${dayElement} Element) highlighted in center
- Favorable Element "${yongShen}" marked in RED
- English labels: Year/Month/Day/Hour Pillar
- Ink brush texture with mystical aesthetic

RIGHT PANEL (35%):
- Futuristic holographic ${mbtiType} personality diagram
- Radar chart with neon circuit patterns
- Cognitive function stack: ${cognitiveFunctions}
- Five Element color scheme: Wood=cyan, Fire=crimson, Earth=amber, Metal=silver, Water=indigo
- Glowing neon lines and digital particles

CENTER FOCAL POINT (25%):
- LARGEST element on card
- Soul Title: "${soulTitle}" in elegant golden typography
- Rose gold metallic finish with holographic rainbow shimmer
- Radiating golden light rays

BOTTOM BANNER (15%):
- Ancient scroll style horizontal banner
- Quote text in English: "${personalityQuote}"
- Aged paper texture with golden border

STYLE REQUIREMENTS:
- Color palette: Black, deep purple, gold, neon accents
- Textures: Holographic foil, metallic gold, ink wash, cosmic nebula
- ALL TEXT IN ENGLISH
- High information density but clear visual hierarchy
- Mystical ceremonial atmosphere
- NO watermarks, NO logos, NO signatures

Quality: Ultra-detailed, sharp focus, professional card design`;
    } else {
      // Chinese version - all text in Chinese
      imagePrompt = `Create a vertical Soul Destiny Card (9:16 aspect ratio) with cyberpunk-Taoist fusion aesthetic.

VISUAL COMPOSITION:
- Background: Deep purple-black gradient with subtle starfield and cosmic dust
- Overall style: Neon mysticism meets ancient Chinese divination, holographic textures

TOP SECTION (15%):
- Golden metallic title text: "${name}的灵魂契合卡"
- Seal script (篆书) style font with golden glow effect
- Decorative Chinese cloud patterns flanking the title

LEFT PANEL (35%):
- Traditional ink-wash style circular BaZi chart
- Four Pillars displayed in Chinese: ${baziPillars}
- Day Master "${dayMaster}" highlighted in center with element color
- Favorable God "${yongShen}" marked in RED
- Chinese labels for Ten Gods: ${shiShen}
- Ink brush texture, traditional Chinese aesthetic

RIGHT PANEL (35%):
- Futuristic holographic ${mbtiType} personality diagram
- Radar chart with neon circuit patterns
- Cognitive function bars: ${cognitiveFunctions}
- Five Element color scheme: Wood=cyan, Fire=crimson, Earth=amber, Metal=silver, Water=indigo
- Glowing neon lines and digital particles

CENTER FOCAL POINT (25%):
- LARGEST element on card
- Soul Title: "${soulTitle}" in ornate golden seal script (Chinese)
- Rose gold metallic finish with holographic rainbow shimmer
- Radiating golden light rays

BOTTOM BANNER (15%):
- Ancient scroll style horizontal banner
- Quote text in Chinese: "${personalityQuote}"
- Aged paper texture with golden border

STYLE REQUIREMENTS:
- Color palette: Black, deep purple, gold, neon accents
- Textures: Holographic foil, metallic gold, ink wash, cosmic nebula
- ALL TEXT IN CHINESE CHARACTERS (简体中文)
- High information density but clear visual hierarchy
- Mystical ceremonial atmosphere
- NO watermarks, NO logos, NO signatures

Quality: Ultra-detailed, sharp focus, professional card design`;
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
 * Enhanced to support the new structured "朋友圈文案" format
 */
function extractInfoFromReport(content, isEnglish) {
  const result = {
    bazi: null,
    mbti: null,
    soulTitle: null,
    fourPillars: {
      year: null,
      month: null,
      day: null,
      hour: null
    },
    dayMaster: null,
    dayMasterStrength: null,  // 旺/弱
    shiShen: [],
    yongShen: null,
    shenSha: [],
    kongWang: null,           // 空亡
    hiddenStems: null,        // 地支藏干
    fiveElements: null,
    cognitiveFunctions: null,
    summary: null,
    personalityQuote: null
  };

  if (!content) return result;

  console.log('[ExtractInfo] Content length:', content.length);

  // PRIORITY 1: Try to extract from structured "报告总结" section first
  const summarySection = content.match(/---报告总结开始---([^]*?)---报告总结结束---/) ||
                         content.match(/---REPORT SUMMARY START---([^]*?)---REPORT SUMMARY END---/);

  if (summarySection) {
    const summary = summarySection[1];
    console.log('[ExtractInfo] Found structured summary section');

    // Extract from structured format: 【八字】年柱 月柱 日柱 时柱
    const baziMatch = summary.match(/【八字】\s*([^\n【]+)/) || summary.match(/【BaZi】\s*([^\n【]+)/i);
    if (baziMatch) {
      const pillars = baziMatch[1].trim().split(/\s+/);
      if (pillars.length >= 4) {
        result.fourPillars.year = pillars[0];
        result.fourPillars.month = pillars[1];
        result.fourPillars.day = pillars[2];
        result.fourPillars.hour = pillars[3];
        result.bazi = pillars.slice(0, 4).join(' ');
      }
    }

    // Extract day master with strength: 【日主】X行（旺/弱）
    const dayMasterMatch = summary.match(/【日主】\s*([金木水火土甲乙丙丁戊己庚辛壬癸])行?[（(]?([旺弱强weak]*)[）)]?/) ||
                           summary.match(/【Day Master】\s*(\w+)\s*Element?\s*\(?(strong|weak)?\)?/i);
    if (dayMasterMatch) {
      result.dayMaster = dayMasterMatch[1];
      result.dayMasterStrength = dayMasterMatch[2] || null;
    }

    // Extract useful god: 【用神】X行
    const yongShenMatch = summary.match(/【用神】\s*([金木水火土])/) ||
                          summary.match(/【Favorable】\s*(\w+)/i);
    if (yongShenMatch) {
      result.yongShen = yongShenMatch[1];
    }

    // Extract MBTI: 【MBTI】XXXX（主导功能-辅助功能-第三功能-劣势功能）
    const mbtiMatch = summary.match(/【MBTI】\s*([INTJSFEP]{4})[（(]?([^）)\n]*)[）)]?/i);
    if (mbtiMatch) {
      result.mbti = mbtiMatch[1].toUpperCase();
      if (mbtiMatch[2]) {
        result.cognitiveFunctions = mbtiMatch[2].trim();
      }
    }

    // Extract soul title: 【灵魂称号】XXX·XXXX
    const soulTitleMatch = summary.match(/【灵魂称号】\s*([^\n【]+)/) ||
                           summary.match(/【Soul Title】\s*([^\n【]+)/i);
    if (soulTitleMatch) {
      result.soulTitle = soulTitleMatch[1].trim().replace(/[*#「」"']/g, '');
    }

    // Extract personality quote: 【人格金句】「古籍原文」——《书名》，译：现代翻译
    const quoteMatch = summary.match(/【人格金句】\s*([^\n【]+)/) ||
                       summary.match(/【Golden Quote】\s*([^\n【]+)/i);
    if (quoteMatch) {
      result.personalityQuote = quoteMatch[1].trim().replace(/[*#]/g, '');
      console.log('[ExtractInfo] Found personality quote from structured format:', result.personalityQuote);
    }
  }

  // PRIORITY 2: Fallback to traditional extraction methods if structured format not found

  // Extract MBTI type if not already found
  if (!result.mbti) {
    const mbtiMatch = content.match(/\b([IE][NS][TF][JP])\b/i);
    if (mbtiMatch) {
      result.mbti = mbtiMatch[1].toUpperCase();
    }
  }

  // Extract Soul Title if not already found
  if (!result.soulTitle) {
    const soulTitlePatterns = [
      /灵魂称号[：:]\s*[「"'【]*([^「"'】\n]+)[」"'】]*/,
      /专属称号[：:]\s*[「"'【]*([^「"'】\n]+)[」"'】]*/,
      /Soul Title[：:]\s*[「"'【]*([^「"'】\n]+)[」"'】]*/i,
      /\*\*([^*\n]+[·][^*\n]+)\*\*/,  // Markdown bold format
      /([甲乙丙丁戊己庚辛壬癸][金木水火土]?[^\s·，。]{0,8}[·][A-Z]{4})/,
      /称号[：:]\s*[「"'【]*([^「"'】\n，。]+)[」"'】]*/
    ];

    for (const pattern of soulTitlePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const title = match[1].trim().replace(/[*#「」"'【】]/g, '');
        if (title.length > 2 && title.length < 30) {
          result.soulTitle = title;
          break;
        }
      }
    }
  }

  // Extract Four Pillars if not already found
  if (!result.bazi) {
    const pillarPatterns = [
      { key: 'year', patterns: [/年柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/] },
      { key: 'month', patterns: [/月柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/] },
      { key: 'day', patterns: [/日柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/] },
      { key: 'hour', patterns: [/时柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/] }
    ];

    for (const { key, patterns } of pillarPatterns) {
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          result.fourPillars[key] = match[1];
          break;
        }
      }
    }

    // Try single-line format: 四柱：甲子 乙丑 丙寅 丁卯
    const allPillarsMatch = content.match(/四柱[八字]*[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\s+([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\s+([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\s+([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/);
    if (allPillarsMatch) {
      result.fourPillars.year = allPillarsMatch[1];
      result.fourPillars.month = allPillarsMatch[2];
      result.fourPillars.day = allPillarsMatch[3];
      result.fourPillars.hour = allPillarsMatch[4];
    }

    const pillars = [result.fourPillars.year, result.fourPillars.month, result.fourPillars.day, result.fourPillars.hour].filter(Boolean);
    if (pillars.length > 0) {
      result.bazi = pillars.join(' ');
    }
  }

  // Extract Day Master if not already found
  if (!result.dayMaster) {
    const dayMasterPatterns = [
      /日主[：:]\s*([甲乙丙丁戊己庚辛壬癸])/,
      /日元[：:]\s*([甲乙丙丁戊己庚辛壬癸])/,
      /日干[：:]\s*([甲乙丙丁戊己庚辛壬癸])/
    ];
    for (const pattern of dayMasterPatterns) {
      const match = content.match(pattern);
      if (match) {
        result.dayMaster = match[1];
        break;
      }
    }
    // Fallback: extract from day pillar
    if (!result.dayMaster && result.fourPillars.day) {
      result.dayMaster = result.fourPillars.day[0];
    }
  }

  // Extract YongShen if not already found
  if (!result.yongShen) {
    const yongShenPatterns = [
      /用神[：:]\s*([金木水火土])/,
      /喜用神[：:]\s*([金木水火土])/,
      /喜神[：:]\s*([金木水火土])/
    ];
    for (const pattern of yongShenPatterns) {
      const match = content.match(pattern);
      if (match) {
        result.yongShen = match[1];
        break;
      }
    }
  }

  // Extract ShiShen (十神)
  const shiShenSet = new Set();
  const shiShenPattern = /(正官|七杀|偏官|正财|偏财|正印|偏印|食神|伤官|比肩|劫财|枭神)/g;
  let match;
  while ((match = shiShenPattern.exec(content)) !== null) {
    shiShenSet.add(match[1]);
  }
  result.shiShen = Array.from(shiShenSet).slice(0, 6);

  // Extract ShenSha (神煞)
  const shenShaSet = new Set();
  const shenShaPattern = /(太极贵人|天乙贵人|文昌|华盖|桃花|红鸾|天德贵人|月德贵人|驿马|将星|金舆|天厨|学堂|词馆|国印|羊刃|禄神|天喜|红艳)/g;
  while ((match = shenShaPattern.exec(content)) !== null) {
    shenShaSet.add(match[1]);
  }
  result.shenSha = Array.from(shenShaSet).slice(0, 5);

  // Extract 空亡 - support multiple formats
  const kongWangPatterns = [
    /空亡[：:]\s*([子丑寅卯辰巳午未申酉戌亥]+)/,           // 空亡：戌亥
    /空亡[\n\r]+([子丑寅卯辰巳午未申酉戌亥]+)/,            // 空亡\n戌亥
    /([子丑寅卯辰巳午未申酉戌亥]{2,4})空亡/,              // 戌亥空亡
    /Empty Void[：:]\s*([子丑寅卯辰巳午未申酉戌亥]+)/i    // English format
  ];
  for (const pattern of kongWangPatterns) {
    const kongWangMatch = content.match(pattern);
    if (kongWangMatch) {
      result.kongWang = kongWangMatch[1];
      break;
    }
  }

  // Extract MBTI cognitive functions if not already found
  if (!result.cognitiveFunctions) {
    const cognitiveFunctionsMatch = content.match(/(Ni|Ne|Si|Se|Ti|Te|Fi|Fe).*?(主导|辅助|第三|劣势|Dominant|Auxiliary|Tertiary|Inferior)/gi);
    if (cognitiveFunctionsMatch) {
      result.cognitiveFunctions = cognitiveFunctionsMatch.slice(0, 4).join(', ');
    }
  }

  // Extract personality quote if not already found
  if (!result.personalityQuote) {
    const quotePatterns = [
      /人格金句[：:]\s*[「"']*([^「"'\n]+)[」"']*/,
      /一句话人格[金句]*[：:]\s*[「"']*([^「"'\n]+)[」"']*/,
      /Personality Quote[：:]\s*[「"']*([^「"'\n]+)[」"']*/i,
      /「([^」\n]{10,60})」[——\-—]+《([^》]+)》[，,]?\s*译[：:]\s*([^「\n]+)/,  // 「古文」——《书名》，译：现代翻译
      /《([^》]+)》[云曰][：:]*\s*[「"']*([^「"'\n]+)[」"']*/
    ];
    for (const pattern of quotePatterns) {
      const quoteMatch = content.match(pattern);
      if (quoteMatch) {
        if (quoteMatch[3]) {
          // Format: 古文——《书名》，译：翻译
          result.personalityQuote = `「${quoteMatch[1]}」——《${quoteMatch[2]}》，译：${quoteMatch[3]}`;
        } else if (quoteMatch[1]) {
          const quote = quoteMatch[1].trim().replace(/[*#「」"']/g, '');
          if (quote.length > 5 && quote.length < 120) {
            result.personalityQuote = quote;
          }
        }
        if (result.personalityQuote) {
          console.log('[ExtractInfo] Found personality quote:', result.personalityQuote);
          break;
        }
      }
    }
  }

  console.log('[ExtractInfo] Final extraction result:', {
    bazi: result.bazi,
    mbti: result.mbti,
    soulTitle: result.soulTitle,
    dayMaster: result.dayMaster,
    yongShen: result.yongShen,
    personalityQuote: result.personalityQuote?.substring(0, 50) + '...'
  });

  return result;
}
