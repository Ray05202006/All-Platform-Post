import { Redis } from '@upstash/redis';

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
    console.warn('Warning: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not defined in environment variables. Redis features will be bypassed.');
  }
}

export const redis =
  globalForRedis.redis ||
  (url && token
    ? new Redis({
        url,
        token,
      })
    : undefined);

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;
