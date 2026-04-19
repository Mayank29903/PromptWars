class LeaderboardService:

    async def get_top(
        self,
        scope: str,
        scope_id: str,
        redis,
        db,
        limit: int = 50
    ) -> list[dict]:
        key = f'leaderboard:{scope}:{scope_id}'
        raw = await redis.zrevrange(key, 0, limit - 1, withscores=True)
        if not raw:
            return []

        user_ids = [uid for uid, _ in raw]
        rows = await db.fetch(
            '''
            SELECT u.id, u."firstName" || ' ' || u."lastName" AS display_name, fp.tier
            FROM users u
            JOIN fan_profiles fp ON u.id = fp.id
            WHERE u.id = ANY($1::text[])
            ''',
            user_ids
        )
        user_map = {r['id']: r for r in rows}

        result = []
        for rank, (uid, score) in enumerate(raw, 1):
            info = user_map.get(uid, {})
            result.append({
                'rank':         rank,
                'user_id':      uid,
                'display_name': info.get('display_name', 'Fan'),
                'points':       int(score),
                'tier':         info.get('tier', 'BRONZE')
            })
        return result

    async def get_user_rank(
        self,
        scope: str,
        scope_id: str,
        user_id: str,
        redis
    ) -> dict:
        key   = f'leaderboard:{scope}:{scope_id}'
        rank  = await redis.zrevrank(key, user_id)
        score = await redis.zscore(key, user_id)
        return {
            'rank':   int(rank) + 1 if rank is not None else None,
            'points': int(score) if score else 0
        }
