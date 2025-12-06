-- NatalCodex 订单数据库表结构
-- 用于 Vercel Postgres 或其他数据库

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  out_trade_no VARCHAR(64) UNIQUE NOT NULL,  -- 商户订单号
  user_id VARCHAR(64),                        -- 用户标识（可选，暂时用设备指纹或IP）
  
  -- 产品信息
  product_type VARCHAR(20) NOT NULL,          -- 'mbti_report' / 'kuder_report' / 'mbti_card' / 'kuder_card' / 'mbti_bundle' / 'kuder_bundle'
  product_name VARCHAR(100),                  -- 产品显示名称
  
  -- 金额
  amount INT NOT NULL,                        -- 金额（分）
  currency VARCHAR(3) DEFAULT 'CNY',          -- 货币 CNY/USD
  
  -- 支付信息
  payment_provider VARCHAR(20),               -- 'mbd' / 'creem'
  payment_channel VARCHAR(20),                -- 'wechat' / 'alipay'
  transaction_id VARCHAR(64),                 -- 第三方支付流水号
  
  -- 状态
  status VARCHAR(20) DEFAULT 'pending',       -- 'pending' / 'paid' / 'expired' / 'refunded'
  
  -- 关联数据（存储生成的报告/卡片信息）
  metadata JSON,                              -- { birthData, reportContent, imageUrl, ... }
  
  -- 时间
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP,
  expired_at TIMESTAMP,                       -- 订单过期时间（15分钟）
  
  -- 索引
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

-- 用户表（可选，后续扩展用）
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  openid VARCHAR(64),                         -- 微信openid（如果接入微信登录）
  nickname VARCHAR(50),
  avatar_url VARCHAR(255),
  phone VARCHAR(20),
  
  -- 统计
  total_orders INT DEFAULT 0,
  total_spent INT DEFAULT 0,                  -- 累计消费（分）
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_openid (openid)
);

-- 使用记录表（用于限制免费次数等）
CREATE TABLE IF NOT EXISTS usage_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(64),                        -- 用户ID或设备指纹
  ip_address VARCHAR(45),
  action_type VARCHAR(20),                    -- 'generate_report' / 'generate_card'
  product_type VARCHAR(20),                   -- 'mbti' / 'kuder'
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_action (user_id, action_type, created_at),
  INDEX idx_ip_action (ip_address, action_type, created_at)
);
