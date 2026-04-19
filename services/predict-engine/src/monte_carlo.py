import numpy as np
from .abs_simulation import VenueSimulation, VenueConfig

DEFAULT_CONFIG = VenueConfig(
    width=200, height=150,
    zones={
        'east_stand':  {'x_range': [150, 200], 'y_range': [40, 110], 'area_sqm': 1200},
        'north_stand': {'x_range': [50, 150],  'y_range': [110, 150], 'area_sqm': 2400},
        'south_stand': {'x_range': [50, 150],  'y_range': [0, 40],   'area_sqm': 2400}
    },
    queue_points=[
        {'type': 'FOOD',     'x': 100, 'y': 75, 'id': 'food_court_west'},
        {'type': 'FOOD',     'x': 140, 'y': 75, 'id': 'food_court_east'},
        {'type': 'RESTROOM', 'x': 60,  'y': 20, 'id': 'restroom_l1'}
    ],
    entry_nodes=[(10, 75), (190, 75), (100, 145)],
    exit_nodes=[(10, 75), (190, 75), (100, 5)]
)


def run_monte_carlo(
    n_agents:             int = 5000,
    n_runs:               int = 50,
    event_duration_ticks: int = 48
) -> dict:
    """
    Run N Monte Carlo simulations of the venue using Mesa ABS.
    Returns P25, P50, P85 density timelines per zone.
    n_agents=5000 for hackathon speed (full scale = 45k).
    """
    all_runs: list[dict[str, list[float]]] = []

    for run_i in range(n_runs):
        sim = VenueSimulation(
            n_agents=n_agents,
            venue_config=DEFAULT_CONFIG,
            event_duration_ticks=event_duration_ticks
        )
        run_densities: dict[str, list[float]] = {}
        for _tick in range(event_duration_ticks):
            sim.step()
            for zone, density in sim.get_zone_densities().items():
                run_densities.setdefault(zone, []).append(density)
        all_runs.append(run_densities)
        if (run_i + 1) % 10 == 0:
            print(f'[MonteCarlo] Completed {run_i + 1}/{n_runs} runs')

    zones = list(all_runs[0].keys()) if all_runs else []

    result = {'P25': {}, 'P50': {}, 'P85': {}}
    for zone in zones:
        stacked = np.array([run[zone] for run in all_runs if zone in run])
        result['P25'][zone] = np.percentile(stacked, 25, axis=0).tolist()
        result['P50'][zone] = np.percentile(stacked, 50, axis=0).tolist()
        result['P85'][zone] = np.percentile(stacked, 85, axis=0).tolist()

    peak_windows = []
    for zone, timeline in result['P50'].items():
        for tick, density in enumerate(timeline):
            if density > 0.7:
                peak_windows.append({
                    'tick':                       tick,
                    'time_minutes_from_kickoff':  (tick - 9) * 5,
                    'zone_id':                    zone,
                    'predicted_density':          round(density, 3),
                    'scenario':                   'P50'
                })
    peak_windows.sort(key=lambda x: x['predicted_density'], reverse=True)

    east_p85  = result['P85'].get('east_stand', [0] * event_duration_ticks)
    val_61min = east_p85[12] if len(east_p85) > 12 else 0
    print(f'[MonteCarlo] East Stand at tick 12 (61 min): {val_61min:.3f} (P85)')

    return {
        'scenarios':                   result,
        'peak_congestion_windows':     peak_windows[:20],
        'east_stand_at_61min_p85':     round(val_61min, 3),
        'n_runs':                      n_runs,
        'n_agents':                    n_agents
    }
