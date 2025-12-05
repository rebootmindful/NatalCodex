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

    let imagePrompt;
    if (isEnglish) {
      imagePrompt = `Ultra-detailed vertical Soul Card (9:16 ratio), cyberpunk Taoist fusion style:

LAYOUT:
- TOP: Giant golden seal script title "${name}'s Soul Card" with metallic glow
- LEFT HALF (Traditional Chinese ink style):
  - Circular BaZi chart wheel showing Four Pillars: ${baziPillars}
  - Day Master ${dayMaster}(${dayElement}) in center
  - Hidden Stems (地支藏干) marked on each branch
  - Ten Gods labeled: ${shiShen}
  - Favorable Element "${yongShen}" highlighted in RED
  - Divine Stars: ${shenSha}
  ${kongWang ? `- Empty Void (空亡): ${kongWang} marked` : ''}
- RIGHT HALF (Cyber-tech style):
  - Holographic ${mbtiType} radar diagram with neon circuits
  - Cognitive function stack progress bars: ${cognitiveFunctions}
  - Five Element color gradient: Wood=cyan, Fire=red, Earth=yellow, Metal=white, Water=black
- CENTER: Massive gilded seal script showing soul title "${soulTitle}" with golden rays
- MIDDLE: Five Element energy streams connecting both sides like "destiny gears" in motion
- BOTTOM: Ancient scroll style horizontal banner with personality summary: "${personalityQuote}"

STYLE: Black-purple gradient starfield background, neon Five Element colors, partial gold foil effects, holographic laser texture, maximum information density yet well-layered, NO watermarks NO logos`;
    } else {
      imagePrompt = `超精细竖版「灵魂契合卡」(9:16比例)，赛博道教融合风格：

【布局要求】
■ 顶部：巨大鎏金篆体标题「${name}的灵魂契合卡」，金属质感发光
■ 左半区(传统水墨风)：
  - 八字命盘圆盘图，四柱：${baziPillars}
  - 日主${dayMaster}(${dayElement})居中
  - 各地支藏干标注（子藏癸、丑藏己癸辛等）
  - 十神标注：${shiShen}
  - 用神「${yongShen}」用红色高亮标出
  ${kongWang ? `- 空亡位置：${kongWang}（用虚线或灰色标注）` : ''}
  - 神煞：${shenSha}
■ 右半区(赛博紫电风)：
  - ${mbtiType}人格雷达图，霓虹电路纹理
  - 认知功能栈进度条：${cognitiveFunctions}
  - 用五行颜色渐变：木青、火红、土黄、金白、水黑
■ 正中央最显眼：超大鎏金篆体灵魂称号「${soulTitle}」，金光四射
■ 中间横贯：五行能量光带连接左右，形成"命运齿轮"转动感
■ 底部：古籍卷轴风格横批，一句话人格总评「${personalityQuote}」

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

  // PRIORITY 1: Try to extract from structured "朋友圈文案" section first
  const summarySection = content.match(/---朋友圈文案开始---([^]*?)---朋友圈文案结束---/) ||
                         content.match(/---SOCIAL MEDIA SUMMARY START---([^]*?)---SOCIAL MEDIA SUMMARY END---/);

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
                          summary.match(/【Useful God】\s*(\w+)/i);
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
                       summary.match(/【Personality Quote】\s*([^\n【]+)/i);
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
