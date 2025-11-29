import { createClient, RedisClientType } from 'redis';

export const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL,
}) as RedisClientType;

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// Auto-connect Redis when module is loaded
redisClient
  .connect()
  .then(() => {
    console.log('✅ Redis connected successfully');
  })
  .catch((err) => {
    console.error('❌ Redis connection failed:', err);
  });
