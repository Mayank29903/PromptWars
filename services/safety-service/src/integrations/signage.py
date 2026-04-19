import httpx
from ..config import config


class SignageSystem:
    async def show_evacuation_routes(self, venue_id: str, routes: dict):
        if not config.SIGNAGE_API_URL:
            print(f'[Signage] (simulation) Showing evacuation routes for venue {venue_id}')
            return
        try:
            route_data = {
                zone_id: [
                    r.model_dump() if hasattr(r, 'model_dump') else r
                    for r in rs
                ]
                for zone_id, rs in routes.items()
            }
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(
                    config.SIGNAGE_API_URL + '/api/emergency',
                    json={'venue_id': venue_id, 'mode': 'EVACUATION', 'routes': route_data}
                )
                print('[Signage] Evacuation routes pushed to screens')
        except Exception as e:
            print(f'[Signage] Update failed (non-fatal): {e}')
