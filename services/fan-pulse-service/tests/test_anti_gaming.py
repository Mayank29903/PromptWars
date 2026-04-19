"""
Tests for AntiGamingEngine — validates rate limiting, geofence,
action-specific checks, and anomaly detection pipeline.
Uses a dict-backed mock Redis (no real connection needed).
Uses asyncio.run() directly to avoid pytest-asyncio plugin issues.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import asyncio
from src.anti_gaming import AntiGamingEngine


class MockRedis:
    """Dict-backed async Redis mock implementing incr, expire, get, set."""

    def __init__(self):
        self._store = {}

    async def incr(self, key):
        self._store[key] = self._store.get(key, 0) + 1
        return self._store[key]

    async def expire(self, key, seconds):
        pass  # TTL not needed for unit tests

    async def get(self, key):
        return self._store.get(key)

    async def set(self, key, value, ex=None):
        self._store[key] = value


def _engine():
    return AntiGamingEngine()


def _redis():
    return MockRedis()


def test_rate_limit_allows_first_five():
    async def _run():
        engine, redis = _engine(), _redis()
        for _ in range(5):
            ok, reason = await engine.validate('user-a', 'EARLY_ARRIVAL', {}, redis)
            assert ok is True
            assert reason == 'ok'
    asyncio.run(_run())


def test_rate_limit_blocks_sixth():
    async def _run():
        engine, redis = _engine(), _redis()
        for _ in range(5):
            await engine.validate('user-a', 'EARLY_ARRIVAL', {}, redis)
        ok, reason = await engine.validate('user-a', 'EARLY_ARRIVAL', {}, redis)
        assert ok is False
        assert 'Rate limit' in reason
    asyncio.run(_run())


def test_different_users_have_separate_limits():
    async def _run():
        engine, redis = _engine(), _redis()
        for _ in range(5):
            await engine.validate('user-a', 'EARLY_ARRIVAL', {}, redis)
        ok, reason = await engine.validate('user-b', 'EARLY_ARRIVAL', {}, redis)
        assert ok is True
        assert reason == 'ok'
    asyncio.run(_run())


def test_virtual_queue_requires_used_status():
    async def _run():
        engine, redis = _engine(), _redis()
        ok, reason = await engine.validate(
            'user-a', 'VIRTUAL_QUEUE_USED',
            {'token_status': 'WAITING'}, redis
        )
        assert ok is False
        assert 'Token not in USED state' in reason
    asyncio.run(_run())


def test_virtual_queue_passes_with_used_status():
    async def _run():
        engine, redis = _engine(), _redis()
        ok, reason = await engine.validate(
            'user-a', 'VIRTUAL_QUEUE_USED',
            {'token_status': 'USED'}, redis
        )
        assert ok is True
        assert reason == 'ok'
    asyncio.run(_run())


def test_social_share_token_one_time_use():
    async def _run():
        engine, redis = _engine(), _redis()
        ctx = {'share_token': 'share-abc-123'}

        ok1, _ = await engine.validate('user-a', 'SOCIAL_SHARE', ctx, redis)
        assert ok1 is True

        ok2, reason2 = await engine.validate('user-a', 'SOCIAL_SHARE', ctx, redis)
        assert ok2 is False
        assert 'already used' in reason2
    asyncio.run(_run())
