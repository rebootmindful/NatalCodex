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

    // Talent quote
    const talentQuote = extractedInfo.talentQuote || '命中注定的天赋，终将照亮前行的路';
    const kongWang = extractedInfo.kongWang || '';
    const favorableColors = extractedInfo.favorableColors || '';

    // Map day master to element
    const dayMasterElements = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
      '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
    };
    const dayElement = dayMasterElements[dayMaster] || '火';

    let imagePrompt;
    if (isEnglish) {
      imagePrompt = `Ultra-detailed vertical Kuder Destiny Career Card (9:16 ratio), steampunk retro fusion style:

LAYOUT:
- BACKGROUND: Deep space navy blue + golden star orbits + vintage mechanical gears
- TOP: Giant golden foil title "${name}'s Kuder Destiny Career Card" with metallic glow
- LEFT HALF (Traditional Chinese ink style):
  - Circular BaZi chart wheel showing Four Pillars: ${baziPillars}
  - Day Master ${dayMaster}(${dayElement}) in center
  - Hidden Stems (地支藏干) marked on each branch
  - Ten Gods labeled: ${shiShen}
  - Favorable Element "${yongShen}" highlighted in RED
  ${kongWang ? `- Empty Void (空亡): ${kongWang} marked` : ''}
  - Divine Stars: ${shenSha}
  ${favorableColors ? `- Favorable Colors: ${favorableColors}` : ''}
- RIGHT HALF (Retro-tech style):
  - Classic Kuder decagonal radar diagram with 10 career interest domains
  - Filled with Five Element colors: Wood=cyan, Fire=red, Earth=yellow, Metal=white, Water=black
  - TOP 3 domains glowing bright: ${top3Domains}
  - BOTTOM 3 domains dimmed: ${bottom3Domains}
- CENTER: Massive gilded seal script showing destiny title "${careerTitle}" with golden rays
- MIDDLE: Five Element energy streams connecting both sides like a "destiny balance scale" in motion
- BOTTOM: Vintage scroll style horizontal banner with talent summary: "${talentQuote}"

STYLE: Cyberpunk retro + vaporwave + laser gold foil + particle texture, maximum PUNCH, extreme information density yet well-layered, NO watermarks NO logos`;
    } else {
      imagePrompt = `超精细竖版「库德尔宿命职业卡」(9:16比例)，蒸汽波复古融合风格：

【布局要求】
■ 背景：深空墨蓝 + 金色星轨 + 复古机械齿轮纹理
■ 顶部：巨大烫金标题「${name}的库德尔宿命职业卡」，金属质感发光
■ 左半区(传统水墨风)：
  - 八字命盘圆盘图，四柱：${baziPillars}
  - 日主${dayMaster}(${dayElement})居中
  - 各地支藏干标注（子藏癸、丑藏己癸辛等）
  - 十神标注：${shiShen}
  - 用神「${yongShen}」用红色高亮标出
  ${kongWang ? `- 空亡位置：${kongWang}（用虚线或灰色标注）` : ''}
  - 神煞：${shenSha}
  ${favorableColors ? `- 喜用颜色：${favorableColors}` : ''}
■ 右半区(复古科技风)：
  - 库德尔经典十边形雷达图，十大职业兴趣领域
  - 用五行颜色填充：木青、火红、土黄、金白、水黑
  - 前三强领域爆表发光：${top3Domains}
  - 后三弱领域暗淡：${bottom3Domains}
■ 正中央最显眼：超大鎏金篆体宿命称号「${careerTitle}」，金光四射
■ 中间横贯：五行能量光带连接左右，形成"命运天平"转动感
■ 底部：复古卷轴横批，一句话天赋总结「${talentQuote}」

【风格要求】
赛博复古 + 蒸汽波 + 镭射烫金 + 微粒感，极致PUNCH
深空墨蓝底色 + 金色星轨点缀 + 霓虹五行色
信息密度爆炸但层次分明
所有文字中文，标题篆体+衬线体，正文宋体黑体搭配，关键词荧光描边
不要水印不要logo`;
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

  // PRIORITY 1: Try to extract from structured "朋友圈文案" section first
  const summarySection = content.match(/---朋友圈文案开始---([^]*?)---朋友圈文案结束---/) ||
                         content.match(/---SOCIAL MEDIA SUMMARY START---([^]*?)---SOCIAL MEDIA SUMMARY END---/);

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
                          summary.match(/【Useful God】\s*(\w+)/i);
    if (yongShenMatch) {
      result.yongShen = yongShenMatch[1];
    }

    // Extract favorable colors: 【喜用颜色】颜色1、颜色2
    const colorMatch = summary.match(/【喜用颜色】\s*([^\n【]+)/) ||
                       summary.match(/【Favorable Color】\s*([^\n【]+)/i);
    if (colorMatch) {
      result.favorableColors = colorMatch[1].trim();
    }

    // Extract top 3 domains: 【前三强领域】①XX(分数) ②XX(分数) ③XX(分数)
    const topDomainsMatch = summary.match(/【前三强领域】\s*([^\n【]+)/) ||
                            summary.match(/【Top 3 Domains】\s*([^\n【]+)/i);
    if (topDomainsMatch) {
      const domainStr = topDomainsMatch[1];
      const domainPattern = /([①②③\d]+)?[\.、]?\s*([^\s（(①②③\d]+)[（(](\d+)[）)]/g;
      let match;
      while ((match = domainPattern.exec(domainStr)) !== null) {
        result.topDomains.push({ name: match[2], score: parseInt(match[3]) });
      }
    }

    // Extract bottom 3 domains: 【后三弱领域】①XX(分数) ②XX(分数) ③XX(分数)
    const bottomDomainsMatch = summary.match(/【后三弱领域】\s*([^\n【]+)/) ||
                               summary.match(/【Bottom 3 Domains】\s*([^\n【]+)/i);
    if (bottomDomainsMatch) {
      const domainStr = bottomDomainsMatch[1];
      const domainPattern = /([①②③\d]+)?[\.、]?\s*([^\s（(①②③\d]+)[（(](\d+)[）)]/g;
      let match;
      while ((match = domainPattern.exec(domainStr)) !== null) {
        result.bottomDomains.push({ name: match[2], score: parseInt(match[3]) });
      }
    }

    // Extract recommended careers: 【推荐职业】职业1、职业2、职业3
    const careersMatch = summary.match(/【推荐职业】\s*([^\n【]+)/) ||
                         summary.match(/【Recommended Careers】\s*([^\n【]+)/i);
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
                       summary.match(/【Talent Quote】\s*([^\n【]+)/i);
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
