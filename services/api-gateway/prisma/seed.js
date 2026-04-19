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

  // 6. Navigation Graph — Manchester Arena (12 nodes)
  // Layout:  gate_nw ── jnc_north ── gate_ne
  //           |    \       |       /    |
  //         jnc_west ── stairs ── jnc_east
  //           |    /       |       \    |
  //         gate_sw ── jnc_south ── gate_se
  //                    elevator
  //         exit_n (north)    exit_s (south)
  const navNodes = [
    // Walkable Junctions (interior concourse grid)
    { name: 'Junction North',  nodeType: 'WALKABLE_JUNCTION', coords: [100, 130], connected: ['gate_nw', 'gate_ne', 'jnc_west', 'jnc_east', 'stairs', 'exit_n'] },
    { name: 'Junction South',  nodeType: 'WALKABLE_JUNCTION', coords: [100, 30],  connected: ['gate_sw', 'gate_se', 'jnc_west', 'jnc_east', 'elevator', 'exit_s'] },
    { name: 'Junction East',   nodeType: 'WALKABLE_JUNCTION', coords: [180, 75],  connected: ['jnc_north', 'jnc_south', 'gate_ne', 'gate_se', 'stairs'] },
    { name: 'Junction West',   nodeType: 'WALKABLE_JUNCTION', coords: [20, 75],   connected: ['jnc_north', 'jnc_south', 'gate_nw', 'gate_sw'] },
    // Gates
    { name: 'Gate NW',         nodeType: 'GATE',   coords: [10, 140],  connected: ['jnc_north', 'jnc_west'] },
    { name: 'Gate NE',         nodeType: 'GATE',   coords: [190, 140], connected: ['jnc_north', 'jnc_east'] },
    { name: 'Gate SW',         nodeType: 'GATE',   coords: [10, 10],   connected: ['jnc_south', 'jnc_west'] },
    { name: 'Gate SE',         nodeType: 'GATE',   coords: [190, 10],  connected: ['jnc_south', 'jnc_east'] },
    // Exits
    { name: 'Main Exit North', nodeType: 'EXIT',   coords: [100, 150], connected: ['jnc_north', 'gate_nw', 'gate_ne'] },
    { name: 'Main Exit South', nodeType: 'EXIT',   coords: [100, 0],   connected: ['jnc_south', 'gate_sw', 'gate_se'] },
    // Stairs & Elevator
    { name: 'Central Stairs',  nodeType: 'STAIRS',   coords: [130, 100], connected: ['jnc_north', 'jnc_east'] },
    { name: 'Central Elevator', nodeType: 'ELEVATOR', coords: [70, 50],  connected: ['jnc_south', 'jnc_west'] },
  ];

  // Map short keys to UUIDs
  const shortKeys = ['jnc_north', 'jnc_south', 'jnc_east', 'jnc_west', 'gate_nw', 'gate_ne', 'gate_sw', 'gate_se', 'exit_n', 'exit_s', 'stairs', 'elevator'];
  const idMap = {};

  // First pass: create all nodes with empty connections
  for (let i = 0; i < navNodes.length; i++) {
    const n = navNodes[i];
    const created = await prisma.navigationNode.create({
      data: {
        venueId: venue.id,
        floorNumber: 1,
        name: n.name,
        nodeType: n.nodeType,
        coords: n.coords,
        connectedNodeIds: [],
        isAccessible: n.nodeType !== 'STAIRS'
      }
    });
    idMap[shortKeys[i]] = created.id;
  }

  // Second pass: update connectedNodeIds with real UUIDs
  for (let i = 0; i < navNodes.length; i++) {
    const n = navNodes[i];
    const realConnected = n.connected.map(key => idMap[key]).filter(Boolean);
    await prisma.navigationNode.update({
      where: { id: idMap[shortKeys[i]] },
      data: { connectedNodeIds: realConnected }
    });
  }

  console.log(`Navigation graph seeded: ${navNodes.length} nodes for Manchester Arena`);
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
