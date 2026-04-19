import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { config } from '../config.js';

async function redisPlugin(fastify) {
  const redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: false
  });

  redis.on('error', (err) => fastify.log.error('Redis error:', err));
  redis.on('connect', () => fastify.log.info('Redis connected'));
  redis.on('reconnecting', () => fastify.log.warn('Redis reconnecting...'));

  await redis.ping();

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
}

export default fp(redisPlugin, { name: 'redis' });
