"""
Tests for EvacuationRouter — validates multi-source reverse Dijkstra,
emergency vehicle exclusion, exit blocking, density-weighted edges,
and the recommended flag.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from src.evacuation_router import EvacuationRouter
from src.schemas import NavigationNode


@pytest.fixture
def router():
    """
    Graph layout (all y=0 for simplicity):

        node-1 [0,0] ─── node-2 [10,0] ─── exit-1 [20,0]
                 \
                  emv-1 [5,5]  (EMERGENCY_VEHICLE_ONLY — must be skipped)

    node-1 connects to: node-2, emv-1
    node-2 connects to: node-1, exit-1
    exit-1 connects to: node-2
    emv-1  connects to: node-1
    """
    nodes = [
        NavigationNode(
            node_id='node-1', floor=0, coords=[0.0, 0.0],
            node_type='WALKABLE_JUNCTION',
            connected_node_ids=['node-2', 'emv-1']
        ),
        NavigationNode(
            node_id='node-2', floor=0, coords=[10.0, 0.0],
            node_type='WALKABLE_JUNCTION',
            connected_node_ids=['node-1', 'exit-1']
        ),
        NavigationNode(
            node_id='exit-1', floor=0, coords=[20.0, 0.0],
            node_type='EXIT',
            connected_node_ids=['node-2']
        ),
        NavigationNode(
            node_id='emv-1', floor=0, coords=[5.0, 5.0],
            node_type='EMERGENCY_VEHICLE_ONLY',
            connected_node_ids=['node-1']
        ),
    ]
    r = EvacuationRouter()
    r.load_graph(nodes)
    return r


def test_basic_route_computed(router):
    result = router.compute_evacuation_routes(['node-1'])
    assert isinstance(result, dict)
    assert 'node-1' in result
    routes = result['node-1']
    assert len(routes) > 0
    assert routes[0].exit_node_id == 'exit-1'


def test_emergency_vehicle_nodes_excluded(router):
    result = router.compute_evacuation_routes(['node-1'])
    for zone_routes in result.values():
        for route in zone_routes:
            assert 'emv-1' not in route.node_sequence


def test_blocked_exit_removes_route(router):
    router.block_exit('exit-1')
    result = router.compute_evacuation_routes(['node-1'])
    assert result.get('node-1', []) == []


def test_density_increases_edge_weight(router):
    # High density at intermediate node (node-2 is traversed on path to exit)
    router.update_densities({'node-2': 4.0, 'exit-1': 0.0})
    result_high = router.compute_evacuation_routes(['node-1'])
    time_high = result_high['node-1'][0].estimated_evac_time_seconds

    # Zero density
    router.update_densities({'node-2': 0.0, 'exit-1': 0.0})
    result_low = router.compute_evacuation_routes(['node-1'])
    time_low = result_low['node-1'][0].estimated_evac_time_seconds

    assert time_high > time_low


def test_recommended_flag_on_first_route(router):
    result = router.compute_evacuation_routes(['node-1'])
    routes = result['node-1']
    if len(routes) >= 1:
        assert routes[0].recommended is True
    for route in routes[1:]:
        assert route.recommended is False
