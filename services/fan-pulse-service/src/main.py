import asyncio
from fastapi import FastAPI, Depends, HTTPException
from contextlib import asynccontextmanager
from .config import config
from .redis_client import get_redis, close_redis
from .db import init_db, close_db, get_db
from .kafka_consumer import init_kafka_producer, close_kafka_producer, get_kafka_producer
from .schemas import PointAwardRequest, PointTransaction
from .points_engine import PointsEngine

engine = PointsEngine()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_kafka_producer()
    yield
    await close_db()
    await close_redis()
    await close_kafka_producer()

app = FastAPI(title='ANTIGRAVITY FanPulse Service', lifespan=lifespan)

@app.get('/health')
async def health():
    return {'status': 'ok'}

@app.post('/api/v1/fan/earn-points', response_model=PointTransaction)
async def earn_points(
    req: PointAwardRequest,
    db=Depends(get_db)
):
    redis = await get_redis()
    producer = await get_kafka_producer()

    txn = await engine.award(
        user_id=req.user_id,
        event_id=req.event_id,
        action_type=req.action_type,
        context=req.context,
        redis=redis,
        db=db,
        kafka_producer=producer
    )
    if not txn:
        raise HTTPException(status_code=400, detail='Point award rejected or unknown action')
    return txn

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('src.main:app', host='0.0.0.0', port=config.PORT, reload=True)
