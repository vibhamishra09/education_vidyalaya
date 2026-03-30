/* eslint-disable prettier/prettier */
 
 
 
 
import 'dotenv/config';
import { createClient, RedisClientType } from 'redis';
import { Logger } from '@nestjs/common';

const logger = new Logger('RedisProvider');
const redisUrl = process.env.REDIS_URL?.trim();

export const redisClient: RedisClientType = createClient({
  url: redisUrl,
}) as RedisClientType;

redisClient.on('error', (err) => {
  logger.debug('Redis Client Error', err);
});

// Auto-connect Redis when module is loaded
redisClient
  .connect()
  .then(() => {
    logger.debug('✅ Redis connected successfully');
  })
  .catch((err) => {
    logger.debug('❌ Redis connection failed:', err);
  });
