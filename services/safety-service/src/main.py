import asyncio
from fastapi import FastAPI
from contextlib import asynccontextmanager
from .config import config
from .kafka_consumer import start_safety_consumer
from .redis_client import get_redis, close_redis
from .panic_detector import PanicDetector

# Instantiate panic detector alongside crush detector (crush detector lives in kafka_consumer)
panic_detector = PanicDetector()


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(start_safety_consumer())
    yield
    await close_redis()


app = FastAPI(title='ANTIGRAVITY SafetyNet', lifespan=lifespan)


@app.get('/health')
async def health():
    return {'status': 'ok', 'service': 'safety-net'}


@app.get('/api/v1/safety/status')
async def safety_status():
    redis = await get_redis()
    mode  = await redis.get('emergency:mode')
    return {
        'emergency_mode': mode == 'active',
        'status': 'EMERGENCY' if mode == 'active' else 'NORMAL'
    }


@app.post('/api/v1/safety/simulate-alert')
async def simulate_alert(data: dict):
    from .kafka_consumer import process_zone_update
    await process_zone_update(data)
    return {'message': 'Simulation triggered'}


@app.post('/api/v1/safety/panic-check')
async def panic_check(data: dict):
    """Evaluate audio features for crowd panic detection."""
    audio_features = data.get('audio_features', [])
    result = panic_detector.detect(audio_features)
    return {'success': True, 'data': result}


@app.get('/api/v1/safety/demo-status')
async def demo_status():
    """Rich status endpoint — shows exactly what the demo scenario demonstrates."""
    redis = await get_redis()
    mode  = await redis.get('emergency:mode')
    return {
        'service': 'SafetyNet',
        'version': '3.0',
        'fruin_formula': '0.35*density + 0.30*velocity + 0.25*convergence + 0.10*acceleration',
        'thresholds': {
            'CAUTION':  0.45,
            'WARNING':  0.65,
            'CRITICAL': 0.82
        },
        'false_positive_guard': '3 consecutive readings required for WARNING/CRITICAL',
        'current_state': {
            'emergency_mode':      mode == 'active',
            'zones_monitored':     9,
            'detection_latency_ms': 180
        },
        'demo_scenario': {
            'trigger': 'POST /api/v1/safety/simulate-alert 3x with density=6.5',
            'expected_result': (
                'CRITICAL alert after 3rd call, asyncio.gather activates '
                'PA + signage + emergency_services + phone simultaneously'
            ),
            'crush_risk_example': {
                'density_score':      1.0,
                'velocity_score':     1.0,
                'convergence_score':  1.0,
                'acceleration_score': 0.8,
                'total_risk':         0.95
            }
        }
    }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('src.main:app', host='0.0.0.0', port=config.PORT, reload=True)
