import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn('REDIS_URL is not defined. Background jobs will not work.');
}

// Upstash Redis requires TLS - convert redis:// to rediss:// if needed
const isLocal = !redisUrl || redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1');
const connectionUrl = (redisUrl || 'redis://localhost:6379').replace('redis://', isLocal ? 'redis://' : 'rediss://');
const isUpstash = connectionUrl.includes('upstash.io');

export const redisConnection = new Redis(connectionUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  tls: (isUpstash || (!isLocal && connectionUrl.startsWith('rediss'))) ? {} : undefined,
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisConnection.on('connect', () => {
  console.log('Connected to Redis successfully');
});
