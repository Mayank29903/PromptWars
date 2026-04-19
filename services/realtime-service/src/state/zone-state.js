const zoneState = new Map();
const lastFullSyncTime = new Map();
const FULL_SYNC_INTERVAL_MS = 60_000;

export function getZoneState(zoneId) {
  return zoneState.get(zoneId) || null;
}

export function setZoneState(zoneId, state) {
  zoneState.set(zoneId, { ...state, _updatedAt: Date.now() });
}

export function getAllZoneStates() {
  return Array.from(zoneState.values());
}

export function needsFullSync(clientId) {
  const last = lastFullSyncTime.get(clientId) || 0;
  return Date.now() - last > FULL_SYNC_INTERVAL_MS;
}

export function markFullSync(clientId) {
  lastFullSyncTime.set(clientId, Date.now());
}

export function clearClientSync(clientId) {
  lastFullSyncTime.delete(clientId);
}
