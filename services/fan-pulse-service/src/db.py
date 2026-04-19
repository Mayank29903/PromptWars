import asyncpg
from .config import config

_pool: asyncpg.Pool | None = None

async def init_db() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(config.DATABASE_URL, min_size=2, max_size=10)
    return _pool

async def get_db():
    if _pool is None:
        await init_db()
    async with _pool.acquire() as conn:
        yield conn

async def close_db():
    if _pool:
        await _pool.close()
