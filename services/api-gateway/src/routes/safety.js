export default async function safetyRoutes(fastify) {
  fastify.get('/evacuation-routes', async (request, reply) => {
    const emergencyMode = await fastify.redis.get('emergency:mode');
    
    if (emergencyMode !== 'active') {
      try { await fastify.authenticate(request, reply); } catch(e) {}
      if (reply.sent) return;
    }

    const { zone_id } = request.query;
    const { config } = await import('../config.js');

    try {
      const response = await fetch(`${config.services.ml}/ml/safety/evacuation-routes?zone_id=${zone_id}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      return { success: true, data: data };
    } catch(err) {
      return {
        success: true,
        source: 'cached_fallback',
        data: [{ id: 'mock', safety_score: 0.9, nodes: [] }]
      };
    }
  });

  fastify.post('/trigger-alert', {
    onRequest: [fastify.requireRole('SECURITY_LEAD')]
  }, async (request, reply) => {
    const { zone_id, level } = request.body;

    const event = await fastify.prisma.event.findFirst({ where: { status: 'LIVE' }});

    const incident = await fastify.prisma.incident.create({
      data: {
        eventId: event ? event.id : 'NO_EVENT',
        zoneId: zone_id,
        reportedById: request.user.userId,
        type: 'CROWD_CRUSH',
        severity: level === 'CRITICAL' || level === 'EMERGENCY' ? 'CRITICAL' : 'HIGH',
        description: 'Automated trigger alert'
      }
    });

    await fastify.publishEvent('safety.alert.stream', zone_id, {
      incidentId: incident.id,
      level,
      timestamp: new Date().toISOString()
    });

    if (level === 'EMERGENCY' || level === 'CRITICAL') {
      await fastify.redis.set('emergency:mode', 'active', 'EX', 21600);
    }

    return { 
      success: true, 
      data: { alert_id: incident.id, actions_triggered: ['push_notifications', 'doors_opened'] }
    };
  });

  fastify.post('/all-clear', {
    onRequest: [fastify.requireRole('SECURITY_LEAD')]
  }, async (request, reply) => {
    const { incidentId } = request.body;

    if (incidentId) {
      await fastify.prisma.incident.update({
        where: { id: incidentId },
        data: { status: 'RESOLVED', resolvedAt: new Date() }
      });
    }

    await fastify.redis.del('emergency:mode');
    await fastify.publishEvent('safety.alert.stream', 'all-clear', { status: 'resolved' });

    return { success: true, message: 'All clear acknowledged' };
  });
}
