-- NatalCodex Payment System Database Migration
-- Version: 1.0
-- Date: 2025-12-09
-- Description: 支付系统、用户次数管理、优惠码系统

-- ============================================================
-- 1. 扩展用户表 (users)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS remaining_credits INT DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_purchased INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 设置管理员
UPDATE users SET is_admin = true WHERE email = 'rebootmindful@gmail.com';

-- ============================================================
-- 2. 使用记录表 (usage_logs)
-- ============================================================

CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) NOT NULL,
  report_id VARCHAR(64) UNIQUE NOT NULL,
  report_type VARCHAR(10) NOT NULL CHECK (report_type IN ('mbti', 'kuder')),
  
  -- 报告状态
  report_status VARCHAR(20) DEFAULT 'pending' CHECK (report_status IN ('pending', 'success', 'failed')),
  report_content TEXT,
  
  -- 图片状态
  image_status VARCHAR(20) DEFAULT 'pending' CHECK (image_status IN ('pending', 'success', 'failed')),
  image_url TEXT,
  image_retry_count INT DEFAULT 0,
  
  -- 计费
  credits_deducted INT DEFAULT 1,
  credits_refunded BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_report_id ON usage_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);

-- ============================================================
-- 3. 优惠码表 (promo_codes)
-- ============================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('HALF', 'TWENTY')),
  discount_percent INT NOT NULL CHECK (discount_percent IN (50, 20)),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_by_user_id INT REFERENCES users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes(expires_at);

-- ============================================================
-- 4. 订单表 (orders)
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_no VARCHAR(32) UNIQUE NOT NULL,
  user_id INT REFERENCES users(id) NOT NULL,
  package_type VARCHAR(20) NOT NULL CHECK (package_type IN ('PACK_6', 'PACK_20')),
  credits INT NOT NULL CHECK (credits IN (6, 20)),
  original_price DECIMAL(10,2) NOT NULL,
  promo_code VARCHAR(6),
  discount_percent INT DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'expired')),
  payment_method VARCHAR(20) DEFAULT 'alipay',
  trade_no VARCHAR(64),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- ============================================================
-- 5. 优惠码验证失败记录表 (用于防刷)
-- ============================================================

CREATE TABLE IF NOT EXISTS promo_validation_attempts (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  attempted_code VARCHAR(20),
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_attempts_ip ON promo_validation_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_promo_attempts_created_at ON promo_validation_attempts(created_at);

-- ============================================================
-- 6. 更新触发器 (自动更新 updated_at)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_usage_logs_updated_at ON usage_logs;
CREATE TRIGGER update_usage_logs_updated_at
  BEFORE UPDATE ON usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. 套餐配置参考 (不创建表，仅供参考)
-- ============================================================

-- PACK_6:  29元,  6次, 单次4.83元
-- PACK_20: 89元, 20次, 单次4.45元

-- 优惠码折扣:
-- HALF (H开头): 50% off, 如 H3KX9M
-- TWENTY (E开头): 20% off, 如 E7BN2P

-- ============================================================
-- 8. 示例数据 (可选，用于测试)
-- ============================================================

-- 生成测试优惠码
-- INSERT INTO promo_codes (code, discount_type, discount_percent, expires_at, created_by)
-- VALUES 
--   ('HTEST1', 'HALF', 50, NOW() + INTERVAL '30 days', 'system'),
--   ('ETEST1', 'TWENTY', 20, NOW() + INTERVAL '30 days', 'system');

-- ============================================================
-- Migration Complete
-- ============================================================
