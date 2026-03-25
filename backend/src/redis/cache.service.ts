import { Injectable } from '@nestjs/common';
import { redisClient } from './redis.provider';
import { LoggerService } from '../common/logger';

@Injectable()
export class CacheService {
  private readonly defaultTTL = 300; // 5 minutes default TTL
  // Track in-flight requests to prevent cache stampede
  private readonly inFlightRequests = new Map<string, Promise<any>>();

  // Memory management thresholds (256 MB limit for free tier)
  private readonly MEMORY_WARNING_THRESHOLD_MB = 200; // 200 MB (78% of 256 MB)
  private readonly MEMORY_CRITICAL_THRESHOLD_MB = 230; // 230 MB (90% of 256 MB)
  private readonly MAX_MEMORY_MB = 256;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(CacheService.name);
  }

  /**
   * Generate a cache key from a prefix and parameters
   */
  private generateCacheKey(
    prefix: string,
    params?: Record<string, any>,
  ): string {
    if (!params || Object.keys(params).length === 0) {
      return prefix;
    }

    // Sort keys to ensure consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => {
        const value = params[key];
        // Handle arrays and objects
        if (Array.isArray(value)) {
          return `${key}:${value.sort().join(',')}`;
        }
        if (typeof value === 'object' && value !== null) {
          return `${key}:${JSON.stringify(value)}`;
        }
        return `${key}:${value}`;
      })
      .join('|');

    return `${prefix}:${sortedParams}`;
  }

  /**
   * Check if Redis is connected
   */
  private async isRedisConnected(): Promise<boolean> {
    try {
      // Try a simple ping to check connection
      await redisClient.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check if Redis is connected before attempting to use it
      if (!(await this.isRedisConnected())) {
        this.logger.warn(`Redis not connected, skipping cache for key: ${key}`);
        return null;
      }

      const cached = await redisClient.get(key);
      if (cached) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(cached) as T;
      }
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.warn(
        `Cache get error for key ${key}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null; // Return null on error to allow fallback to database
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      // Check if Redis is connected before attempting to use it
      if (!(await this.isRedisConnected())) {
        this.logger.warn(
          `Redis not connected, skipping cache set for key: ${key}`,
        );
        return;
      }

      const ttl = ttlSeconds ?? this.defaultTTL;
      const serialized = JSON.stringify(value);
      await redisClient.setEx(key, ttl, serialized);
      this.logger.debug(`Cached value for key: ${key} with TTL: ${ttl}s`);
    } catch (error) {
      this.logger.warn(
        `Cache set error for key ${key}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - caching failures shouldn't break the app
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await redisClient.del(key);
      this.logger.debug(`Deleted cache key: ${key}`);
    } catch (error) {
      this.logger.warn(
        `Cache delete error for key ${key}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        this.logger.debug(
          `Deleted ${keys.length} cache keys matching pattern: ${pattern}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Cache deletePattern error for pattern ${pattern}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Get or set a value using a callback function
   * This is the main method to use for caching database queries
   *
   * Implements request deduplication to prevent cache stampede:
   * - If multiple requests come in for the same key simultaneously
   * - Only one will fetch from database, others wait for that result
   */
  async getOrSet<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Check if there's already an in-flight request for this key
    const existingRequest = this.inFlightRequests.get(cacheKey);
    if (existingRequest) {
      this.logger.debug(
        `Deduplicating request for key: ${cacheKey} (waiting for in-flight request)`,
      );
      try {
        return await existingRequest;
      } catch (error) {
        // If the in-flight request failed, we'll try again below
        this.inFlightRequests.delete(cacheKey);
        throw error;
      }
    }

    // Create a new promise for this request
    const requestPromise = (async () => {
      try {
        // Cache miss - fetch from database
        const value = await fetchFn();

        // Store in cache
        await this.set(cacheKey, value, ttlSeconds);

        return value;
      } finally {
        // Remove from in-flight map when done (success or failure)
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    // Store the promise so other concurrent requests can wait for it
    this.inFlightRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  /**
   * Helper method to create a cache key with prefix and params
   */
  createKey(prefix: string, params?: Record<string, any>): string {
    return this.generateCacheKey(prefix, params);
  }

  /**
   * Get current Redis memory usage in MB
   */
  async getMemoryUsage(): Promise<number> {
    try {
      if (!(await this.isRedisConnected())) {
        return 0;
      }

      const info = await redisClient.info('memory');
      // Parse used_memory_human or used_memory
      const usedMemoryMatch = info.match(/used_memory:(\d+)/);
      if (usedMemoryMatch) {
        const bytes = parseInt(usedMemoryMatch[1], 10);
        return bytes / (1024 * 1024); // Convert to MB
      }
      return 0;
    } catch (error) {
      this.logger.warn(
        'Failed to get Redis memory usage:',
        error instanceof Error ? error.message : String(error),
      );
      return 0;
    }
  }

  /**
   * Check if memory usage is approaching limits
   */
  async checkMemoryStatus(): Promise<{
    usageMB: number;
    percentage: number;
    status: 'ok' | 'warning' | 'critical';
  }> {
    const usageMB = await this.getMemoryUsage();
    const percentage = (usageMB / this.MAX_MEMORY_MB) * 100;

    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (usageMB >= this.MEMORY_CRITICAL_THRESHOLD_MB) {
      status = 'critical';
    } else if (usageMB >= this.MEMORY_WARNING_THRESHOLD_MB) {
      status = 'warning';
    }

    return { usageMB, percentage, status };
  }

  /**
   * Evict debate transcript keys to free memory
   * Prioritizes oldest/least recently used keys
   */
  async evictDebateTranscripts(maxKeysToEvict: number = 10): Promise<number> {
    try {
      if (!(await this.isRedisConnected())) {
        return 0;
      }

      // Find all debate transcript keys
      const pattern = 'debate:*:transcripts';
      const keys = await redisClient.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      // Get TTL for each key to prioritize eviction (evict keys with longer TTL first, or expired)
      const keysWithTTL = await Promise.all(
        keys.map(async (key) => {
          const ttl = await redisClient.ttl(key);
          return { key, ttl };
        }),
      );

      // Sort by TTL (longer TTL = more time left = lower priority, so evict first)
      // Also prioritize keys that are close to expiration (negative TTL means expired)
      keysWithTTL.sort((a, b) => {
        // Expired keys first
        if (a.ttl < 0 && b.ttl >= 0) return -1;
        if (a.ttl >= 0 && b.ttl < 0) return 1;
        // Then by TTL (longer TTL = evict first)
        return b.ttl - a.ttl;
      });

      // Evict the specified number of keys
      const keysToEvict = keysWithTTL
        .slice(0, maxKeysToEvict)
        .map((k) => k.key);

      if (keysToEvict.length > 0) {
        await redisClient.del(keysToEvict);
        this.logger.warn(
          `Evicted ${keysToEvict.length} debate transcript keys to free memory. Keys: ${keysToEvict.slice(0, 3).join(', ')}${keysToEvict.length > 3 ? '...' : ''}`,
        );
      }

      return keysToEvict.length;
    } catch (error) {
      this.logger.warn(
        'Failed to evict debate transcripts:',
        error instanceof Error ? error.message : String(error),
      );
      return 0;
    }
  }

  /**
   * Evict old cache entries when memory is high
   * Automatically called before setting large values
   */
  async evictIfNeeded(): Promise<void> {
    const status = await this.checkMemoryStatus();

    if (status.status === 'critical') {
      this.logger.warn(
        `Redis memory usage is critical: ${status.usageMB.toFixed(2)} MB (${status.percentage.toFixed(1)}%). Evicting debate transcripts...`,
      );
      // Evict more aggressively when critical
      await this.evictDebateTranscripts(20);
    } else if (status.status === 'warning') {
      this.logger.warn(
        `Redis memory usage is high: ${status.usageMB.toFixed(2)} MB (${status.percentage.toFixed(1)}%). Evicting old debate transcripts...`,
      );
      // Evict moderately when warning
      await this.evictDebateTranscripts(10);
    }
  }

  /**
   * Set a value in cache with memory-aware eviction
   * Automatically evicts old entries if memory is high
   */
  async setWithMemoryCheck<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<void> {
    // Check memory before setting large values (debate transcripts)
    if (key.includes('debate:') && key.includes(':transcripts')) {
      await this.evictIfNeeded();
    }

    await this.set(key, value, ttlSeconds);
  }
}
