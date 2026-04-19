import httpx
from ..config import config

MESSAGES = {
    'caution':   'Attention please. For your comfort, please move to less crowded areas. Follow staff guidance.',
    'warning':   'Important announcement. Please move toward the exits shown on screens. Do not run.',
    'emergency': 'Emergency evacuation in progress. Move calmly to the nearest exit. Follow staff immediately.',
    'all_clear': 'The situation has been resolved. Thank you for your cooperation.'
}


class PaSystem:
    async def broadcast(self, level: str):
        message = MESSAGES.get(level, MESSAGES['caution'])
        if not config.PA_SYSTEM_URL:
            print(f'[PA] (simulation) Broadcasting: {message[:60]}...')
            return
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(
                    config.PA_SYSTEM_URL + '/api/broadcast',
                    json={'message': message, 'repeat': 3, 'priority': 'HIGH'}
                )
                print(f'[PA] Broadcast sent: {level}')
        except Exception as e:
            print(f'[PA] Broadcast failed (non-fatal): {e}')
