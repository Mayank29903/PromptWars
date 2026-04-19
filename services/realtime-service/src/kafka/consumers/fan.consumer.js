import { createConsumer } from '../client.js';
import { registerToken } from '../../state/token-state.js';

export async function startFanConsumer(io) {
  const consumer = await createConsumer('cg-ws-fan');
  await consumer.subscribe({ topic: 'fan.behavior.events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      let event;
      try {
        event = JSON.parse(message.value.toString());
      } catch (e) {
        return;
      }

      const { user_id, event_type } = event;
      if (!user_id) return;

      switch (event_type) {
        case 'POINTS_EARNED':
          io.of('/').to(`user:${user_id}`).emit('fan:points_earned', {
            points_earned: event.points_earned,
            action_type: event.action_type,
            new_balance: event.new_balance,
            multiplier: event.multiplier_applied,
            timestamp: event.timestamp
          });
          if (event.tier_upgraded) {
            io.of('/').to(`user:${user_id}`).emit('fan:tier_upgraded', {
              new_tier: event.new_tier,
              message: `Congratulations! You've reached ${event.new_tier} tier!`
            });
          }
          break;

        case 'TOKEN_REGISTERED':
          registerToken(user_id, event.queue_point_id, event.token_id);
          break;

        case 'REROUTE_SUGGESTION':
          io.of('/').to(`user:${user_id}`).emit('nav:reroute', {
            reason: event.reason,
            suggested_route: event.suggested_route,
            bonus_points: event.bonus_points,
            message: event.message
          });
          break;
      }
    }
  });

  console.log('[fan.consumer] Running — consuming fan.behavior.events');
}
