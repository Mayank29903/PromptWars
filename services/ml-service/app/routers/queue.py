from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.models.xgboost_queue import QueueTimePredictor
from app.models.rf_spike import RFSpikePredictor
import numpy as np

router = APIRouter()
xgb_model = QueueTimePredictor()
rf_model = RFSpikePredictor()

class QueueRequest(BaseModel):
    features: List[float] 

class SpikePredictRequest(BaseModel):
    features: List[float] 

@router.post("/wait-time")
async def predict_wait_time(request: QueueRequest):
    X = np.array([request.features])
    output = xgb_model.predict(X)
    return {"success": True, "data": output}

@router.post("/spike-predict")
async def predict_spike(request: SpikePredictRequest):
    X = np.array([request.features])
    output = rf_model.predict(X)
    return {"success": True, "data": output}
