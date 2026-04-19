import { Kafka } from 'kafkajs';
import http from 'http';

// ── Config ────────────────────────────────────────────────────────────
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const PORT          = parseInt(process.env.PORT || '3003', 10);

// ── Rate Limiter ──────────────────────────────────────────────────────
// Tracks per-user notification count within a sliding 60-second window
class RateLimiter {
  constructor(maxPerMinute = 3) {
    this.maxPerMinute = maxPerMinute;
    this.log = new Map(); // userId → [timestamp, ...]
  }

  allow(userId) {
    if (!userId) return true; // anonymous always allowed
    const now    = Date.now();
    const cutoff = now - 60_000;
    const times  = (this.log.get(userId) || []).filter(t => t > cutoff);

    if (times.length >= this.maxPerMinute) return false;

    times.push(now);
    this.log.set(userId, times);
    return true;
  }
}

// ── Notification Queue (in-memory, last 100) ──────────────────────────
class NotificationQueue {
  constructor(capacity = 100) {
    this.capacity = capacity;
    this.items    = [];
  }

  push(notification) {
    this.items.unshift({ ...notification, timestamp: new Date().toISOString() });
    if (this.items.length > this.capacity) this.items.pop();
  }

  recent(limit = 20) {
    return this.items.slice(0, Math.min(limit, this.items.length));
  }
}

const queue   = new NotificationQueue();
const limiter = new RateLimiter(3);

// ── Notification handlers ─────────────────────────────────────────────
function processSafetyAlert(data) {
  const { zone_id, level, user_id = null } = data;
  if (!['CRITICAL', 'WARNING'].includes(level)) return;
  if (!limiter.allow(user_id)) return;

  const notification = {
    type:    'SAFETY',
    user_id,
    payload: {
      title: 'Safety Alert',
      body:  `Zone ${zone_id} requires attention. Please follow staff instructions.`,
      data:  { type: 'SAFETY', zone_id, level }
    }
  };

  queue.push(notification);
  console.log(`🚨 [SAFETY] ${level} — Zone ${zone_id}${user_id ? ` → user ${user_id}` : ' → broadcast'}`);
}

function processFanEvent(data) {
  const { event_type, user_id, points, action_type, new_balance, new_tier } = data;

  if (!limiter.allow(user_id)) return;

  let notification;

  if (event_type === 'POINTS_EARNED') {
    notification = {
      type:    'POINTS',
      user_id,
      payload: {
        title: 'Points Earned! 🎮',
        body:  `You earned ${points} FanPulse points for ${action_type}`,
        data:  { type: 'POINTS', points, new_balance }
      }
    };
    console.log(`🎮 [POINTS] user=${user_id} +${points}pts (${action_type}) → bal ${new_balance}`);

  } else if (event_type === 'TIER_UPGRADE') {
    notification = {
      type:    'TIER_UPGRADE',
      user_id,
      payload: {
        title: 'Tier Upgrade! 🏆',
        body:  `Congratulations! You reached ${new_tier} tier!`,
        data:  { type: 'TIER_UPGRADE', new_tier }
      }
    };
    console.log(`🏆 [TIER] user=${user_id} → ${new_tier}`);
  }

  if (notification) queue.push(notification);
}

// ── Kafka Consumer ────────────────────────────────────────────────────
const kafka    = new Kafka({
  clientId: 'notification-service',
  brokers:  KAFKA_BROKERS,
  retry: { initialRetryTime: 1000, retries: 10 }
});
const consumer = kafka.consumer({ groupId: 'notification-service-group' });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topics: ['safety.alert.stream', 'fan.behavior.events'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      let data;
      try {
        data = JSON.parse(message.value.toString());
      } catch (e) {
        console.error('[notification-service] Failed to parse message:', e.message);
        return;
      }

      if (topic === 'safety.alert.stream') {
        processSafetyAlert(data);
      } else if (topic === 'fan.behavior.events') {
        processFanEvent(data);
      }
    }
  });
}

// ── HTTP server ───────────────────────────────────────────────────────
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status:  'ok',
        service: 'notification-service',
        queued:  queue.items.length
      }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/notifications/recent') {
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: queue.recent(limit) }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, () => {
    console.log(`[notification-service] HTTP server on port ${PORT}`);
  });
}

// ── Boot ──────────────────────────────────────────────────────────────
async function main() {
  console.log('[notification-service] Connecting to Kafka...');
  await startConsumer();
  console.log('[notification-service] Consumer subscribed to safety.alert.stream + fan.behavior.events');
  startServer();
}

main().catch(err => {
  console.error('[notification-service] Fatal error:', err);
  process.exit(1);
});
