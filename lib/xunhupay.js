/**
 * 虎皮椒支付 SDK
 * 文档: https://www.xunhupay.com/doc/api/pay.html
 *
 * 注意: 2024年1月起虎皮椒废弃了PC端URL直接跳转方式
 * 新方式: 服务端POST请求 → 获取JSON返回值 → 前端本地渲染二维码
 */

const crypto = require('crypto');

const config = {
  appId: process.env.XUNHUPAY_APPID || '201906175624',
  appSecret: process.env.XUNHUPAY_APPSECRET || '6ce88d0160e2cb6d5933461e75b079da',
  gateway: 'https://api.xunhupay.com/payment/do.html',
  // 重要：使用 www 前缀，避免 Vercel 307 重定向
  notifyUrl: process.env.XUNHUPAY_NOTIFY_URL || 'https://www.natalcodex.com/api/notify',
  returnUrl: process.env.XUNHUPAY_RETURN_URL || 'https://www.natalcodex.com/pay/result.html'
};

// 套餐配置
const PACKAGES = {
  PACK_6: { credits: 6, price: 29.00, name: '6次套餐' },
  PACK_20: { credits: 20, price: 89.00, name: '20次套餐' }
};

/**
 * 生成签名
 * 虎皮椒签名规则: MD5(参数按key排序拼接 + appSecret)
 */
function generateSign(params) {
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys
    .filter(key => params[key] !== '' && key !== 'hash')
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return crypto
    .createHash('md5')
    .update(signStr + config.appSecret)
    .digest('hex');
}

/**
 * 验证回调签名
 */
function verifySign(params) {
  const receivedHash = params.hash;
  if (!receivedHash) {
    console.error('[Xunhupay] No hash in params');
    return false;
  }

  const calculatedHash = generateSign(params);
  const isValid = receivedHash.toLowerCase() === calculatedHash.toLowerCase();

  if (!isValid) {
    console.error('[Xunhupay] Signature mismatch:');
    console.error('[Xunhupay] Received hash:', receivedHash);
    console.error('[Xunhupay] Calculated hash:', calculatedHash);
    console.error('[Xunhupay] AppSecret length:', config.appSecret?.length || 0);
  }

  return isValid;
}

/**
 * 生成订单号
 * 格式: NC + 时间戳 + 4位随机数
 */
function generateOrderNo() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `NC${timestamp}${random}`;
}

/**
 * 创建支付订单 (2024新版: POST请求获取二维码URL)
 * @param {Object} options
 * @param {string} options.packageType - 套餐类型: PACK_6 / PACK_20
 * @param {string} options.orderNo - 订单号
 * @param {number} options.amount - 实付金额
 * @param {string} options.title - 商品标题
 * @returns {Promise<Object>} 包含二维码URL等支付信息
 */
async function createPayment(options) {
  const { orderNo, amount, title } = options;

  // 动态生成 return_url，附加订单号供移动端返回时查询
  const returnUrlWithOrder = `${config.returnUrl}?order=${orderNo}`;

  const params = {
    version: '1.1',
    appid: config.appId,
    trade_order_id: orderNo,
    total_fee: amount.toFixed(2),
    title: title || 'NatalCodex 次数套餐',
    time: Math.floor(Date.now() / 1000).toString(),
    notify_url: config.notifyUrl,
    return_url: returnUrlWithOrder,
    nonce_str: crypto.randomBytes(16).toString('hex')
  };

  params.hash = generateSign(params);

  // POST 请求虎皮椒 API
  const response = await fetch(config.gateway, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString()
  });

  const result = await response.json();

  console.log('[Xunhupay] API Response:', JSON.stringify(result));

  if (result.errcode !== 0) {
    throw new Error(result.errmsg || 'Payment API error');
  }

  return {
    openid: result.openid,
    qrCodeUrl: result.url_qrcode,  // PC端用这个显示二维码
    mobileUrl: result.url,          // 移动端用这个跳转
    hash: result.hash,
    orderNo: orderNo
  };
}

/**
 * 处理支付回调
 * @param {Object} body - 回调请求体
 * @returns {Object} 处理结果
 */
function handleNotify(body) {
  // 验证签名
  if (!verifySign(body)) {
    return { success: false, error: 'Invalid signature' };
  }
  
  const {
    trade_order_id,  // 商户订单号
    transaction_id,  // 虎皮椒交易号
    total_fee,       // 支付金额
    status,          // 支付状态: OD (已支付)
    plugins,         // 插件参数
    appid,
    time,
    nonce_str
  } = body;
  
  // 验证状态
  if (status !== 'OD') {
    return { success: false, error: `Payment not completed: ${status}` };
  }
  
  return {
    success: true,
    orderNo: trade_order_id,
    tradeNo: transaction_id,
    amount: parseFloat(total_fee),
    paidAt: new Date()
  };
}

/**
 * 计算优惠后价格
 * @param {string} packageType - 套餐类型
 * @param {number} discountPercent - 折扣百分比 (50 = 五折, 20 = 八折)
 * @returns {Object} 价格信息
 */
function calculatePrice(packageType, discountPercent = 0) {
  const pkg = PACKAGES[packageType];
  if (!pkg) {
    throw new Error(`Invalid package type: ${packageType}`);
  }
  
  const originalPrice = pkg.price;
  let discountAmount = 0;
  let finalPrice = originalPrice;
  
  if (discountPercent === 50) {
    // 五折
    discountAmount = originalPrice * 0.5;
    finalPrice = originalPrice * 0.5;
  } else if (discountPercent === 20) {
    // 八折
    discountAmount = originalPrice * 0.2;
    finalPrice = originalPrice * 0.8;
  }
  
  return {
    packageType,
    packageName: pkg.name,
    credits: pkg.credits,
    originalPrice: originalPrice,
    discountPercent: discountPercent,
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100
  };
}

module.exports = {
  config,
  PACKAGES,
  generateSign,
  verifySign,
  generateOrderNo,
  createPayment,
  handleNotify,
  calculatePrice
};
