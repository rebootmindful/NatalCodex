# Vercel 双支付网关方案

## 一、架构概览

```
                    ┌─────────────────────────────────────┐
                    │         Vercel 服务器 (同一套代码)      │
                    │                                     │
用户访问             │   ┌─────────────────────────────┐   │
                    │   │     统一后端逻辑              │   │
海外用户 ──────────►│   │  - 检测域名/地区             │   │
 xxx.vercel.app     │   │  - 路由到对应支付            │   │
   ↓ Creem支付      │   └─────────────────────────────┘   │
                    │         ↙            ↘              │
国内用户 ──────────►│   Creem API      面包多Pay API      │
 your-domain.cn     │   (海外用户)       (国内用户)         │
   ↓ 面包多支付      │                                     │
                    └─────────────────────────────────────┘
```

## 二、面包多Pay 简介

**面包多Pay** 是面包多旗下为**个人开发者**提供的支付服务：
- **费率**: ¥0.1 + 2% 每笔交易
- **支持渠道**: 微信 JSAPI、微信 H5、支付宝
- **结算**: 支付宝实时到账，微信次日自动汇总提现
- **文档**: https://doc.mbd.pub/

### API 接口

| 接口 | URL | 说明 |
|------|-----|------|
| 微信 JSAPI | `https://newapi.mbd.pub/release/wx` | 微信内支付 |
| 微信 H5 | `https://newapi.mbd.pub/release/wx/prepay` | 手机浏览器跳转微信 |
| 支付宝 | `https://newapi.mbd.pub/release/alipay/pay` | 移动端支付宝 |
| Webhook | 控制台配置 | 支付成功/投诉回调 |

### 签名算法

```javascript
import crypto from 'crypto';

function sign(data, key) {
  const sorted = Object.keys(data).sort();
  const str = sorted.map(k => `${k}=${data[k]}`).join('&');
  return crypto.createHash('md5').update(`${str}&key=${key}`).digest('hex');
}
```

## 三、域名配置

### 海外域名
- 直接使用 `xxx.vercel.app` 或绑定海外域名

### 国内域名
1. 购买一个 `.cn` 或 `.com` 域名
2. 在 Vercel 绑定自定义域名
3. DNS 配置 CNAME 指向: `cname-china.vercel-dns.com` (Vercel 中国优化节点)
4. 或使用 CloudFlare 做 DNS 代理优化国内访问

## 四、代码实现

### 1. 支付路由逻辑

```javascript
// lib/payment.js
export function getPaymentProvider(req) {
  const host = req.headers.host;
  
  // 根据访问域名判断
  if (host.includes('vercel.app') || host.includes('your-global-domain.com')) {
    return 'creem';
  }
  return 'mbd'; // 面包多
}
```

### 2. 统一支付入口

```javascript
// pages/api/pay.js
import { getPaymentProvider } from '@/lib/payment';

export default async function handler(req, res) {
  const provider = getPaymentProvider(req);
  
  if (provider === 'creem') {
    return handleCreemPayment(req, res);
  } else {
    return handleMbdPayment(req, res);
  }
}
```

### 3. 面包多支付实现

```javascript
// lib/mbd-payment.js
import crypto from 'crypto';

function sign(data, key) {
  const sorted = Object.keys(data).sort();
  const str = sorted.map(k => `${k}=${data[k]}`).join('&');
  return crypto.createHash('md5').update(`${str}&key=${key}`).digest('hex');
}

export async function handleMbdPayment(req, res) {
  const data = {
    app_id: process.env.MBD_APP_ID,
    amount_total: req.body.amount, // 单位: 分
    description: req.body.description,
    out_trade_no: `order_${Date.now()}`,
    url: 'https://your-domain.cn/pay/callback',
  };
  data.sign = sign(data, process.env.MBD_APP_KEY);

  const response = await fetch('https://newapi.mbd.pub/release/alipay/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  res.json(await response.json());
}
```

### 4. Webhook 接收

```javascript
// pages/api/webhook/mbd.js
export default async function handler(req, res) {
  const { type, data } = req.body;
  
  if (type === 'charge_succeeded') {
    // 处理支付成功
    // data.out_trade_no - 订单号
    // data.amount - 金额(分)
    // data.payway - 支付渠道 (1=微信, 2=支付宝)
    // 更新数据库订单状态
  }
  
  if (type === 'complaint') {
    // 处理投诉
    // data.out_trade_no - 订单号
    // data.complaint_detail - 投诉详情
  }
  
  res.status(200).json({ success: true });
}
```

## 五、Webhook 配置

| 支付渠道 | Webhook URL |
|---------|-------------|
| Creem | `https://xxx.vercel.app/api/webhook/creem` |
| 面包多 | `https://your-domain.cn/api/webhook/mbd` |

## 六、数据库设计建议

订单表增加 `payment_provider` 字段区分支付来源：

```sql
CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY,
  out_trade_no VARCHAR(64) UNIQUE,
  amount INT,                    -- 金额(分)
  currency VARCHAR(3),           -- CNY / USD
  payment_provider VARCHAR(20),  -- 'creem' / 'mbd'
  status VARCHAR(20),            -- pending / paid / refunded
  created_at TIMESTAMP,
  paid_at TIMESTAMP
);
```

## 七、注意事项

| 问题 | 解决方案 |
|------|---------|
| 订单统一管理 | 使用统一的数据库，订单表增加 `payment_provider` 字段 |
| 用户手动切换域名 | 可增加 IP 地理位置检测作为辅助判断 |
| 货币单位 | Creem 用美元/分，面包多用人民币/分，需换算 |
| 面包多 Webhook | 必须使用国内可访问的自定义域名，不能用 `.vercel.app` |

## 八、面包多开通流程

1. 注册面包多账号: https://mbd.pub/
2. 提交闪电认证申请: https://mbd.pub/o/warrant
3. 选择「仅开通闪电结算」
4. 填写产品信息，等待审核 (1-2天)
5. 审核通过后开通微信/支付宝渠道
6. 在控制台获取 `app_id` 和 `app_key`
7. 配置 Webhook URL

## 九、环境变量

```env
# 面包多
MBD_APP_ID=your_mbd_app_id
MBD_APP_KEY=your_mbd_app_key

# Creem
CREEM_API_KEY=your_creem_api_key
CREEM_WEBHOOK_SECRET=your_creem_webhook_secret
```
