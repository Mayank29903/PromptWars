/**
 * Tests for GET /status queue route.
 * Validates status derivation logic: OPEN / BUSY / OVERLOADED / CLOSED.
 */
import { describe, it, expect, vi } from 'vitest';
import queueRoutes from '../queue.js';

// ── Mock factory ─────────────────────────────────────────────────────

function createMockFastify({ waitTime = '5', closedFlag = null }) {
  const redisStore = {};

  const mockFastify = {
    authenticate: async () => {},
    requireRole: () => async () => {},
    prisma: {
      queuePoint: {
        findMany: vi.fn(async () => [
          { id: 'qp-1', name: 'Gate A', type: 'ENTRY', venueId: 'v1' },
          { id: 'qp-2', name: 'Food West', type: 'FOOD', venueId: 'v1' },
        ]),
        findUnique: vi.fn(async () => null),
      },
      virtualToken: {
        findFirst: vi.fn(async () => null),
        count: vi.fn(async () => 0),
        create: vi.fn(async (d) => ({ id: 'tok-1', ...d.data })),
        update: vi.fn(async () => ({})),
      },
    },
    redis: {
      get: vi.fn(async (key) => {
        if (key.startsWith('queue:closed:')) return closedFlag;
        if (key.startsWith('queue:wait:')) return waitTime;
        return redisStore[key] || null;
      }),
      set: vi.fn(async (k, v) => { redisStore[k] = v; }),
      zcard: vi.fn(async () => 3),
      zadd: vi.fn(async () => {}),
      zrem: vi.fn(async () => {}),
      zrank: vi.fn(async () => null),
      scan: vi.fn(async () => ['0', []]),
    },
    publishEvent: vi.fn(async () => {}),
    log: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    // Fastify route registration capture
    _routes: {},
    get(path, optsOrHandler, handler) {
      const h = handler || optsOrHandler;
      this._routes[`GET ${path}`] = h;
    },
    post(path, optsOrHandler, handler) {
      const h = handler || optsOrHandler;
      this._routes[`POST ${path}`] = h;
    },
    delete(path, optsOrHandler, handler) {
      const h = handler || optsOrHandler;
      this._routes[`DELETE ${path}`] = h;
    },
  };

  return mockFastify;
}

async function getStatusHandler(overrides = {}) {
  const fastify = createMockFastify(overrides);
  await queueRoutes(fastify);
  const handler = fastify._routes['GET /status'];
  const result = await handler({ query: {}, user: { userId: 'u1' } }, {});
  return result;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('GET /status', () => {
  it('returns success with array of 2 queue points', async () => {
    const result = await getStatusHandler({ waitTime: '5' });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(2);
    for (const item of result.data) {
      expect(item).toHaveProperty('wait_time_minutes');
      expect(item).toHaveProperty('virtual_length');
      expect(item).toHaveProperty('status');
    }
  });

  it('returns OPEN when wait time is under 10', async () => {
    const result = await getStatusHandler({ waitTime: '5' });
    for (const item of result.data) {
      expect(item.status).toBe('OPEN');
    }
  });

  it('returns BUSY when wait time is 10-19', async () => {
    const result = await getStatusHandler({ waitTime: '15' });
    for (const item of result.data) {
      expect(item.status).toBe('BUSY');
    }
  });

  it('returns OVERLOADED when wait time is 20+', async () => {
    const result = await getStatusHandler({ waitTime: '22' });
    for (const item of result.data) {
      expect(item.status).toBe('OVERLOADED');
    }
  });

  it('returns CLOSED when flag is set regardless of wait time', async () => {
    const result = await getStatusHandler({ waitTime: '5', closedFlag: '1' });
    for (const item of result.data) {
      expect(item.status).toBe('CLOSED');
    }
  });
});
