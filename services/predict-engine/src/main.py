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

@app.post('/api/v1/predict/simulation')
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

@app.get('/api/v1/predict/job/{job_id}')
async def get_job(job_id: str):
    return JOBS.get(job_id, {'status': 'NOT_FOUND'})

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('src.main:app', host='0.0.0.0', port=config.PORT, reload=True)
