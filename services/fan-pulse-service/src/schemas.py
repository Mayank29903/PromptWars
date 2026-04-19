from pydantic import BaseModel
from typing import Optional
from enum import Enum


class FanTier(str, Enum):
    BRONZE   = 'BRONZE'
    SILVER   = 'SILVER'
    GOLD     = 'GOLD'
    PLATINUM = 'PLATINUM'


TIER_THRESHOLDS = {
    FanTier.BRONZE:   0,
    FanTier.SILVER:   500,
    FanTier.GOLD:     1500,
    FanTier.PLATINUM: 3000
}

NEXT_TIER = {
    FanTier.BRONZE:   FanTier.SILVER,
    FanTier.SILVER:   FanTier.GOLD,
    FanTier.GOLD:     FanTier.PLATINUM,
    FanTier.PLATINUM: None
}

# All actions are server-defined. Clients never supply points values.
ACTION_DEFINITIONS = {
    'EARLY_ARRIVAL':      {'base_points': 50,  'description': 'Arrived 25+ min before kickoff'},
    'ALTERNATE_STALL':    {'base_points': 30,  'description': 'Used off-peak food stall'},
    'LOW_TRAFFIC_EXIT':   {'base_points': 25,  'description': 'Used low-density exit gate'},
    'AR_NAV_COMPLETE':    {'base_points': 20,  'description': 'Completed AR navigation to seat'},
    'VIRTUAL_QUEUE_USED': {'base_points': 15,  'description': 'Used virtual queue token'},
    'QUICK_STALL':        {'base_points': 10,  'description': 'Visited stall with <5 min wait'},
    'SOCIAL_SHARE':       {'base_points': 20,  'description': 'Shared event check-in'},
    'FEEDBACK_SURVEY':    {'base_points': 25,  'description': 'Completed post-event survey'},
    'REROUTE_ACCEPTED':   {'base_points': 25,  'description': 'Accepted AI crowd reroute suggestion'}
}


class PointAwardRequest(BaseModel):
    user_id:    str
    event_id:   str
    action_type: str
    context:    dict = {}
    user_lat:   Optional[float] = None
    user_lng:   Optional[float] = None


class PointTransaction(BaseModel):
    transaction_id:    str
    user_id:           str
    event_id:          str
    action_type:       str
    points_earned:     int
    multiplier_applied: float
    balance_after:     int
    timestamp:         str


class LeaderboardEntry(BaseModel):
    rank:         int
    user_id:      str
    display_name: str
    points:       int
    tier:         FanTier
