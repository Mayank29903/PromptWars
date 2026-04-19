import asyncio
import json
from aiokafka import AIOKafkaConsumer
from .config import config
from .schemas import ZoneSnapshot
from .crush_detector import CrushRiskDetector
from .evacuation_router import EvacuationRouter
from .emergency_orchestrator import EmergencyOrchestrator

detector     = CrushRiskDetector()
router       = EvacuationRouter()
orchestrator = EmergencyOrchestrator()

zone_density_history: dict[str, list[float]] = {}


async def start_safety_consumer():
    consumer = AIOKafkaConsumer(
        'crowd.zone.state',
        bootstrap_servers=config.KAFKA_BROKERS,
        group_id='cg-safety-detector',
        auto_offset_reset='latest',
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    await consumer.start()
    print('[SafetyNet] Kafka consumer started — monitoring crowd.zone.state')
    try:
        async for msg in consumer:
            await process_zone_update(msg.value)
    finally:
        await consumer.stop()


async def process_zone_update(data: dict):
    try:
        zone_id = data.get('zone_id')
        if not zone_id:
            return

        history = zone_density_history.setdefault(zone_id, [])
        history.append(data.get('current_density', 0.0))
        if len(history) > 12:
            history.pop(0)

        snapshot = ZoneSnapshot(
            zone_id          = zone_id,
            venue_id         = data.get('venue_id', 'default'),
            floor            = data.get('floor', 0),
            current_density  = data.get('current_density', 0.0),
            avg_velocity_mps = data.get('avg_velocity_mps', 0.8),
            flow_vectors     = data.get('flow_vectors', []),
            density_history  = history.copy(),
            timestamp        = data.get('timestamp', '')
        )

        alert = detector.evaluate(snapshot)
        if not alert:
            return

        print(
            f'[SafetyNet] ALERT zone={zone_id} '
            f'level={alert.level} risk={alert.crush_risk_score:.3f}'
        )

        router.update_densities({
            k: h[-1] for k, h in zone_density_history.items() if h
        })
        evac_routes = router.compute_evacuation_routes([zone_id])

        await orchestrator.handle_alert(alert, evac_routes)

    except Exception as e:
        print(f'[SafetyNet] Error processing zone update: {e}')
