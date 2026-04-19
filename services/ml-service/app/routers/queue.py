import numpy as np
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

from app.features.pipeline import VenueFeaturePipeline

router = APIRouter()
pipeline = VenueFeaturePipeline()


class QueuePredictRequest(BaseModel):
    current_queue_visible_length: int = 15
    virtual_queue_backlog_count: int = 8
    active_server_count: int = 4
    historical_service_rate_p50: float = 3.0
    hour: int = 20
    minutes_to_halftime: int = 10
    rivalry_index: float = 0.95


@router.post('/predict')
async def predict_queue(request: Request, body: QueuePredictRequest):
    """
    Queue wait time prediction using XGBoost-backed predictor.
    Runs feature pipeline → model predict → confidence interval.
    """
    predictor = request.app.state.queue_predictor

    # Build feature vector via VenueFeaturePipeline
    queue_state = {
        'current_queue_visible_length': body.current_queue_visible_length,
        'virtual_queue_backlog_count': body.virtual_queue_backlog_count,
        'active_server_count': body.active_server_count,
        'historical_service_rate_p50': body.historical_service_rate_p50,
        'hour': body.hour,
        'minutes_to_halftime': body.minutes_to_halftime,
        'rivalry_index': body.rivalry_index,
    }
    features = pipeline.compute_queue_features(queue_state)
    X = np.array([features])

    output = predictor.predict(X)

    wait = round(float(output['wait_time_minutes']), 1)
    lower = round(float(output['confidence_interval_80pct']['lower']), 1)
    upper = round(float(output['confidence_interval_80pct']['upper']), 1)

    if wait > 15:
        recommendation = 'Consider alternate stall'
    else:
        recommendation = 'Queue time acceptable'

    return {
        'wait_time_minutes': wait,
        'confidence_interval_80pct': {
            'lower': lower,
            'upper': upper
        },
        'recommendation': recommendation
    }
