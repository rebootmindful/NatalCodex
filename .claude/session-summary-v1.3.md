# NatalCodex v1.3 Session Summary

## 版本信息
- **版本号**: v1.3
- **发布日期**: 2025-12-09
- **Git Commit**: 9f623d5

## 核心功能：支付系统

### 计费规则
- 新用户注册即送 **1次免费**
- 报告生成即扣费（报告+图片算1次）
- 报告失败自动退款，图片失败可重试3次
- 报告-图片严格绑定，防止串用

### 套餐定价
| 套餐 | 价格 | 次数 | 单价 |
|------|------|------|------|
| 新用户体验 | ¥0 | 1次 | 免费 |
| 6次套餐 | ¥29 | 6次 | ¥4.83 |
| 20次套餐 | ¥89 | 20次 | ¥4.45 |

### 优惠码系统
- **五折码**: H开头，如 `H3KX9M`
- **八折码**: E开头，如 `E7BN2P`
- 格式：前缀1位 + 随机5位（大写字母+数字）
- 单次使用，有效期管理员设置

### 支付平台
- **虎皮椒** (Xunhupay) 支付宝
- 环境变量：
  - `XUNHUPAY_APPID`
  - `XUNHUPAY_APPSECRET`
  - `XUNHUPAY_NOTIFY_URL`
  - `XUNHUPAY_RETURN_URL`

### 管理后台
- **URL**: `/admin/index.html`
- **管理员**: `rebootmindful@gmail.com`
- **功能**:
  - 用户列表（搜索、修改次数）
  - 优惠码生成（批量、设置有效期）
  - 统计概览（用户、收入、使用量）

## 文件变更

### 新增文件
| 文件 | 说明 |
|------|------|
| `scripts/init-payment-db.sql` | 数据库迁移（users扩展、usage_logs、promo_codes、orders） |
| `lib/xunhupay.js` | 虎皮椒SDK封装 |
| `api/pay.js` | 支付API（create/status/notify/validate-promo） |
| `api/user.js` | 用户API（credits/deduct/refund/check-image） |
| `api/admin.js` | 管理后台API |
| `admin/index.html` | 管理后台页面 |
| `blog/who-needs-natalcodex-personality-career-guide.html` | 新博客文章 |

### 删除文件（冗余函数）
- `api/apimart/chat.js`
- `api/apimart/generateImage.js`
- `api/apimart/queryTask.js`
- `api/webhook/mbd.js`
- `api/pay/create.js`（合并到pay.js）
- `api/pay/status.js`（合并到pay.js）

### 修改文件
| 文件 | 变更 |
|------|------|
| `index.html` | 新增"适合人群"板块、更新价格展示（3列套餐卡片） |
| `generate.html` | 添加次数显示、购买弹窗、次数检查逻辑 |
| `blog/index.html` | 添加新文章链接 |
| `sitemap.xml` | 添加新文章URL |

## API 结构 (v1.3)

### 当前 Vercel 函数 (8个)
```
api/
├── auth.js          # 认证（login/register/google/me/logout）
├── pay.js           # 支付（create/status/notify/validate-promo）
├── user.js          # 用户（credits/deduct/refund/check-image）
├── admin.js         # 管理（users/promo/stats）
└── reports/
    ├── generateWithAPImart.js   # MBTI报告
    ├── generateSoulCard.js      # MBTI图片
    ├── generateKuder.js         # KUDER报告
    └── generateKuderCard.js     # KUDER图片
```

### Vercel Hobby 限制
- 限制：12个函数
- 当前：8个 ✅

## 数据库表

### users (扩展)
```sql
remaining_credits INT DEFAULT 1   -- 剩余次数
total_purchased INT DEFAULT 0     -- 累计购买
is_admin BOOLEAN DEFAULT false    -- 管理员标识
```

### usage_logs (新增)
- report_id: 报告唯一ID
- report_type: mbti/kuder
- report_status: pending/success/failed
- image_status: pending/success/failed
- image_retry_count: 重试次数（上限3）
- credits_deducted/credits_refunded: 计费追踪

### promo_codes (新增)
- code: 6位优惠码
- discount_type: HALF/TWENTY
- discount_percent: 50/20
- expires_at: 过期时间
- is_used/used_by_user_id/used_at: 使用记录

### orders (新增)
- order_no: 订单号（NC+时间戳+随机数）
- package_type: PACK_6/PACK_20
- original_price/discount_amount/final_price: 价格
- promo_code: 使用的优惠码
- status: pending/paid/failed/refunded
- trade_no: 虎皮椒交易号

## 前端交互

### 生成流程
1. 用户点击生成 → 检查登录
2. 检查 `userCredits >= 1` → 不足则弹出购买弹窗
3. 调用报告API → 成功后显示结果
4. 点击生成图片 → 校验report_id匹配

### 购买弹窗
- 显示剩余次数
- 套餐选择（6次/20次）
- 优惠码输入+验证
- 折扣价格实时更新
- 支付宝支付跳转

## 安全措施
- 优惠码验证：失败5次锁定IP 10分钟
- 支付回调：虎皮椒签名验证
- 次数管理：服务端扣减，不信任前端
- 报告绑定：report_id + type 双重校验
- 管理后台：JWT + is_admin 验证

## 后续可优化
- [ ] 报告函数合并（4个→2个）进一步减少函数数
- [ ] 添加微信支付渠道
- [ ] 订单过期自动关闭
- [ ] 用户使用历史页面
- [ ] 邮件通知（购买成功、次数不足提醒）

## 版本历史
- v1.0: 基础功能（八字+MBTI分析）
- v1.1: 提示词优化，标准化模板
- v1.2: 报告格式优化，引用句截断
- **v1.3**: 支付系统、用户管理、优惠码、管理后台
