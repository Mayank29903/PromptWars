from pydantic import BaseModel

class SimRequest(BaseModel):
    event_id: str
    n_runs: int = 10
    n_agents: int = 1000
