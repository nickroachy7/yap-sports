/**
 * Live Game Cache Management
 * 
 * Dynamically adjusts cache TTL based on game status:
 * - Live games: 1 minute cache (frequent updates)
 * - Recent games (<2 hours): 5 minute cache
 * - Completed games: 30 minute cache
 * - Off-season: 1 hour cache
 */

export type GameStatus = 'scheduled' | 'live' | 'in_progress' | 'final' | 'postponed';

export interface LiveGameContext {
  hasLiveGames: boolean;
  liveGameCount: number;
  recentGameCount: number;
  lastGameEndTime?: Date;
}

/**
 * Get appropriate cache TTL based on game context
 */
export function getCacheTTL(context?: LiveGameContext): number {
  // No context = use safe default
  if (!context) {
    return 5 * 60 * 1000; // 5 minutes
  }

  // During live games: 1 minute cache
  if (context.hasLiveGames && context.liveGameCount > 0) {
    console.log(`⚡ Live games active (${context.liveGameCount}), using 1-min cache`);
    return 1 * 60 * 1000; // 1 minute
  }

  // Within 2 hours of last game: 5 minute cache
  if (context.lastGameEndTime) {
    const hoursSinceLastGame = (Date.now() - context.lastGameEndTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastGame < 2) {
      console.log(`🕐 Recent game ended ${hoursSinceLastGame.toFixed(1)}h ago, using 5-min cache`);
      return 5 * 60 * 1000; // 5 minutes
    }
  }

  // Off-day: 30 minute cache
  console.log('📅 No live games, using 30-min cache');
  return 30 * 60 * 1000; // 30 minutes
}

/**
 * Check if today is an NFL game day
 */
export function isNFLGameDay(date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
  // Sunday (0), Monday (1), Thursday (4), Saturday (6) during playoffs
  return dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 4 || dayOfWeek === 6;
}

/**
 * Get cache key with version
 */
export function getVersionedCacheKey(baseKey: string, version: string = 'v5'): string {
  return `${baseKey}_${version}`;
}

/**
 * Clear all player caches (use when forcing refresh)
 */
export function clearAllPlayerCaches(): void {
  if (typeof window === 'undefined') return; // Server-side

  let cleared = 0;
  const keysToRemove: string[] = [];

  // Find all player cache keys
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('player_modal_') || key.includes('player_detail_'))) {
      keysToRemove.push(key);
    }
  }

  // Remove them
  keysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
    cleared++;
  });

  console.log(`🗑️ Cleared ${cleared} player caches`);
}

/**
 * Get cache with TTL check
 */
export function getCachedData<T>(
  key: string, 
  maxAge?: number
): T | null {
  if (typeof window === 'undefined') return null; // Server-side

  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const age = Date.now() - (data.timestamp || 0);

    // Use provided maxAge or default
    const ttl = maxAge || 5 * 60 * 1000;

    if (age > ttl) {
      console.log(`⏰ Cache expired for ${key} (age: ${(age / 1000).toFixed(0)}s, ttl: ${(ttl / 1000).toFixed(0)}s)`);
      sessionStorage.removeItem(key);
      return null;
    }

    console.log(`✅ Cache hit for ${key} (age: ${(age / 1000).toFixed(0)}s)`);
    return data;
  } catch (err) {
    console.error('Cache read error:', err);
    return null;
  }
}

/**
 * Set cache data with timestamp
 */
export function setCachedData<T>(
  key: string,
  data: T,
  metadata?: {
    gameStatus?: GameStatus;
    playerId?: string;
  }
): void {
  if (typeof window === 'undefined') return; // Server-side

  try {
    const cacheData = {
      ...data,
      timestamp: Date.now(),
      metadata: metadata || {}
    };

    sessionStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`💾 Cached ${key}`);
  } catch (err) {
    console.error('Cache write error:', err);
    // Quota exceeded - clear old caches
    if (err instanceof Error && err.name === 'QuotaExceededError') {
      clearOldestCaches(10);
      // Try again
      try {
        sessionStorage.setItem(key, JSON.stringify({ ...data, timestamp: Date.now() }));
      } catch (retryErr) {
        console.error('Cache write failed after cleanup:', retryErr);
      }
    }
  }
}

/**
 * Clear oldest caches to free up space
 */
function clearOldestCaches(count: number): void {
  if (typeof window === 'undefined') return;

  interface CacheEntry {
    key: string;
    timestamp: number;
  }

  const entries: CacheEntry[] = [];

  // Collect all cache entries with timestamps
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('player_modal_') || key.includes('player_detail_'))) {
      try {
        const data = JSON.parse(sessionStorage.getItem(key) || '{}');
        entries.push({ key, timestamp: data.timestamp || 0 });
      } catch (err) {
        // Invalid JSON, remove it
        sessionStorage.removeItem(key);
      }
    }
  }

  // Sort by age (oldest first)
  entries.sort((a, b) => a.timestamp - b.timestamp);

  // Remove oldest N entries
  const toRemove = entries.slice(0, Math.min(count, entries.length));
  toRemove.forEach(entry => {
    sessionStorage.removeItem(entry.key);
  });

  console.log(`🗑️ Cleared ${toRemove.length} oldest caches to free space`);
}

/**
 * Get live game context from sports events
 */
export async function getLiveGameContext(): Promise<LiveGameContext> {
  try {
    // This would ideally call an API endpoint
    // For now, check if it's a game day
    const isGameDay = isNFLGameDay();
    
    if (!isGameDay) {
      return {
        hasLiveGames: false,
        liveGameCount: 0,
        recentGameCount: 0
      };
    }

    // During game day, assume there might be live games
    // In production, you'd query the database or API
    const now = new Date();
    const hour = now.getHours();
    
    // NFL games typically: 1pm ET (13), 4pm ET (16), 8pm ET (20)
    const isLikelyGameTime = (hour >= 13 && hour <= 23);

    return {
      hasLiveGames: isLikelyGameTime,
      liveGameCount: isLikelyGameTime ? 1 : 0,
      recentGameCount: 0
    };
  } catch (err) {
    console.error('Error getting live game context:', err);
    return {
      hasLiveGames: false,
      liveGameCount: 0,
      recentGameCount: 0
    };
  }
}

/**
 * Hook for React components to use smart caching
 */
export function useSmartCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    forceRefresh?: boolean;
    gameStatus?: GameStatus;
  }
): {
  data: T | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  // This would be implemented as a React hook
  // Placeholder for the concept
  return {
    data: null,
    loading: false,
    refresh: async () => {}
  };
}

/**
 * Invalidate cache for a specific player
 */
export function invalidatePlayerCache(playerId: string): void {
  if (typeof window === 'undefined') return;

  const patterns = [
    `player_modal_v5_${playerId}`,
    `player_detail_v5_${playerId}`,
    `player_modal_v4_${playerId}`, // Old version
    `player_detail_v4_${playerId}`  // Old version
  ];

  let removed = 0;
  patterns.forEach(pattern => {
    if (sessionStorage.getItem(pattern)) {
      sessionStorage.removeItem(pattern);
      removed++;
    }
  });

  if (removed > 0) {
    console.log(`🗑️ Invalidated ${removed} cache entries for player ${playerId}`);
  }
}

/**
 * Get cache age in seconds
 */
export function getCacheAge(key: string): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    const data = JSON.parse(cached);
    return (Date.now() - (data.timestamp || 0)) / 1000;
  } catch (err) {
    return null;
  }
}

/**
 * Is cache fresh enough?
 */
export function isCacheFresh(key: string, maxAgeSeconds: number): boolean {
  const age = getCacheAge(key);
  if (age === null) return false;
  return age < maxAgeSeconds;
}

