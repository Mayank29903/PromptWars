import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT: int = int(os.getenv('PORT', '8003'))
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'postgresql://antigravity:DevHackathon2024!@localhost:5432/antigravity')

config = Config()
