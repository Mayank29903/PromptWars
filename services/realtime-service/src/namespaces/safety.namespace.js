import { redis } from '../app.js';
import { authenticateSocket } from '../auth/socket-auth.js';

export function setupSafetyNamespace(io) {
  const safety = io.of('/safety');

  safety.use(async (socket, next) => {
    const emergencyMode = await redis.get('emergency:mode');
    if (emergencyMode === 'active') {
      socket.data.userId  = 'anonymous';
      socket.data.role    = 'ATTENDEE';
      socket.data.venueId = socket.handshake.query.venue_id || 'default';
      return next();
    }
    authenticateSocket(socket, next);
  });

  safety.on('connection', (socket) => {
    const { venueId } = socket.data;
    socket.join(`venue:${venueId}`);
    console.log(`[/safety] connected: ${socket.data.userId}`);

    socket.on('request:evacuation_routes', ({ zone_id }) => {
      socket.emit('evacuation:requested', { zone_id, message: 'Fetching routes...' });
    });

    socket.on('disconnect', () => {
      console.log(`[/safety] disconnected: ${socket.data.userId}`);
    });
  });

  console.log('[Namespace] /safety ready (emergency-bypass enabled)');
}
