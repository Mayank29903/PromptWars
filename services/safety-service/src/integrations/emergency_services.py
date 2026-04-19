import httpx
from ..config import config


class EmergencyServicesIntegration:
    async def send_alert(self, alert, evac_routes: dict):
        if not config.EMERGENCY_SERVICES_URL:
            print(
                f'[EmergencyServices] (simulation) Alert sent: '
                f'{alert.level} zone={alert.zone_id}'
            )
            return
        try:
            payload = {
                'incident_type':    'CROWD_CRUSH',
                'location':         alert.zone_id,
                'venue_id':         alert.venue_id,
                'severity':         alert.level.value,
                'crush_risk_score': alert.crush_risk_score,
                'timestamp':        alert.timestamp
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    config.EMERGENCY_SERVICES_URL + '/api/incident',
                    json=payload
                )
                print('[EmergencyServices] Alert sent successfully')
        except Exception as e:
            print(f'[EmergencyServices] Send failed (non-fatal): {e}')

    async def trigger_phone_call(self, alert):
        print(
            f'[EmergencyServices] (simulation) Phone call triggered '
            f'for CRITICAL alert zone={alert.zone_id}'
        )
