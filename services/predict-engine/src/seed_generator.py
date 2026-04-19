import asyncio
import asyncpg
import redis.asyncio as aioredis
import uuid
import random
import json
from datetime import datetime, timezone, timedelta
from faker import Faker
import bcrypt

fake = Faker('en_IN')

EVENT_ID    = 'evt-premier-league-finals-001'
VENUE_ID    = 'venue-manchester-arena-001'
EVENT_START = datetime(2025, 5, 15, 19, 45, 0, tzinfo=timezone.utc)


async def generate_all(db_url: str, redis_url: str):
    conn = await asyncpg.connect(db_url)
    r    = await aioredis.from_url(redis_url, decode_responses=True)
    print('[Seed] Starting ANTIGRAVITY demo data generation...')
    try:
        await _seed_venue(conn)
        await _seed_event(conn)
        await _seed_zones(conn)
        await _seed_queue_points(conn)
        await _seed_users(conn, r)
        await _seed_incident_history(conn)
        await _seed_virtual_tokens(conn)
        await _seed_redis_state(r)
        print('[Seed] Done — all demo data generated.')
    finally:
        await conn.close()
        await r.aclose()


async def _seed_venue(conn):
    await conn.execute('''
        INSERT INTO venues (id, name, total_capacity, address, city, geofence, total_floors, config)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT DO NOTHING
    ''', VENUE_ID, 'Manchester Arena', 45000,
        'Victoria Station, Manchester', 'Manchester',
        json.dumps({'type': 'Polygon', 'coordinates': [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}),
        3,
        json.dumps({'timezone': 'Europe/London', 'sport': 'football'})
    )
    print('[Seed] Venue created')


async def _seed_event(conn):
    await conn.execute('''
        INSERT INTO events
            (id, venue_id, name, sport, home_team, away_team,
             rivalry_index, start_time, expected_attendance, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT DO NOTHING
    ''', EVENT_ID, VENUE_ID, 'Premier League Finals', 'football',
        'Manchester City', 'Manchester United', 0.95,
        EVENT_START, 43000, 'LIVE'
    )
    print('[Seed] Event created')


async def _seed_zones(conn):
    zones = [
        ('zone-gate-nw',    'Gate NW',          0, 'ENTRY',      4.5, 3000),
        ('zone-north-stand','North Stand',       1, 'STAND',      4.5, 12000),
        ('zone-gate-ne',    'Gate NE',           0, 'ENTRY',      4.5, 3000),
        ('zone-west-stand', 'West Stand',        1, 'STAND',      4.5, 8000),
        ('zone-east-stand', 'East Stand',        1, 'STAND',      4.5, 8000),
        ('zone-south-food', 'South Food Court',  0, 'FOOD_COURT', 3.0, 4000),
        ('zone-gate-sw',    'Gate SW',           0, 'EXIT',       4.5, 3000),
        ('zone-gate-se',    'Gate SE',           0, 'EXIT',       4.5, 3000),
    ]
    for z in zones:
        await conn.execute('''
            INSERT INTO crowd_zones
                (id, venue_id, floor, name, polygon_coords,
                 max_safe_density, max_capacity, type)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT DO NOTHING
        ''', z[0], VENUE_ID, z[2], z[1],
            json.dumps({'type': 'Polygon', 'coordinates': [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}),
            z[4], z[5], z[3]
        )
    print('[Seed] 8 zones created')


async def _seed_queue_points(conn):
    points = [
        ('qp-gate-a',      'Gate A – Main Entry',  'ENTRY',       0, 8,  60.0),
        ('qp-gate-b',      'Gate B – North',       'ENTRY',       0, 6,  55.0),
        ('qp-food-west',   'Food Court West',      'FOOD',        0, 4,  3.0),
        ('qp-restroom-l1', 'Restrooms L1',         'RESTROOM',    1, 10, 8.0),
        ('qp-merchandise', 'Merchandise Hub',      'MERCHANDISE', 0, 3,  2.5),
    ]
    for p in points:
        await conn.execute('''
            INSERT INTO queue_points
                (id, venue_id, name, type, floor, location_coords,
                 max_servers, avg_service_rate_per_server)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT DO NOTHING
        ''', p[0], VENUE_ID, p[1], p[2], p[3],
            json.dumps({'lat': 53.4839, 'lng': -2.2446}),
            p[4], p[5]
        )
    print('[Seed] 5 queue points created')


async def _seed_users(conn, r):
    hashed_pw = bcrypt.hashpw(b'Demo1234!', bcrypt.gensalt()).decode()
    TIERS = [
        ('BRONZE',   0,    200),
        ('SILVER',   500,  800),
        ('GOLD',     1500, 2200),
        ('PLATINUM', 3000, 5000)
    ]
    for i in range(100):
        uid        = str(uuid.uuid4())
        fn, ln     = fake.first_name(), fake.last_name()
        tier_name, min_pts, max_pts = random.choice(TIERS)
        pts        = random.randint(min_pts, max_pts)
        email      = f'{fn.lower()}.{ln.lower()}{i}@fan.antigravity.test'

        await conn.execute('''
            INSERT INTO users (id, email, "hashedPassword", role, "firstName", "lastName")
            VALUES ($1,$2,$3,'ATTENDEE',$4,$5)
            ON CONFLICT DO NOTHING
        ''', uid, email, hashed_pw, fn, ln)

        await conn.execute('''
            INSERT INTO fan_profiles
                (id, total_lifetime_points, current_balance_points, tier, events_attended)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT DO NOTHING
        ''', uid, pts, max(0, pts - random.randint(0, 100)), tier_name, random.randint(1, 20))

        await r.zadd(f'leaderboard:event:{EVENT_ID}',  {uid: pts})
        await r.zadd(f'leaderboard:alltime:{VENUE_ID}', {uid: pts})

    print('[Seed] 100 fan profiles created')


async def _seed_incident_history(conn):
    incident_types = [
        'CROWD_CRUSH', 'FIGHT', 'MEDICAL', 'MEDICAL', 'CROWD_CRUSH', 'MEDICAL',
        'GENERAL', 'GENERAL', 'FIGHT', 'MEDICAL', 'GENERAL', 'CROWD_CRUSH'
    ]
    for i, itype in enumerate(incident_types):
        ago = timedelta(hours=random.randint(1, 72))
        created_at  = datetime.now(timezone.utc) - ago
        resolved_at = created_at + timedelta(minutes=random.randint(5, 30))
        await conn.execute('''
            INSERT INTO incidents
                (id, event_id, zone_id, reported_by_id, type, severity,
                 description, status, created_at, resolved_at)
            VALUES ($1,$2,$3,'00000000-0000-0000-0000-000000000001',$4,$5,$6,'RESOLVED',$7,$8)
            ON CONFLICT DO NOTHING
        ''', str(uuid.uuid4()), EVENT_ID, 'zone-east-stand', itype,
            random.choice(['LOW', 'MEDIUM', 'HIGH']),
            f'Auto-resolved incident #{i + 1} — detected and cleared by ANTIGRAVITY',
            created_at, resolved_at
        )
    print('[Seed] 12 historical incidents created')


async def _seed_virtual_tokens(conn):
    statuses = ['WAITING', 'WAITING', 'WAITING', 'CALLED', 'USED', 'USED', 'USED', 'EXPIRED']
    for _ in range(50):
        status = random.choice(statuses)
        await conn.execute('''
            INSERT INTO virtual_tokens
                (id, user_id, queue_point_id, event_id,
                 issued_at, estimated_call_time, status, position_in_queue)
            VALUES
                ($1,'00000000-0000-0000-0000-000000000002','qp-food-west',$2,
                 NOW(),$3,$4,$5)
            ON CONFLICT DO NOTHING
        ''', str(uuid.uuid4()), EVENT_ID,
            datetime.now(timezone.utc) + timedelta(minutes=random.randint(2, 25)),
            status, random.randint(1, 80)
        )
    print('[Seed] Virtual token history seeded')


async def _seed_redis_state(r):
    # CRITICAL: exact values — demo dashboard reads these directly
    DENSITIES = {
        'zone-east-stand':  0.91,  # WARNING level — most impressive demo metric
        'zone-north-stand': 0.78,
        'zone-south-food':  0.84,
        'zone-gate-a':      0.65,
        'zone-gate-b':      0.42
    }
    for zone_id, density in DENSITIES.items():
        state = {
            'zone_id':                zone_id,
            'venue_id':               VENUE_ID,
            'floor':                  1,
            'current_density':        density,
            'max_safe_density':       4.5,
            'density_trend':          'RISING' if density > 0.7 else 'STABLE',
            'predicted_density_10min': min(1.0, density * 1.1),
            'alert_level':            ('CRITICAL' if density > 0.85 else
                                       'WARNING'  if density > 0.65 else 'NORMAL'),
            'crush_risk_score':       round(max(0, (density - 0.4) * 1.2), 3),
            'timestamp':              datetime.now(timezone.utc).isoformat()
        }
        await r.set(f'zone:density:{zone_id}', json.dumps(state), ex=30)

    # Queue wait times
    queue_waits = {
        'qp-gate-a':      22.0,   # 22-minute wait — key demo talking point
        'qp-gate-b':      8.0,
        'qp-food-west':   18.0,
        'qp-restroom-l1': 4.0,
        'qp-merchandise': 11.0
    }
    for qp_id, wait in queue_waits.items():
        await r.set(f'queue:wait:{qp_id}', str(wait), ex=60)

    print('[Seed] Redis state injected (East Stand 91%, Gate A 22min wait)')


if __name__ == '__main__':
    import os
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(generate_all(
        os.environ['DATABASE_URL'],
        os.environ['REDIS_URL']
    ))
