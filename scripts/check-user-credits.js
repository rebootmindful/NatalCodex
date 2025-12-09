/**
 * 检查用户次数的调试脚本
 * 使用方法：node scripts/check-user-credits.js <user_email>
 */

require('dotenv').config();
const { query } = require('../lib/db');

async function checkUserCredits() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node scripts/check-user-credits.js <user_email>');
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Checking credits for: ${email}\n`);

    // 查询用户信息
    const userResult = await query(
      `SELECT id, email, remaining_credits, total_purchased, created_at, is_admin
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User not found');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log('👤 User Info:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Remaining Credits:', user.remaining_credits);
    console.log('   Total Purchased:', user.total_purchased);
    console.log('   Is Admin:', user.is_admin);
    console.log('   Created At:', user.created_at);

    // 查询使用记录
    const usageResult = await query(
      `SELECT report_id, report_type, report_status, image_status,
              credits_deducted, credits_refunded, created_at
       FROM usage_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [user.id]
    );

    console.log('\n📊 Recent Usage (last 10):');
    if (usageResult.rows.length === 0) {
      console.log('   No usage history');
    } else {
      usageResult.rows.forEach((log, index) => {
        console.log(`\n   ${index + 1}. ${log.report_type.toUpperCase()}`);
        console.log(`      Report: ${log.report_status} | Image: ${log.image_status || 'N/A'}`);
        console.log(`      Deducted: ${log.credits_deducted} | Refunded: ${log.credits_refunded}`);
        console.log(`      Time: ${log.created_at}`);
      });
    }

    // 查询订单记录
    const ordersResult = await query(
      `SELECT order_no, package_type, credits, status, final_price, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [user.id]
    );

    console.log('\n💳 Recent Orders (last 5):');
    if (ordersResult.rows.length === 0) {
      console.log('   No order history');
    } else {
      ordersResult.rows.forEach((order, index) => {
        console.log(`\n   ${index + 1}. ${order.order_no}`);
        console.log(`      Package: ${order.package_type} (${order.credits} credits)`);
        console.log(`      Status: ${order.status} | Price: ¥${order.final_price}`);
        console.log(`      Time: ${order.created_at}`);
      });
    }

    // 计算次数平衡
    const totalDeducted = usageResult.rows.reduce((sum, log) => sum + (log.credits_deducted ? 1 : 0), 0);
    const totalRefunded = usageResult.rows.reduce((sum, log) => sum + (log.credits_refunded ? 1 : 0), 0);
    const totalPurchased = ordersResult.rows
      .filter(o => o.status === 'paid')
      .reduce((sum, order) => sum + order.credits, 0);

    console.log('\n📈 Credits Summary:');
    console.log('   Total Purchased (from paid orders):', totalPurchased);
    console.log('   Total Deducted (from usage logs):', totalDeducted);
    console.log('   Total Refunded (from usage logs):', totalRefunded);
    console.log('   Expected Balance:', totalPurchased - totalDeducted + totalRefunded);
    console.log('   Actual Balance:', user.remaining_credits);

    const diff = (totalPurchased - totalDeducted + totalRefunded) - user.remaining_credits;
    if (diff !== 0) {
      console.log(`   ⚠️  Mismatch: ${diff > 0 ? '+' : ''}${diff} credits`);
    } else {
      console.log('   ✅ Balance matches!');
    }

    // 检查推广期配置
    const configResult = await query(`
      SELECT config_key, config_value FROM system_config
      WHERE config_key IN ('promo_free_credits', 'promo_start_at', 'promo_end_at')
    `);

    console.log('\n🎁 Promo Config:');
    if (configResult.rows.length === 0) {
      console.log('   No promo config set (default: 1 credit for new users)');
    } else {
      const config = {};
      configResult.rows.forEach(row => {
        config[row.config_key] = row.config_value;
      });
      console.log('   Free Credits:', config.promo_free_credits || 1);
      console.log('   Start At:', config.promo_start_at || 'Not set');
      console.log('   End At:', config.promo_end_at || 'Not set');

      const now = new Date();
      if (config.promo_start_at && config.promo_end_at) {
        const startAt = new Date(config.promo_start_at);
        const endAt = new Date(config.promo_end_at);
        const isActive = now >= startAt && now <= endAt;
        console.log('   Status:', isActive ? '✅ Active' : '❌ Inactive');
      }
    }

    console.log('\n✅ Check complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkUserCredits();
