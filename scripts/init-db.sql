-- NatalCodex Database Schema
-- Run this in Neon SQL Editor: https://console.neon.tech/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  -- For future Google OAuth
  google_id VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  name VARCHAR(255)
);

-- Index for faster email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: User reports history (for future use)
-- CREATE TABLE IF NOT EXISTS user_reports (
--   id SERIAL PRIMARY KEY,
--   user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
--   report_type VARCHAR(20) NOT NULL, -- 'mbti' or 'kuder'
--   birth_data JSONB NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS idx_user_reports_user_id ON user_reports(user_id);
