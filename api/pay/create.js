/**
 * 创建支付订单 API
 * POST /api/pay/create
 * 
 * Body: {
 *   productType: 'mbti_report' | 'kuder_report' | 'mbti_card' | 'kuder_card' | 'mbti_bundle' | 'kuder_bundle',
 *   payChannel: 'alipay' | 'wechat',
 *   metadata: { ... }  // 可选，存储额外信息
 * }
 */

const { 
  generateOrderNo, 
  createAlipayOrder, 
  createWechatH5Order 
} = require('../../lib/mbd-payment');

// 产品价格配置（单位：分）
const PRODUCTS = {
  mbti_report: { name: 'MBTI性格分析报告', price: 990 },      // ¥9.9
  kuder_report: { name: 'KUDER职业分析报告', price: 990 },    // ¥9.9
  mbti_card: { name: '灵魂契合卡', price: 690 },              // ¥6.9
  kuder_card: { name: '宿命职业卡', price: 690 },             // ¥6.9
  mbti_bundle: { name: 'MBTI报告+灵魂卡套餐', price: 1490 },  // ¥14.9
  kuder_bundle: { name: 'KUDER报告+职业卡套餐', price: 1490 } // ¥14.9
};

module.exports = async (req, res) => {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productType, payChannel, metadata } = req.body;

    // 验证产品类型
    const product = PRODUCTS[productType];
    if (!product) {
      return res.status(400).json({ 
        error: 'Invalid product type',
        validTypes: Object.keys(PRODUCTS)
      });
    }

    // 验证支付渠道
    if (!['alipay', 'wechat'].includes(payChannel)) {
      return res.status(400).json({ 
        error: 'Invalid pay channel',
        validChannels: ['alipay', 'wechat']
      });
    }

    // 检测是否在微信内（微信内不能用H5支付）
    const userAgent = req.headers['user-agent'] || '';
    const isWechat = /MicroMessenger/i.test(userAgent);
    if (isWechat && payChannel === 'wechat') {
      return res.status(400).json({
        error: 'WeChat H5 payment not available inside WeChat app',
        suggestion: 'Please use Alipay or open in external browser'
      });
    }

    // 生成订单号
    const outTradeNo = generateOrderNo();

    // 回调URL
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const callbackUrl = `${protocol}://${host}/pay/result?order=${outTradeNo}`;

    // 创建支付订单
    let payResult;
    const orderOptions = {
      amount: product.price,
      description: product.name,
      outTradeNo,
      callbackUrl
    };

    if (payChannel === 'alipay') {
      payResult = await createAlipayOrder(orderOptions);
    } else {
      payResult = await createWechatH5Order(orderOptions);
    }

    // TODO: 将订单保存到数据库
    // await saveOrder({
    //   id: uuid(),
    //   outTradeNo,
    //   productType,
    //   productName: product.name,
    //   amount: product.price,
    //   paymentProvider: 'mbd',
    //   paymentChannel: payChannel,
    //   status: 'pending',
    //   metadata,
    //   createdAt: new Date(),
    //   expiredAt: new Date(Date.now() + 15 * 60 * 1000) // 15分钟过期
    // });

    console.log('[Pay/Create] Order created:', outTradeNo, product.name, payChannel);

    return res.json({
      success: true,
      orderNo: outTradeNo,
      payUrl: payResult.payUrl,
      product: {
        type: productType,
        name: product.name,
        price: product.price,
        priceDisplay: `¥${(product.price / 100).toFixed(2)}`
      }
    });

  } catch (error) {
    console.error('[Pay/Create] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
