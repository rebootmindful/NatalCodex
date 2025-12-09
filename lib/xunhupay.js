/**
 * 虎皮椒支付 SDK
 * 文档: https://www.xunhupay.com/doc/api/pay.html
 */

const crypto = require('crypto');

const config = {
  appId: process.env.XUNHUPAY_APPID || '',
  appSecret: process.env.XUNHUPAY_APPSECRET || '',
  gateway: 'https://api.xunhupay.com/payment/do.html',
  notifyUrl: process.env.XUNHUPAY_NOTIFY_URL || 'https://natalcodex.com/api/pay?action=notify',
  returnUrl: process.env.XUNHUPAY_RETURN_URL || 'https://natalcodex.com/pay/result.html'
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
  if (!receivedHash) return false;
  
  const calculatedHash = generateSign(params);
  return receivedHash.toLowerCase() === calculatedHash.toLowerCase();
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
 * 创建支付订单
 * @param {Object} options
 * @param {string} options.packageType - 套餐类型: PACK_6 / PACK_20
 * @param {string} options.orderNo - 订单号
 * @param {number} options.amount - 实付金额
 * @param {string} options.title - 商品标题
 * @returns {Object} 支付URL和参数
 */
function createPayment(options) {
  const { orderNo, amount, title } = options;
  
  const params = {
    version: '1.1',
    appid: config.appId,
    trade_order_id: orderNo,
    total_fee: amount.toFixed(2),
    title: title || 'NatalCodex 次数套餐',
    time: Math.floor(Date.now() / 1000).toString(),
    notify_url: config.notifyUrl,
    return_url: config.returnUrl,
    nonce_str: crypto.randomBytes(16).toString('hex')
  };
  
  params.hash = generateSign(params);
  
  // 构建支付URL
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  return {
    payUrl: `${config.gateway}?${queryString}`,
    params: params
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
