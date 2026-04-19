from ortools.sat.python import cp_model


def optimize_staffing(
    predicted_pressures: dict,
    total_staff:    int = 280,
    n_time_blocks:  int = 8
) -> list[dict]:
    """
    ILP staffing optimiser using Google OR-Tools CP-SAT.
    Minimises unmet coverage across all zones and time blocks.

    Args:
        predicted_pressures: {zone_id: [pressure_0..pressure_N]} (0-1 float)
        total_staff:  total staff budget across all zones per time block
        n_time_blocks: number of 30-minute scheduling windows

    Returns:
        list of {zone_id, time_block, staff_count_required, role_type, ...}
    """
    zones    = list(predicted_pressures.keys())
    n_zones  = len(zones)
    model    = cp_model.CpModel()

    MAX_PER_ZONE = max(2, total_staff // max(1, n_zones))

    staff = {
        (z, t): model.NewIntVar(0, MAX_PER_ZONE, f'staff_{z}_{t}')
        for z in zones
        for t in range(n_time_blocks)
    }
    slack = {
        (z, t): model.NewIntVar(0, 100, f'slack_{z}_{t}')
        for z in zones
        for t in range(n_time_blocks)
    }

    # constraint: total budget per time block
    for t in range(n_time_blocks):
        model.Add(sum(staff[(z, t)] for z in zones) <= total_staff)

    # constraint: zone minimums
    for z in zones:
        for t in range(n_time_blocks):
            model.Add(staff[(z, t)] >= 2)

    # constraint: smooth shift transitions
    for z in zones:
        for t in range(1, n_time_blocks):
            diff     = model.NewIntVar(-20, 20, f'diff_{z}_{t}')
            abs_diff = model.NewIntVar(0,  20, f'abs_diff_{z}_{t}')
            model.Add(diff == staff[(z, t)] - staff[(z, t - 1)])
            model.AddAbsEquality(abs_diff, diff)
            model.Add(abs_diff <= 8)

    # constraint: coverage demand
    for z in zones:
        pressures = predicted_pressures[z]
        for t in range(n_time_blocks):
            tick_idx       = min(t * 6, len(pressures) - 1)
            pressure       = int(pressures[tick_idx] * 100)
            required_staff = max(2, int(pressure / 10))
            model.Add(staff[(z, t)] + slack[(z, t)] >= required_staff)

    # objective: minimise unmet coverage
    model.Minimize(sum(slack[(z, t)] for z in zones for t in range(n_time_blocks)))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30
    status = solver.Solve(model)

    result = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for z in zones:
            for t in range(n_time_blocks):
                result.append({
                    'zone_id':              z,
                    'time_block':           t,
                    'time_block_start_min': t * 30,
                    'time_block_end_min':   (t + 1) * 30,
                    'staff_count_required': solver.Value(staff[(z, t)]),
                    'unmet_slack':          solver.Value(slack[(z, t)]),
                    'role_type':            'SECURITY_LEAD' if 'gate' in z else 'GATE_OFFICER'
                })
    else:
        print(f'[StaffingOptimizer] No solution (status={status}), using defaults')
        for z in zones:
            for t in range(n_time_blocks):
                result.append({
                    'zone_id': z, 'time_block': t,
                    'staff_count_required': 4, 'role_type': 'GATE_OFFICER'
                })
    return result
