import { authenticateSocket, requireManagerRole } from '../auth/socket-auth.js';

export function setupOpsNamespace(io) {
  const ops = io.of('/ops');
  ops.use(authenticateSocket);
  ops.use(requireManagerRole);

  ops.on('connection', (socket) => {
    const { userId, venueId, role } = socket.data;
    socket.join(`ops:${venueId}`);
    console.log(`[/ops] connected: ${userId} (${role})`);

    socket.on('request:dashboard', () => {
      socket.emit('ops:ack', {
        message: `Subscribed to ops feed for venue ${venueId}`,
        role
      });
    });

    socket.on('dispatch:task', (taskData) => {
      socket.to(`ops:${venueId}`).emit('task:dispatched', {
        ...taskData,
        dispatched_by: userId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log(`[/ops] disconnected: ${userId}`);
    });
  });

  console.log('[Namespace] /ops ready (manager-only)');
}
