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
- LEFT HALF (Traditional Chinese): Circular BaZi chart wheel showing Four Pillars "${baziPillars}", Day Master ${dayMaster}(${dayElement}), Ten Gods: ${shiShen}, Favorable Element: ${yongShen} in RED, Divine Stars: ${shenSha}
- RIGHT HALF (Retro-tech): Classic Kuder decagonal radar diagram with 10 career interest domains, filled with Five Element colors (Wood=cyan, Fire=red, Earth=yellow, Metal=white, Water=black). TOP 3 domains glowing bright: ${top3Domains}. BOTTOM 3 domains dimmed: ${bottom3Domains}
- CENTER: Massive gilded seal script showing destiny title "${careerTitle}" with golden rays
- MIDDLE: Five Element energy streams connecting both sides like a "destiny balance scale"
- BOTTOM: Vintage scroll style career summary - Best careers: ${careers}

STYLE: Cyberpunk retro + vaporwave + laser gold foil + particle texture, maximum PUNCH, extreme information density yet well-layered, NO watermarks`;
    } else {
      imagePrompt = `超精细竖版「库德尔宿命职业卡」(9:16比例)，蒸汽波复古融合风格：

【布局要求】
■ 背景：深空墨蓝 + 金色星轨 + 复古机械齿轮纹理
■ 顶部：巨大烫金标题「${name}的库德尔宿命职业卡」，金属质感发光
■ 左半区(传统水墨风)：
  - 八字命盘圆盘图，四柱：${baziPillars}
  - 日主${dayMaster}(${dayElement})居中
  - 十神标注：${shiShen}
  - 用神「${yongShen}」用红色高亮标出
  - 神煞：${shenSha}
■ 右半区(复古科技风)：
  - 库德尔经典十边形雷达图，十大职业兴趣领域
  - 用五行颜色填充：木青、火红、土黄、金白、水黑
  - 前三强领域爆表发光：${top3Domains}
  - 后三弱领域暗淡：${bottom3Domains}
■ 正中央最显眼：超大鎏金篆体宿命称号「${careerTitle}」，金光四射
■ 中间横贯：五行能量光带连接左右，形成"命运天平"转动感
■ 底部：复古卷轴横批 - 最佳职业方向：${careers}

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
 */
function extractKuderInfo(content, isEnglish) {
  const result = {
    bazi: null,
    careerTitle: null,
    fourPillars: { year: null, month: null, day: null, hour: null },
    dayMaster: null,
    shiShen: [],
    yongShen: null,
    shenSha: [],
    kongWang: null,       // 空亡
    topDomains: [],       // Top 3 Kuder domains
    bottomDomains: [],    // Bottom 3 Kuder domains
    careers: [],          // Recommended careers
    summary: null,
    talentQuote: null     // 天赋金句
  };

  if (!content) return result;

  console.log('[ExtractKuderInfo] Content length:', content.length);
  console.log('[ExtractKuderInfo] Content preview:', content.substring(0, 500));

  // Extract Career Title - look for patterns (more flexible matching)
  const careerTitlePatterns = [
    /宿命职业称号[：:]\s*[「"'【]?([^「"'】\n]+)[」"'】]?/,
    /职业称号[：:]\s*[「"'【]?([^「"'】\n]+)[」"'】]?/,
    /专属.*?称号[：:]\s*[「"'【]?([^「"'】\n]+)[」"'】]?/,
    /Destiny Career Title[：:]\s*[「"']?([^「"'\n]+)[」"']?/i,
    /Career Title[：:]\s*[「"']?([^「"'\n]+)[」"']?/i,
    /["「【]([^"」】]+[·][^"」】]+)["」】]/,  // Match patterns like "XX·YY"
    /([甲乙丙丁戊己庚辛壬癸][^\s·，。]{1,6}[·][^\s，。]{2,10})/  // Match like "庚金剑修·征服者"
  ];

  for (const pattern of careerTitlePatterns) {
    const match = content.match(pattern);
    if (match) {
      result.careerTitle = match[1].trim().replace(/[*#]/g, '');
      console.log('[ExtractKuderInfo] Found career title:', result.careerTitle);
      break;
    }
  }

  // Extract Four Pillars - more flexible patterns
  const pillarPatterns = [
    { key: 'year', patterns: [/年柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/, /年[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/] },
    { key: 'month', patterns: [/月柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/, /月[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/] },
    { key: 'day', patterns: [/日柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/, /日[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/] },
    { key: 'hour', patterns: [/时柱[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/, /时[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/] }
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

  // Also try to extract all four pillars from a single line like "四柱：甲子 乙丑 丙寅 丁卯"
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
    console.log('[ExtractKuderInfo] Found BaZi:', result.bazi);
  }

  // Extract Day Master - more patterns
  const dayMasterPatterns = [
    /日主[：:]\s*([甲乙丙丁戊己庚辛壬癸])/,
    /日元[：:]\s*([甲乙丙丁戊己庚辛壬癸])/,
    /日干[：:]\s*([甲乙丙丁戊己庚辛壬癸])/
  ];
  for (const pattern of dayMasterPatterns) {
    const match = content.match(pattern);
    if (match) {
      result.dayMaster = match[1];
      console.log('[ExtractKuderInfo] Found Day Master:', result.dayMaster);
      break;
    }
  }

  // If no day master found, try to extract from day pillar
  if (!result.dayMaster && result.fourPillars.day) {
    result.dayMaster = result.fourPillars.day[0];
  }

  // Extract ShiShen (十神)
  const shiShenSet = new Set();
  const shiShenPattern = /(正官|七杀|偏官|正财|偏财|正印|偏印|食神|伤官|比肩|劫财|枭神)/g;
  let match;
  while ((match = shiShenPattern.exec(content)) !== null) {
    shiShenSet.add(match[1]);
  }
  result.shiShen = Array.from(shiShenSet).slice(0, 6);
  console.log('[ExtractKuderInfo] Found ShiShen:', result.shiShen);

  // Extract YongShen (用神)
  const yongShenPatterns = [
    /用神[：:]\s*([金木水火土])/,
    /喜用神[：:]\s*([金木水火土])/,
    /喜神[：:]\s*([金木水火土])/
  ];
  for (const pattern of yongShenPatterns) {
    const yongMatch = content.match(pattern);
    if (yongMatch) {
      result.yongShen = yongMatch[1];
      break;
    }
  }

  // Extract ShenSha (神煞)
  const shenShaSet = new Set();
  const shenShaPattern = /(太极贵人|天乙贵人|文昌|华盖|桃花|红鸾|天德贵人|月德贵人|驿马|将星|金舆|天厨|学堂|词馆|国印|羊刃|禄神|空亡|孤辰|寡宿|天喜|红艳)/g;
  while ((match = shenShaPattern.exec(content)) !== null) {
    shenShaSet.add(match[1]);
  }
  result.shenSha = Array.from(shenShaSet).slice(0, 5);

  // Extract 空亡
  const kongWangMatch = content.match(/空亡[：:]\s*([子丑寅卯辰巳午未申酉戌亥]+)/);
  if (kongWangMatch) {
    result.kongWang = kongWangMatch[1];
  }

  // Extract Kuder domains with scores - improved patterns
  const kuderDomainsCN = ['户外', '机械', '计算', '科学', '说服', '艺术', '文学', '音乐', '社会服务', '文书'];

  // Pattern 1: "艺术：92分" or "艺术(92)" or "艺术 92"
  const domainScores = [];
  for (const domain of kuderDomainsCN) {
    const patterns = [
      new RegExp(`${domain}[：:（(]?\\s*(\\d{1,3})\\s*[分）)]?`, 'g'),
      new RegExp(`${domain}\\s*[\\(（]\\s*(\\d{1,3})\\s*[\\)）]`, 'g'),
      new RegExp(`(\\d{1,3})\\s*[分]*\\s*[\\(（]?${domain}`, 'g')
    ];
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const m of matches) {
        const score = parseInt(m[1]);
        if (score >= 0 && score <= 100) {
          domainScores.push({ name: domain, score });
          break;
        }
      }
      if (domainScores.find(d => d.name === domain)) break;
    }
  }

  // Also try patterns like "前三强：艺术、文学、音乐" and "后三弱：机械、户外、计算"
  const top3Match = content.match(/前三强[领域]*[：:]\s*([^\n]+)/);
  const bottom3Match = content.match(/后三弱[领域]*[：:]\s*([^\n]+)/);

  if (top3Match && result.topDomains.length === 0) {
    const domains = top3Match[1].split(/[、,，]/).map(d => d.trim()).filter(d => kuderDomainsCN.includes(d));
    result.topDomains = domains.slice(0, 3).map((name, i) => ({ name, score: 90 - i * 5 }));
  }
  if (bottom3Match && result.bottomDomains.length === 0) {
    const domains = bottom3Match[1].split(/[、,，]/).map(d => d.trim()).filter(d => kuderDomainsCN.includes(d));
    result.bottomDomains = domains.slice(0, 3).map((name, i) => ({ name, score: 30 + i * 5 }));
  }

  // Sort by score and get top/bottom 3
  if (domainScores.length >= 3) {
    domainScores.sort((a, b) => b.score - a.score);
    result.topDomains = domainScores.slice(0, 3);
    result.bottomDomains = domainScores.slice(-3).reverse();
  }

  console.log('[ExtractKuderInfo] Top domains:', result.topDomains);
  console.log('[ExtractKuderInfo] Bottom domains:', result.bottomDomains);

  // Extract recommended careers - more patterns
  const careerPatterns = [
    /最匹配.*?职业[：:]\s*([^\n]+)/,
    /推荐职业[：:]\s*([^\n]+)/,
    /适合.*?职业[：:]\s*([^\n]+)/,
    /现代职业[：:]\s*([^\n]+)/,
    /职业方向[：:]\s*([^\n]+)/,
    /Best careers?[：:]\s*([^\n]+)/i,
    /Matching careers?[：:]\s*([^\n]+)/i,
    /Recommended.*?careers?[：:]\s*([^\n]+)/i
  ];

  for (const pattern of careerPatterns) {
    const careerMatch = content.match(pattern);
    if (careerMatch) {
      result.careers = careerMatch[1]
        .split(/[、,，\d+\.。]/)
        .map(c => c.trim())
        .filter(c => c.length > 1 && c.length < 20 && !c.match(/^[\d\s]+$/))
        .slice(0, 5);
      if (result.careers.length > 0) break;
    }
  }
  console.log('[ExtractKuderInfo] Careers:', result.careers);

  // Extract talent quote / 天赋金句
  const quotePatterns = [
    /天赋金句[：:]\s*[「"']?([^「"'\n]+)[」"']?/,
    /一句话.*?[：:]\s*[「"']?([^「"'\n]+)[」"']?/,
    /金句[：:]\s*[「"']?([^「"'\n]+)[」"']?/
  ];
  for (const pattern of quotePatterns) {
    const quoteMatch = content.match(pattern);
    if (quoteMatch) {
      result.talentQuote = quoteMatch[1].trim();
      break;
    }
  }

  return result;
}
