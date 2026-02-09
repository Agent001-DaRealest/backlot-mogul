const cache = new Map();

export const TTL = {
  QUOTE: 4 * 60 * 60 * 1000,
  OVERVIEW: 24 * 60 * 60 * 1000,
  EARNINGS: 7 * 24 * 60 * 60 * 1000,
  CALENDAR: 24 * 60 * 60 * 1000,
  HISTORY: 24 * 60 * 60 * 1000,
};

export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCache(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCache() {
  cache.clear();
}
