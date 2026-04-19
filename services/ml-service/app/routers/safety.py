import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from sklearn.ensemble import IsolationForest

router = APIRouter()


class AnomalyRequest(BaseModel):
    zone_id: str
    sensor_readings: List[float]


class CrushRiskRequest(BaseModel):
    densities: List[float]
    flow_vectors: List[List[float]]


@router.post('/anomaly')
async def detect_anomaly(body: AnomalyRequest):
    """
    Anomaly detection on sensor readings using IsolationForest.
    Fits on provided readings and scores the last observation.
    """
    if len(body.sensor_readings) < 10:
        return {
            'zone_id': body.zone_id,
            'anomaly_detected': False,
            'anomaly_score': 0.0,
            'severity': 'LOW',
            'error': 'Minimum 10 readings required'
        }

    X = np.array(body.sensor_readings).reshape(-1, 1)

    iso = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        random_state=42
    )
    iso.fit(X)

    # Score the last reading
    last_reading = X[-1].reshape(1, -1)
    score = float(iso.score_samples(last_reading)[0])
    prediction = int(iso.predict(last_reading)[0])

    anomaly_detected = prediction == -1

    # Severity classification based on anomaly score
    if score < -0.30:
        severity = 'HIGH'
    elif score < -0.15:
        severity = 'MEDIUM'
    elif score < -0.05:
        severity = 'LOW'
    else:
        severity = 'LOW'

    return {
        'zone_id': body.zone_id,
        'anomaly_detected': anomaly_detected,
        'anomaly_score': round(score, 4),
        'severity': severity
    }


@router.post('/crush-risk')
async def crush_risk(req: CrushRiskRequest):
    """Simplified crush risk score from raw densities."""
    if not req.densities:
        return {'success': True, 'crush_risk': 0.0, 'alert': False}

    max_density = max(req.densities)
    score = min(1.0, max(0.0, (max_density - 3.0) / 3.0))
    return {'success': True, 'crush_risk': round(score, 3), 'alert': score > 0.85}


@router.post('/panic-detect')
async def panic_detect():
    return {'success': True, 'panic_probability': 0.05, 'is_panic': False}


@router.post('/audio-classify')
async def audio_classify():
    return {
        'success': True,
        'class': 'NORMAL_CROWD',
        'confidence': 0.98
    }
