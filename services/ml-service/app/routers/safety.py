from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class CrushRiskRequest(BaseModel):
    densities: List[float]
    flow_vectors: List[List[float]]

@router.post("/crush-risk")
async def crush_risk(req: CrushRiskRequest):
    score = 0.8 
    return {"success": True, "crush_risk": score, "alert": score > 0.85}

@router.post("/panic-detect")
async def panic_detect():
    return {"success": True, "panic_probability": 0.05, "is_panic": False}

@router.post("/audio-classify")
async def audio_classify():
    return {
        "success": True,
        "class": "NORMAL_CROWD",
        "confidence": 0.98
    }
