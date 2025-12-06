/**
 * 查询订单状态 API
 * GET /api/pay/status?order=xxx
 */

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const orderNo = req.query.order;

  if (!orderNo) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing order number' 
    });
  }

  try {
    // TODO: 从数据库查询订单
    // const order = await getOrderByNo(orderNo);
    // if (!order) {
    //   return res.status(404).json({ success: false, error: 'Order not found' });
    // }
    // return res.json({
    //   success: true,
    //   status: order.status,
    //   productName: order.productName,
    //   amountDisplay: `¥${(order.amount / 100).toFixed(2)}`
    // });

    // 临时：返回模拟数据（接入数据库后删除）
    console.log('[Pay/Status] Query order:', orderNo);
    
    return res.json({
      success: true,
      status: 'pending',  // 'pending' | 'paid' | 'expired'
      orderNo,
      productName: '待查询',
      amountDisplay: '¥0.00'
    });

  } catch (error) {
    console.error('[Pay/Status] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
