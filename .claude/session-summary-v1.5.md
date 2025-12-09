# NatalCodex v1.5 Session Summary

## 版本信息
- **版本号**: v1.5
- **发布日期**: 2025-12-09
- **Git Commit**: b3fc354

## v1.5 核心更新：支付系统升级

### 1. 虎皮椒 2024 API 升级
**背景**: 虎皮椒于2024年1月废弃PC端URL直接跳转方式

**旧方式** (已废弃):
```javascript
// GET请求构造URL直接跳转
const payUrl = `https://api.xunhupay.com/payment/do.html?...`
window.location.href = payUrl;
```

**新方式** (2024版):
```javascript
// POST请求获取JSON → 前端渲染二维码
const response = await fetch(gateway, { method: 'POST', body: params });
const { url_qrcode, url } = await response.json();
// PC端显示url_qrcode二维码，移动端跳转url
```

**修改文件**:
- `lib/xunhupay.js`: `createPayment()` 改为 async POST 请求
- `api/pay.js`: 返回 `qrCodeUrl` 和 `mobileUrl`
- `generate.html`: 新增 QR Code 弹窗组件

### 2. 支付失败重试机制
**用户体验流程**:
```
用户扫码 → 5分钟未支付 → 显示"支付超时，二维码已失效"
                          ↓
                   [刷新二维码] 按钮
                          ↓
         调用 /api/pay?action=retry → 获取新二维码
                          ↓
                  继续显示新二维码，重新倒计时
```

**重试策略**:
- pending 订单 (30分钟内): 复用原订单号，重新调用支付接口
- expired/failed 订单: 创建新订单，继承原金额和优惠码

**新增 API**: `POST /api/pay?action=retry`
```javascript
// Request
{ orderNo: "NC17336..." }

// Response
{
  success: true,
  orderNo: "NC17336...",  // 可能是新订单号
  qrCodeUrl: "https://...",
  mobileUrl: "https://...",
  isNewOrder: false  // 是否创建了新订单
}
```

### 3. 支付安全增强

#### IDOR 漏洞修复
- 订单状态查询添加 JWT 验证
- 非订单所有者只能查看 `orderNo` 和 `status`
- 订单所有者返回完整信息（金额、套餐等）

#### 速率限制
```javascript
const STATUS_QUERY_LIMIT = 30;      // 每分钟最多30次
const STATUS_QUERY_WINDOW = 60000;  // 1分钟窗口
```

#### 订单过期机制
- pending 状态超过 30 分钟自动标记为 expired
- 在 `handleStatus` 中检查并更新

### 4. 管理后台订单管理
**新增功能**:
- "订单管理" Tab
- 状态筛选: 全部/已支付/待支付/已过期/失败
- 订单搜索（订单号）
- 显示用户邮箱、套餐、金额、优惠码、状态

**新增 API**: `GET /api/admin?action=orders`

### 5. Bug 修复

#### JWT Token Key 不一致
| 文件 | 错误 | 修复 |
|------|------|------|
| `api/admin.js` | `decoded.userId` | `decoded.id` |
| `admin/index.html` | `nc_token` | `nc_auth_token` |

**根本原因**: `lib/auth.js` 生成 token 使用 `id` 字段，但多处使用 `userId`

#### 移动端支付返回
- `return_url` 添加订单号参数: `?order=${orderNo}`
- `pay/result.html` 从 URL 获取订单号并查询状态
- 支付成功后 3 秒自动跳转

## 文件变更

### 修改文件
| 文件 | 变更 |
|------|------|
| `lib/xunhupay.js` | POST API + 动态 return_url |
| `api/pay.js` | 新增 retry action、速率限制、订单过期 |
| `api/admin.js` | 新增 orders action、JWT 修复 |
| `generate.html` | QR Code 弹窗、重试功能、轮询逻辑 |
| `admin/index.html` | 订单管理 Tab、token key 修复 |
| `pay/result.html` | API 路径修复、字段映射修复 |

### 新增前端组件 (generate.html)
```html
<!-- QR Code Payment Modal -->
<div class="qrcode-overlay" id="qrcodeOverlay">
  <div class="qrcode-modal">
    <div class="qrcode-content">...</div>
    <div class="qrcode-error">
      <button id="qrcodeRetryBtn">刷新二维码</button>
    </div>
  </div>
</div>
```

### 新增 JavaScript 函数
- `showQrCodeModal(qrCodeUrl, orderNo, amount, packageName)`
- `showQrCodeError(icon, message)`
- `startPaymentPolling(orderNo)` - 每3秒轮询支付状态
- `startCountdown(seconds)` - 5分钟倒计时
- `retryPayment()` - 调用重试 API

## API 结构 (v1.5)

### 支付 API 完整列表
```
POST /api/pay?action=create         # 创建订单
POST /api/pay?action=retry          # 重试支付 [新增]
GET  /api/pay?action=status         # 查询状态 [增强]
POST /api/pay?action=notify         # 支付回调
POST /api/pay?action=validate-promo # 验证优惠码
```

### 管理 API 完整列表
```
GET    /api/admin?action=users          # 用户列表
GET    /api/admin?action=user&id=xxx    # 用户详情
PUT    /api/admin?action=update-credits # 修改次数
GET    /api/admin?action=orders         # 订单列表 [新增]
POST   /api/admin?action=generate-promo # 生成优惠码
GET    /api/admin?action=promo-list     # 优惠码列表
DELETE /api/admin?action=delete-promo   # 删除优惠码
GET    /api/admin?action=stats          # 统计数据
GET    /api/admin?action=promo-config   # 推广配置
PUT    /api/admin?action=update-promo-config # 更新推广配置
```

## 安全措施总结

| 措施 | 位置 | 说明 |
|------|------|------|
| JWT 验证 | `handleStatus`, `handleRetry` | 订单所有权校验 |
| 速率限制 | `checkStatusQueryLimit()` | 30次/分钟/订单 |
| 订单过期 | `handleStatus()` | 30分钟自动过期 |
| 签名验证 | `handleNotify()` | 虎皮椒回调签名 |
| IDOR 防护 | `handleStatus()` | 非所有者限制信息 |

## 版本历史
- v1.0: 基础功能（八字+MBTI分析）
- v1.1: 提示词优化，标准化模板
- v1.2: 报告格式优化，引用句截断
- v1.3: 支付系统、用户管理、优惠码、管理后台
- v1.4: 推广期免费次数设置、JWT解析修复
- **v1.5**: 虎皮椒2024升级、支付重试、订单管理、安全增强

## 后续可优化
- [ ] 报告函数合并（4个→2个）
- [ ] 微信支付渠道
- [ ] 用户使用历史页面
- [ ] 邮件通知（购买成功、次数不足）
- [ ] Redis 替代内存存储（速率限制）
