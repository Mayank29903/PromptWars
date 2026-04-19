import Fastify from 'fastify';
import { config } from './config.js';
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import kafkaPlugin from './plugins/kafka.js';
import authMiddleware from './middleware/auth.js';
import crowdRoutes from './routes/crowd.js';
import queueRoutes from './routes/queue.js';
import navRoutes from './routes/nav.js';
import fanRoutes from './routes/fan.js';
import opsRoutes from './routes/ops.js';
import safetyRoutes from './routes/safety.js';
import predictRoutes from './routes/predict.js';
import aiRoutes from './routes/ai.js';
import authRoutes from './routes/auth.js';

const app = Fastify({
  logger: { level: config.env === 'production' ? 'info' : 'debug' },
  ajv: { customOptions: { removeAdditional: true } }
});

await app.register(import('@fastify/helmet'));
await app.register(import('@fastify/cors'), { origin: '*' });
await app.register(import('@fastify/rate-limit'), { max: config.rateLimit.max, timeWindow: config.rateLimit.timeWindow });
await app.register(import('@fastify/swagger'), { openapi: { info: { title: 'ANTIGRAVITY API', version: '1.0.0' } } });
await app.register(import('@fastify/swagger-ui'), { routePrefix: '/docs' });

await app.register(prismaPlugin);
await app.register(redisPlugin);
await app.register(kafkaPlugin);
await app.register(authMiddleware);

await app.register(authRoutes, { prefix: '/api/v1/auth' });
await app.register(crowdRoutes, { prefix: '/api/v1/crowd' });
await app.register(queueRoutes, { prefix: '/api/v1/queue' });
await app.register(navRoutes, { prefix: '/api/v1/nav' });
await app.register(fanRoutes, { prefix: '/api/v1/fan' });
await app.register(opsRoutes, { prefix: '/api/v1/ops' });
await app.register(safetyRoutes, { prefix: '/api/v1/safety' });
await app.register(predictRoutes, { prefix: '/api/v1/predict' });
await app.register(aiRoutes, { prefix: '/api/v1/ai' });

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  
  let statusCode = error.statusCode || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message;

  if (error.code === 'P2025') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (error.code === 'P2002') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'Unique constraint violation';
  }

  reply.status(statusCode).send({ success: false, error: message, code: code });
});

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`ANTIGRAVITY API running on port ${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
