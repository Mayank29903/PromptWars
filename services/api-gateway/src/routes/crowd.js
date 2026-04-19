export default async function crowdRoutes(fastify) {

  /**
   * Async SCAN helper — replaces O(n) blocking redis.keys() calls.
   * Iterates with cursor until Redis returns '0', collecting all matches.
   */
  async function scanKeys(pattern) {
    let cursor = '0';
    let keys = [];
    do {
      const result = await fastify.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    return keys;
  }

  fastify.get('/density', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { zone_id, floor } = request.query;
    
    const keys = await scanKeys('zone:density:*');
    
    let densities = [];
    if (keys.length > 0) {
      const values = await fastify.redis.mget(keys);
      densities = values.map(v => JSON.parse(v));
    } else {
      let where = {};
      if (zone_id) where.id = zone_id;
      if (floor) where.floor = parseInt(floor, 10);
      
      const zones = await fastify.prisma.crowdZone.findMany({ where });
      densities = zones.map(z => ({
        zone_id: z.id,
        name: z.name,
        current_density: 0,
        type: z.type
      }));
    }

    if (zone_id) {
      densities = densities.filter(d => d.zone_id === zone_id);
    }
    if (floor) {
      const targetFloor = parseInt(floor, 10);
      densities = densities.filter(d => d.floor === targetFloor || d.floor === undefined); 
    }

    return { success: true, data: densities };
  });

  fastify.get('/heatmap', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const zones = await fastify.prisma.crowdZone.findMany();
    
    const featureCollection = {
      type: "FeatureCollection",
      features: []
    };

    for (const zone of zones) {
      const densityRaw = await fastify.redis.get(`zone:density:${zone.id}`);
      const densityData = densityRaw ? JSON.parse(densityRaw) : { current_density: 0, alert_level: 'NORMAL' };
      
      featureCollection.features.push({
        type: "Feature",
        geometry: typeof zone.polygonCoords === 'string' ? JSON.parse(zone.polygonCoords) : zone.polygonCoords,
        properties: {
          zone_id: zone.id,
          name: zone.name,
          density: densityData.current_density,
          alert_level: densityData.alert_level || 'NORMAL'
        }
      });
    }

    return { success: true, data: featureCollection };
  });

  fastify.get('/predictions', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { next_minutes = '15' } = request.query;
    const { config } = await import('../config.js');
    
    try {
      const response = await fetch(`${config.services.ml}/ml/crowd/predict?horizon=${next_minutes}`);
      if (!response.ok) throw new Error('ML service error');
      const data = await response.json();
      return { success: true, data: data.grid };
    } catch (err) {
      fastify.log.warn('ML Service unreachable, falling back to Last Known State');
      
      const keys = await scanKeys('zone:density:*');
      let fallbackData = [];
      if (keys.length > 0) {
        const values = await fastify.redis.mget(keys);
        fallbackData = values.map(v => JSON.parse(v));
      }
      return { success: true, source: 'fallback', data: fallbackData };
    }
  });

  fastify.get('/flow-vectors', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const keys = await scanKeys('flow:vector:*');

    if (keys.length === 0) return { success: true, data: [] };

    const values = await fastify.redis.mget(keys);
    const vectors = values.filter(v => v).map(v => JSON.parse(v));
    
    return { success: true, data: vectors };
  });

  fastify.post('/alert', {
    onRequest: [fastify.requireRole('SECURITY_LEAD')],
    schema: {
      body: {
        type: 'object',
        required: ['zone_id', 'alert_type'],
        properties: {
          zone_id: { type: 'string' },
          alert_type: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { zone_id, alert_type, notes } = request.body;

    const zone = await fastify.prisma.crowdZone.findUnique({ where: { id: zone_id } });
    if (!zone) return reply.status(404).send({ success: false, error: 'Zone not found' });

    const uuidRaw = await import('uuid');
    const alert_id = uuidRaw.v4();

    await fastify.publishEvent('safety.alert.stream', zone_id, {
      alert_id,
      zone_id,
      alert_type,
      notes,
      triggered_by: request.user.userId,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: 'Alert published', alert_id };
  });
}
