-- 修复 remaining_credits 为 NULL 的用户
-- 这些用户可能是在添加 remaining_credits 字段之前注册的

-- 1. 检查有多少用户的 remaining_credits 为 NULL
SELECT COUNT(*) as null_credits_count
FROM users
WHERE remaining_credits IS NULL;

-- 2. 显示这些用户
SELECT id, email, created_at, remaining_credits
FROM users
WHERE remaining_credits IS NULL
ORDER BY created_at DESC;

-- 3. 修复：设置为 1（默认免费次数）
UPDATE users
SET remaining_credits = 1
WHERE remaining_credits IS NULL;

-- 4. 确保 total_purchased 也不为 NULL
UPDATE users
SET total_purchased = 0
WHERE total_purchased IS NULL;

-- 5. 验证修复结果
SELECT COUNT(*) as users_with_credits,
       SUM(remaining_credits) as total_remaining_credits,
       AVG(remaining_credits) as avg_credits
FROM users
WHERE remaining_credits IS NOT NULL;

-- 6. 添加非空约束（可选，确保未来不会出现 NULL）
-- ALTER TABLE users ALTER COLUMN remaining_credits SET NOT NULL;
-- ALTER TABLE users ALTER COLUMN remaining_credits SET DEFAULT 1;
-- ALTER TABLE users ALTER COLUMN total_purchased SET NOT NULL;
-- ALTER TABLE users ALTER COLUMN total_purchased SET DEFAULT 0;
