/**
 * Test script for extraction functions
 * Simulates AI output and verifies extraction accuracy
 */

// Simulated MBTI report output (模拟AI输出)
const mockMbtiReport = `
# 李梅的八字命理与MBTI人格分析报告

## 基本信息
- 出生：1999-08-08 14:30
- 地点：上海黄浦区
- 时区：Asia/Shanghai
- 性别：女

---

## 一、四柱八字排盘

### 真太阳时修正
上海黄浦区经度约121.47°，真太阳时修正后为14:22

### 四柱八字
- 年柱：己卯（土木）- 藏干：乙
- 月柱：壬申（水金）- 藏干：庚、壬、戊
- 日柱：辛酉（金金）- 藏干：辛
- 时柱：乙未（木土）- 藏干：己、丁、乙

### 十神配置
- 年柱己土：偏印
- 月柱壬水：伤官
- 日柱辛金：比肩（日主）
- 时柱乙木：偏财

### 神煞
天乙贵人、文昌、华盖、驿马

### 空亡
戌亥空亡

### 大运
5岁起运，大运排列：癸酉、甲戌、乙亥、丙子、丁丑、戊寅

---

## 二、命理分析

### 日主五行旺衰
日主辛金生于申月，得令而旺。地支酉金帮身，金气充足，日主偏旺。

### 用神忌神
- 用神：木（财星泄秀）、火（官杀制身）
- 忌神：金（比劫争财）、土（印星生身太过）

### 格局层级
伤官格，中上等格局。伤官透干，聪明伶俐，才华横溢。

---

## 三、MBTI深度推导

### 认知功能推导过程

1. **内向/外向维度 (I/E)**
   辛金日主，阴金性质内敛细腻。华盖星主孤独清高，偏印透干主思想深邃。→ **内向 I**

2. **感觉/直觉维度 (S/N)**
   伤官主导，思维跳跃创新。华盖+文昌组合，善于抽象思考，对玄学哲学有兴趣。→ **直觉 N**

3. **思考/情感维度 (T/F)**
   辛金日主理性客观，伤官冷静分析。但时柱偏财透干，也有人情味。金旺主义气。→ **偏思考 T**

4. **判断/感知维度 (J/P)**
   申酉金气有序，偏印主规划。但伤官也带来灵活性。综合看偏向有计划。→ **判断 J**

### MBTI类型确定
**INTJ** - 建筑师型人格

### 认知功能栈
Ni（主导）> Te（辅助）> Fi（第三）> Se（劣势）

---

## 四、灵魂称号映射

日主辛金 + 伤官格 + 华盖 + INTJ = 

**灵魂称号：辛金玉匠·INTJ**

辛金如珠玉，外表温润内心坚韧；伤官吐秀，才华外显；华盖加身，独立特行。INTJ的战略思维与辛金的精雕细琢完美契合。

---

## 五、朋友圈文案

---朋友圈文案开始---
【八字】己卯 壬申 辛酉 乙未
【日主】金行（旺）
【用神】木行
【MBTI】INTJ（Ni-Te-Fi-Se）
【灵魂称号】辛金玉匠·INTJ
【人格金句】「金水伤官喜见官，惟有金水独清寒」——《滴天髓》，译：金水伤官格的人聪明清高，才华出众却性情孤傲
---朋友圈文案结束---

---
*本报告由AI生成，融合中国传统八字命理与现代MBTI心理学*
`;

// Simulated KUDER report output
const mockKuderReport = `
# 李明的八字命理与库德尔职业分析报告

## 基本信息
- 出生：1995-03-15 09:30
- 地点：北京市朝阳区
- 时区：Asia/Shanghai
- 性别：男

---

## 一、四柱八字排盘

### 真太阳时修正
北京朝阳区经度约116.4°，真太阳时修正后为09:15

### 四柱八字
- 年柱：乙亥（木水）- 藏干：甲、壬
- 月柱：己卯（土木）- 藏干：乙
- 日柱：丙午（火火）- 藏干：己、丁
- 时柱：癸巳（水火）- 藏干：庚、丙、戊

### 十神配置
- 年柱乙木：正印
- 月柱己土：伤官
- 日柱丙火：比肩（日主）
- 时柱癸水：正官

### 神煞
天乙贵人、文昌、红鸾、将星、羊刃

### 空亡
申酉空亡

### 大运
3岁起运，大运排列：庚辰、辛巳、壬午、癸未、甲申、乙酉

---

## 二、命理分析

### 日主五行旺衰
日主丙火生于卯月，木火相生，得令而旺。午火帮身，巳火藏丙，火势强旺。

### 用神忌神
- 用神：水（官杀制身）、金（财星耗身）
- 忌神：木（印星生身太过）、火（比劫争财）

### 格局层级
伤官格配正官，中上等格局。伤官吐秀，正官约束，文武双全。

### 喜忌颜色
- 喜用颜色：黑色、蓝色（水）、白色、银色（金）
- 忌讳颜色：绿色（木）、红色（火）

---

## 三、库德尔十大领域分析

### 深度推导过程

根据八字十神组合与库德尔量表对应：

1. **伤官透干 + 文昌** → 文学(6)、艺术(5)极强
   - 伤官主创作表达，文昌主文采
   - 文学领域得分：88分
   - 艺术领域得分：85分

2. **正印 + 正官组合** → 社会服务(8)较强
   - 印星主教化，官星主责任
   - 社会服务得分：82分

3. **火旺无金** → 机械(1)、计算(2)偏弱
   - 火克金，金代表精密机械
   - 机械领域得分：35分
   - 计算领域得分：38分

4. **羊刃在午** → 户外(0)有潜力但需控制
   - 羊刃主冲劲，但过旺易冲动
   - 户外领域得分：45分

### 前三强领域
1. 文学(88分) - 伤官+文昌
2. 艺术(85分) - 伤官吐秀
3. 社会服务(82分) - 印官相生

### 后三弱领域
1. 机械(35分) - 火旺克金
2. 计算(38分) - 缺乏金水配合
3. 户外(45分) - 羊刃过旺

---

## 四、宿命职业称号

伤官 + 文昌 + 正印 + 正官 = 

**宿命职业称号：伤官吐秀·文坛新星**

丙火日主，热情奔放；伤官透干，才华横溢；文昌加身，文采斐然。正印正官组合，既有创造力又有责任感，适合文化传媒、教育培训类职业。

---

## 五、推荐现代职业

根据库德尔优势领域与八字特征，推荐以下职业：

1. **作家/编剧** - 文学(88分)极强
2. **创意设计师** - 艺术(85分)出众
3. **教育培训师** - 社会服务(82分)+正印
4. **媒体记者** - 伤官表达+文昌采访
5. **心理咨询师** - 印官组合+社会服务

---

## 六、朋友圈文案

---朋友圈文案开始---
【八字】乙亥 己卯 丙午 癸巳
【日主】火行（旺）
【用神】水行
【喜用颜色】黑色、蓝色、白色、银色
【前三强领域】①文学(88) ②艺术(85) ③社会服务(82)
【后三弱领域】①机械(35) ②计算(38) ③户外(45)
【推荐职业】作家、创意设计师、教育培训师、媒体记者、心理咨询师
【宿命职业称号】伤官吐秀·文坛新星
【天赋金句】「火明木秀，定产文章之士」——《穷通宝鉴》，译：火旺得木生，必出文采飞扬之人
---朋友圈文案结束---

---
*本报告由AI生成，融合中国传统八字命理与库德尔职业兴趣量表分析*
`;

// ============ MBTI Extraction Function (copied from generateSoulCard.js) ============
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
    dayMasterStrength: null,
    shiShen: [],
    yongShen: null,
    shenSha: [],
    kongWang: null,
    hiddenStems: null,
    fiveElements: null,
    cognitiveFunctions: null,
    summary: null,
    personalityQuote: null
  };

  if (!content) return result;

  // PRIORITY 1: Try to extract from structured "朋友圈文案" section first
  const summarySection = content.match(/---朋友圈文案开始---([^]*?)---朋友圈文案结束---/) ||
                         content.match(/---SOCIAL MEDIA SUMMARY START---([^]*?)---SOCIAL MEDIA SUMMARY END---/);

  if (summarySection) {
    const summary = summarySection[1];
    console.log('[ExtractInfo] Found structured summary section');

    // Extract from structured format
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

    const dayMasterMatch = summary.match(/【日主】\s*([金木水火土甲乙丙丁戊己庚辛壬癸])行?[（(]?([旺弱强weak]*)[）)]?/) ||
                           summary.match(/【Day Master】\s*(\w+)\s*Element?\s*\(?(strong|weak)?\)?/i);
    if (dayMasterMatch) {
      result.dayMaster = dayMasterMatch[1];
      result.dayMasterStrength = dayMasterMatch[2] || null;
    }

    const yongShenMatch = summary.match(/【用神】\s*([金木水火土])/) ||
                          summary.match(/【Useful God】\s*(\w+)/i);
    if (yongShenMatch) {
      result.yongShen = yongShenMatch[1];
    }

    const mbtiMatch = summary.match(/【MBTI】\s*([INTJSFEP]{4})[（(]?([^）)\n]*)[）)]?/i);
    if (mbtiMatch) {
      result.mbti = mbtiMatch[1].toUpperCase();
      if (mbtiMatch[2]) {
        result.cognitiveFunctions = mbtiMatch[2].trim();
      }
    }

    const soulTitleMatch = summary.match(/【灵魂称号】\s*([^\n【]+)/) ||
                           summary.match(/【Soul Title】\s*([^\n【]+)/i);
    if (soulTitleMatch) {
      result.soulTitle = soulTitleMatch[1].trim().replace(/[*#「」"']/g, '');
    }

    const quoteMatch = summary.match(/【人格金句】\s*([^\n【]+)/) ||
                       summary.match(/【Personality Quote】\s*([^\n【]+)/i);
    if (quoteMatch) {
      result.personalityQuote = quoteMatch[1].trim().replace(/[*#]/g, '');
    }
  }

  // Extract 空亡 - support multiple formats
  const kongWangPatterns = [
    /空亡[：:]\s*([子丑寅卯辰巳午未申酉戌亥]+)/,
    /空亡[\n\r]+([子丑寅卯辰巳午未申酉戌亥]+)/,
    /([子丑寅卯辰巳午未申酉戌亥]{2,4})空亡/
  ];
  for (const pattern of kongWangPatterns) {
    const kongWangMatch = content.match(pattern);
    if (kongWangMatch) {
      result.kongWang = kongWangMatch[1];
      break;
    }
  }

  // Extract ShiShen
  const shiShenSet = new Set();
  const shiShenPattern = /(正官|七杀|偏官|正财|偏财|正印|偏印|食神|伤官|比肩|劫财|枭神)/g;
  let match;
  while ((match = shiShenPattern.exec(content)) !== null) {
    shiShenSet.add(match[1]);
  }
  result.shiShen = Array.from(shiShenSet).slice(0, 6);

  // Extract ShenSha
  const shenShaSet = new Set();
  const shenShaPattern = /(太极贵人|天乙贵人|文昌|华盖|桃花|红鸾|天德贵人|月德贵人|驿马|将星|金舆|天厨|学堂|词馆|国印|羊刃|禄神|天喜|红艳)/g;
  while ((match = shenShaPattern.exec(content)) !== null) {
    shenShaSet.add(match[1]);
  }
  result.shenSha = Array.from(shenShaSet).slice(0, 5);

  return result;
}

// ============ KUDER Extraction Function (copied from generateKuderCard.js) ============
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
    favorableColors: null,
    unfavorableColors: null,
    topDomains: [],
    bottomDomains: [],
    careers: [],
    summary: null,
    talentQuote: null
  };

  if (!content) return result;

  // PRIORITY 1: Try to extract from structured "朋友圈文案" section first
  const summarySection = content.match(/---朋友圈文案开始---([^]*?)---朋友圈文案结束---/) ||
                         content.match(/---SOCIAL MEDIA SUMMARY START---([^]*?)---SOCIAL MEDIA SUMMARY END---/);

  if (summarySection) {
    const summary = summarySection[1];
    console.log('[ExtractKuderInfo] Found structured summary section');

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

    const dayMasterMatch = summary.match(/【日主】\s*([金木水火土甲乙丙丁戊己庚辛壬癸])行?[（(]?([旺弱强weak]*)[）)]?/);
    if (dayMasterMatch) {
      result.dayMaster = dayMasterMatch[1];
      result.dayMasterStrength = dayMasterMatch[2] || null;
    }

    const yongShenMatch = summary.match(/【用神】\s*([金木水火土])/);
    if (yongShenMatch) {
      result.yongShen = yongShenMatch[1];
    }

    const colorMatch = summary.match(/【喜用颜色】\s*([^\n【]+)/);
    if (colorMatch) {
      result.favorableColors = colorMatch[1].trim();
    }

    // Extract top 3 domains
    const topDomainsMatch = summary.match(/【前三强领域】\s*([^\n【]+)/);
    if (topDomainsMatch) {
      const domainStr = topDomainsMatch[1];
      const domainPattern = /([①②③\d]+)?[\.、]?\s*([^\s（(①②③\d]+)[（(](\d+)[）)]/g;
      let match;
      while ((match = domainPattern.exec(domainStr)) !== null) {
        result.topDomains.push({ name: match[2], score: parseInt(match[3]) });
      }
    }

    // Extract bottom 3 domains
    const bottomDomainsMatch = summary.match(/【后三弱领域】\s*([^\n【]+)/);
    if (bottomDomainsMatch) {
      const domainStr = bottomDomainsMatch[1];
      const domainPattern = /([①②③\d]+)?[\.、]?\s*([^\s（(①②③\d]+)[（(](\d+)[）)]/g;
      let match;
      while ((match = domainPattern.exec(domainStr)) !== null) {
        result.bottomDomains.push({ name: match[2], score: parseInt(match[3]) });
      }
    }

    const careersMatch = summary.match(/【推荐职业】\s*([^\n【]+)/);
    if (careersMatch) {
      result.careers = careersMatch[1].split(/[、,，]/).map(c => c.trim()).filter(c => c.length > 1).slice(0, 5);
    }

    const careerTitleMatch = summary.match(/【宿命职业称号】\s*([^\n【]+)/);
    if (careerTitleMatch) {
      result.careerTitle = careerTitleMatch[1].trim().replace(/[*#「」"']/g, '');
    }

    const quoteMatch = summary.match(/【天赋金句】\s*([^\n【]+)/);
    if (quoteMatch) {
      result.talentQuote = quoteMatch[1].trim().replace(/[*#]/g, '');
    }
  }

  // Extract 空亡 - support multiple formats
  const kongWangPatterns = [
    /空亡[：:]\s*([子丑寅卯辰巳午未申酉戌亥]+)/,
    /空亡[\n\r]+([子丑寅卯辰巳午未申酉戌亥]+)/,
    /([子丑寅卯辰巳午未申酉戌亥]{2,4})空亡/
  ];
  for (const pattern of kongWangPatterns) {
    const kongWangMatch = content.match(pattern);
    if (kongWangMatch) {
      result.kongWang = kongWangMatch[1];
      break;
    }
  }

  // Extract ShiShen
  const shiShenSet = new Set();
  const shiShenPattern = /(正官|七杀|偏官|正财|偏财|正印|偏印|食神|伤官|比肩|劫财|枭神)/g;
  let match;
  while ((match = shiShenPattern.exec(content)) !== null) {
    shiShenSet.add(match[1]);
  }
  result.shiShen = Array.from(shiShenSet).slice(0, 6);

  // Extract ShenSha
  const shenShaSet = new Set();
  const shenShaPattern = /(太极贵人|天乙贵人|文昌|华盖|桃花|红鸾|天德贵人|月德贵人|驿马|将星|金舆|天厨|学堂|词馆|国印|羊刃|禄神|天喜|红艳)/g;
  while ((match = shenShaPattern.exec(content)) !== null) {
    shenShaSet.add(match[1]);
  }
  result.shenSha = Array.from(shenShaSet).slice(0, 5);

  return result;
}

// ============ Run Tests ============
console.log('='.repeat(60));
console.log('MBTI EXTRACTION TEST');
console.log('='.repeat(60));

const mbtiResult = extractInfoFromReport(mockMbtiReport, false);
console.log('\n--- Extracted MBTI Data ---');
console.log('八字:', mbtiResult.bazi);
console.log('四柱:', mbtiResult.fourPillars);
console.log('日主:', mbtiResult.dayMaster, '(' + mbtiResult.dayMasterStrength + ')');
console.log('用神:', mbtiResult.yongShen);
console.log('MBTI:', mbtiResult.mbti);
console.log('认知功能栈:', mbtiResult.cognitiveFunctions);
console.log('灵魂称号:', mbtiResult.soulTitle);
console.log('人格金句:', mbtiResult.personalityQuote);
console.log('空亡:', mbtiResult.kongWang);
console.log('十神:', mbtiResult.shiShen);
console.log('神煞:', mbtiResult.shenSha);

// Validate MBTI results
const mbtiErrors = [];
if (mbtiResult.bazi !== '己卯 壬申 辛酉 乙未') mbtiErrors.push('八字提取错误');
if (mbtiResult.dayMaster !== '金') mbtiErrors.push('日主提取错误');
if (mbtiResult.yongShen !== '木') mbtiErrors.push('用神提取错误');
if (mbtiResult.mbti !== 'INTJ') mbtiErrors.push('MBTI提取错误');
if (!mbtiResult.soulTitle || !mbtiResult.soulTitle.includes('辛金玉匠')) mbtiErrors.push('灵魂称号提取错误');
if (!mbtiResult.personalityQuote || !mbtiResult.personalityQuote.includes('金水伤官')) mbtiErrors.push('人格金句提取错误');

console.log('\n--- MBTI Validation ---');
if (mbtiErrors.length === 0) {
  console.log('✅ All MBTI extractions PASSED!');
} else {
  console.log('❌ MBTI Errors:', mbtiErrors.join(', '));
}

console.log('\n' + '='.repeat(60));
console.log('KUDER EXTRACTION TEST');
console.log('='.repeat(60));

const kuderResult = extractKuderInfo(mockKuderReport, false);
console.log('\n--- Extracted KUDER Data ---');
console.log('八字:', kuderResult.bazi);
console.log('四柱:', kuderResult.fourPillars);
console.log('日主:', kuderResult.dayMaster, '(' + kuderResult.dayMasterStrength + ')');
console.log('用神:', kuderResult.yongShen);
console.log('喜用颜色:', kuderResult.favorableColors);
console.log('前三强领域:', kuderResult.topDomains);
console.log('后三弱领域:', kuderResult.bottomDomains);
console.log('推荐职业:', kuderResult.careers);
console.log('宿命职业称号:', kuderResult.careerTitle);
console.log('天赋金句:', kuderResult.talentQuote);
console.log('空亡:', kuderResult.kongWang);
console.log('十神:', kuderResult.shiShen);
console.log('神煞:', kuderResult.shenSha);

// Validate KUDER results
const kuderErrors = [];
if (kuderResult.bazi !== '乙亥 己卯 丙午 癸巳') kuderErrors.push('八字提取错误');
if (kuderResult.dayMaster !== '火') kuderErrors.push('日主提取错误');
if (kuderResult.yongShen !== '水') kuderErrors.push('用神提取错误');
if (!kuderResult.favorableColors || !kuderResult.favorableColors.includes('黑色')) kuderErrors.push('喜用颜色提取错误');
if (kuderResult.topDomains.length !== 3) kuderErrors.push('前三强领域提取错误');
if (kuderResult.bottomDomains.length !== 3) kuderErrors.push('后三弱领域提取错误');
if (kuderResult.careers.length < 3) kuderErrors.push('推荐职业提取错误');
if (!kuderResult.careerTitle || !kuderResult.careerTitle.includes('伤官吐秀')) kuderErrors.push('宿命职业称号提取错误');
if (!kuderResult.talentQuote || !kuderResult.talentQuote.includes('火明木秀')) kuderErrors.push('天赋金句提取错误');

console.log('\n--- KUDER Validation ---');
if (kuderErrors.length === 0) {
  console.log('✅ All KUDER extractions PASSED!');
} else {
  console.log('❌ KUDER Errors:', kuderErrors.join(', '));
}

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));
