from .schemas import FanTier, TIER_THRESHOLDS, NEXT_TIER


class TierService:
    async def check_upgrade(
        self,
        user_id: str,
        new_lifetime_points: int,
        current_tier_str: str,
        db,
        kafka_producer=None
    ) -> str | None:
        current_tier = FanTier(current_tier_str)
        next_tier    = NEXT_TIER.get(current_tier)
        if not next_tier:
            return None  # already PLATINUM
        if new_lifetime_points >= TIER_THRESHOLDS[next_tier]:
            await db.execute(
                'UPDATE fan_profiles SET tier=$1 WHERE id=$2',
                next_tier.value, user_id
            )
            print(f'[TierService] User {user_id} upgraded to {next_tier.value}')
            return next_tier.value
        return None
