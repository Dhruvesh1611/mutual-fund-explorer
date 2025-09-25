import NodeCache from 'node-cache';

// Cache with longer TTL for better performance
const cache = new NodeCache({ 
  stdTTL: 7200, // 2 hours default
  checkperiod: 600 // Check for expired keys every 10 minutes
});

export const getCachedData = (key, allowStale = false) => {
  if (allowStale) {
    // Try to get data even if expired
    const data = cache.get(key);
    if (data) return data;
    
    // Check if we have stale data in storage
    const keys = cache.keys();
    if (keys.includes(key)) {
      return cache.get(key);
    }
  }
  
  return cache.get(key);
};

export const setCachedData = (key, data, ttl) => {
  if (ttl !== undefined) {
    return cache.set(key, data, ttl);
  }
  return cache.set(key, data);
};

export const deleteCachedData = (key) => {
  return cache.del(key);
};

export const getCacheStats = () => {
  return {
    keys: cache.keys().length,
    stats: cache.getStats()
  };
};