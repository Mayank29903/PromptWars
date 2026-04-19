import math
from datetime import datetime, timezone
from sklearn.ensemble import IsolationForest
import numpy as np

MAX_ACTIONS_PER_HOUR     = 5
MIN_GEOFENCE_DISTANCE_M  = 50.0
ANOMALY_SCORE_THRESHOLD  = -0.15
TRAINING_SAMPLE_MINIMUM  = 100

_isolation_model  = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
_training_data:  list[list[float]] = []
_model_trained = False


class AntiGamingEngine:

    async def validate(
        self,
        user_id: str,
        action_type: str,
        context: dict,
        redis
    ) -> tuple[bool, str]:

        # 1. Rate limit
        hour_key = f'rl:fan:{user_id}:{datetime.now(timezone.utc).strftime("%Y%m%d%H")}'
        count = await redis.incr(hour_key)
        if count == 1:
            await redis.expire(hour_key, 3600)
        if count > MAX_ACTIONS_PER_HOUR:
            return False, f'Rate limit: {count} actions this hour (max {MAX_ACTIONS_PER_HOUR})'

        # 2. Geofence for location-dependent actions
        LOCATION_ACTIONS = ('ALTERNATE_STALL', 'QUICK_STALL', 'LOW_TRAFFIC_EXIT', 'EARLY_ARRIVAL')
        if action_type in LOCATION_ACTIONS:
            user_lat   = context.get('user_lat')
            user_lng   = context.get('user_lng')
            target_lat = context.get('target_lat')
            target_lng = context.get('target_lng')
            if all(v is not None for v in (user_lat, user_lng, target_lat, target_lng)):
                dist = self._haversine(user_lat, user_lng, target_lat, target_lng)
                if dist > MIN_GEOFENCE_DISTANCE_M:
                    return False, (
                        f'Geofence fail: {dist:.0f}m from target '
                        f'(max {MIN_GEOFENCE_DISTANCE_M}m)'
                    )

        # 3a. Virtual queue — token must be in USED state (server-verified)
        if action_type == 'VIRTUAL_QUEUE_USED':
            token_status = context.get('token_status', '')
            if token_status != 'USED':
                return False, f'Token not in USED state: {token_status}'

        # 3b. Social share — one-time token stored 24h
        if action_type == 'SOCIAL_SHARE':
            share_token = context.get('share_token', '')
            if not share_token:
                return False, 'Missing share_token'
            key = f'share:used:{share_token}'
            existing = await redis.get(key)
            if existing:
                return False, 'Share token already used'
            await redis.set(key, '1', ex=86400)

        # 3c. Survey — one submission per user per survey
        if action_type == 'FEEDBACK_SURVEY':
            survey_id = context.get('survey_id', '')
            if not survey_id:
                return False, 'Missing survey_id'
            key = f'survey:used:{user_id}:{survey_id}'
            existing = await redis.get(key)
            if existing:
                return False, 'Survey already submitted by this user'
            await redis.set(key, '1', ex=2592000)  # 30 days

        # 4. Isolation Forest — after 100 training samples
        global _training_data, _model_trained
        if len(_training_data) >= TRAINING_SAMPLE_MINIMUM and not _model_trained:
            X = np.array(_training_data)
            _isolation_model.fit(X)
            _model_trained = True

        features = [int(count), hash(action_type) % 10, 0.0]
        _training_data.append(features)

        if _model_trained:
            score = _isolation_model.decision_function([features])[0]
            if score < ANOMALY_SCORE_THRESHOLD:
                return False, f'Anomaly detected (score={score:.3f}) — flagged for manual review'

        return True, 'ok'

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R    = 6_371_000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a    = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))
