const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function safeNumber(n) {
  return Number.isFinite(n) ? n : 0;
}

function countLines(content) {
  if (!content) return 0;
  let lines = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) lines++;
  }
  return lines;
}

function collectFiles(rootDir, options) {
  const {
    excludeDirNames,
    includeExtensions,
    maxFileBytes
  } = options;

  const results = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (excludeDirNames.has(ent.name)) continue;
        walk(full);
        continue;
      }
      if (!ent.isFile()) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (includeExtensions.size > 0 && !includeExtensions.has(ext)) continue;

      try {
        const stat = fs.statSync(full);
        if (stat.size > maxFileBytes) continue;
      } catch {
        continue;
      }

      results.push(full);
    }
  }

  walk(rootDir);
  return results;
}

function getTopLevelBucket(projectRoot, filePath) {
  const rel = path.relative(projectRoot, filePath);
  const parts = rel.split(/[\\/]/g).filter(Boolean);
  if (parts.length === 0) return 'root';
  const top = parts[0].toLowerCase();
  if (top === 'api' || top === 'lib' || top === 'tests') return top;
  if (top.startsWith('.')) return 'root';
  return 'root';
}

function computeMetrics(projectRoot, filePaths) {
  const byExt = new Map();
  const byBucket = new Map();
  const largestFiles = [];
  let totalLines = 0;

  for (const fp of filePaths) {
    let content = '';
    try {
      content = fs.readFileSync(fp, 'utf8');
    } catch {
      continue;
    }

    const lines = countLines(content);
    const ext = path.extname(fp).toLowerCase() || '(none)';
    const bucket = getTopLevelBucket(projectRoot, fp);

    totalLines += lines;

    const extRec = byExt.get(ext) || { files: 0, lines: 0 };
    extRec.files += 1;
    extRec.lines += lines;
    byExt.set(ext, extRec);

    const bucketRec = byBucket.get(bucket) || { files: 0, lines: 0 };
    bucketRec.files += 1;
    bucketRec.lines += lines;
    byBucket.set(bucket, bucketRec);

    largestFiles.push({ filePath: fp, lines });
  }

  largestFiles.sort((a, b) => b.lines - a.lines);

  return {
    totalFiles: filePaths.length,
    totalLines,
    byExt: [...byExt.entries()].sort((a, b) => b[1].lines - a[1].lines),
    byBucket: [...byBucket.entries()].sort((a, b) => b[1].lines - a[1].lines),
    largestFiles: largestFiles.slice(0, 12)
  };
}

function registerCjkFont(doc) {
  const candidates = [
    'C:\\\\Windows\\\\Fonts\\\\msyh.ttf',
    'C:\\\\Windows\\\\Fonts\\\\msyhbd.ttf',
    'C:\\\\Windows\\\\Fonts\\\\simhei.ttf',
    'C:\\\\Windows\\\\Fonts\\\\simsun.ttf'
  ];

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      doc.registerFont('CJK', p);
      return 'CJK';
    } catch {
      continue;
    }
  }

  return null;
}

function drawBarChart(doc, title, items, options) {
  const { x, y, width, height } = options;
  const maxValue = Math.max(1, ...items.map((i) => safeNumber(i.value)));
  const barAreaHeight = height - 26;
  const barGap = 8;
  const barCount = items.length;
  const barWidth = Math.max(10, (width - barGap * (barCount - 1)) / barCount);

  doc.fontSize(12).text(title, x, y);
  const baseY = y + height;
  let curX = x;

  doc.save();
  doc.lineWidth(0.5).strokeColor('#d0d0d0');
  doc.rect(x, y + 18, width, barAreaHeight).stroke();
  doc.restore();

  for (const item of items) {
    const v = safeNumber(item.value);
    const barH = Math.round((v / maxValue) * (barAreaHeight - 10));
    const barX = curX;
    const barY = y + 18 + (barAreaHeight - barH);
    doc.save();
    doc.fillColor(item.color || '#4f46e5');
    doc.rect(barX, barY, barWidth, barH).fill();
    doc.restore();

    doc.save();
    doc.fillColor('#111827');
    doc.fontSize(9);
    doc.text(item.label, barX, baseY + 4, { width: barWidth, align: 'center' });
    doc.text(String(v), barX, barY - 12, { width: barWidth, align: 'center' });
    doc.restore();

    curX += barWidth + barGap;
  }
}

function drawKeyValueTable(doc, rows, options) {
  const { x, y, col1Width, col2Width, rowHeight } = options;
  let curY = y;
  for (const r of rows) {
    doc.fontSize(10).fillColor('#111827').text(String(r.key), x, curY, { width: col1Width });
    doc.fontSize(10).fillColor('#111827').text(String(r.value), x + col1Width, curY, { width: col2Width });
    curY += rowHeight;
  }
  return curY;
}

function wrapTextLines(doc, text, width) {
  const lines = [];
  const paragraphs = String(text).split(/\r?\n/);
  for (const p of paragraphs) {
    if (p.trim() === '') {
      lines.push('');
      continue;
    }
    let current = '';
    let lastBreakIndex = -1;
    for (let i = 0; i < p.length; i++) {
      const ch = p[i];
      const next = current + ch;
      const w = doc.widthOfString(next);
      if (ch === ' ' || ch === '\t') lastBreakIndex = current.length;

      if (w <= width) {
        current = next;
        continue;
      }

      if (current.length === 0) {
        lines.push(ch);
        current = '';
        lastBreakIndex = -1;
        continue;
      }

      if (lastBreakIndex > 0) {
        const leftPart = current.slice(0, lastBreakIndex).trimEnd();
        const restPart = (current.slice(lastBreakIndex) + ch).trimStart();
        lines.push(leftPart);
        current = restPart;
      } else {
        lines.push(current);
        current = ch.trimStart();
      }
      lastBreakIndex = -1;
    }
    if (current.length > 0) lines.push(current);
  }
  return lines;
}

function drawFindings(doc, findings, options) {
  const { pageWidth, left, right, startY } = options;
  let y = startY;
  const width = pageWidth - left - right;

  const severityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const sorted = [...findings].sort((a, b) => (severityOrder[a.priority] ?? 99) - (severityOrder[b.priority] ?? 99));

  for (const f of sorted) {
    const header = `${f.priority}  ${f.title}`;
    const meta = `${f.category} · ${f.location}`;
    const body = `问题：${f.problem}\n影响：${f.impact}\n修复：${f.fix}\n难度：${f.difficulty}\n预期效果：${f.expected}`;

    const headerHeight = 14;
    const bodyLines = wrapTextLines(doc, body, width - 18);
    const bodyHeight = bodyLines.length * 12 + 8;
    const blockHeight = headerHeight + 10 + bodyHeight + 16;

    if (y + blockHeight > doc.page.height - 60) {
      doc.addPage();
      y = 60;
    }

    doc.save();
    doc.fillColor('#111827').fontSize(12).text(header, left, y);
    y += 16;
    doc.fillColor('#6b7280').fontSize(9).text(meta, left, y);
    y += 12;
    doc.restore();

    doc.save();
    doc.fillColor('#f9fafb');
    doc.roundedRect(left, y, width, bodyHeight + 10, 6).fill();
    doc.restore();

    doc.save();
    doc.fillColor('#111827').fontSize(10);
    let bodyY = y + 6;
    for (const line of bodyLines) {
      doc.text(line, left + 9, bodyY, { width: width - 18 });
      bodyY += 12;
    }
    doc.restore();

    y += bodyHeight + 18;
  }
}

async function main() {
  const projectRoot = path.resolve(__dirname);
  const now = new Date();
  const reportDate = formatDate(now);
  const outPath = path.join(projectRoot, `code-audit-report-${reportDate}.pdf`);

  const excludeDirNames = new Set([
    'node_modules',
    '.git',
    '.vercel',
    'dist',
    'tmp',
    'backup-original',
    'backup-legacy',
    'tinyship-1.1.0'
  ]);

  const includeExtensions = new Set(['.js', '.json', '.html', '.css']);

  const filePaths = collectFiles(projectRoot, {
    excludeDirNames,
    includeExtensions,
    maxFileBytes: 2_000_000
  });

  const metrics = computeMetrics(projectRoot, filePaths);

  const findings = [
    {
      priority: 'P0',
      category: 'Security',
      title: '生产默认密钥/支付密钥硬编码回退',
      location: 'lib/auth.js:8, lib/xunhupay.js:12-17',
      problem: 'JWT 与支付 SDK 在缺少环境变量时回退到固定默认值，导致生产环境可被猜测/复用的密钥风险。',
      impact: '攻击者可伪造 JWT 或伪造支付回调签名，进而接管账户或刷次数/订单状态。',
      fix: '移除所有生产默认值；启动/请求时强制校验 env；并旋转已发布密钥。',
      expected: '杜绝“配置缺失即降级不安全”的类事故，提升鉴权与支付链路可信度。',
      difficulty: '中'
    },
    {
      priority: 'P0',
      category: 'Correctness',
      title: '事务使用方式不安全（BEGIN/COMMIT 可能不在同一连接）',
      location: 'api/user.js:141-171',
      problem: '通过 pool.query 直接执行 BEGIN/COMMIT/ROLLBACK，事务不保证绑定同一 client；在并发/连接池条件下会出现“看似事务，实际非事务”。',
      impact: '扣减次数与写 usage_logs 可能部分成功，造成次数错账、重复扣费/无法追溯等业务事故。',
      fix: '使用 db.getClient() 获取 client 并在同一连接上执行完整事务；或提供 db.transaction(fn) 工具统一管理。',
      expected: '确保关键扣费/记账操作具备原子性与可恢复性。',
      difficulty: '中'
    },
    {
      priority: 'P0',
      category: 'Security',
      title: 'Webhook 签名校验可被时序攻击，且 payload 规范化存在风险',
      location: 'api/webhook/creem.js:12-16, 50-55',
      problem: '使用字符串相等比较（非恒定时间）且对非字符串 body 做 JSON.stringify 可能改变原始字节序列，导致签名误判或被利用。',
      impact: 'Webhook 伪造/绕过校验或误拒绝真实回调，导致订单状态与发放次数异常。',
      fix: '使用 crypto.timingSafeEqual；确保使用原始请求体做签名（raw body），并严格校验 header 格式与编码。',
      expected: '提升 webhook 防篡改能力，降低支付状态错乱与被刷风险。',
      difficulty: '中'
    },
    {
      priority: 'P1',
      category: 'Security',
      title: 'CORS 过于宽松（允许任意 Origin）',
      location: 'api/pay.js:21-24, api/auth.js:22-26, api/user.js:16-19, api/webhook/creem.js:24-27',
      problem: '多个端点直接设置 Access-Control-Allow-Origin: *，且允许 Authorization 头。',
      impact: '扩大跨站调用面，结合其他缺陷（令牌泄露/错误配置）可能放大攻击面；也不利于精确风控与审计。',
      fix: '收敛到白名单域名；对 webhook 等无需浏览器调用的端点直接关闭 CORS。',
      expected: '缩小攻击面，减少意外跨域暴露。',
      difficulty: '低'
    },
    {
      priority: 'P1',
      category: 'Security',
      title: 'Google OAuth state 未绑定会话，存在 CSRF 风险',
      location: 'api/auth.js:301-306',
      problem: '生成了随机 state，但未在服务端/客户端持久化并在 callback 时校验。',
      impact: '可能被引导完成非预期登录绑定流程，造成账户混淆或会话劫持类问题。',
      fix: '将 state 写入安全 cookie 或 KV，并在回调中严格比对；同时设置 state 有效期。',
      expected: '阻断 OAuth 登录 CSRF，提升登录流程安全性。',
      difficulty: '中'
    },
    {
      priority: 'P2',
      category: 'Performance',
      title: '数据库日志过于冗余，错误时打印 SQL 文本',
      location: 'lib/db.js:49-55',
      problem: '每次查询都打印耗时，失败时打印完整 SQL 文本与错误信息，可能带来 I/O 开销与敏感字段泄露风险。',
      impact: '在高并发下增加函数执行时间；日志系统成本上升；错误日志可能暴露业务表结构与数据片段。',
      fix: '仅在开发或采样打印；错误时脱敏/截断 SQL；引入结构化日志与请求 ID。',
      expected: '降低日志噪声与成本，提高定位效率。',
      difficulty: '低'
    },
    {
      priority: 'P2',
      category: 'Performance',
      title: '服务端轮询调用量偏大，可能触发超时/配额限制',
      location: 'api/reports/generateSoulCard.js:21-23, 242-279',
      problem: '2 秒一次、最多 2 分钟轮询第三方任务，单次请求可触发约 60 次下游调用。',
      impact: '在 Serverless 环境下更易接近 maxDuration；并发时放大下游 API 成本与失败率。',
      fix: '改为异步回调/队列；或把任务 id 返回给前端由前端轮询；或指数退避与更短的服务器轮询窗口。',
      expected: '降低下游调用量与失败率，提升用户体验。',
      difficulty: '中'
    },
    {
      priority: 'P2',
      category: 'Scalability',
      title: '内存缓存/内存限流不适配 Serverless 多实例',
      location: 'lib/cache.js:6-63, api/pay.js:280-306',
      problem: '缓存与限流依赖进程内 Map，多实例/冷启动会导致命中率低、限流不一致。',
      impact: '同一用户/订单在不同实例上无法共享状态，导致重复请求与成本上升。',
      fix: '迁移到 KV/Redis（Upstash/Neon KV 等）；或在边缘层做限流。',
      expected: '可预期的缓存与限流效果，提升稳定性。',
      difficulty: '中'
    },
    {
      priority: 'P3',
      category: 'Quality',
      title: 'Action 路由聚合导致文件偏大、职责混杂',
      location: 'api/pay.js:18-60, api/auth.js:21-60',
      problem: '单文件通过 action 分发多个逻辑分支，长期演进时可读性与可测试性下降。',
      impact: '变更风险增大，安全控制点分散，监控告警粒度不清晰。',
      fix: '拆分为独立 endpoint 或抽出 service 层；统一鉴权/校验/响应格式。',
      expected: '提升可维护性与可观测性，降低回归风险。',
      difficulty: '中'
    }
  ];

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true
  });

  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const cjkFontName = registerCjkFont(doc);
  const isCjk = !!cjkFontName;
  if (isCjk) doc.font(cjkFontName);

  doc.info.Title = isCjk ? '代码审计报告' : 'Code Audit Report';
  doc.info.Author = 'Trae IDE (Automated + Manual Review)';
  doc.info.CreationDate = now;

  const toc = [];
  const left = doc.page.margins.left;
  const right = doc.page.margins.right;
  const pageWidth = doc.page.width;

  function h1(text) {
    doc.fillColor('#111827').fontSize(20).text(text, { align: 'left' });
    doc.moveDown(0.5);
  }

  function h2(text) {
    doc.fillColor('#111827').fontSize(14).text(text, { align: 'left' });
    doc.moveDown(0.4);
  }

  function para(text) {
    doc.fillColor('#111827').fontSize(10).text(text, { lineGap: 2 });
    doc.moveDown(0.6);
  }

  function sectionStart(title, key) {
    doc.addPage();
    const pageNo = doc.page.pageNumber;
    toc.push({ key, title, page: pageNo });
    h1(title);
  }

  const title = isCjk ? 'NatalCodex / ncdesign 代码审计报告' : 'NatalCodex / ncdesign Code Audit Report';
  const subtitle = isCjk ? `生成日期：${reportDate}` : `Generated: ${reportDate}`;
  const scopeLine = isCjk
    ? '范围：根目录站点代码（/api, /lib, /tests 与关键静态页面），排除第三方/历史目录'
    : 'Scope: site runtime code (/api, /lib, /tests and key static pages), excluding third-party/legacy folders';

  h1(title);
  para(subtitle);
  para(scopeLine);

  doc.moveDown(1);
  h2(isCjk ? '摘要' : 'Abstract');
  const abstract = isCjk
    ? '本报告结合静态分析与逐文件人工审查，对鉴权、支付、Webhook、数据库访问、AI 报告/图片生成等关键路径进行评估，输出代码质量、安全、性能与可扩展性结论，并给出按优先级排序的修复建议。'
    : 'This report combines lightweight static analysis and manual review of key runtime paths (auth, payments, webhooks, DB access, AI report/image generation). It summarizes code quality, security, performance, and scalability, and provides prioritized recommendations.';
  para(abstract);

  doc.moveDown(1);
  const tocPageIndex = doc.bufferedPageRange().start + 0;
  doc.addPage();
  const tocPageNumber = doc.page.pageNumber;
  h1(isCjk ? '目录' : 'Table of Contents');
  para(isCjk ? '（目录页在报告生成结束后回填页码）' : '(Page numbers will be filled after rendering.)');

  sectionStart(isCjk ? '1. 代码质量评估' : '1. Code Quality', 'quality');

  h2(isCjk ? '结构与可读性' : 'Structure & Readability');
  const qualityNotes = isCjk
    ? [
        '工程结构清晰：Serverless API 主要集中在 /api，底层能力集中在 /lib。',
        '部分文件采用 action 分发（例如 /api/pay.js、/api/auth.js），导致单文件职责混杂；建议随增长拆分。',
        '日志/错误处理在多个端点中风格不一致（返回结构、错误文案、是否暴露 stack）。'
      ].join('\n')
    : [
        'Project structure is clear: serverless handlers under /api and utilities under /lib.',
        'Some handlers multiplex multiple actions in one file (e.g., /api/pay.js, /api/auth.js), which can reduce maintainability as features grow.',
        'Logging and error response shapes are not fully consistent across endpoints.'
      ].join('\n');
  para(qualityNotes);

  h2(isCjk ? '规模概览（自动统计）' : 'Size Overview (Auto)');
  const rows = [
    { key: isCjk ? '纳入统计文件数' : 'Files counted', value: metrics.totalFiles },
    { key: isCjk ? '纳入统计代码行数（粗略）' : 'Lines counted (rough)', value: metrics.totalLines }
  ];
  drawKeyValueTable(doc, rows, {
    x: left,
    y: doc.y,
    col1Width: 180,
    col2Width: 260,
    rowHeight: 14
  });
  doc.moveDown(1);

  const bucketItems = metrics.byBucket.slice(0, 4).map(([label, rec], idx) => ({
    label,
    value: rec.lines,
    color: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'][idx] || '#4f46e5'
  }));
  drawBarChart(doc, isCjk ? '按目录分布（行数）' : 'Lines by Area', bucketItems, {
    x: left,
    y: doc.y,
    width: pageWidth - left - right,
    height: 170
  });
  doc.moveDown(8);

  h2(isCjk ? '最大文件（Top 12）' : 'Largest Files (Top 12)');
  for (const f of metrics.largestFiles) {
    const rel = path.relative(projectRoot, f.filePath).replace(/\\/g, '/');
    doc.fontSize(10).fillColor('#111827').text(`${rel}  —  ${f.lines} lines`);
  }

  sectionStart(isCjk ? '2. 安全审查' : '2. Security Review', 'security');
  para(
    isCjk
      ? '重点审查鉴权（JWT/OAuth）、支付（订单/回调）、Webhook（签名校验）、敏感信息与日志策略、跨域策略等。'
      : 'Focus areas: auth (JWT/OAuth), payments (orders/callbacks), webhook signature validation, sensitive data/logging, and CORS policy.'
  );

  h2(isCjk ? '核心发现（按优先级）' : 'Key Findings (Prioritized)');
  drawFindings(doc, findings.filter((f) => f.category === 'Security'), {
    pageWidth,
    left,
    right,
    startY: doc.y
  });

  sectionStart(isCjk ? '3. 性能优化建议' : '3. Performance', 'performance');
  const perfNotes = isCjk
    ? [
        'Serverless 场景下，日志与轮询会显著影响函数执行时长与成本。',
        '数据库层每次 query 打印耗时，建议采样/按环境分级。',
        '图片生成采用服务端高频轮询，建议改为前端轮询或异步工作流。',
        '内存缓存命中不稳定，建议引入外部缓存提升命中率。'
      ].join('\n')
    : [
        'In serverless environments, verbose logging and polling can materially increase duration and cost.',
        'DB layer logs every query duration; consider sampling and environment-based logging.',
        'Image generation uses server-side frequent polling; prefer client polling or async workflow.',
        'In-memory cache is instance-local; external cache improves hit rate.'
      ].join('\n');
  para(perfNotes);

  sectionStart(isCjk ? '4. 可扩展性分析' : '4. Scalability', 'scalability');
  const scaleNotes = isCjk
    ? [
        '现有模块边界以“端点文件”为主，扩展时应引入 service 层统一鉴权、参数校验与错误返回。',
        '支付/回调/发放次数等关键链路建议通过事务与幂等键强化一致性与可恢复性。',
        '建议逐步把跨实例状态（限流/缓存/state）迁移到 KV/Redis。'
      ].join('\n')
    : [
        'Current boundaries are mostly per-endpoint file; consider a service layer to standardize auth, validation, and error responses.',
        'For payment callback and credit granting, strengthen consistency and idempotency using transactions and idempotency keys.',
        'Move cross-instance state (rate-limit/cache/state) to KV/Redis.'
      ].join('\n');
  para(scaleNotes);

  sectionStart(isCjk ? '5. 优先级修复建议' : '5. Prioritized Recommendations', 'prioritized');
  para(
    isCjk
      ? '建议按 P0→P3 顺序推进，先保安全与账务一致性，再做体验与结构优化。'
      : 'Address P0 → P3 in order: secure secrets and accounting consistency first, then improve reliability and structure.'
  );
  drawFindings(doc, findings, {
    pageWidth,
    left,
    right,
    startY: doc.y
  });

  const range = doc.bufferedPageRange();
  const tocEntries = toc.map((t) => ({
    title: t.title,
    page: t.page
  }));

  doc.switchToPage(tocPageIndex);
  doc.y = 90;
  doc.fillColor('#111827').fontSize(10);
  for (const e of tocEntries) {
    const line = `${e.title}`;
    const pageStr = `${e.page}`;
    const dotWidth = doc.widthOfString(' . ');
    const maxWidth = pageWidth - left - right;
    const titleWidth = doc.widthOfString(line);
    const pageWidthStr = doc.widthOfString(pageStr);
    const dotsCount = Math.max(2, Math.floor((maxWidth - titleWidth - pageWidthStr) / dotWidth));
    const dots = '.'.repeat(dotsCount);
    doc.text(`${line} ${dots} ${pageStr}`, left, doc.y, { width: maxWidth });
    doc.moveDown(0.3);
  }

  doc.switchToPage(range.start + range.count - 1);
  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  process.stdout.write(outPath);
}

main().catch((err) => {
  process.stderr.write(String(err && err.stack ? err.stack : err));
  process.exitCode = 1;
});
