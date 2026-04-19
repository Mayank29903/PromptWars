import { AppError } from '../utils/errors.js';

// ── Inline A* implementation (replaces mock in utils/astar.js) ───────
function euclidean(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function astarSearch(startId, goalId, nodesMap, filterFn) {
  if (!nodesMap.has(startId) || !nodesMap.has(goalId)) return null;

  const openSet  = new Set([startId]);
  const cameFrom = new Map();
  const gScore   = new Map();
  const fScore   = new Map();

  const goalCoords = nodesMap.get(goalId).coords;

  gScore.set(startId, 0);
  fScore.set(startId, euclidean(nodesMap.get(startId).coords, goalCoords));

  while (openSet.size > 0) {
    let current = null;
    let lowestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) { lowestF = f; current = id; }
    }

    if (current === goalId) {
      const path = [current];
      let walk = current;
      while (cameFrom.has(walk)) { walk = cameFrom.get(walk); path.unshift(walk); }
      return { path, distance: gScore.get(goalId) };
    }

    openSet.delete(current);
    const currentNode = nodesMap.get(current);

    for (const neighborId of (currentNode.connectedNodeIds || [])) {
      const neighbor = nodesMap.get(neighborId);
      if (!neighbor) continue;
      if (filterFn && !filterFn(neighbor)) continue;

      const tentG = (gScore.get(current) ?? Infinity) + euclidean(currentNode.coords, neighbor.coords);
      if (tentG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, current);
        gScore.set(neighborId, tentG);
        fScore.set(neighborId, tentG + euclidean(neighbor.coords, goalCoords));
        openSet.add(neighborId);
      }
    }
  }
  return null;
}

// ── Hardcoded POIs for demo venue ────────────────────────────────────
const DEMO_POIS = [
  { id: 'poi-food-1',  name: 'Burger Station',     category: 'FOOD',      floor: 1, coords: [60, 120] },
  { id: 'poi-food-2',  name: 'Pizza Express',       category: 'FOOD',      floor: 2, coords: [140, 40] },
  { id: 'poi-rest-1',  name: 'Restrooms Level 1',   category: 'RESTROOM',  floor: 1, coords: [30, 80]  },
  { id: 'poi-rest-2',  name: 'Restrooms Level 2',   category: 'RESTROOM',  floor: 2, coords: [170, 80] },
  { id: 'poi-med-1',   name: 'Medical Bay',         category: 'MEDICAL',   floor: 1, coords: [100, 10] },
  { id: 'poi-aid-1',   name: 'First Aid Station',   category: 'FIRST_AID', floor: 1, coords: [100, 140]}
];

// ── Direction instruction generator ──────────────────────────────────
function generateInstructions(pathNodes) {
  if (pathNodes.length < 2) return 'You are already at your destination.';
  const steps = [];
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const from = pathNodes[i];
    const to   = pathNodes[i + 1];
    const dx   = to.coords[0] - from.coords[0];
    const dy   = to.coords[1] - from.coords[1];
    let dir = '';
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'east' : 'west';
    else dir = dy > 0 ? 'south' : 'north';

    const dist = Math.round(euclidean(from.coords, to.coords));
    if (i === 0) steps.push(`Head ${dir} from ${from.name}`);
    else if (i === pathNodes.length - 2) steps.push(`Your destination ${to.name} is ${dist}m ahead`);
    else steps.push(`Continue ${dir} past ${to.name} (${dist}m)`);
  }
  return steps.join(', ');
}

export default async function navRoutes(fastify) {

  // ── GET /route?from_node_id=X&to_node_id=Y&accessibility=false ────
  fastify.get('/route', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { from_node_id, to_node_id, accessibility } = request.query;
    if (!from_node_id || !to_node_id) throw new AppError('from_node_id and to_node_id are required', 400);

    const allNodes = await fastify.prisma.navigationNode.findMany();
    const nodesMap = new Map();
    for (const n of allNodes) {
      nodesMap.set(n.id, { ...n, coords: Array.isArray(n.coords) ? n.coords : [0, 0] });
    }

    const accessFilter = accessibility === 'true'
      ? (node) => node.nodeType !== 'STAIRS'
      : null;

    const result = astarSearch(from_node_id, to_node_id, nodesMap, accessFilter);
    if (!result) return reply.status(404).send({ success: false, error: 'No path found between the specified nodes.' });

    const pathNodes = result.path.map(id => nodesMap.get(id));
    const totalDistance = parseFloat(result.distance.toFixed(2));
    const walkTime = parseFloat((totalDistance / 1.2).toFixed(1)); // 1.2 m/s walking speed

    return {
      success: true,
      data: {
        path: pathNodes.map(n => ({ node_id: n.id, name: n.name, nodeType: n.nodeType, coords: n.coords })),
        total_distance_meters: totalDistance,
        estimated_walk_time_seconds: walkTime,
        accessibility_suitable: accessibility === 'true'
      }
    };
  });

  // ── GET /pois?venue_id=X&category=FOOD ─────────────────────────────
  fastify.get('/pois', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { category } = request.query;

    let pois = DEMO_POIS;
    if (category) pois = pois.filter(p => p.category === category.toUpperCase());

    const result = await Promise.all(pois.map(async poi => {
      const waitRaw = await fastify.redis.get(`queue:wait:${poi.id}`);
      return { ...poi, current_wait_minutes: waitRaw ? parseInt(waitRaw, 10) : 0 };
    }));

    return { success: true, data: result };
  });

  // ── GET /graph?venue_id=X ──────────────────────────────────────────
  fastify.get('/graph', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { venue_id } = request.query;
    const where = venue_id ? { venueId: venue_id } : {};
    const nodes = await fastify.prisma.navigationNode.findMany({ where });

    return {
      success: true,
      data: { nodes }
    };
  });

  // ── GET /directions?from_zone=X&to_poi_category=FOOD ──────────────
  fastify.get('/directions', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { from_zone, to_poi_category } = request.query;
    if (!from_zone || !to_poi_category) throw new AppError('from_zone and to_poi_category required', 400);

    const allNodes = await fastify.prisma.navigationNode.findMany();
    const nodesMap = new Map();
    for (const n of allNodes) {
      nodesMap.set(n.id, { ...n, coords: Array.isArray(n.coords) ? n.coords : [0, 0] });
    }

    // Find all nodes in the from_zone (name match)
    const zoneNodes = allNodes.filter(n => n.name.toLowerCase().includes(from_zone.toLowerCase()));
    // Find all POI nodes of category
    const targetPois = DEMO_POIS.filter(p => p.category === to_poi_category.toUpperCase());

    if (zoneNodes.length === 0) return reply.status(404).send({ success: false, error: `No nodes found in zone '${from_zone}'` });
    if (targetPois.length === 0) return reply.status(404).send({ success: false, error: `No POIs found for category '${to_poi_category}'` });

    // Find shortest pair (zone_node → any poi's nearest graph node)
    let bestResult = null;
    let bestDist = Infinity;
    let bestFromId = null;
    let bestPoi = null;

    for (const zn of zoneNodes) {
      for (const poi of targetPois) {
        // Find closest graph node to poi coords
        let closestNode = null;
        let closestDist = Infinity;
        for (const node of allNodes) {
          const d = euclidean(Array.isArray(node.coords) ? node.coords : [0, 0], poi.coords);
          if (d < closestDist) { closestDist = d; closestNode = node; }
        }
        if (!closestNode) continue;

        const r = astarSearch(zn.id, closestNode.id, nodesMap, null);
        if (r && r.distance < bestDist) {
          bestDist = r.distance;
          bestResult = r;
          bestFromId = zn.id;
          bestPoi = poi;
        }
      }
    }

    if (!bestResult) return reply.status(404).send({ success: false, error: 'No route found.' });

    const pathNodes = bestResult.path.map(id => nodesMap.get(id));
    const totalDistance = parseFloat(bestResult.distance.toFixed(2));

    return {
      success: true,
      data: {
        poi: bestPoi,
        path: pathNodes.map(n => ({ node_id: n.id, name: n.name, nodeType: n.nodeType, coords: n.coords })),
        total_distance_meters: totalDistance,
        estimated_walk_time_seconds: parseFloat((totalDistance / 1.2).toFixed(1)),
        instructions: generateInstructions(pathNodes)
      }
    };
  });

  // ── Kept: venue-map endpoint ───────────────────────────────────────
  fastify.get('/venue-map', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { venueId, floor } = request.query;
    if (!venueId || !floor) throw new AppError('venueId and floor required', 400);

    const venueFloor = await fastify.prisma.venueFloor.findUnique({
      where: { venueId_floorNumber: { venueId, floorNumber: parseInt(floor, 10) } }
    });

    if (!venueFloor) return { success: false, error: 'Floor not found' };

    const nodes = await fastify.prisma.navigationNode.findMany({
      where: { venueId, floorNumber: parseInt(floor, 10) }
    });

    return {
      success: true,
      data: {
        floor: venueFloor,
        nodes,
        mapSvgUrl: venueFloor.mapSvgUrl,
        mapGeojsonUrl: venueFloor.mapGeojsonUrl
      }
    };
  });

  // ── Kept: location-update endpoint ─────────────────────────────────
  fastify.post('/location-update', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { coordinates } = request.body;
    const userId = request.user.userId;
    await fastify.redis.set(`user:${userId}:location`, JSON.stringify(coordinates), 'EX', 30);
    return { success: true, data: { snapped_node_id: 'mock', rerouted: false } };
  });
}
