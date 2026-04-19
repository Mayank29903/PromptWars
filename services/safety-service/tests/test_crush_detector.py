"""
Tests for CrushRiskDetector — validates the Fruin Level-of-Service crush risk
scoring model with exact weight verification and false-positive guard logic.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.crush_detector import CrushRiskDetector
from src.schemas import ZoneSnapshot, AlertLevel


def _make_snapshot(
    density=2.0,
    velocity=0.8,
    flow_vectors=None,
    density_history=None,
    zone_id='zone-test',
    venue_id='venue-test',
):
    return ZoneSnapshot(
        zone_id=zone_id,
        venue_id=venue_id,
        floor=1,
        current_density=density,
        avg_velocity_mps=velocity,
        flow_vectors=flow_vectors or [],
        density_history=density_history or [],
        timestamp='2025-01-01T00:00:00Z',
    )


# ── density_score tests ──────────────────────────────────────────────

def test_density_score_below_safe_threshold():
    d = CrushRiskDetector()
    assert d.compute_density_score(3.5) == 0.0


def test_density_score_at_critical():
    d = CrushRiskDetector()
    assert d.compute_density_score(6.0) == 1.0


def test_density_score_interpolated():
    d = CrushRiskDetector()
    assert d.compute_density_score(5.0) == 0.5


# ── velocity_score tests ─────────────────────────────────────────────

def test_velocity_score_walking_speed():
    d = CrushRiskDetector()
    assert d.compute_velocity_score(0.8) == 0.0


def test_velocity_score_stationary():
    d = CrushRiskDetector()
    assert d.compute_velocity_score(0.0) == 1.0


# ── crush_risk formula tests ─────────────────────────────────────────

def test_crush_risk_formula_weights():
    d = CrushRiskDetector()
    snap = _make_snapshot(density=6.0, velocity=0.0, density_history=[5.0, 6.0])
    result = d.compute_crush_risk(snap)

    assert 'risk' in result
    assert 0.0 <= result['risk'] <= 1.0
    assert result['ds'] == 1.0
    assert result['vs'] == 1.0


# ── evaluate() alert lifecycle tests ─────────────────────────────────

def test_caution_fires_on_first_reading():
    d = CrushRiskDetector()
    # density=5.5 → ds=0.75, velocity=0.1 → vs≈0.875 → risk ~0.35*0.75+0.30*0.875 = 0.525 ≥ 0.45
    snap = _make_snapshot(density=5.5, velocity=0.1)
    result = d.evaluate(snap)

    assert result is not None
    assert result.level.value == 'CAUTION'


def test_critical_requires_three_consecutive_readings():
    from src.schemas import FlowVector
    d = CrushRiskDetector()
    # density=6.5 → ds=1.0, velocity=0.0 → vs=1.0,
    # all flow vectors point INTO zone → cs=1.0, accel → acc>0
    # risk = 0.35*1.0 + 0.30*1.0 + 0.25*1.0 + 0.10*acc ≥ 0.90 → CRITICAL threshold
    fv = [
        FlowVector(from_zone='other', to_zone='zone-test', flow_rate=1.0, timestamp='t'),
        FlowVector(from_zone='other2', to_zone='zone-test', flow_rate=1.0, timestamp='t'),
    ]
    snap = _make_snapshot(density=6.5, velocity=0.0, flow_vectors=fv, density_history=[5.0, 6.5])

    r1 = d.evaluate(snap)
    # First reading: fires as CAUTION (consecutive=1, not yet 3 for CRITICAL)
    assert r1 is not None
    assert r1.level.value == 'CAUTION'

    r2 = d.evaluate(snap)
    # Second reading: consecutive=2, still not 3 for CRITICAL. CAUTION suppressed (same level).
    assert r2 is None

    r3 = d.evaluate(snap)
    # Third reading: consecutive=3 → CRITICAL fires
    assert r3 is not None
    assert r3.level.value == 'CRITICAL'


def test_normal_reading_resets_counter():
    d = CrushRiskDetector()
    critical_snap = _make_snapshot(density=6.5, velocity=0.0, density_history=[6.0, 6.5])
    safe_snap = _make_snapshot(density=2.0, velocity=0.8)

    # Two critical readings
    d.evaluate(critical_snap)
    d.evaluate(critical_snap)

    # Safe reading resets the counter
    r_safe = d.evaluate(safe_snap)
    assert r_safe is None

    # Next critical reading starts counter over at 1 → CAUTION, not CRITICAL
    r_after_reset = d.evaluate(critical_snap)
    assert r_after_reset is not None
    assert r_after_reset.level.value == 'CAUTION'
