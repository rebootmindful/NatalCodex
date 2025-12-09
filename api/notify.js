/**
 * 虎皮椒支付回调专用端点
 * 独立文件，避免路由问题
 * URL: /api/notify
 *
 * 虎皮椒文档: https://www.xunhupay.com/doc/api/pay.html
 * 回调方式: POST, form表单类型
 * 返回要求: 返回纯文本 "success" 表示收到
 */

const { query } = require('../lib/db');
const xunhupay = require('../lib/xunhupay');

module.exports = async (req, res) => {
  // 立即设置响应头，确保返回纯文本
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store');

  console.log('[Notify] ====== PAYMENT CALLBACK ======');
  console.log('[Notify] Method:', req.method);
  console.log('[Notify] URL:', req.url);

  // 虎皮椒使用 POST + form表单
  // req.body 在 Vercel 中会自动解析 form 数据
  const params = req.body || req.query || {};

  console.log('[Notify] Params:', JSON.stringify(params));

  // 检查必要参数
  if (!params || !params.trade_order_id) {
    console.error('[Notify] Missing trade_order_id');
    return res.status(200).send('fail');
  }

  // 验证签名
  const result = xunhupay.handleNotify(params);

  if (!result.success) {
    console.error('[Notify] Validation failed:', result.error);
    return res.status(200).send('fail');
  }

  const { orderNo, tradeNo, amount, paidAt } = result;
  console.log('[Notify] Verified order:', orderNo, 'amount:', amount);

  try {
    // 查询订单
    const orderResult = await query(
      `SELECT * FROM orders WHERE order_no = $1`,
      [orderNo]
    );

    if (orderResult.rows.length === 0) {
      console.error('[Notify] Order not found:', orderNo);
      return res.status(200).send('fail');
    }

    const order = orderResult.rows[0];

    // 检查是否已处理
    if (order.status === 'paid') {
      console.log('[Notify] Order already paid:', orderNo);
      return res.status(200).send('success');
    }

    // 验证金额
    if (Math.abs(parseFloat(order.final_price) - amount) > 0.01) {
      console.error('[Notify] Amount mismatch:', order.final_price, 'vs', amount);
      return res.status(200).send('fail');
    }

    // 更新订单状态
    await query(
      `UPDATE orders SET status = 'paid', trade_no = $1, paid_at = $2 WHERE order_no = $3`,
      [tradeNo, paidAt, orderNo]
    );

    // 给用户加次数
    await query(
      `UPDATE users SET
         remaining_credits = remaining_credits + $1,
         total_purchased = total_purchased + $1
       WHERE id = $2`,
      [order.credits, order.user_id]
    );

    // 标记优惠码已使用
    if (order.promo_code) {
      await query(
        `UPDATE promo_codes SET is_used = true, used_by_user_id = $1, used_at = NOW() WHERE code = $2`,
        [order.user_id, order.promo_code]
      );
    }

    console.log('[Notify] SUCCESS:', orderNo, 'credits:', order.credits);
    return res.status(200).send('success');

  } catch (error) {
    console.error('[Notify] Database error:', error);
    return res.status(200).send('fail');
  }
};
