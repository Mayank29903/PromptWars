import { authenticateSocket } from '../auth/socket-auth.js';

export function setupQueueNamespace(io) {
  const queue = io.of('/queue');
  queue.use(authenticateSocket);

  queue.on('connection', (socket) => {
    const { userId, venueId } = socket.data;
    socket.join(`venue:${venueId}`);
    socket.join(`user:${userId}`);
    console.log(`[/queue] connected: ${userId}`);

    socket.on('request:status', () => {
      socket.emit('queue:ack', {
        message: `Subscribed to queue updates for venue ${venueId}`
      });
    });

    socket.on('disconnect', () => {
      console.log(`[/queue] disconnected: ${userId}`);
    });
  });

  console.log('[Namespace] /queue ready');
}
