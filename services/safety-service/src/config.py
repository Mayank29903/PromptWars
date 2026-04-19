import os
from dotenv import load_dotenv
load_dotenv()


def required(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f'Missing required env var: {name}')
    return v


class Config:
    KAFKA_BROKERS: list[str] = required('KAFKA_BROKERS').split(',')
    REDIS_URL: str = required('REDIS_URL')
    API_GATEWAY_URL: str = required('API_GATEWAY_URL')
    REALTIME_SERVICE_URL: str = os.getenv('REALTIME_SERVICE_URL', 'http://localhost:3001')
    PA_SYSTEM_URL: str = os.getenv('PA_SYSTEM_URL', '')
    SIGNAGE_API_URL: str = os.getenv('SIGNAGE_API_URL', '')
    EMERGENCY_SERVICES_URL: str = os.getenv('EMERGENCY_SERVICES_URL', '')
    PORT: int = int(os.getenv('PORT', '8001'))


config = Config()
