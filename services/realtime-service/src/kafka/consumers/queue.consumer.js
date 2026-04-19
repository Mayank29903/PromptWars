import { createConsumer } from '../client.js';
import { computeQueueDelta } from '../../utils/delta.js';
import { getUsersForQueuePoint, removeToken } from '../../state/token-state.js';

const queueState = new Map();

export async function startQueueConsumer(io) {
  const consumer = await createConsumer('cg-ws-queue');
  await consumer.subscribe({ topic: 'queue.point.updates', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      let data;
      try {
        data = JSON.parse(message.value.toString());
      } catch (e) {
        return;
      }

      const { point_id, venue_id, event_type } = data;

      if (event_type === 'TOKEN_CALLED') {
        const { token_id, user_id, estimated_call_time, queue_point_id } = data;
        io.of('/queue').to(`user:${user_id}`).emit('token:called', {
          token_id,
          queue_point_id,
          estimated_call_time,
          message: 'Your turn is coming up! Head to the counter now.',
          grace_period_minutes: 5
        });
        setTimeout(() => {
          io.of('/queue').to(`user:${user_id}`).emit('token:expiring', {
            token_id,
            message: 'Your token expires in 1 minute!'
          });
        }, 4 * 60 * 1000);
        return;
      }

      if (['TOKEN_EXPIRED', 'TOKEN_USED', 'TOKEN_CANCELLED'].includes(event_type)) {
        if (data.user_id) removeToken(data.user_id, data.queue_point_id);
        return;
      }

      const previous = queueState.get(point_id);
      queueState.set(point_id, data);
      const delta = computeQueueDelta(previous, data);

      if (delta) {
        io.of('/queue').to(`venue:${venue_id}`).emit('point:update', delta);
        getUsersForQueuePoint(point_id).forEach(({ userId }) => {
          io.of('/queue').to(`user:${userId}`).emit('point:update', delta);
        });
      }
    }
  });

  console.log('[queue.consumer] Running — consuming queue.point.updates');
}
