import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import http from 'http';

// ── Config ────────────────────────────────────────────────────────────
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const REDIS_URL     = process.env.REDIS_URL || 'redis://localhost:6379';
const PUBLISH_INTERVAL_MS = 5000;
const PORT = parseInt(process.env.PORT || '3002', 10);

// ── Zone definitions (area in sq-metres used for person_count) ───────
const ZONES = [
  { zone_id: 'north_stand',  area: 1200 },
  { zone_id: 'south_stand',  area: 1200 },
  { zone_id: 'east_stand',   area: 900  },
  { zone_id: 'west_stand',   area: 900  },
  { zone_id: 'gate_nw',      area: 300  },
  { zone_id: 'gate_ne',      area: 300  },
  { zone_id: 'gate_sw',      area: 300  },
  { zone_id: 'gate_se',      area: 300  },
  { zone_id: 'food_court',   area: 600  }
];

// ── Sensor Simulator with EMA smoothing (alpha=0.3) ──────────────────
class SensorSimulator {
  constructor() {
    this.tick  = 0;
    // EMA state: track smoothed density per zone
    this.ema   = {};
    for (const z of ZONES) this.ema[z.zone_id] = 0.4;
  }

  /** Sine-wave base density with noise, with east_stand peaking at tick 12 */
  _rawDensity(zoneId) {
    const phase = zoneId === 'east_stand'
      ? Math.sin((this.tick - 12) * (Math.PI / 20))   // peaks at tick 12
      : Math.sin(this.tick * (Math.PI / 24));          // general crowd flow

    const base  = 0.55 + phase * 0.35;
    const noise = (Math.random() - 0.5) * 0.08;
    return Math.max(0.05, Math.min(1.0, base + noise));
  }

  /** EMA smoothing — simulates Kalman Filter sensor fusion step */
  _smooth(zoneId, raw) {
    const alpha = 0.3;
    const smoothed = alpha * raw + (1 - alpha) * this.ema[zoneId];
    this.ema[zoneId] = smoothed;
    return smoothed;
  }

  generate() {
    this.tick++;
    const readings = [];

    for (const z of ZONES) {
      const raw      = this._rawDensity(z.zone_id);
      const density  = parseFloat(this._smooth(z.zone_id, raw).toFixed(4));
      // Velocity is inversely correlated: dense zones move slower
      const velocity = parseFloat((1.5 * (1 - density) + 0.1).toFixed(3));

      readings.push({
        zone_id:          z.zone_id,
        current_density:  density,
        avg_velocity_mps: velocity,
        person_count:     Math.round(density * z.area),
        tick:             this.tick,
        timestamp:        new Date().toISOString(),
        sensor_type:      'SIMULATED_BLE'
      });
    }

    return readings;
  }
}

// ── Kafka + Redis clients ────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'edge-processor',
  brokers:  KAFKA_BROKERS,
  retry: { initialRetryTime: 1000, retries: 10 }
});
const producer = kafka.producer();
const redis    = new Redis(REDIS_URL);
const sim      = new SensorSimulator();

let publishCount = 0;
let lastReadings  = [];

async function publishReadings() {
  const readings = sim.generate();
  lastReadings   = readings;

  const messages = readings.map(r => ({
    key:   r.zone_id,
    value: JSON.stringify(r)
  }));

  // Publish batch to Kafka
  await producer.send({
    topic:    'crowd.density.updates',
    messages
  });

  // Update Redis (30-second TTL per zone)
  const pipeline = redis.pipeline();
  for (const r of readings) {
    pipeline.set(`zone:density:${r.zone_id}`, JSON.stringify(r), 'EX', 30);
  }
  await pipeline.exec();

  publishCount++;

  // Summary log
  const summary = readings
    .map(r => `${r.zone_id.padEnd(12)} ${(r.current_density * 100).toFixed(1)}%`)
    .join('  ');
  console.log(`[${new Date().toISOString()}] tick=${sim.tick} | ${summary}`);
}

// ── Health HTTP server ────────────────────────────────────────────────
function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status:       'ok',
        service:      'edge-processor',
        tick:         sim.tick,
        publishCount,
        lastReadings: lastReadings.map(r => ({ zone_id: r.zone_id, density: r.current_density }))
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    console.log(`[edge-processor] Health server listening on port ${PORT}`);
  });
}

// ── Boot ──────────────────────────────────────────────────────────────
async function main() {
  console.log('[edge-processor] Connecting to Kafka...');
  await producer.connect();
  console.log('[edge-processor] Connected. Starting sensor simulation every 5s...');

  startHealthServer();

  // First publish immediately, then every 5s
  await publishReadings();
  setInterval(publishReadings, PUBLISH_INTERVAL_MS);
}

main().catch(err => {
  console.error('[edge-processor] Fatal error:', err);
  process.exit(1);
});
