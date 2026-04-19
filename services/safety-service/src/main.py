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


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('src.main:app', host='0.0.0.0', port=config.PORT, reload=True)
