// Type for cached items
interface CacheItem<T = unknown> {
  data: T;
  expires: number;
}

// Simple in-memory cache for API responses
class SimpleCache {
  private cache = new Map<string, CacheItem>();

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expires });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const apiCache = new SimpleCache();

// Clean up expired entries every 5 minutes
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    apiCache.cleanup();
  }, 5 * 60 * 1000);
}

// Cache helper functions
export function getCachedData<T>(key: string): T | null {
  return apiCache.get<T>(key);
}

export function setCachedData<T>(key: string, data: T, ttlSeconds: number = 300): void {
  apiCache.set(key, data, ttlSeconds);
}

export function clearCache(): void {
  apiCache.clear();
}

// Generate cache keys
export function generateCacheKey(prefix: string, params: Record<string, unknown> = {}): string {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return paramString ? `${prefix}:${paramString}` : prefix;
}
