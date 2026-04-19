from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import torch

from app.models.lstm_crowd import CrowdFlowLSTM

router = APIRouter()
model = CrowdFlowLSTM(n_zones=9)
model.eval()

class CrowdPredictRequest(BaseModel):
    history: List[List[float]] 
    horizon_minutes: int = 15

@router.post("/predict")
async def predict_crowd(request: CrowdPredictRequest):
    try:
        x_tensor = torch.tensor(request.history, dtype=torch.float32)
        with torch.no_grad():
            outputs = model(x_tensor)
            
        grid_key = "pred_10min"
        if request.horizon_minutes <= 5: grid_key = "pred_5min"
        elif request.horizon_minutes >= 30: grid_key = "pred_30min"
            
        predictions = outputs[grid_key].tolist()
        return {"success": True, "grid": [{"zone_id": i, "density": d} for i, d in enumerate(predictions[0])]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cluster-alerts")
async def get_cluster_alerts():
    return {"success": True, "clusters": []}
