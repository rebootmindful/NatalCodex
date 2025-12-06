/**
 * 面包多支付回调 Webhook
 * POST /api/webhook/mbd
 * 
 * 面包多会在支付成功后调用此接口
 * 文档: https://doc.mbd.pub/
 */

const { handleWebhook } = require('../../lib/mbd-payment');

module.exports = async (req, res) => {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[Webhook/MBD] Received:', JSON.stringify(req.body));

  try {
    const result = handleWebhook(req.body);

    if (!result.success) {
      console.error('[Webhook/MBD] Validation failed:', result.error);
      return res.status(400).json({ error: result.error });
    }

    if (result.event === 'payment_success') {
      console.log('[Webhook/MBD] Payment success:', {
        orderNo: result.orderNo,
        amount: result.amount,
        channel: result.payChannel
      });

      // TODO: 更新订单状态为已支付
      // await updateOrder(result.orderNo, {
      //   status: 'paid',
      //   transactionId: result.transactionId,
      //   paymentChannel: result.payChannel,
      //   paidAt: new Date()
      // });

      // TODO: 如果有邮箱，发送报告到邮箱
      // TODO: 如果需要，触发报告生成

      return res.json({ success: true, message: 'Payment processed' });
    }

    if (result.event === 'complaint') {
      console.warn('[Webhook/MBD] Complaint received:', {
        orderNo: result.orderNo,
        detail: result.detail
      });

      // TODO: 记录投诉，通知管理员
      // await recordComplaint(result.orderNo, result.detail);
      // await notifyAdmin('Payment complaint', result);

      return res.json({ success: true, message: 'Complaint recorded' });
    }

    return res.json({ success: true });

  } catch (error) {
    console.error('[Webhook/MBD] Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
