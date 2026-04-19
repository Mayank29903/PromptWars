import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import Redis from 'ioredis';
import { setupCrowdNamespace } from './namespaces/crowd.namespace.js';
import { setupQueueNamespace } from './namespaces/queue.namespace.js';
import { setupSafetyNamespace } from './namespaces/safety.namespace.js';
import { setupOpsNamespace } from './namespaces/ops.namespace.js';
import { startCrowdConsumer } from './kafka/consumers/crowd.consumer.js';
import { startQueueConsumer } from './kafka/consumers/queue.consumer.js';
import { startSafetyConsumer } from './kafka/consumers/safety.consumer.js';
import { startFanConsumer } from './kafka/consumers/fan.consumer.js';
import { startOpsConsumer } from './kafka/consumers/ops.consumer.js';

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connections: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

export const io = new Server(httpServer, {
  cors: { origin: config.cors.origins, methods: ['GET', 'POST'] },
  pingInterval: 25000,
  pingTimeout: 60000,
  transports: ['websocket', 'polling']
});

export const redis = new Redis(config.redis.url);
redis.on('error', (err) => console.error('[Redis] error:', err.message));
redis.on('connect', () => console.log('[Redis] connected'));

setupCrowdNamespace(io);
setupQueueNamespace(io);
setupSafetyNamespace(io);
setupOpsNamespace(io);

await startCrowdConsumer(io);
await startQueueConsumer(io);
await startSafetyConsumer(io);
await startFanConsumer(io);
await startOpsConsumer(io);

httpServer.listen(config.port, config.host, () => {
  console.log(`[Realtime] Socket.IO listening on port ${config.port}`);
});

process.on('SIGTERM', async () => {
  console.log('[Realtime] SIGTERM received — shutting down gracefully');
  await redis.quit();
  httpServer.close(() => process.exit(0));
});
