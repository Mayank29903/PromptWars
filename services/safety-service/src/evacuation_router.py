import heapq
import math
import uuid
from datetime import datetime, timezone
from .schemas import NavigationNode, EvacuationRoute


class EvacuationRouter:
    """
    Multi-source reverse Dijkstra from all EXIT nodes simultaneously.
    Objective: minimise maximum evacuation time (minimax formulation).
    Uses heapq — NOT a sorted list.
    """

    CORRIDOR_MAX_DENSITY_EVAC = 4.0
    EMERGENCY_VEHICLE_NODE_TYPE = 'EMERGENCY_VEHICLE_ONLY'

    def __init__(self):
        self.nodes:           dict[str, NavigationNode] = {}
        self.densities:       dict[str, float]          = {}
        self.blocked_exits:   set[str]                  = set()
        self.exit_capacities: dict[str, float]          = {}

    def load_graph(self, nodes: list[NavigationNode]):
        self.nodes = {n.node_id: n for n in nodes}

    def update_densities(self, densities: dict[str, float]):
        self.densities = densities

    def block_exit(self, node_id: str):
        self.blocked_exits.add(node_id)

    def unblock_exit(self, node_id: str):
        self.blocked_exits.discard(node_id)

    def _edge_weight(
        self,
        from_id: str,
        to_id: str,
        accessibility_only: bool = False
    ) -> float | None:
        to_node = self.nodes.get(to_id)
        if not to_node:
            return None
        # Hard constraint: skip accessibility-only paths for stairs
        if accessibility_only and to_node.node_type == 'STAIRS':
            return None
        # Hard constraint: never route through emergency vehicle corridors
        if to_node.node_type == self.EMERGENCY_VEHICLE_NODE_TYPE:
            return None

        from_node = self.nodes.get(from_id)
        if not from_node:
            return None

        dx   = to_node.coords[0] - from_node.coords[0]
        dy   = to_node.coords[1] - from_node.coords[1]
        dist = math.sqrt(dx * dx + dy * dy)

        base_time     = dist / 1.2  # 1.2 m/s evacuation walking speed
        density       = self.densities.get(to_id, 0.0)
        density_ratio = min(1.0, density / self.CORRIDOR_MAX_DENSITY_EVAC)
        weight        = base_time * (1.0 + 4.0 * density_ratio)

        return weight

    def compute_evacuation_routes(
        self,
        zone_ids: list[str],
        accessibility_only: bool = False
    ) -> dict[str, list[EvacuationRoute]]:
        """
        Multi-source Dijkstra on the REVERSED graph.
        Sources = EXIT/GATE nodes (exits are Dijkstra starting points).
        Each node records which exit it is closest to.
        Output: for each zone_id, list of EvacuationRoute ordered by time.
        """
        exit_nodes = [
            n for n in self.nodes.values()
            if n.node_type in ('EXIT', 'GATE')
            and n.node_id not in self.blocked_exits
        ]
        if not exit_nodes:
            return {}

        dist:      dict[str, float]       = {}
        prev:      dict[str, str | None]  = {}
        prev_exit: dict[str, str]         = {}
        heap:      list[tuple[float, str, str]] = []

        for exit_node in exit_nodes:
            dist[exit_node.node_id]      = 0.0
            prev[exit_node.node_id]      = None
            prev_exit[exit_node.node_id] = exit_node.node_id
            heapq.heappush(heap, (0.0, exit_node.node_id, exit_node.node_id))

        while heap:
            cost, node_id, exit_id = heapq.heappop(heap)
            if cost > dist.get(node_id, float('inf')):
                continue
            node = self.nodes.get(node_id)
            if not node:
                continue
            for neighbor_id in node.connected_node_ids:
                w = self._edge_weight(node_id, neighbor_id, accessibility_only)
                if w is None:
                    continue
                new_cost = cost + w
                if new_cost < dist.get(neighbor_id, float('inf')):
                    dist[neighbor_id]      = new_cost
                    prev[neighbor_id]      = node_id
                    prev_exit[neighbor_id] = exit_id
                    heapq.heappush(heap, (new_cost, neighbor_id, exit_id))

        results: dict[str, list[EvacuationRoute]] = {}

        for zone_id in zone_ids:
            zone_routes:   list[EvacuationRoute] = []
            exit_ids_used: set[str]              = set()

            for node_id, cost in sorted(dist.items(), key=lambda x: x[1]):
                if node_id != zone_id:
                    continue
                eid = prev_exit.get(node_id)
                if not eid or eid in exit_ids_used:
                    continue
                exit_ids_used.add(eid)

                # reconstruct path
                path = []
                cur  = node_id
                while cur is not None:
                    path.append(cur)
                    cur = prev.get(cur)
                path.reverse()

                zone_routes.append(EvacuationRoute(
                    route_id                    = str(uuid.uuid4()),
                    for_zone_id                 = zone_id,
                    exit_node_id                = eid,
                    node_sequence               = path,
                    estimated_evac_time_seconds = round(cost, 1),
                    accessibility_suitable      = accessibility_only,
                    recommended                 = len(zone_routes) == 0,
                    crowd_score                 = round(self.densities.get(node_id, 0.0), 3),
                    timestamp                   = datetime.now(timezone.utc).isoformat()
                ))

            results[zone_id] = zone_routes

        return results
