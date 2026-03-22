import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, RedisClientType } from 'redis';
import { Logger } from '@nestjs/common';

// Load .env before REDIS_URL is read (this module is imported early from main.ts).
config({ path: resolve(process.cwd(), '.env') });

const logger = new Logger('RedisProvider');

export const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 10_000,
    reconnectStrategy: (retries) => {
      if (retries > 8) return new Error('Redis reconnect limit reached');
      return Math.min(retries * 150, 3_000);
    },
  },
  // Do not queue commands forever while disconnected — avoids hung HTTP handlers.
  disableOfflineQueue: true,
}) as RedisClientType;

redisClient.on('error', (err) => {
  logger.debug('Redis Client Error', err);
});

redisClient
  .connect()
  .then(() => {
    logger.debug('✅ Redis connected successfully');
  })
  .catch((err) => {
    logger.warn('❌ Redis connection failed (app continues without cache):', err?.message ?? err);
  });
