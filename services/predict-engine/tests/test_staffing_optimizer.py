"""
Tests for StaffingOptimizer — validates OR-Tools CP-SAT ILP output
structure, zone minimums, budget constraints, shift smoothing, and role assignment.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.staffing_optimizer import optimize_staffing


PRESSURES = {
    'north_stand': [0.5] * 48,
    'gate_north':  [0.8] * 48,
}
TOTAL_STAFF = 100
N_TIME_BLOCKS = 4


def _get_result():
    return optimize_staffing(PRESSURES, total_staff=TOTAL_STAFF, n_time_blocks=N_TIME_BLOCKS)


def test_returns_list_of_dicts():
    result = _get_result()
    assert isinstance(result, list)
    assert len(result) > 0
    for item in result:
        assert isinstance(item, dict)
        assert 'zone_id' in item
        assert 'time_block' in item
        assert 'staff_count_required' in item
        assert 'role_type' in item


def test_minimum_staff_per_zone():
    result = _get_result()
    for item in result:
        assert item['staff_count_required'] >= 2


def test_total_staff_budget_respected():
    result = _get_result()
    for t in range(N_TIME_BLOCKS):
        block_total = sum(
            item['staff_count_required']
            for item in result
            if item['time_block'] == t
        )
        assert block_total <= TOTAL_STAFF


def test_shift_smoothing_constraint():
    result = _get_result()
    for zone_id in PRESSURES.keys():
        zone_items = sorted(
            [r for r in result if r['zone_id'] == zone_id],
            key=lambda x: x['time_block']
        )
        for i in range(1, len(zone_items)):
            diff = abs(
                zone_items[i]['staff_count_required']
                - zone_items[i - 1]['staff_count_required']
            )
            assert diff <= 8


def test_gate_zones_get_security_lead_role():
    result = _get_result()
    gate_items = [r for r in result if r['zone_id'] == 'gate_north']
    assert len(gate_items) > 0
    for item in gate_items:
        assert item['role_type'] == 'SECURITY_LEAD'


def test_non_gate_zones_get_gate_officer_role():
    result = _get_result()
    stand_items = [r for r in result if r['zone_id'] == 'north_stand']
    assert len(stand_items) > 0
    for item in stand_items:
        assert item['role_type'] == 'GATE_OFFICER'
