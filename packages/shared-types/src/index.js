// ═══════════════════════════════════════════════════════════════════════
//  @ag/shared-types — ANTIGRAVITY Domain Schemas
//  All schemas are frozen objects with correct defaults and types.
// ═══════════════════════════════════════════════════════════════════════

// ── Enums ────────────────────────────────────────────────────────────

export const Enums = Object.freeze({
  AlertLevel:   Object.freeze(['NORMAL', 'CAUTION', 'WARNING', 'CRITICAL']),
  DensityTrend: Object.freeze(['RISING', 'STABLE', 'FALLING']),
  ZoneStatus:   Object.freeze(['ACTIVE', 'INACTIVE', 'EVACUATING', 'RESTRICTED']),
  ZoneType:     Object.freeze(['STAND', 'ENTRY', 'EXIT', 'FOOD_COURT', 'RESTROOM', 'CONCOURSE']),
  UserRole:     Object.freeze(['ATTENDEE', 'STAFF', 'SECURITY_LEAD', 'MEDIC', 'COMMAND', 'ADMIN']),
  TokenStatus:  Object.freeze(['IDLE', 'WAITING', 'CALLED', 'GRACE_PERIOD', 'USED', 'EXPIRED', 'CANCELLED']),
  Tier:         Object.freeze(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
  IncidentType: Object.freeze(['CROWD_CRUSH', 'FIGHT', 'MEDICAL', 'FIRE', 'GENERAL']),
  Severity:     Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  IncidentStatus: Object.freeze(['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_ALARM']),
  StaffStatus:  Object.freeze(['ON_DUTY', 'OFF_DUTY', 'ON_BREAK', 'DISPATCHED', 'EMERGENCY']),
  QueuePointType: Object.freeze(['ENTRY', 'FOOD', 'RESTROOM', 'MERCHANDISE', 'EXIT']),
  NodeType:     Object.freeze(['WALKABLE_JUNCTION', 'EXIT', 'GATE', 'EMERGENCY_VEHICLE_ONLY', 'STAIRWELL'])
});

// ── Crowd Zone ───────────────────────────────────────────────────────

export const CrowdZoneSchema = Object.freeze({
  zone_id:                  '',
  name:                     '',
  floor:                    0,
  polygon_coords:           [],
  current_density:          0.0,
  max_safe_density:         4.5,
  density_trend:            'STABLE',
  predicted_density_10min:  0.0,
  alert_level:              'NORMAL',
  crush_risk_score:         0.0,
  timestamp:                new Date().toISOString(),
  type:                     'STAND',
  max_capacity:             0,
  venue_id:                 ''
});

// ── Virtual Token ────────────────────────────────────────────────────

export const VirtualTokenSchema = Object.freeze({
  token_id:            '',
  user_id:             '',
  queue_point_id:      '',
  event_id:            '',
  issued_at:           new Date().toISOString(),
  estimated_call_time: new Date().toISOString(),
  called_at:           null,
  used_at:             null,
  status:              'WAITING',
  position_in_queue:   0
});

// ── Flow Vector ──────────────────────────────────────────────────────

export const FlowVectorSchema = Object.freeze({
  from_zone:          '',
  to_zone:            '',
  magnitude:          0.0,
  direction_degrees:  0.0,
  flow_rate:          0.0,
  timestamp:          new Date().toISOString()
});

// ── Crowd Density Update (Kafka payload) ─────────────────────────────

export const CrowdDensityUpdateSchema = Object.freeze({
  zone_id:            '',
  venue_id:           '',
  floor:              0,
  current_density:    0.0,
  avg_velocity_mps:   0.0,
  flow_vectors:       [],
  density_history:    [],
  timestamp:          new Date().toISOString()
});

// ── Queue Point ──────────────────────────────────────────────────────

export const QueuePointSchema = Object.freeze({
  id:                             '',
  venue_id:                       '',
  name:                           '',
  type:                           'FOOD',
  floor:                          0,
  location_coords:                { lat: 0.0, lng: 0.0 },
  max_servers:                    4,
  avg_service_rate_per_server:    3.0,
  wait_time_minutes:              0,
  virtual_length:                 0,
  status:                         'OPEN'
});

// ── Queue Alternative ────────────────────────────────────────────────

export const QueueAlternativeSchema = Object.freeze({
  queue_point_id:       '',
  name:                 '',
  type:                 'FOOD',
  wait_time_minutes:    0,
  distance_meters:      0,
  recommendation_score: 0.0
});

// ── Navigation Node ──────────────────────────────────────────────────

export const NavigationNodeSchema = Object.freeze({
  node_id:            '',
  floor:              0,
  coords:             [0.0, 0.0],
  node_type:          'WALKABLE_JUNCTION',
  connected_node_ids: [],
  zone_id:            '',
  metadata:           {}
});

// ── POI ──────────────────────────────────────────────────────────────

export const POISchema = Object.freeze({
  id:          '',
  name:        '',
  type:        '',
  floor:       0,
  coords:      [0.0, 0.0],
  description: '',
  icon:        ''
});

// ── Route ────────────────────────────────────────────────────────────

export const RouteSchema = Object.freeze({
  from_node_id: '',
  to_node_id:   '',
  path:         [],
  distance:     0.0,
  duration_sec: 0.0
});

// ── Venue ────────────────────────────────────────────────────────────

export const VenueSchema = Object.freeze({
  id:              '',
  name:            '',
  total_capacity:  0,
  address:         '',
  city:            '',
  geofence:        {},
  total_floors:    1,
  config:          {}
});

// ── Venue Floor ──────────────────────────────────────────────────────

export const VenueFloorSchema = Object.freeze({
  floor:      0,
  name:       '',
  svg_path:   '',
  zones:      [],
  nodes:      []
});

// ── Staff Member ─────────────────────────────────────────────────────

export const StaffMemberSchema = Object.freeze({
  id:          '',
  name:        '',
  role:        'GATE_OFFICER',
  zone_id:     '',
  shift_start: new Date().toISOString(),
  shift_end:   new Date().toISOString(),
  status:      'ON_DUTY'
});

// ── Task ─────────────────────────────────────────────────────────────

export const TaskSchema = Object.freeze({
  id:           '',
  assigned_to:  '',
  type:         '',
  zone_id:      '',
  priority:     'MEDIUM',
  status:       'PENDING',
  created_at:   new Date().toISOString()
});

// ── Incident ─────────────────────────────────────────────────────────

export const IncidentSchema = Object.freeze({
  id:              '',
  event_id:        '',
  zone_id:         '',
  reported_by_id:  '',
  type:            'GENERAL',
  severity:        'LOW',
  description:     '',
  status:          'OPEN',
  created_at:      new Date().toISOString(),
  resolved_at:     null,
  resolution_note: ''
});

// ── Fan Profile ──────────────────────────────────────────────────────

export const FanProfileSchema = Object.freeze({
  id:                      '',
  email:                   '',
  first_name:              '',
  last_name:               '',
  total_lifetime_points:   0,
  current_balance_points:  0,
  tier:                    'BRONZE',
  events_attended:         0,
  achievements:            []
});

// ── Point Transaction ────────────────────────────────────────────────

export const PointTransactionSchema = Object.freeze({
  transaction_id:      '',
  user_id:             '',
  event_id:            '',
  action_type:         '',
  points_earned:       0,
  multiplier_applied:  1.0,
  balance_after:       0,
  timestamp:           new Date().toISOString()
});

// ── Reward ───────────────────────────────────────────────────────────

export const RewardSchema = Object.freeze({
  id:            '',
  name:          '',
  description:   '',
  cost_points:   0,
  tier_required: 'BRONZE',
  available:     true
});

// ── Safety Alert ─────────────────────────────────────────────────────

export const SafetyAlertSchema = Object.freeze({
  zone_id:           '',
  venue_id:          '',
  floor:             0,
  level:             'CAUTION',
  crush_risk_score:  0.0,
  density:           0.0,
  velocity:          0.0,
  convergence:       0.0,
  acceleration:      0.0,
  timestamp:         new Date().toISOString(),
  consecutive_count: 0
});

// ── Evacuation Route ─────────────────────────────────────────────────

export const EvacuationRouteSchema = Object.freeze({
  exit_node_id:               '',
  node_sequence:              [],
  estimated_evac_time_seconds: 0.0,
  distance_meters:            0.0,
  recommended:                false,
  congestion_level:           'LOW'
});

// ── Event Forecast ───────────────────────────────────────────────────

export const EventForecastSchema = Object.freeze({
  event_id:             '',
  scenarios:            { P25: {}, P50: {}, P85: {} },
  peak_congestion_windows: [],
  staffing_plan:        [],
  n_runs:               0,
  n_agents:             0
});

// ── API Response ─────────────────────────────────────────────────────

export const APIResponseSchema = Object.freeze({
  success: true,
  data:    null,
  error:   null,
  meta:    {}
});

// ── Paginated Response ───────────────────────────────────────────────

export const PaginatedResponseSchema = Object.freeze({
  success:     true,
  data:        [],
  total:       0,
  page:        1,
  per_page:    20,
  total_pages: 0
});

// ── WebSocket Message ────────────────────────────────────────────────

export const WebSocketMessageSchema = Object.freeze({
  event:     '',
  data:      {},
  timestamp: new Date().toISOString(),
  room:      ''
});
