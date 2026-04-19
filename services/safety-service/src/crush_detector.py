from collections import defaultdict
from datetime import datetime, timezone
import uuid
from .schemas import ZoneSnapshot, SafetyAlert, AlertLevel


class CrushRiskDetector:
    """
    Multi-signal crush risk scoring based on the Fruin Level-of-Service model (1987).
    Critical density threshold: 6.0 p/sqm (HSE crowd safety guidelines).

    Formula (EXACT — do not modify weights):
        crush_risk = 0.35*density_score + 0.30*velocity_score
                   + 0.25*convergence_score + 0.10*acceleration_score
    """

    WATCH_THRESHOLD    = 0.45
    WARNING_THRESHOLD  = 0.65
    CRITICAL_THRESHOLD = 0.82
    READINGS_REQUIRED  = 3  # consecutive readings before WARNING/CRITICAL fires

    def __init__(self):
        self.consecutive_readings: dict[str, int] = defaultdict(int)
        self.current_levels:       dict[str, str] = {}

    def compute_density_score(self, density: float) -> float:
        """
        Linear interpolation: 0.0 at 4.0 p/sqm, 1.0 at 6.0 p/sqm.
        Below 4.0 → 0.0 (safe zone). Above 6.0 → 1.0 (capped).
        """
        return max(0.0, min(1.0, (density - 4.0) / 2.0))

    def compute_velocity_score(self, avg_velocity_mps: float) -> float:
        """
        0.0 at normal walking speed (0.8+ m/s), 1.0 when crowd is fully stationary.
        """
        return max(0.0, 1.0 - avg_velocity_mps / 0.8)

    def compute_convergence_score(self, zone_id: str, flow_vectors: list) -> float:
        """
        Proportion of flow vectors pointing INTO this zone.
        High convergence = crowd being fed from all directions = crush forming.
        Returns 0.0 when no flow data is available.
        """
        if not flow_vectors:
            return 0.0
        inward = sum(1 for v in flow_vectors if v.to_zone == zone_id)
        return inward / len(flow_vectors)

    def compute_acceleration_score(self, density_history: list[float]) -> float:
        """
        Rate of density increase over the last 5-second window, normalised to 0-1.
        Normalising factor: 0.5 p/sqm/s (rapid crowd compression).
        Requires at least 2 readings.
        """
        if len(density_history) < 2:
            return 0.0
        rate = (density_history[-1] - density_history[-2]) / 5.0
        return min(1.0, max(0.0, rate / 0.5))

    def compute_crush_risk(self, snapshot: ZoneSnapshot) -> dict:
        ds  = self.compute_density_score(snapshot.current_density)
        vs  = self.compute_velocity_score(snapshot.avg_velocity_mps)
        cs  = self.compute_convergence_score(snapshot.zone_id, snapshot.flow_vectors)
        acc = self.compute_acceleration_score(snapshot.density_history)

        # EXACT formula — do not change weights
        risk = (0.35 * ds) + (0.30 * vs) + (0.25 * cs) + (0.10 * acc)

        return {
            'risk': round(risk, 4),
            'ds':   round(ds, 4),
            'vs':   round(vs, 4),
            'cs':   round(cs, 4),
            'acc':  round(acc, 4)
        }

    def evaluate(self, snapshot: ZoneSnapshot) -> SafetyAlert | None:
        """
        Main evaluation entry point.
        Returns a SafetyAlert if a threshold is crossed for the required
        number of consecutive readings. Returns None otherwise.
        """
        scores  = self.compute_crush_risk(snapshot)
        risk    = scores['risk']
        zone_id = snapshot.zone_id

        if risk >= self.WATCH_THRESHOLD:
            self.consecutive_readings[zone_id] += 1
        else:
            self.consecutive_readings[zone_id] = 0
            self.current_levels[zone_id] = 'NORMAL'
            return None

        consecutive = self.consecutive_readings[zone_id]

        if risk >= self.CRITICAL_THRESHOLD and consecutive >= self.READINGS_REQUIRED:
            level = AlertLevel.CRITICAL
        elif risk >= self.WARNING_THRESHOLD and consecutive >= self.READINGS_REQUIRED:
            level = AlertLevel.WARNING
        elif risk >= self.WATCH_THRESHOLD and consecutive >= 1:
            level = AlertLevel.CAUTION
        else:
            return None

        prev_level = self.current_levels.get(zone_id, 'NORMAL')
        self.current_levels[zone_id] = level.value

        # suppress duplicate alerts (except CRITICAL — always emit)
        if level.value == prev_level and level != AlertLevel.CRITICAL:
            return None

        return SafetyAlert(
            alert_id           = str(uuid.uuid4()),
            zone_id            = zone_id,
            venue_id           = snapshot.venue_id,
            level              = level,
            crush_risk_score   = risk,
            density_score      = scores['ds'],
            velocity_score     = scores['vs'],
            convergence_score  = scores['cs'],
            acceleration_score = scores['acc'],
            trigger_source     = 'CRUSH_DETECTOR',
            timestamp          = datetime.now(timezone.utc).isoformat()
        )
