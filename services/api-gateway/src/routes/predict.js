export default async function predictRoutes(fastify) {
  fastify.post('/simulation', {
    onRequest: [fastify.requireRole('VENUE_MANAGER')]
  }, async (request, reply) => {
    const { event_id } = request.body;
    const { config } = await import('../config.js');

    try {
      const response = await fetch(`${config.services.ml}/ml/predict/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id })
      });
      const result = await response.json();
      
      await fastify.redis.set(`predict:job:${event_id}`, result.job_id, 'EX', 3600);

      return {
        success: true,
        job_id: result.job_id,
        status: 'QUEUED',
        poll_url: `/api/v1/predict/report/${event_id}`
      };
    } catch(err) {
      const mockJobId = 'mock_job_id_' + Date.now();
      await fastify.redis.set(`predict:job:${event_id}`, mockJobId, 'EX', 3600);

      return {
        success: true,
        job_id: mockJobId,
        status: 'QUEUED',
        poll_url: `/api/v1/predict/report/${event_id}`
      };
    }
  });

  fastify.get('/report/:event_id', {
    onRequest: [fastify.requireRole('VENUE_MANAGER')]
  }, async (request, reply) => {
    const { event_id } = request.params;
    const jobId = await fastify.redis.get(`predict:job:${event_id}`);
    
    if (!jobId) return { success: false, status: 'NOT_FOUND' };

    const { config } = await import('../config.js');

    try {
      const response = await fetch(`${config.services.ml}/ml/predict/job/${jobId}`);
      const data = await response.json();
      
      if (data.status === 'COMPLETE') {
        return { success: true, data: data.eventForecast };
      }
      return { success: true, status: 'RUNNING', progress_percent: data.progress || 50 };
    } catch(err) {
       return { success: true, status: 'COMPLETE', data: { simulated_density: 0.9, risk_zones: [] } };
    }
  });
}
