import asyncio
from fastapi import FastAPI
import uuid
from .config import config
from .schemas import SimRequest
from .monte_carlo import run_monte_carlo

app = FastAPI(title='ANTIGRAVITY PredictEngine')

JOBS = {}

@app.get('/health')
async def health():
    return {'status': 'ok'}

@app.post('/ml/predict/simulate')
async def run_simulation(req: SimRequest):
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {'status': 'QUEUED'}
    
    # Run in background to not block
    async def _run():
        res = await asyncio.to_thread(
            run_monte_carlo, 
            n_agents=req.n_agents, 
            n_runs=req.n_runs
        )
        JOBS[job_id] = {'status': 'COMPLETE', 'scenarios': res['scenarios'], 'east_stand_p85': res['east_stand_at_61min_p85']}
        
    asyncio.create_task(_run())
    return {'job_id': job_id, 'status': 'QUEUED'}

@app.get('/ml/predict/job/{job_id}')
async def get_job(job_id: str):
    return JOBS.get(job_id, {'status': 'NOT_FOUND'})

@app.get('/ml/predict/explain-crush')
async def explain_crush(density: float, velocity: float, convergence: float, acceleration: float):
    risk_score = min(0.999, density * 0.15 + (1.0 if convergence > 0.7 else 0) * 0.2 + velocity * 0.1)
    alert_level = "NORMAL"
    if risk_score > 0.82: alert_level = "CRITICAL"
    elif risk_score > 0.65: alert_level = "WARNING"
    elif risk_score > 0.4: alert_level = "CAUTION"
    
    return {
        "crush_risk_score": round(risk_score, 3),
        "alert_level": alert_level,
        "explanation": {
            "feature_contributions": [
                {
                    "feature": "crowd_density",
                    "weighted_contribution": round(density * 0.15, 3),
                    "plain_english": f"Zone density at {round(density, 1)} persons/sqm"
                },
                {
                    "feature": "crowd_convergence",
                    "weighted_contribution": 0.2 if convergence > 0.7 else 0.05,
                    "plain_english": "High convergence detected at stand entry" if convergence > 0.7 else "Flow patterns remain parallel"
                }
            ],
            "recommendation": "Activate rerouting" if risk_score > 0.65 else "Continue monitoring"
        }
    }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('src.main:app', host='0.0.0.0', port=config.PORT, reload=True)
