import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin1234!', 12);
  const managerPassword = await bcrypt.hash('Manager1234!', 12);
  const attendeePassword = await bcrypt.hash('Fan1234!!', 12);

  // 1. Venue
  const venue = await prisma.venue.create({
    data: {
      name: 'Manchester Arena',
      totalCapacity: 45000,
      address: 'Victoria Station Approach, Manchester M3 1AR, United Kingdom',
      city: 'Manchester',
      geofence: { type: 'Polygon', coordinates: [] }, // simplified
      totalFloors: 3,
      config: { gateCount: 4, foodCourts: 2 },
      floors: {
        create: [
          { floorNumber: 1, beaconCount: 50 },
          { floorNumber: 2, beaconCount: 40 },
          { floorNumber: 3, beaconCount: 30 }
        ]
      }
    }
  });

  // 2. CrowdZones (9 total)
  const zoneTypes = ['ENTRY', 'ENTRY', 'ENTRY', 'STAND', 'STAND', 'PITCH', 'FOOD_COURT', 'EXIT', 'EXIT'];
  const zoneNames = ['NW Gate', 'N Gate', 'NE Gate', 'W Stand', 'E Stand', 'Pitch', 'S Food Court', 'SW Exit', 'SE Exit'];
  for (let i = 0; i < 9; i++) {
    await prisma.crowdZone.create({
      data: {
        venueId: venue.id,
        floor: 1,
        name: zoneNames[i],
        polygonCoords: { type: 'Polygon', coordinates: [] }, // simplified
        maxCapacity: 5000,
        type: zoneTypes[i]
      }
    });
  }

  // 3. QueuePoints (5 total)
  const queueData = [
    { name: 'Gate A Main Entry', type: 'ENTRY', floor: 1 },
    { name: 'Gate B North', type: 'ENTRY', floor: 1 },
    { name: 'Food Court West', type: 'FOOD', floor: 2 },
    { name: 'Restrooms L1', type: 'RESTROOM', floor: 1 },
    { name: 'Merchandise Hub', type: 'MERCHANDISE', floor: 1 }
  ];
  for (const q of queueData) {
    await prisma.queuePoint.create({
      data: {
        venueId: venue.id,
        name: q.name,
        type: q.type,
        floor: q.floor,
        locationCoords: { type: 'Point', coordinates: [0, 0] },
        maxServers: 5,
        avgServiceRatePerServer: 4.5
      }
    });
  }

  // 4. Upcoming Event
  const event = await prisma.event.create({
    data: {
      venueId: venue.id,
      name: 'Premier League Finals',
      sport: 'Football',
      homeTeam: 'Manchester United',
      awayTeam: 'Manchester City',
      rivalryIndex: 0.92,
      startTime: new Date(Date.now() + 86400000), // tomorrow
      expectedAttendance: 45000,
      status: 'UPCOMING'
    }
  });

  // 5. Users
  await prisma.user.create({
    data: {
      email: 'admin@antigravity.venue',
      hashedPassword,
      role: 'SUPER_ADMIN',
      firstName: 'Super',
      lastName: 'Admin'
    }
  });

  await prisma.user.create({
    data: {
      email: 'manager@antigravity.venue',
      hashedPassword: managerPassword,
      role: 'VENUE_MANAGER',
      firstName: 'Venue',
      lastName: 'Manager'
    }
  });

  for (let i = 1; i <= 3; i++) {
    const attendee = await prisma.user.create({
      data: {
        email: `fan${i}@antigravity.venue`,
        hashedPassword: attendeePassword,
        role: 'ATTENDEE',
        firstName: `Fan`,
        lastName: `${i}`
      }
    });
    
    await prisma.fanProfile.create({
      data: {
        id: attendee.id,
        totalLifetimePoints: i * 100,
        currentBalancePoints: i * 50,
        tier: 'BRONZE'
      }
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
