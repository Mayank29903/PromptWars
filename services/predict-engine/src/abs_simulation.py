import mesa
import numpy as np
from dataclasses import dataclass, field


@dataclass
class VenueConfig:
    width:       int  = 200
    height:      int  = 150
    zones:       dict = field(default_factory=dict)
    queue_points: list = field(default_factory=list)
    entry_nodes: list = field(default_factory=list)
    exit_nodes:  list = field(default_factory=list)


class AttendeeAgent(mesa.Agent):
    def __init__(
        self,
        unique_id:       int,
        model,
        agent_type:      str,
        arrival_tick:    int,
        seat_x:          int,
        seat_y:          int,
        compliance_rate: float = 0.65
    ):
        super().__init__(unique_id, model)
        self.agent_type      = agent_type
        self.arrival_tick    = arrival_tick
        self.seat_x          = seat_x
        self.seat_y          = seat_y
        self.compliance_rate = compliance_rate
        self.arrived         = False
        self.state           = 'PRE_ARRIVAL'

        self.hunger_level       = np.random.uniform(0, 1)
        self.restroom_need      = np.random.uniform(0, 1)
        self.hunger_threshold   = np.random.uniform(0.6, 0.9)
        self.restroom_threshold = np.random.uniform(0.7, 0.95)
        self.ticks_since_food      = np.random.randint(0, 10)
        self.ticks_since_restroom  = np.random.randint(0, 15)

    def step(self):
        if not self.arrived:
            if self.model.schedule.time >= self.arrival_tick:
                if self.model.venue_config.entry_nodes:
                    entry = np.random.choice(self.model.venue_config.entry_nodes)
                    self.pos   = tuple(entry)
                    self.arrived = True
                    self.state   = 'MOVING_TO_SEAT'
            return

        self.hunger_level      += 0.02
        self.restroom_need     += 0.015
        self.ticks_since_food      += 1
        self.ticks_since_restroom  += 1

        if self.model.reroute_active and np.random.random() < self.compliance_rate:
            self._move_toward_alternate()
            return

        if self.hunger_level > self.hunger_threshold and self.ticks_since_food > 6:
            self._move_toward_food()
            return

        if self.restroom_need > self.restroom_threshold and self.ticks_since_restroom > 8:
            self._move_toward_restroom()
            return

        if self.state == 'MOVING_TO_SEAT':
            self._move_toward(self.seat_x, self.seat_y)
            if abs(self.pos[0] - self.seat_x) < 3 and abs(self.pos[1] - self.seat_y) < 3:
                self.state = 'AT_SEAT'

    def _move_toward(self, tx: int, ty: int, speed: int = 2):
        x, y = self.pos
        dx   = int(np.clip(tx - x, -speed, speed))
        dy   = int(np.clip(ty - y, -speed, speed))
        nx   = max(0, min(x + dx, self.model.grid.width  - 1))
        ny   = max(0, min(y + dy, self.model.grid.height - 1))
        self.model.grid.move_agent(self, (nx, ny))

    def _move_toward_food(self):
        fp = [q for q in self.model.venue_config.queue_points if q.get('type') == 'FOOD']
        if fp:
            food = np.random.choice(fp)
            self._move_toward(food['x'], food['y'])
            if abs(self.pos[0] - food['x']) < 3:
                self.hunger_level     = 0.0
                self.ticks_since_food = 0

    def _move_toward_restroom(self):
        rx, ry = self.model.grid.width // 2, self.model.grid.height // 4
        self._move_toward(rx, ry)
        if abs(self.pos[0] - rx) < 3:
            self.restroom_need        = 0.0
            self.ticks_since_restroom = 0

    def _move_toward_alternate(self):
        if self.model.venue_config.exit_nodes:
            exit_node = self.model.venue_config.exit_nodes[0]
            self._move_toward(exit_node[0], exit_node[1])


ZONE_CELL_COUNTS = {
    'north_stand': 2400, 'south_stand': 2400,
    'east_stand':  1200, 'west_stand':  1200,
    'gate_nw': 400,  'gate_ne': 400,
    'gate_sw': 400,  'gate_se': 400,
    'food_court': 800
}


class VenueSimulation(mesa.Model):
    def __init__(
        self,
        n_agents:             int,
        venue_config:         VenueConfig,
        event_duration_ticks: int = 48,
        halftime_tick:        int = 9,
        reroute_enabled:      bool = True
    ):
        super().__init__()
        self.venue_config         = venue_config
        self.event_duration_ticks = event_duration_ticks
        self.halftime_tick        = halftime_tick
        self.reroute_active       = False

        self.grid      = mesa.space.MultiGrid(venue_config.width, venue_config.height, torus=False)
        self.schedule  = mesa.time.RandomActivation(self)
        self.datacollector = mesa.DataCollector(
            model_reporters={
                'total_arrived': lambda m: sum(1 for a in m.schedule.agents if a.arrived)
            }
        )

        SPLITS = {'EARLY_BIRD': 0.15, 'ON_TIME': 0.45, 'LATE': 0.30, 'STAFF': 0.10}
        types  = list(SPLITS.keys())
        probs  = list(SPLITS.values())

        for i in range(n_agents):
            atype = np.random.choice(types, p=probs)
            if atype == 'EARLY_BIRD':
                arrival = max(0, int(np.random.normal(-10, 3)))
            elif atype == 'ON_TIME':
                arrival = max(0, int(np.random.normal(-4, 2)))
            elif atype == 'LATE':
                arrival = max(0, int(np.random.normal(-1, 2)))
            else:
                arrival = 0

            sx = np.random.randint(50, 150)
            sy = np.random.randint(40, 110)
            cr = np.random.uniform(0.5, 0.8)

            agent = AttendeeAgent(i, self, atype, arrival, sx, sy, cr)
            self.schedule.add(agent)
            self.grid.place_agent(
                agent,
                (np.random.randint(0, venue_config.width),
                 np.random.randint(0, venue_config.height))
            )

    def step(self):
        if self.schedule.time == self.halftime_tick:
            self.reroute_active = True
        self.datacollector.collect(self)
        self.schedule.step()

    def get_zone_densities(self) -> dict:
        zone_counts: dict[str, int] = {}
        for agent in self.schedule.agents:
            if not agent.arrived:
                continue
            x, y = agent.pos
            zone = self._get_zone_for_pos(x, y)
            zone_counts[zone] = zone_counts.get(zone, 0) + 1
        return {
            zone: count / ZONE_CELL_COUNTS.get(zone, 1000)
            for zone, count in zone_counts.items()
        }

    def _get_zone_for_pos(self, x: int, y: int) -> str:
        if y > 110:               return 'north_stand'
        if y < 40:                return 'south_stand'
        if x > 150:               return 'east_stand'
        if x < 50:                return 'west_stand'
        if x < 30 and y > 110:   return 'gate_nw'
        if x > 170 and y > 110:  return 'gate_ne'
        if x < 30 and y < 40:    return 'gate_sw'
        if x > 170 and y < 40:   return 'gate_se'
        return 'food_court'
