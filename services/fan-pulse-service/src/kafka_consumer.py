import asyncio
from aiokafka import AIOKafkaProducer
from .config import config

_producer: AIOKafkaProducer | None = None

async def init_kafka_producer():
    global _producer
    if _producer is None:
        _producer = AIOKafkaProducer(bootstrap_servers=config.KAFKA_BROKERS)
        await _producer.start()

async def get_kafka_producer() -> AIOKafkaProducer:
    if _producer is None:
        await init_kafka_producer()
    return _producer

async def close_kafka_producer():
    if _producer:
        await _producer.stop()
