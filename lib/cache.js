/**
 * Simple in-memory cache for Vercel serverless functions
 * Note: Cache is per-instance, cleared on cold starts
 */

const cache = new Map();
const rateLimits = new Map();
const TTL = 10 * 60 * 1000; // 10 minutes TTL
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN || '';

/**
 * Generate cache key from birth data
 * Supports both simple birthData and extended objects with type field
 */
function generateCacheKey(birthData) {
  const key = [
    birthData.date,
    birthData.time,
    birthData.gender,
    birthData.location,
    birthData.timezone || 'Asia/Shanghai',
    birthData.language || 'zh',
    birthData.type || 'mbti'  // Support KUDER vs MBTI differentiation
  ].join('|');
  return key;
}

/**
 * Get cached result if exists and not expired
 */
async function upstashCommand(command) {
  const response = await fetch(UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upstash error: ${response.status} ${text.substring(0, 200)}`);
  }

  return response.json();
}

function isUpstashEnabled() {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

async function rateLimit(key, limit, windowMs) {
  const now = Date.now();

  if (isUpstashEnabled()) {
    try {
      const redisKey = `nc:rl:${key}`;
      const json = await upstashCommand(['INCR', redisKey]);
      const count = Number(json?.result || 0);
      if (count === 1) {
        await upstashCommand(['PEXPIRE', redisKey, String(windowMs)]);
      }
      return count <= limit;
    } catch {}
  }

  const record = rateLimits.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }

  rateLimits.set(key, record);

  if (rateLimits.size > 5000) {
    for (const [k, v] of rateLimits) {
      if (now > v.resetAt) rateLimits.delete(k);
    }
  }

  return record.count <= limit;
}

async function get(birthData) {
  const key = generateCacheKey(birthData);

  if (isUpstashEnabled()) {
    const redisKey = `nc:cache:${key}`;
    const json = await upstashCommand(['GET', redisKey]);
    if (!json || json.result == null) return null;
    try {
      return JSON.parse(json.result);
    } catch (_) {
      await upstashCommand(['DEL', redisKey]);
      return null;
    }
  }

  const cached = cache.get(key);

  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.timestamp > TTL) {
    cache.delete(key);
    return null;
  }

  console.log('[Cache] HIT for:', key.substring(0, 50));
  return cached.data;
}

/**
 * Store result in cache
 */
async function set(birthData, data) {
  const key = generateCacheKey(birthData);
  if (isUpstashEnabled()) {
    const redisKey = `nc:cache:${key}`;
    await upstashCommand(['SET', redisKey, JSON.stringify(data), 'PX', String(TTL)]);
    return;
  }

  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  console.log('[Cache] SET for:', key.substring(0, 50));

  // Clean up old entries (keep max 50)
  if (cache.size > 50) {
    const oldest = [...cache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, cache.size - 50);
    oldest.forEach(([k]) => cache.delete(k));
  }
}

/**
 * Clear all cache
 */
async function clear() {
  cache.clear();
  console.log('[Cache] Cleared');
}

/**
 * Get cache stats
 */
async function stats() {
  if (isUpstashEnabled()) {
    const json = await upstashCommand(['DBSIZE']);
    return {
      provider: 'upstash',
      size: json?.result ?? null
    };
  }
  return {
    provider: 'memory',
    size: cache.size,
    keys: [...cache.keys()].map(k => k.substring(0, 30))
  };
}

module.exports = {
  get,
  set,
  clear,
  stats,
  generateCacheKey,
  rateLimit,
  isUpstashEnabled,
  upstashCommand
};
