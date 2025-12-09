/**
 * 测试数据库连接和表结构
 * 使用方法：node scripts/test-db-connection.js
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...\n');

  // 1. 检查环境变量
  console.log('1️⃣ Environment Variables:');
  console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
  if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL is not set!');
    process.exit(1);
  }

  // 显示连接信息（隐藏密码）
  const dbUrl = process.env.DATABASE_URL;
  const urlObj = new URL(dbUrl);
  console.log('   Host:', urlObj.hostname);
  console.log('   Database:', urlObj.pathname.substring(1));
  console.log('   User:', urlObj.username);
  console.log('   Password:', '*'.repeat(urlObj.password.length));
  console.log('   SSL Mode:', urlObj.searchParams.get('sslmode') || 'default');

  // 2. 创建连接池
  console.log('\n2️⃣ Creating Connection Pool...');
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000,
      max: 1 // 只用一个连接测试
    });
    console.log('   ✅ Pool created');
  } catch (error) {
    console.error('   ❌ Failed to create pool:', error.message);
    process.exit(1);
  }

  // 3. 测试基本连接
  console.log('\n3️⃣ Testing Basic Connection...');
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('   ✅ Connection successful!');
    console.log('   Current Time:', result.rows[0].current_time);
    console.log('   PostgreSQL Version:', result.rows[0].version.split(',')[0]);
  } catch (error) {
    console.error('   ❌ Connection failed:', error.message);
    console.error('   Error code:', error.code);
    await pool.end();
    process.exit(1);
  }

  // 4. 检查必需的表
  console.log('\n4️⃣ Checking Required Tables...');
  const requiredTables = ['users', 'orders', 'promo_codes', 'usage_logs', 'system_config'];

  for (const table of requiredTables) {
    try {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        // 获取表的行数
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table} (${countResult.rows[0].count} rows)`);
      } else {
        console.log(`   ❌ ${table} (missing)`);
      }
    } catch (error) {
      console.log(`   ❌ ${table} (error: ${error.message})`);
    }
  }

  // 5. 检查 users 表结构
  console.log('\n5️⃣ Checking Users Table Structure...');
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    if (result.rows.length > 0) {
      console.log('   Columns:');
      result.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`     - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });

      // 检查关键字段
      const columnNames = result.rows.map(r => r.column_name);
      const requiredColumns = ['id', 'email', 'remaining_credits', 'is_admin'];

      console.log('\n   Required Columns:');
      requiredColumns.forEach(col => {
        const exists = columnNames.includes(col);
        console.log(`     ${exists ? '✅' : '❌'} ${col}`);
      });
    } else {
      console.log('   ❌ Table structure not found');
    }
  } catch (error) {
    console.error('   ❌ Failed to check table structure:', error.message);
  }

  // 6. 测试一个简单查询
  console.log('\n6️⃣ Testing Sample Query...');
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as user_count,
             SUM(remaining_credits) as total_credits
      FROM users
    `);
    console.log('   ✅ Query successful!');
    console.log('   Total Users:', result.rows[0].user_count);
    console.log('   Total Credits:', result.rows[0].total_credits || 0);
  } catch (error) {
    console.error('   ❌ Query failed:', error.message);
  }

  // 7. 检查管理员
  console.log('\n7️⃣ Checking Admin User...');
  try {
    const result = await pool.query(`
      SELECT id, email, is_admin, remaining_credits
      FROM users
      WHERE email = 'rebootmindful@gmail.com'
    `);

    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log('   ✅ Admin user found!');
      console.log('   ID:', admin.id);
      console.log('   Email:', admin.email);
      console.log('   Is Admin:', admin.is_admin);
      console.log('   Credits:', admin.remaining_credits);
    } else {
      console.log('   ⚠️  Admin user not found (rebootmindful@gmail.com)');
    }
  } catch (error) {
    console.error('   ❌ Failed to check admin:', error.message);
  }

  // 关闭连接
  await pool.end();
  console.log('\n✅ Database test completed!\n');
}

// 运行测试
testDatabaseConnection().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
