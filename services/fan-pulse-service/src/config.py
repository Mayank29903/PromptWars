import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT: int = int(os.getenv('PORT', '8002'))
    KAFKA_BROKERS: list[str] = os.getenv('KAFKA_BROKERS', 'localhost:9092').split(',')
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379')
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'postgresql://antigravity:password@localhost:5432/antigravity')

config = Config()
