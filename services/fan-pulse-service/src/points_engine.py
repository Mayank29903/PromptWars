import uuid
from datetime import datetime, timezone
from .schemas import ACTION_DEFINITIONS, PointTransaction
from .anti_gaming import AntiGamingEngine
from .tier_service import TierService

anti_gaming  = AntiGamingEngine()
tier_service = TierService()


class PointsEngine:

    async def award(
        self,
        user_id: str,
        event_id: str,
        action_type: str,
        context: dict,
        redis,
        db,
        kafka_producer=None
    ) -> PointTransaction | None:
        """
        Server-side point award. Returns None if action is unknown,
        blocked by anti-gaming, or user profile is missing.
        Clients never call this directly — only internal service calls.
        """
        if action_type not in ACTION_DEFINITIONS:
            print(f'[PointsEngine] Unknown action: {action_type}')
            return None

        valid, reason = await anti_gaming.validate(user_id, action_type, context, redis)
        if not valid:
            print(f'[PointsEngine] Blocked: user={user_id} action={action_type} reason={reason}')
            return None

        base       = ACTION_DEFINITIONS[action_type]['base_points']
        multiplier = await self._compute_multiplier(user_id, action_type, context, redis)
        final      = round(base * multiplier)

        profile = await db.fetchrow(
            'SELECT current_balance_points, total_lifetime_points, tier '
            'FROM fan_profiles WHERE id = $1',
            user_id
        )
        if not profile:
            print(f'[PointsEngine] No fan profile for user {user_id}')
            return None

        new_balance  = profile['current_balance_points']  + final
        new_lifetime = profile['total_lifetime_points']   + final

        # tier check runs after every award
        new_tier      = await tier_service.check_upgrade(
            user_id, new_lifetime, profile['tier'], db, kafka_producer
        )
        current_tier  = new_tier if new_tier else profile['tier']

        transaction_id = str(uuid.uuid4())
        ts             = datetime.now(timezone.utc).isoformat()

        await db.execute(
            'UPDATE fan_profiles '
            'SET current_balance_points=$1, total_lifetime_points=$2, tier=$3 '
            'WHERE id=$4',
            new_balance, new_lifetime, current_tier, user_id
        )
        await db.execute(
            'INSERT INTO point_transactions '
            '(id, user_id, event_id, action_type, points_earned, '
            ' multiplier_applied, balance_after, created_at) '
            'VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
            transaction_id, user_id, event_id, action_type,
            final, multiplier, new_balance, ts
        )

        # leaderboard updated in Redis sorted sets — never in Postgres
        await redis.zadd(f'leaderboard:event:{event_id}',   {user_id: new_lifetime})
        await redis.zadd(f'leaderboard:alltime:default',    {user_id: new_lifetime})

        txn = PointTransaction(
            transaction_id     = transaction_id,
            user_id            = user_id,
            event_id           = event_id,
            action_type        = action_type,
            points_earned      = final,
            multiplier_applied = multiplier,
            balance_after      = new_balance,
            timestamp          = ts
        )

        if kafka_producer:
            tier_suffix = (
                f',"tier_upgraded":true,"new_tier":"{new_tier}"'
                if new_tier else ''
            )
            await kafka_producer.send(
                'fan.behavior.events',
                key=user_id.encode(),
                value=(
                    f'{{"event_type":"POINTS_EARNED"'
                    f',"user_id":"{user_id}"'
                    f',"points_earned":{final}'
                    f',"action_type":"{action_type}"'
                    f',"new_balance":{new_balance}'
                    f',"multiplier_applied":{multiplier}'
                    f'{tier_suffix}}}'
                ).encode()
            )

        return txn

    async def _compute_multiplier(
        self,
        user_id: str,
        action_type: str,
        context: dict,
        redis
    ) -> float:
        multiplier = 1.0

        if context.get('is_season_ticket'):
            multiplier *= 2.0

        if context.get('is_first_venue_visit'):
            multiplier *= 1.5

        congestion_index = float(context.get('congestion_index', 0.0))
        multiplier *= max(1.0, congestion_index * 3.0)

        sponsor_raw = await redis.get(f'sponsor:multiplier:{action_type}')
        if sponsor_raw:
            multiplier *= float(sponsor_raw)

        return round(multiplier, 3)
