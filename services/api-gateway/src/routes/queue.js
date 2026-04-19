import { ConflictError, NotFoundError, AppError } from '../utils/errors.js';

export default async function queueRoutes(fastify) {
  fastify.get('/status', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { venueId } = request.query;
    let where = {};
    if (venueId) where.venueId = venueId;

    const queuePoints = await fastify.prisma.queuePoint.findMany({ where });

    const enriched = await Promise.all(queuePoints.map(async (qp) => {
      const waitRaw = await fastify.redis.get(`queue:wait:${qp.id}`);
      const waitTime = waitRaw ? parseInt(waitRaw, 10) : 0;
      
      const virtLength = await fastify.redis.zcard(`queue:${qp.id}`);

      let status = 'OPEN';
      if (waitTime >= 20) status = 'OVERLOADED';
      else if (waitTime >= 10) status = 'BUSY';

      // Check explicit closed flag
      const closedFlag = await fastify.redis.get(`queue:closed:${qp.id}`);
      if (closedFlag === '1') status = 'CLOSED';

      return {
        ...qp,
        wait_time_minutes: waitTime,
        virtual_length: virtLength,
        status
      };
    }));

    return { success: true, data: enriched };
  });

  fastify.post('/join', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['queue_point_id'],
        properties: {
          queue_point_id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const { queue_point_id } = request.body;
    const userId = request.user.userId;

    const existingToken = await fastify.prisma.virtualToken.findFirst({
      where: {
        userId,
        queuePointId: queue_point_id,
        status: { in: ['WAITING', 'CALLED', 'GRACE_PERIOD'] }
      }
    });

    if (existingToken) throw ConflictError('Already in queue for this point');

    const activeTokensCount = await fastify.prisma.virtualToken.count({
      where: {
        userId,
        status: { in: ['WAITING', 'CALLED', 'GRACE_PERIOD'] }
      }
    });

    if (activeTokensCount >= 2) throw ConflictError('Max concurrent queues reached');

    const qp = await fastify.prisma.queuePoint.findUnique({
      where: { id: queue_point_id },
      include: { venue: { include: { events: { where: { status: 'LIVE' }, take: 1 } } } }
    });

    if (!qp) throw NotFoundError('QueuePoint');

    const eventId = qp.venue.events[0]?.id;
    if (!eventId) throw new AppError('No live event found for this venue', 400);

    const position = (await fastify.redis.zcard(`queue:${queue_point_id}`)) + 1;
    let waitTime = parseInt((await fastify.redis.get(`queue:wait:${queue_point_id}`)) || '0', 10);
    if (waitTime === 0) waitTime = Math.ceil(position / qp.avgServiceRatePerServer);

    const estimatedCallTime = new Date(Date.now() + waitTime * 60000);

    const token = await fastify.prisma.virtualToken.create({
      data: {
        userId,
        queuePointId: queue_point_id,
        eventId,
        estimatedCallTime,
        positionInQueue: position,
        status: 'WAITING'
      }
    });

    await fastify.redis.zadd(`queue:${queue_point_id}`, Date.now(), token.id);

    await fastify.publishEvent('fan.behavior.events', userId, {
      userId,
      actionType: 'VIRTUAL_QUEUE_USED',
      eventId,
      queuePointId: queue_point_id,
      tokenId: token.id
    });

    return { success: true, data: token };
  });

  fastify.delete('/leave/:token_id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { token_id } = request.params;
    
    const token = await fastify.prisma.virtualToken.findUnique({ where: { id: token_id } });
    if (!token) throw NotFoundError('VirtualToken');

    if (token.userId !== request.user.userId) throw new AppError('Forbidden', 403, 'FORBIDDEN');
    if (['USED', 'EXPIRED'].includes(token.status)) throw new AppError('Cannot cancel a completed token', 400);

    await fastify.prisma.virtualToken.update({
      where: { id: token_id },
      data: { status: 'CANCELLED' }
    });

    await fastify.redis.zrem(`queue:${token.queuePointId}`, token.id);

    return { success: true };
  });

  fastify.get('/alternatives', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { queue_point_id, max_distance_meters = '500' } = request.query;
    if (!queue_point_id) throw new AppError('queue_point_id is required', 400);

    const source = await fastify.prisma.queuePoint.findUnique({ where: { id: queue_point_id } });
    if (!source) throw NotFoundError('QueuePoint');

    const maxDist = parseFloat(max_distance_meters);

    const candidates = await fastify.prisma.queuePoint.findMany({
      where: { type: source.type, venueId: source.venueId, id: { not: source.id } }
    });

    // Haversine distance conceptually - simplified here using euclidean for mock
    function getDistance(c1, c2) {
      if(!c1 || !c2 || !c1.coordinates || !c2.coordinates) return 999;
      const dx = c1.coordinates[0] - c2.coordinates[0];
      const dy = c1.coordinates[1] - c2.coordinates[1];
      return Math.sqrt(dx*dx + dy*dy) * 111000; // crude mapping deg to meters
    }

    const enriched = await Promise.all(candidates.map(async (c) => {
      const waitRaw = await fastify.redis.get(`queue:wait:${c.id}`);
      const waitTime = waitRaw ? parseInt(waitRaw, 10) : 0;
      let dist = 999;
      if (source.locationCoords && c.locationCoords) {
        dist = getDistance(source.locationCoords, c.locationCoords);
      }
      
      const score = (1 - waitTime/30) * 0.7 + (1 - dist/500) * 0.3;
      return { ...c, waitTime, distance: dist, recommendation_score: score };
    }));

    const filtered = enriched.filter(c => c.distance <= maxDist)
      .sort((a,b) => b.recommendation_score - a.recommendation_score)
      .slice(0, 5);

    return { success: true, data: filtered };
  });

  fastify.get('/virtual-token/:token_id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { token_id } = request.params;

    const token = await fastify.prisma.virtualToken.findUnique({ where: { id: token_id } });
    if (!token) throw NotFoundError('VirtualToken');

    if (token.userId !== request.user.userId) throw new AppError('Forbidden', 403, 'FORBIDDEN');

    let currentPos = token.positionInQueue;
    if (token.status === 'WAITING') {
      const zrank = await fastify.redis.zrank(`queue:${token.queuePointId}`, token.id);
      if (zrank !== null) {
        currentPos = zrank + 1;
        
        const qp = await fastify.prisma.queuePoint.findUnique({ where: { id: token.queuePointId } });
        const waitTimeMinutes = Math.ceil(currentPos / (qp?.avgServiceRatePerServer || 3));
        token.estimatedCallTime = new Date(Date.now() + waitTimeMinutes * 60000);
      }
    }

    return { success: true, data: { ...token, positionInQueue: currentPos } };
  });
}
