/**
 * Simple in-memory cache for Vercel serverless functions
 * Note: Cache is per-instance, cleared on cold starts
 */

const cache = new Map();
const TTL = 10 * 60 * 1000; // 10 minutes TTL

/**
 * Generate cache key from birth data
 */
function generateCacheKey(birthData) {
  const key = [
    birthData.date,
    birthData.time,
    birthData.gender,
    birthData.location,
    birthData.timezone || 'Asia/Shanghai',
    birthData.language || 'zh'
  ].join('|');
  return key;
}

/**
 * Get cached result if exists and not expired
 */
function get(birthData) {
  const key = generateCacheKey(birthData);
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
function set(birthData, data) {
  const key = generateCacheKey(birthData);
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
function clear() {
  cache.clear();
  console.log('[Cache] Cleared');
}

/**
 * Get cache stats
 */
function stats() {
  return {
    size: cache.size,
    keys: [...cache.keys()].map(k => k.substring(0, 30))
  };
}

module.exports = {
  get,
  set,
  clear,
  stats,
  generateCacheKey
};
