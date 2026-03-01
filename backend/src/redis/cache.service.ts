import { Injectable } from '@nestjs/common';
import { redisClient } from './redis.provider';
import { LoggerService } from '../common/logger';

@Injectable()
export class CacheService {
  private readonly defaultTTL = 300; // 5 minutes default TTL
  // Track in-flight requests to prevent cache stampede
  private readonly inFlightRequests = new Map<string, Promise<any>>();

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(CacheService.name);
  }

  /**
   * Generate a cache key from a prefix and parameters
   */
  private generateCacheKey(prefix: string, params?: Record<string, any>): string {
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
      this.logger.warn(`Cache get error for key ${key}:`, error instanceof Error ? error.message : String(error));
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
        this.logger.warn(`Redis not connected, skipping cache set for key: ${key}`);
        return;
      }

      const ttl = ttlSeconds ?? this.defaultTTL;
      const serialized = JSON.stringify(value);
      await redisClient.setEx(key, ttl, serialized);
      this.logger.debug(`Cached value for key: ${key} with TTL: ${ttl}s`);
    } catch (error) {
      this.logger.warn(`Cache set error for key ${key}:`, error instanceof Error ? error.message : String(error));
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
      this.logger.warn(`Cache delete error for key ${key}:`, error instanceof Error ? error.message : String(error));
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
        this.logger.debug(`Deleted ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.warn(`Cache deletePattern error for pattern ${pattern}:`, error instanceof Error ? error.message : String(error));
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
      this.logger.debug(`Deduplicating request for key: ${cacheKey} (waiting for in-flight request)`);
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
}
