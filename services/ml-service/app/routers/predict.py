from fastapi import APIRouter
from pydantic import BaseModel
import uuid
from app.tasks.simulation import run_simulation_task

router = APIRouter()

class SimulateRequest(BaseModel):
    event_id: str

@router.post("/simulate")
async def start_simulation(req: SimulateRequest):
    job_id = f"sim_{uuid.uuid4().hex}"
    run_simulation_task.delay(req.event_id, job_id)
    return {"success": True, "job_id": job_id}

@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    return {
        "success": True, 
        "status": "COMPLETE", 
        "progress": 100,
        "eventForecast": {
            "simulated_density": 0.8,
            "risk_zones": ["zone_1", "zone_4"]
        }
    }
