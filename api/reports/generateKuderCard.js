/**
 * Kuder Destiny Career Card Image Generation API
 * Uses APIMart: gemini-3-pro-image-preview for image generation
 *
 * API is asynchronous:
 * 1. Submit task -> get task_id
 * 2. Poll task status until completed
 * 3. Return image URL
 */

const config = {
  API_KEY: process.env.APIMART_API_KEY || '',
  BASE_URL: 'https://api.apimart.ai/v1',
  IMAGE_MODEL: 'gemini-3-pro-image-preview'
};

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 120000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, gender, reportContent, rawAnalysis, language } = req.body;

  if (!name || !reportContent) {
    return res.status(400).json({ error: 'name and reportContent required' });
  }

  const isEnglish = language === 'en';

  console.log('[GenerateKuderCard] Starting for:', name);
  console.log('[GenerateKuderCard] Language:', language);

  try {
    // Extract key info from Kuder report
    const extractedInfo = extractKuderInfo(rawAnalysis || reportContent, isEnglish);
    console.log('[GenerateKuderCard] Extracted info:', JSON.stringify(extractedInfo, null, 2));

    // Build image prompt for Kuder Destiny Career Card
    const careerTitle = extractedInfo.careerTitle || `${name}之宿命`;
    const fp = extractedInfo.fourPillars;
    const baziPillars = fp.year && fp.month && fp.day && fp.hour
      ? `${fp.year} ${fp.month} ${fp.day} ${fp.hour}`
      : (extractedInfo.bazi || '己卯 戊申 丁未 戊午');
    const dayMaster = extractedInfo.dayMaster || '丁';
    const shiShen = extractedInfo.shiShen.length > 0 ? extractedInfo.shiShen.join('、') : '正官、食神、伤官';
    const yongShen = extractedInfo.yongShen || '木';
    const shenSha = extractedInfo.shenSha.length > 0 ? extractedInfo.shenSha.join('、') : '天乙贵人、文昌';

    // Kuder domains - top 3 and bottom 3
    const top3Domains = extractedInfo.topDomains.length > 0
      ? extractedInfo.topDomains.map(d => `${d.name}(${d.score})`).join('、')
      : '艺术(92)、文学(88)、音乐(85)';
    const bottom3Domains = extractedInfo.bottomDomains.length > 0
      ? extractedInfo.bottomDomains.map(d => `${d.name}(${d.score})`).join('、')
      : '机械(25)、户外(30)、计算(35)';
    const careers = extractedInfo.careers.length > 0
      ? extractedInfo.careers.join('、')
      : '设计师、作家、心理咨询师';

    // Talent quote - truncate to avoid prompt being too long
    let talentQuote = extractedInfo.talentQuote || '命中注定的天赋，终将照亮前行的路';
    // Keep only the main quote part (before translation if exists)
    if (talentQuote.length > 30) {
      const mainQuote = talentQuote.match(/「([^」]+)」/);
      if (mainQuote) {
        talentQuote = mainQuote[0]; // Just keep 「...」 part
      } else {
        talentQuote = talentQuote.substring(0, 30);
      }
    }
    const kongWang = extractedInfo.kongWang || '';
    const favorableColors = extractedInfo.favorableColors || '';

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
      imagePrompt = `Create a vertical Kuder Destiny Career Card (9:16 aspect ratio) with steampunk-vaporwave fusion aesthetic.

VISUAL COMPOSITION:
- Background: Deep space indigo with golden star trails and vintage mechanical gears
- Overall style: Retro-futurism meets Chinese divination, holographic textures with industrial elements

TOP SECTION (15%):
- Golden metallic title text: "${name}'s Kuder Destiny Career Card"
- Elegant serif font with golden glow effect
- Decorative mechanical gear patterns flanking the title

LEFT PANEL (35%):
- Traditional circular BaZi chart with modern styling
- Four Pillars displayed: ${baziPillars}
- Day Master "${dayMaster}" (${dayElement} Element) highlighted in center
- Favorable Element "${yongShen}" marked in RED
- English labels: Year/Month/Day/Hour Pillar
- Ink brush texture with mystical aesthetic

RIGHT PANEL (35%):
- Futuristic DECAGON radar chart (10-sided polygon)
- 10 vertices with English labels: Outdoor, Mechanical, Computational, Scientific, Persuasive, Artistic, Literary, Musical, Social Service, Clerical
- Top 3 strengths glowing brightly: ${top3Domains}
- Bottom 3 weaknesses dimmed: ${bottom3Domains}
- Neon circuit patterns with Five Element colors
- Color scheme: Wood=cyan, Fire=crimson, Earth=amber, Metal=silver, Water=indigo

CENTER FOCAL POINT (25%):
- LARGEST element on card
- Destiny Title: "${careerTitle}" in elegant golden typography
- Rose gold metallic finish with holographic shimmer
- Radiating golden light rays with gear motifs

BOTTOM BANNER (15%):
- Vintage scroll style horizontal banner
- Quote text in English: "${talentQuote}"
- Aged parchment texture with golden border

STYLE REQUIREMENTS:
- Color palette: Deep indigo, vaporwave purple, electric blue, neon pink, gold accents
- Textures: Holographic foil, metallic gold, mechanical gears, cosmic nebula
- ALL TEXT IN ENGLISH
- High information density but clear visual hierarchy
- Steampunk ceremonial atmosphere with futuristic elements
- NO watermarks, NO logos, NO signatures

Quality: Ultra-detailed, sharp focus, professional card design`;
    } else {
      // Chinese version - all text in Chinese
      imagePrompt = `Create a vertical Kuder Destiny Career Card (9:16 aspect ratio) with steampunk-vaporwave fusion aesthetic.

VISUAL COMPOSITION:
- Background: Deep space indigo with golden star trails and vintage mechanical gears
- Overall style: Retro-futurism meets Chinese divination, holographic textures with industrial elements

TOP SECTION (15%):
- Golden metallic title text: "${name}的库德尔宿命职业卡"
- Seal script (篆书) style font with golden glow effect
- Decorative mechanical gear patterns flanking the title

LEFT PANEL (35%):
- Traditional ink-wash style circular BaZi chart
- Four Pillars displayed in Chinese: ${baziPillars}
- Day Master "${dayMaster}" highlighted in center
- Favorable God "${yongShen}" marked in RED
- Chinese labels for Ten Gods
- Ink brush texture with subtle smoke effects

RIGHT PANEL (35%):
- Futuristic DECAGON radar chart (10-sided polygon)
- 10 vertices with Chinese labels for Kuder's 10 career interest areas
- Top 3 strengths glowing brightly: ${top3Domains}
- Bottom 3 weaknesses dimmed: ${bottom3Domains}
- Neon circuit patterns with Five Element colors
- Color scheme: Wood=cyan, Fire=crimson, Earth=amber, Metal=silver, Water=indigo

CENTER FOCAL POINT (25%):
- LARGEST element on card
- Destiny Title: "${careerTitle}" in ornate golden seal script (Chinese)
- Rose gold metallic finish with holographic shimmer
- Radiating golden light rays with gear motifs

BOTTOM BANNER (15%):
- Vintage scroll style horizontal banner
- Quote text in Chinese: "${talentQuote}"
- Aged parchment texture with golden border

STYLE REQUIREMENTS:
- Color palette: Deep indigo, vaporwave purple, electric blue, neon pink, gold accents
- Textures: Holographic foil, metallic gold, mechanical gears, cosmic nebula
- ALL TEXT IN CHINESE CHARACTERS (简体中文)
- High information density but clear visual hierarchy
- Steampunk ceremonial atmosphere with futuristic elements
- NO watermarks, NO logos, NO signatures

Quality: Ultra-detailed, sharp focus, professional card design`;
    }

    console.log('[GenerateKuderCard] Image prompt length:', imagePrompt.length);
    console.log('[GenerateKuderCard] Submitting image generation task...');

    // Submit task
    const submitResponse = await fetch(`${config.BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.IMAGE_MODEL,
        prompt: imagePrompt,
        size: '9:16',
        n: 1
      })
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('[GenerateKuderCard] Submit Error:', submitResponse.status, errorText);
      throw new Error(`Submit failed: ${submitResponse.status} - ${errorText.substring(0, 200)}`);
    }

    const submitData = await submitResponse.json();
    console.log('[GenerateKuderCard] Submit response:', JSON.stringify(submitData, null, 2));

    const taskId = submitData.data?.[0]?.task_id;
    if (!taskId) {
      console.error('[GenerateKuderCard] No task_id in response:', submitData);
      throw new Error('No task_id returned from API');
    }

    console.log('[GenerateKuderCard] Task ID:', taskId);

    // Poll for completion
    const imageUrl = await pollTaskResult(taskId);

    console.log('[GenerateKuderCard] Success! Image URL:', imageUrl.substring(0, 100) + '...');

    return res.json({
      success: true,
      imageUrl,
      extractedInfo,
      taskId
    });

  } catch (error) {
    console.error('[GenerateKuderCard] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

async function pollTaskResult(taskId) {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME) {
    console.log('[GenerateKuderCard] Polling task:', taskId);

    const queryResponse = await fetch(`${config.BASE_URL}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error('[GenerateKuderCard] Query Error:', queryResponse.status, errorText);
      throw new Error(`Query failed: ${queryResponse.status}`);
    }

    const queryData = await queryResponse.json();
    console.log('[GenerateKuderCard] Task response:', JSON.stringify(queryData, null, 2));

    const status = queryData.data?.status || queryData.status;
    const failCode = queryData.data?.failCode || queryData.failCode;
    const failMsg = queryData.data?.failMsg || queryData.failMsg;
    const error = queryData.error || queryData.data?.error;

    // Try to find image URL
    let imageUrl = queryData.data?.result?.images?.[0]?.url?.[0] ||
                   queryData.data?.result?.images?.[0]?.url ||
                   queryData.data?.output?.image_url ||
                   queryData.data?.output?.url ||
                   queryData.data?.result?.url ||
                   queryData.data?.result?.image_url ||
                   queryData.data?.url ||
                   queryData.data?.image_url ||
                   queryData.data?.output?.[0]?.url ||
                   queryData.data?.images?.[0]?.url?.[0] ||
                   queryData.data?.images?.[0]?.url ||
                   queryData.data?.images?.[0] ||
                   queryData.url ||
                   queryData.image_url;

    if (Array.isArray(imageUrl)) {
      imageUrl = imageUrl[0];
    }

    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      console.log('[GenerateKuderCard] Found image URL:', imageUrl);
      return imageUrl;
    }

    if (failCode || failMsg || error || status === 'failed' || status === 'error') {
      const errorMsg = failMsg || error || failCode || 'Task failed';
      console.error('[GenerateKuderCard] Task failed with:', errorMsg);
      throw new Error(`Generation failed: ${typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg}`);
    }

    if (status === 'processing' || status === 'pending' || status === 'submitted' || status === 'running') {
      console.log('[GenerateKuderCard] Task still processing, status:', status);
      await sleep(POLL_INTERVAL);
      continue;
    }

    if (status === 'completed' || status === 'success') {
      console.error('[GenerateKuderCard] Task completed but no image URL found');
      throw new Error('Task completed but image URL not found');
    }

    console.log('[GenerateKuderCard] Unknown status:', status, '- continuing to poll...');
    await sleep(POLL_INTERVAL);
  }

  throw new Error('Image generation timeout (2 minutes)');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract comprehensive BaZi and Kuder info from report content
 * Enhanced to support the new structured "朋友圈文案" format
 */
function extractKuderInfo(content, isEnglish) {
  const result = {
    bazi: null,
    careerTitle: null,
    fourPillars: { year: null, month: null, day: null, hour: null },
    dayMaster: null,
    dayMasterStrength: null,
    shiShen: [],
    yongShen: null,
    shenSha: [],
    kongWang: null,
    favorableColors: null,    // 喜用颜色
    unfavorableColors: null,  // 忌讳颜色
    topDomains: [],
    bottomDomains: [],
    careers: [],
    summary: null,
    talentQuote: null
  };

  if (!content) return result;

  console.log('[ExtractKuderInfo] Content length:', content.length);

  // PRIORITY 1: Try to extract from structured "报告总结" section first
  const summarySection = content.match(/---报告总结开始---([^]*?)---报告总结结束---/) ||
                         content.match(/---REPORT SUMMARY START---([^]*?)---REPORT SUMMARY END---/);

  if (summarySection) {
    const summary = summarySection[1];
    console.log('[ExtractKuderInfo] Found structured summary section');

    // Extract BaZi: 【八字】年柱 月柱 日柱 时柱
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

    // Extract day master: 【日主】X行（旺/弱）
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

    // Extract top 3 domains: 【库德尔前三强】1.XX领域(XX分) 2.XX领域(XX分) 3.XX领域(XX分)
    const topDomainsMatch = summary.match(/【库德尔前三强】\s*([^\n【]+)/) ||
                            summary.match(/【Kuder Top 3】\s*([^\n【]+)/i);
    if (topDomainsMatch) {
      const domainStr = topDomainsMatch[1];
      const domainPattern = /([①②③\d]+)?[\.、]?\s*([^\s（(①②③\d]+)[领域]*[（(](\d+)[分）)]/g;
      let match;
      while ((match = domainPattern.exec(domainStr)) !== null) {
        result.topDomains.push({ name: match[2].replace(/领域$/, ''), score: parseInt(match[3]) });
      }
    }

    // Extract bottom 3 domains: 【库德尔后三弱】8.XX领域(XX分) 9.XX领域(XX分) 10.XX领域(XX分)
    const bottomDomainsMatch = summary.match(/【库德尔后三弱】\s*([^\n【]+)/) ||
                               summary.match(/【Kuder Bottom 3】\s*([^\n【]+)/i);
    if (bottomDomainsMatch) {
      const domainStr = bottomDomainsMatch[1];
      const domainPattern = /([①②③\d]+)?[\.、]?\s*([^\s（(①②③\d]+)[领域]*[（(](\d+)[分）)]/g;
      let match;
      while ((match = domainPattern.exec(domainStr)) !== null) {
        result.bottomDomains.push({ name: match[2].replace(/领域$/, ''), score: parseInt(match[3]) });
      }
    }

    // Extract recommended careers: 【TOP5职业】职业1、职业2、职业3、职业4、职业5
    const careersMatch = summary.match(/【TOP5职业】\s*([^\n【]+)/) ||
                         summary.match(/【TOP5 Careers】\s*([^\n【]+)/i);
    if (careersMatch) {
      result.careers = careersMatch[1].split(/[、,，]/).map(c => c.trim()).filter(c => c.length > 1).slice(0, 5);
    }

    // Extract career title: 【宿命职业称号】XXX·XXX
    const careerTitleMatch = summary.match(/【宿命职业称号】\s*([^\n【]+)/) ||
                             summary.match(/【Destiny Career Title】\s*([^\n【]+)/i);
    if (careerTitleMatch) {
      result.careerTitle = careerTitleMatch[1].trim().replace(/[*#「」"']/g, '');
    }

    // Extract talent quote: 【天赋金句】「古籍原文」——《书名》，译：现代翻译
    const quoteMatch = summary.match(/【天赋金句】\s*([^\n【]+)/) ||
                       summary.match(/【Talent Quote】\s*([^\n【]+)/i) ||
                       summary.match(/【Golden Quote】\s*([^\n【]+)/i);
    if (quoteMatch) {
      result.talentQuote = quoteMatch[1].trim().replace(/[*#]/g, '');
      console.log('[ExtractKuderInfo] Found talent quote from structured format:', result.talentQuote);
    }
  }

  // PRIORITY 2: Fallback to traditional extraction methods

  // Extract Career Title if not already found
  if (!result.careerTitle) {
    const careerTitlePatterns = [
      /宿命职业称号[：:]\s*[「"'【\*]*([^「"'】\n*，。]+)[」"'】\*]*/,
      /职业称号[：:]\s*[「"'【\*]*([^「"'】\n*，。]+)[」"'】\*]*/,
      /Destiny Career Title[：:]\s*[「"'【\*]*([^「"'】\n*]+)[」"'】\*]*/i,
      /\*\*([^*\n]+[·][^*\n]+)\*\*/,
      /[「"'【]([^「"'】\n]+[·][^「"'】\n]+)[」"'】]/,
      /([甲乙丙丁戊己庚辛壬癸][金木水火土]?[^\s·，。]{0,8}[·][^\s，。\n]{2,15})/
    ];

    for (const pattern of careerTitlePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const title = match[1].trim().replace(/[*#「」"'【】]/g, '');
        if (title.length > 2 && title.length < 30) {
          result.careerTitle = title;
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

  // Extract favorable colors if not already found
  if (!result.favorableColors) {
    const colorPatterns = [
      /喜用颜色[：:]\s*([^\n，。]+)/,
      /喜忌颜色[：:][^\n]*喜[：:]\s*([^\n，。忌]+)/,
      /Favorable.*?Color[：:]\s*([^\n]+)/i
    ];
    for (const pattern of colorPatterns) {
      const match = content.match(pattern);
      if (match) {
        result.favorableColors = match[1].trim();
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

  // Extract Kuder domains if not already found
  if (result.topDomains.length === 0) {
    const kuderDomainsCN = ['户外', '机械', '计算', '科学', '说服', '艺术', '文学', '音乐', '社会服务', '文书'];
    const domainScores = [];

    for (const domain of kuderDomainsCN) {
      const patterns = [
        new RegExp(`${domain}[：:（(]?\\s*(\\d{1,3})\\s*[分）)]?`),
        new RegExp(`${domain}\\s*[\\(（]\\s*(\\d{1,3})\\s*[\\)）]`)
      ];
      for (const pattern of patterns) {
        const domainMatch = content.match(pattern);
        if (domainMatch) {
          const score = parseInt(domainMatch[1]);
          if (score >= 0 && score <= 100) {
            domainScores.push({ name: domain, score });
            break;
          }
        }
      }
    }

    if (domainScores.length >= 3) {
      domainScores.sort((a, b) => b.score - a.score);
      result.topDomains = domainScores.slice(0, 3);
      result.bottomDomains = domainScores.slice(-3).reverse();
    }
  }

  // Extract careers if not already found
  if (result.careers.length === 0) {
    const careerPatterns = [
      /最匹配.*?职业[：:]\s*([^\n]+)/,
      /推荐职业[：:]\s*([^\n]+)/,
      /现代职业[：:]\s*([^\n]+)/,
      /Recommended.*?Careers?[：:]\s*([^\n]+)/i
    ];

    for (const pattern of careerPatterns) {
      const careerMatch = content.match(pattern);
      if (careerMatch) {
        result.careers = careerMatch[1]
          .split(/[、,，]/)
          .map(c => c.trim())
          .filter(c => c.length > 1 && c.length < 20)
          .slice(0, 5);
        if (result.careers.length > 0) break;
      }
    }
  }

  // Extract talent quote if not already found
  if (!result.talentQuote) {
    const quotePatterns = [
      /天赋金句[：:]\s*[「"']*([^「"'\n]+)[」"']*/,
      /一句话天赋[金句]*[：:]\s*[「"']*([^「"'\n]+)[」"']*/,
      /Talent Quote[：:]\s*[「"']*([^「"'\n]+)[」"']*/i,
      /「([^」\n]{10,60})」[——\-—]+《([^》]+)》[，,]?\s*译[：:]\s*([^「\n]+)/,
      /《([^》]+)》[云曰][：:]*\s*[「"']*([^「"'\n]+)[」"']*/
    ];
    for (const pattern of quotePatterns) {
      const quoteMatch = content.match(pattern);
      if (quoteMatch) {
        if (quoteMatch[3]) {
          result.talentQuote = `「${quoteMatch[1]}」——《${quoteMatch[2]}》，译：${quoteMatch[3]}`;
        } else if (quoteMatch[1]) {
          const quote = quoteMatch[1].trim().replace(/[*#「」"']/g, '');
          if (quote.length > 5 && quote.length < 120) {
            result.talentQuote = quote;
          }
        }
        if (result.talentQuote) break;
      }
    }
  }

  console.log('[ExtractKuderInfo] Final extraction result:', {
    bazi: result.bazi,
    careerTitle: result.careerTitle,
    dayMaster: result.dayMaster,
    yongShen: result.yongShen,
    favorableColors: result.favorableColors,
    topDomains: result.topDomains,
    careers: result.careers,
    talentQuote: result.talentQuote?.substring(0, 50) + '...'
  });

  return result;
}
