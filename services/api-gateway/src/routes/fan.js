import { AppError, NotFoundError } from '../utils/errors.js';

export default async function fanRoutes(fastify) {
  fastify.get('/profile/:user_id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { user_id } = request.params;
    
    const ROLE_HIERARCHY = { ATTENDEE: 0, GATE_OFFICER: 1, FOOD_MANAGER: 2, SECURITY_LEAD: 3, VENUE_MANAGER: 4, SUPER_ADMIN: 5 };
    const requesterRoleVal = ROLE_HIERARCHY[request.user.role] || 0;
    
    if (user_id !== request.user.userId && requesterRoleVal < ROLE_HIERARCHY.VENUE_MANAGER) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    const profile = await fastify.prisma.fanProfile.findUnique({
      where: { id: user_id },
      include: { user: true }
    });

    if (!profile) throw NotFoundError('FanProfile');

    return { success: true, data: profile };
  });

  fastify.get('/leaderboard', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { scope = 'all_time', eventId } = request.query;
    const key = eventId ? `leaderboard:${scope}:${eventId}` : `leaderboard:${scope}:global`;

    const rawTop = await fastify.redis.zrevrange(key, 0, 49, 'WITHSCORES');
    const userIds = [];
    const top50 = [];
    
    for (let i=0; i<rawTop.length; i+=2) {
      userIds.push(rawTop[i]);
      top50.push({ rank: i/2 + 1, userId: rawTop[i], points: parseInt(rawTop[i+1], 10) });
    }

    const users = await fastify.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true }
    });

    const userMap = {};
    users.forEach(u => userMap[u.id] = `${u.firstName} ${u.lastName}`);

    top50.forEach(t => t.displayName = userMap[t.userId] || 'Unknown Fan');

    const userRankRedis = await fastify.redis.zrevrank(key, request.user.userId);
    const userRank = userRankRedis !== null ? userRankRedis + 1 : -1;
    const userPoints = parseInt(await fastify.redis.zscore(key, request.user.userId) || '0', 10);

    return {
      success: true,
      data: { top50, userRank, userPoints }
    };
  });

  fastify.post('/redeem', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { rewardId } = request.body;
    return { success: false, error: 'Not fully implemented - Reward schema missing' };
  });
}
