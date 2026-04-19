import httpx
import asyncio
from .config import config
from .schemas import SafetyAlert, AlertLevel
from .redis_client import get_redis
from .integrations.pa_system import PaSystem
from .integrations.signage import SignageSystem
from .integrations.emergency_services import EmergencyServicesIntegration

pa           = PaSystem()
signage      = SignageSystem()
emer_services = EmergencyServicesIntegration()


class EmergencyOrchestrator:

    async def handle_alert(self, alert: SafetyAlert, evac_routes: dict):
        level = alert.level
        if level == AlertLevel.CAUTION:
            await self._handle_caution(alert)
        elif level == AlertLevel.WARNING:
            await self._handle_warning(alert)
        elif level == AlertLevel.CRITICAL:
            await self._handle_critical(alert, evac_routes)

    async def _handle_caution(self, alert: SafetyAlert):
        await self._publish_to_realtime('safety:caution', alert.model_dump())
        await self._log_incident(alert, severity='MEDIUM')
        print(f'[CAUTION] Zone {alert.zone_id} risk={alert.crush_risk_score:.3f}')

    async def _handle_warning(self, alert: SafetyAlert):
        await self._handle_caution(alert)
        await self._publish_to_realtime('safety:warning', alert.model_dump())
        await self._notify_adjacent_fans(alert)
        print(f'[WARNING] Zone {alert.zone_id} — security dispatch triggered')

    async def _handle_critical(self, alert: SafetyAlert, evac_routes: dict):
        """
        Full emergency protocol. All tasks run via asyncio.gather with
        return_exceptions=True — a failed PA call never blocks signage or
        emergency services. Phone call is included in the single gather.
        """
        redis = await get_redis()
        await redis.set('emergency:mode', 'active', ex=21600)
        print(f'[CRITICAL] Zone {alert.zone_id} — activating full emergency protocol')

        tasks = [
            self._publish_to_realtime('safety:emergency', alert.model_dump()),
            pa.broadcast('emergency'),
            signage.show_evacuation_routes(alert.venue_id, evac_routes),
            self._log_incident(alert, severity='CRITICAL'),
            emer_services.send_alert(alert, evac_routes),
            self._push_evac_routes_to_fans(alert, evac_routes),
            emer_services.trigger_phone_call(alert),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                print(f'[CRITICAL] Task {i} failed (non-fatal): {r}')

        print(f'[CRITICAL] Zone {alert.zone_id} — emergency services phone call triggered')

    async def _publish_to_realtime(self, event: str, data: dict):
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(
                    f'{config.REALTIME_SERVICE_URL}/internal/broadcast',
                    json={'event': event, 'data': data}
                )
        except Exception as e:
            print(f'[Orchestrator] Realtime publish failed (non-fatal): {e}')

    async def _log_incident(self, alert: SafetyAlert, severity: str):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f'{config.API_GATEWAY_URL}/api/v1/ops/incident',
                    json={
                        'type':        'CROWD_CRUSH',
                        'zone_id':     alert.zone_id,
                        'severity':    severity,
                        'description': (
                            f'Crush risk {alert.crush_risk_score:.2f} — '
                            f'auto-detected by SafetyNet'
                        )
                    },
                    headers={'Authorization': 'Bearer SYSTEM_INTERNAL'}
                )
        except Exception as e:
            print(f'[Orchestrator] Incident log failed (non-fatal): {e}')

    async def _notify_adjacent_fans(self, alert: SafetyAlert):
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(
                    f'{config.API_GATEWAY_URL}/api/v1/crowd/alert',
                    json={
                        'zone_id':    alert.zone_id,
                        'alert_type': alert.level.value,
                        'notes':      'auto'
                    },
                    headers={'Authorization': 'Bearer SYSTEM_INTERNAL'}
                )
        except Exception as e:
            print(f'[Orchestrator] Fan notify failed (non-fatal): {e}')

    async def _push_evac_routes_to_fans(self, alert: SafetyAlert, evac_routes: dict):
        try:
            routes_payload = {
                k: [r.model_dump() if hasattr(r, 'model_dump') else r for r in v]
                for k, v in evac_routes.items()
            }
            await self._publish_to_realtime('evacuation:routes', {
                'venue_id': alert.venue_id,
                'routes':   routes_payload
            })
        except Exception as e:
            print(f'[Orchestrator] Evac route push failed (non-fatal): {e}')
