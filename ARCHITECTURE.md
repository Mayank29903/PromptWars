# ANTIGRAVITY — Technical Architecture Reference

> Deep technical documentation for developers and judges. For a high-level overview, see [README.md](./README.md).

---

## Data Flow

```
┌──────────┐    ┌─────────────────┐    ┌──────────────────────────────────┐
│  Sensors │───►│  Edge Processor │───►│         Apache Kafka             │
│ BLE/LIDAR│    │ EMA smoothing   │    │ (KRaft, 5 topics, 3 partitions) │
└──────────┘    │ α=0.3 Kalman    │    └──────────┬───────────────────────┘
                │   ↓ Redis SET   │               │
                │ zone:density:*  │               │
                └─────────────────┘               │
                                    ┌─────────────┴──────────────────────┐
                                    │              Consumers             │
                                    │                                    │
                    ┌───────────────┼───────────────┬────────────────┐   │
                    ▼               ▼               ▼                ▼   │
             ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────┐│
             │ Safety   │  │ Realtime Svc │  │ Notif.   │  │ Fan Pulse ││
             │ Service  │  │ (Socket.IO)  │  │ Service  │  │ Service   ││
             │          │  │              │  │          │  │           ││
             │ Crush    │  │ Delta comp.  │  │ Push     │  │ Points    ││
             │ Detect   │  │ WebSocket    │  │ Queue    │  │ Engine    ││
             └────┬─────┘  └──────┬───────┘  └──────────┘  └───────────┘│
                  │               │                                      │
                  ▼               ▼                                      │
             ┌─────────┐   ┌──────────┐                                  │
             │  Redis  │   │Dashboard │   ┌──────────────┐               │
             │ (state) │   │ + Mobile │   │  PostgreSQL  │◄──────────────┘
             └─────────┘   │   PWA    │   │  (Prisma ORM)│
                           └──────────┘   └──────────────┘
```

---

## Kafka Topic Reference

All topics use 3 partitions and replication factor 1 (dev). Messages are JSON-encoded.

| Topic | Producer(s) | Consumer(s) | Key | Payload Fields |
|-------|------------|-------------|-----|---------------|
| `crowd.density.updates` | edge-processor | realtime-service, safety-service | `zone_id` (string) | `zone_id`, `current_density` (float), `avg_velocity_mps` (float), `person_count` (int), `timestamp` (ISO), `sensor_type` (string) |
| `safety.alert.stream` | safety-service | realtime-service, notification-service | `zone_id` (string) | `zone_id`, `venue_id`, `level` (CAUTION\|WARNING\|CRITICAL), `crush_risk_score` (float), `density`, `velocity`, `timestamp` |
| `fan.behavior.events` | fan-pulse-service | realtime-service, notification-service | `user_id` (string) | `event_type` (POINTS_EARNED\|TIER_UPGRADE), `user_id`, `points` (int), `action_type` (string), `new_balance` (int), `new_tier` (string) |
| `queue.updates` | api-gateway | realtime-service | `queue_point_id` (string) | `queue_point_id`, `current_wait_minutes` (float), `virtual_length` (int), `status` (OPEN\|BUSY\|OVERLOADED\|CLOSED) |
| `ops.incidents` | api-gateway | realtime-service, notification-service | `incident_id` (string) | `incident_id`, `type` (IncidentType), `severity` (Severity), `zone_id`, `status`, `timestamp` |

---

## Socket.IO Namespace Reference

All namespaces require JWT authentication via `socket.auth.token`. Emergency auth bypass reads `emergency:mode` from Redis.

| Namespace | Event Name | Direction | Payload Shape |
|-----------|-----------|-----------|--------------|
| `/crowd` | `density:update` | Server → Client | `{ zone_id, current_density, velocity, trend, timestamp }` |
| `/crowd` | `density:batch` | Server → Client | `{ zones: [{ zone_id, density, delta }...] }` (delta compressed) |
| `/queue` | `queue:update` | Server → Client | `{ queue_point_id, wait_minutes, virtual_length, status }` |
| `/queue` | `token:called` | Server → Client | `{ token_id, queue_point_id, position }` |
| `/safety` | `alert:new` | Server → Client | Full `SafetyAlertSchema` object |
| `/safety` | `emergency:activate` | Server → Client | `{ active: true, evac_routes: [...], timestamp }` |
| `/safety` | `emergency:deactivate` | Server → Client | `{ active: false }` |
| `/ops` | `incident:new` | Server → Client | Full `IncidentSchema` object |
| `/ops` | `staff:dispatched` | Server → Client | `{ task_id, staff_id, zone_id }` |

---

## Redis Key Schema

| Key Pattern | Data Type | TTL | Description |
|-------------|----------|-----|-------------|
| `zone:density:{zone_id}` | JSON string | 30s | Latest sensor reading per zone (set by edge-processor) |
| `queue:wait:{queue_point_id}` | Integer string | 60s | Current wait time in minutes per queue point |
| `queue:{queue_point_id}` | JSON string | none | Queue metadata (status, virtual length, servers) |
| `emergency:mode` | String (`"true"`) | none | Global emergency flag — bypasses auth on safety WS |
| `leaderboard:{event_id}` | Sorted Set | none | FanPulse leaderboard (member=user_id, score=points) |
| `share:used:{token}` | String | 86400s | One-time social share token deduplication |
| `sponsor:multiplier:{event_id}` | String (float) | none | FanPulse point multiplier for sponsor events |
| `user:{user_id}:location` | JSON string | 30s | Last known user coordinates (from mobile) |
| `rate:points:{user_id}` | Counter (INCR) | 60s | Rate limiter: max 5 point actions per minute |

---

## Database Index Strategy

Each `@@index` in the Prisma schema is justified by a specific query pattern:

| Model | Index | Query Pattern |
|-------|-------|--------------|
| `Event` | `venueId` | Dashboard loads events filtered by venue |
| `Event` | `status` | "Show all LIVE events" on command center |
| `Event` | `startTime` | Chronological event listing, upcoming filter |
| `CrowdZone` | `venueId` | Load all zones for a venue (heatmap render) |
| `CrowdZone` | `floor` | Floor-specific zone queries (multi-floor venues) |
| `QueuePoint` | `venueId` | Queue status sidebar loads per-venue |
| `QueuePoint` | `type` | "Find all FOOD queues" for SmartQueue |
| `VirtualToken` | `userId` | "My active tokens" — mobile fan view |
| `VirtualToken` | `[queuePointId, status]` | Compound: "next WAITING token for this queue" |
| `VirtualToken` | `eventId` | Event-scoped token analytics |
| `PointTransaction` | `userId` | Fan point history |
| `PointTransaction` | `eventId` | Event-scoped leaderboard backup |
| `PointTransaction` | `createdAt` | Time-series analytics, recent activity |
| `Incident` | `eventId` | Incident log per event (ops dashboard) |
| `Incident` | `status` | "Show all OPEN incidents" filter |
| `Incident` | `severity` | Priority sorting for dispatch |
| `StaffTask` | `assignedToId` | "My assigned tasks" per staff member |
| `StaffTask` | `[eventId, status]` | Compound: "active tasks for this event" |
| `NavigationNode` | `venueId` | Load graph for A* pathfinding |
| `NavigationNode` | `nodeType` | Find all EXIT nodes for evacuation routing |

---

## Security Model

### Authentication

- **JWT Bearer tokens** issued by `POST /api/v1/auth/login`
- Token contains: `{ userId, role, email, iat, exp }`
- Default expiry: 24 hours
- Stored client-side in memory (dashboard) or `httpOnly` cookie (mobile)

### Role-Based Access Control (RBAC)

| Role | Access |
|------|--------|
| `ATTENDEE` | Fan endpoints (queue, points, tokens, safety report) |
| `GATE_OFFICER` | Attendee + gate management endpoints |
| `FOOD_MANAGER` | Attendee + food court queue management |
| `SECURITY_LEAD` | Attendee + incident management, staff dispatch |
| `VENUE_MANAGER` | All operational endpoints |
| `SUPER_ADMIN` | Full access including system configuration |

### Emergency Override

When `emergency:mode` is set to `"true"` in Redis:
- Socket.IO safety namespace bypasses JWT validation
- All mobile clients auto-subscribe to evacuation updates
- Rate limits on safety endpoints are disabled
- Dashboard switches to emergency overlay regardless of user role

### Anti-Gaming Security

FanPulse points are validated server-side through a 4-stage pipeline:
1. **Rate Limit**: Max 5 point actions per user per minute (Redis counter with TTL)
2. **Geofence**: Haversine distance check — user must be within 50m of venue
3. **Action Validation**: Each action type has specific rules (e.g., `VIRTUAL_QUEUE_USED` checks token status is `USED`)
4. **Anomaly Detection**: IsolationForest (contamination=0.05) flags abnormal scoring patterns

---

## Service Communication Matrix

```
┌─────────────────┬──────────────────────────────────────────────┐
│     Service     │             Communicates With                │
├─────────────────┼──────────────────────────────────────────────┤
│ api-gateway     │ → PostgreSQL, Redis, Kafka (producer)       │
│ realtime-svc    │ ← Kafka (consumer), → Redis, ← WebSocket   │
│ safety-service  │ ← Kafka (consumer), → Redis, → Kafka       │
│ fan-pulse-svc   │ → PostgreSQL, Redis, Kafka (producer)       │
│ predict-engine  │ → Redis, PostgreSQL                         │
│ ml-service      │ → Redis (read zone densities)               │
│ edge-processor  │ → Kafka (producer), → Redis                 │
│ notification-svc│ ← Kafka (consumer)                          │
│ dashboard       │ ← WebSocket, → API Gateway (HTTP)           │
└─────────────────┴──────────────────────────────────────────────┘
```

No service calls another service directly via HTTP in the hot path. All inter-service communication flows through Kafka (async) or Redis (shared state). The only HTTP cross-service calls are:
- `safety-service → realtime-service` for emergency broadcast (via REST fallback if Kafka is down)
- `safety-service → api-gateway` for incident creation (POST /api/v1/ops/incident)
