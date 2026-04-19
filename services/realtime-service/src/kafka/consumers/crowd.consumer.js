import { createConsumer } from '../client.js';
import { computeDelta } from '../../utils/delta.js';
import { getZoneState, setZoneState } from '../../state/zone-state.js';

export async function startCrowdConsumer(io) {
  const consumer = await createConsumer('cg-ws-crowd');
  await consumer.subscribe({ topic: 'crowd.zone.state', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      let zoneData;
      try {
        zoneData = JSON.parse(message.value.toString());
      } catch (e) {
        console.error('[crowd.consumer] Invalid JSON:', e.message);
        return;
      }

      const { zone_id, venue_id } = zoneData;
      if (!zone_id || !venue_id) return;

      const previous = getZoneState(zone_id);
      setZoneState(zone_id, zoneData);

      const delta = computeDelta(previous, zoneData);
      if (delta) {
        io.of('/crowd').to(`zone:${zone_id}`).emit('zone:update', delta);
        io.of('/crowd').to(`venue:${venue_id}`).emit('zone:update', delta);
      }

      if (zoneData.alert_level === 'WARNING' || zoneData.alert_level === 'CRITICAL') {
        io.of('/crowd').to(`venue:${venue_id}`).emit('zone:alert', {
          zone_id,
          venue_id,
          alert_level: zoneData.alert_level,
          current_density: zoneData.current_density,
          crush_risk_score: zoneData.crush_risk_score,
          timestamp: zoneData.timestamp
        });
      }
    }
  });

  console.log('[crowd.consumer] Running — consuming crowd.zone.state');
}
