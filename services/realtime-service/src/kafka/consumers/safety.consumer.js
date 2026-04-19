import { createConsumer } from '../client.js';
import { redis } from '../../app.js';

export async function startSafetyConsumer(io) {
  const consumer = await createConsumer('cg-ws-safety');
  await consumer.subscribe({ topic: 'safety.alert.stream', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      let alert;
      try {
        alert = JSON.parse(message.value.toString());
      } catch (e) {
        return;
      }

      const { level, venue_id, zone_id, alert_id } = alert;

      if (level === 'EMERGENCY' || level === 'CRITICAL') {
        await redis.set('emergency:mode', 'active', 'EX', 21600);
        console.warn(`[safety.consumer] EMERGENCY activated — zone: ${zone_id}`);

        io.emit('safety:emergency', {
          alert_id,
          level,
          zone_id,
          venue_id,
          message: alert.message || 'Emergency in progress. Follow evacuation instructions.',
          timestamp: new Date().toISOString()
        });
        io.of('/safety').emit('alert:new', alert);
        io.of('/ops').to(`ops:${venue_id}`).emit('ai:suggestion', {
          type: 'EMERGENCY_DISPATCH',
          priority: 'CRITICAL',
          message: `EMERGENCY in Zone ${zone_id}. Dispatch all available security staff immediately.`,
          zone_id,
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (level === 'ALL_CLEAR') {
        await redis.del('emergency:mode');
        io.emit('safety:all_clear', { alert_id, zone_id, venue_id, timestamp: new Date().toISOString() });
        io.of('/safety').emit('all:clear', alert);
        console.log('[safety.consumer] Emergency cleared');
        return;
      }

      io.of('/safety').to(`venue:${venue_id}`).emit('alert:new', alert);
      io.of('/ops').to(`ops:${venue_id}`).emit('pressure:zone', alert);
    }
  });

  console.log('[safety.consumer] Running — consuming safety.alert.stream');
}
