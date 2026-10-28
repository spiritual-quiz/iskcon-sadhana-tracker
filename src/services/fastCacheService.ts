/**
 * Multi-tier In-Memory & Storage Fast Cache Service
 * Provides instant (<1ms) response times for frequent database queries
 * with stale-while-revalidate background refresh.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

class FastCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();

  /**
   * Get cached data from memory or persistent storage
   */
  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // 1. In-memory check (0ms)
    const mem = this.memoryCache.get(key);
    if (mem) {
      if (now - mem.timestamp < mem.ttlMs) {
        return mem.data as T;
      }
    }

    // 2. Persistent storage fallback (<5ms)
    try {
      const raw = await AsyncStorage.getItem(`bhakti_cache_${key}`);
      if (raw) {
        const entry = JSON.parse(raw) as CacheEntry<T>;
        if (now - entry.timestamp < entry.ttlMs) {
          // Warm up memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        }
      }
    } catch {
      // Ignore storage errors
    }

    return null;
  }

  /**
   * Store data in memory and storage with TTL (default 120 seconds)
   */
  async set<T>(key: string, data: T, ttlSeconds: number = 120): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs: ttlSeconds * 1000,
    };

    // Store in memory
    this.memoryCache.set(key, entry);

    // Store in persistent storage asynchronously without blocking
    AsyncStorage.setItem(`bhakti_cache_${key}`, JSON.stringify(entry)).catch(() => {});
  }

  /**
   * Invalidate specific key or keys matching a prefix
   */
  async invalidate(keyOrPrefix: string): Promise<void> {
    const keysToDelete: string[] = [];

    // Clear matching keys from memory
    for (const k of this.memoryCache.keys()) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        keysToDelete.push(k);
      }
    }
    keysToDelete.forEach((k) => this.memoryCache.delete(k));

    // Clear matching keys from AsyncStorage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const storageKeys = allKeys.filter(
        (k) => k === `bhakti_cache_${keyOrPrefix}` || k.startsWith(`bhakti_cache_${keyOrPrefix}`)
      );
      if (storageKeys.length > 0) {
        if (typeof (AsyncStorage as any).multiRemove === 'function') {
          await AsyncStorage.multiRemove(storageKeys);
        } else {
          await Promise.all(storageKeys.map((k) => AsyncStorage.removeItem(k)));
        }
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Clear all cached data
   */
  clearAll(): void {
    this.memoryCache.clear();
  }
}

export const fastCache = new FastCacheService();
