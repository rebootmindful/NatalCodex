/**
 * 面包多支付封装
 * 文档: https://doc.mbd.pub/
 */

const crypto = require('crypto');

const MBD_CONFIG = {
  APP_ID: process.env.MBD_APP_ID || '',
  APP_KEY: process.env.MBD_APP_KEY || '',
  API_BASE: 'https://newapi.mbd.pub/release'
};

/**
 * 生成签名
 */
function sign(data, key) {
  const sorted = Object.keys(data).sort();
  const str = sorted.map(k => `${k}=${data[k]}`).join('&');
  return crypto.createHash('md5').update(`${str}&key=${key}`).digest('hex');
}

/**
 * 验证签名
 */
function verifySign(data, key) {
  const receivedSign = data.sign;
  const dataWithoutSign = { ...data };
  delete dataWithoutSign.sign;
  const calculatedSign = sign(dataWithoutSign, key);
  return receivedSign === calculatedSign;
}

/**
 * 生成订单号
 */
function generateOrderNo() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `NC${timestamp}${random}`;
}

/**
 * 创建支付宝支付
 * @param {Object} options
 * @param {number} options.amount - 金额（分）
 * @param {string} options.description - 商品描述
 * @param {string} options.outTradeNo - 商户订单号
 * @param {string} options.callbackUrl - 支付成功后跳转URL
 */
async function createAlipayOrder(options) {
  const { amount, description, outTradeNo, callbackUrl } = options;

  const data = {
    app_id: MBD_CONFIG.APP_ID,
    amount_total: amount,
    description: description,
    out_trade_no: outTradeNo,
    url: callbackUrl
  };
  data.sign = sign(data, MBD_CONFIG.APP_KEY);

  const response = await fetch(`${MBD_CONFIG.API_BASE}/alipay/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();
  
  if (result.errcode !== 0) {
    throw new Error(result.errmsg || 'Alipay order creation failed');
  }

  return {
    success: true,
    payUrl: result.data?.pay_url || result.pay_url,
    outTradeNo
  };
}

/**
 * 创建微信H5支付（手机浏览器跳转微信）
 * 注意：不能在微信内使用
 */
async function createWechatH5Order(options) {
  const { amount, description, outTradeNo, callbackUrl } = options;

  const data = {
    app_id: MBD_CONFIG.APP_ID,
    amount_total: amount,
    description: description,
    out_trade_no: outTradeNo,
    url: callbackUrl
  };
  data.sign = sign(data, MBD_CONFIG.APP_KEY);

  const response = await fetch(`${MBD_CONFIG.API_BASE}/wx/prepay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (result.errcode !== 0) {
    throw new Error(result.errmsg || 'WeChat H5 order creation failed');
  }

  return {
    success: true,
    payUrl: result.data?.pay_url || result.pay_url,
    outTradeNo
  };
}

/**
 * 处理面包多 Webhook 回调
 */
function handleWebhook(body) {
  const { type, data } = body;

  // 验证签名
  if (!verifySign(data, MBD_CONFIG.APP_KEY)) {
    return { success: false, error: 'Invalid signature' };
  }

  if (type === 'charge_succeeded') {
    return {
      success: true,
      event: 'payment_success',
      orderNo: data.out_trade_no,
      amount: data.amount,
      transactionId: data.transaction_id,
      payChannel: data.payway === 1 ? 'wechat' : 'alipay'
    };
  }

  if (type === 'complaint') {
    return {
      success: true,
      event: 'complaint',
      orderNo: data.out_trade_no,
      detail: data.complaint_detail
    };
  }

  return { success: false, error: 'Unknown event type' };
}

module.exports = {
  sign,
  verifySign,
  generateOrderNo,
  createAlipayOrder,
  createWechatH5Order,
  handleWebhook,
  MBD_CONFIG
};
