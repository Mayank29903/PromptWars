import { astar } from '../utils/astar.js';
import { AppError } from '../utils/errors.js';

export default async function navRoutes(fastify) {
  fastify.post('/route', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { from_node_id, to_node_id, to_poi_category, mode = 'FASTEST', accessibility_mode } = request.body;
    
    let targetNodeId = to_node_id;
    if (to_poi_category) {
      targetNodeId = 'mock_target_node_id';
    }

    const graphNodes = {};

    const route = await astar.findPath(from_node_id, targetNodeId, graphNodes, fastify.redis);
    
    if (mode === 'ACCESSIBLE') {
      route.crowd_penalty_score += 0.5;
    }

    return { success: true, data: route };
  });

  fastify.get('/venue-map', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { venueId, floor } = request.query;
    if(!venueId || !floor) throw new AppError('venueId and floor required', 400);

    const venueFloor = await fastify.prisma.venueFloor.findUnique({
      where: { venueId_floorNumber: { venueId, floorNumber: parseInt(floor, 10) } }
    });

    if(!venueFloor) return { success: false, error: 'Floor not found' };

    return {
      success: true,
      data: {
        floor: venueFloor,
        nodes: [],
        mapSvgUrl: venueFloor.mapSvgUrl,
        mapGeojsonUrl: venueFloor.mapGeojsonUrl
      }
    };
  });

  fastify.get('/pois', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const qps = await fastify.prisma.queuePoint.findMany();
    const result = await Promise.all(qps.map(async qp => {
      const waitRaw = await fastify.redis.get(`queue:wait:${qp.id}`);
      return {
        ...qp,
        wait_time: waitRaw ? parseInt(waitRaw, 10) : 0
      };
    }));
    return { success: true, data: result };
  });

  fastify.get('/nearest-poi', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    return {
      success: true,
      data: {
        poi: { id: 'mock', name: 'Nearest Restroom' },
        route: { nodes_sequence: [], estimated_walk_time_seconds: 60, distance_meters: 20 }
      }
    };
  });

  fastify.post('/location-update', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { coordinates } = request.body;
    const userId = request.user.userId;

    await fastify.redis.set(`user:${userId}:location`, JSON.stringify(coordinates), 'EX', 30);

    return {
      success: true,
      data: {
        snapped_node_id: 'mock_node_id',
        rerouted: false
      }
    };
  });
}
