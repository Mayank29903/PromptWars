from pydantic import BaseModel
from typing import Optional
from enum import Enum


class AlertLevel(str, Enum):
    NORMAL    = 'NORMAL'
    CAUTION   = 'CAUTION'
    WARNING   = 'WARNING'
    EMERGENCY = 'EMERGENCY'
    CRITICAL  = 'CRITICAL'
    ALL_CLEAR = 'ALL_CLEAR'


class FlowVector(BaseModel):
    from_zone:  str
    to_zone:    str
    flow_rate:  float
    timestamp:  str


class ZoneSnapshot(BaseModel):
    zone_id:          str
    venue_id:         str
    floor:            int
    current_density:  float
    avg_velocity_mps: float = 0.5
    flow_vectors:     list[FlowVector] = []
    density_history:  list[float] = []
    timestamp:        str


class SafetyAlert(BaseModel):
    alert_id:           str
    zone_id:            str
    venue_id:           str
    level:              AlertLevel
    crush_risk_score:   float
    density_score:      float
    velocity_score:     float
    convergence_score:  float
    acceleration_score: float
    trigger_source:     str
    timestamp:          str
    auto_actions:       list[str] = []


class NavigationNode(BaseModel):
    node_id:            str
    floor:              int
    coords:             list[float]
    node_type:          str
    accessible:         bool = True
    connected_node_ids: list[str] = []


class EvacuationRoute(BaseModel):
    route_id:                    str
    for_zone_id:                 str
    exit_node_id:                str
    node_sequence:               list[str]
    estimated_evac_time_seconds: float
    accessibility_suitable:      bool
    recommended:                 bool
    crowd_score:                 float
    timestamp:                   str
