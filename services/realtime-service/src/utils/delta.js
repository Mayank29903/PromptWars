export function computeDelta(previous, current) {
  if (!previous) return current;

  const delta = {
    zone_id: current.zone_id,
    timestamp: current.timestamp
  };
  let hasChanges = false;
  const THRESHOLD = 0.005;

  if (Math.abs((current.current_density || 0) - (previous.current_density || 0)) > THRESHOLD) {
    delta.current_density = current.current_density;
    hasChanges = true;
  }
  if (current.alert_level !== previous.alert_level) {
    delta.alert_level = current.alert_level;
    hasChanges = true;
  }
  if (current.density_trend !== previous.density_trend) {
    delta.density_trend = current.density_trend;
    hasChanges = true;
  }
  if (
    current.crush_risk_score !== undefined &&
    Math.abs((current.crush_risk_score || 0) - (previous.crush_risk_score || 0)) > THRESHOLD
  ) {
    delta.crush_risk_score = current.crush_risk_score;
    hasChanges = true;
  }

  return hasChanges ? delta : null;
}

export function computeQueueDelta(previous, current) {
  if (!previous) return current;

  const delta = {
    point_id: current.point_id,
    timestamp: current.timestamp
  };
  let hasChanges = false;

  if (Math.abs((current.current_wait_minutes || 0) - (previous.current_wait_minutes || 0)) > 0.5) {
    delta.current_wait_minutes = current.current_wait_minutes;
    hasChanges = true;
  }
  if (current.current_queue_length !== previous.current_queue_length) {
    delta.current_queue_length = current.current_queue_length;
    hasChanges = true;
  }
  if (current.status !== previous.status) {
    delta.status = current.status;
    hasChanges = true;
  }

  return hasChanges ? delta : null;
}
