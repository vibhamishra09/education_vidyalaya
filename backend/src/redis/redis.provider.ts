/* eslint-disable prettier/prettier */
 
 
 
 
import 'dotenv/config';
import { createClient, RedisClientType } from 'redis';
import { Logger } from '@nestjs/common';

const logger = new Logger('RedisProvider');
const redisUrl = process.env.REDIS_URL?.trim();

if (!redisUrl && process.env.NODE_ENV === 'production') {
  logger.error('❌ REDIS_URL is not defined in production environment!');
}

export const redisClient: RedisClientType = createClient({
  url: redisUrl || 'redis://localhost:6379',
}) as RedisClientType;

redisClient.on('error', (err) => {
  // Only log full error if not a connection refused on localhost (to keep logs clean)
  if (!redisUrl && err.code === 'ECONNREFUSED') {
    return;
  }
  logger.error('Redis Client Error', err);
});

// Auto-connect Redis when module is loaded
redisClient
  .connect()
  .then(() => {
    logger.log(`✅ Redis connected successfully ${redisUrl ? '(Remote)' : '(Localhost)'}`);
  })
  .catch((err) => {
    logger.error('❌ Redis connection failed:', err.message);
  });
