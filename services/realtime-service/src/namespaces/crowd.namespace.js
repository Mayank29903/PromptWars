import { authenticateSocket } from '../auth/socket-auth.js';
import { getAllZoneStates, needsFullSync, markFullSync, clearClientSync } from '../state/zone-state.js';

export function setupCrowdNamespace(io) {
  const crowd = io.of('/crowd');
  crowd.use(authenticateSocket);

  crowd.on('connection', (socket) => {
    const { userId, venueId } = socket.data;
    socket.join(`venue:${venueId}`);
    socket.join(`user:${userId}`);
    console.log(`[/crowd] connected: ${userId} (venue: ${venueId})`);

    const allZones = getAllZoneStates();
    if (allZones.length > 0) {
      socket.emit('heatmap:full', { zones: allZones, timestamp: new Date().toISOString() });
    }
    markFullSync(socket.id);

    socket.on('subscribe:zone', (zoneId) => {
      socket.join(`zone:${zoneId}`);
    });

    socket.on('unsubscribe:zone', (zoneId) => {
      socket.leave(`zone:${zoneId}`);
    });

    socket.on('disconnect', () => {
      clearClientSync(socket.id);
      console.log(`[/crowd] disconnected: ${userId}`);
    });
  });

  setInterval(() => {
    const allZones = getAllZoneStates();
    if (allZones.length === 0) return;
    const payload = { zones: allZones, timestamp: new Date().toISOString() };
    for (const [id, socket] of crowd.sockets) {
      if (needsFullSync(id)) {
        socket.emit('heatmap:full', payload);
        markFullSync(id);
      }
    }
  }, 60000);

  console.log('[Namespace] /crowd ready');
}
