import { createConsumer } from '../client.js';

export async function startOpsConsumer(io) {
  const consumer = await createConsumer('cg-ws-ops');
  await consumer.subscribe({ topic: 'ops.staff.positions', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      let data;
      try {
        data = JSON.parse(message.value.toString());
      } catch (e) {
        return;
      }

      const { venue_id } = data;
      if (!venue_id) return;

      io.of('/ops').to(`ops:${venue_id}`).emit('staff:location', {
        staff_id: data.staff_id,
        coords: data.coords,
        floor: data.floor,
        status: data.status,
        current_task_id: data.current_task_id,
        timestamp: data.timestamp
      });
    }
  });

  console.log('[ops.consumer] Running — consuming ops.staff.positions');
}
