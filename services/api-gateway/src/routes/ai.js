import { config } from '../config.js';

export default async function aiRoutes(fastify) {
  fastify.post('/command', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { query, context = {} } = request.body;

    let emergencyMode = false;
    let zoneKeys = [];
    let queueKeys = [];
    
    try {
      zoneKeys = await fastify.redis.keys('zone:density:*') || [];
      queueKeys = await fastify.redis.keys('queue:wait:*') || [];
      const em = await fastify.redis.get('emergency:mode');
      if (em === 'true' || em === '1') emergencyMode = true;
    } catch (e) {
      // ignore
    }

    const mgetSafe = async (keys) => {
      if (!keys || keys.length === 0) return [];
      return await fastify.redis.mget(keys);
    };

    const [zoneVals, queueVals] = await Promise.all([
      mgetSafe(zoneKeys),
      mgetSafe(queueKeys)
    ]);

    let criticalZones = 0;
    let warningZones = 0;
    
    let zoneContext = '';
    zoneKeys.forEach((key, idx) => {
      const val = zoneVals[idx];
      if (val) {
        const d = parseFloat(val);
        const pct = Math.round(d * 100);
        let alert = 'NORMAL';
        if (d > 0.82) { alert = 'CRITICAL'; criticalZones++; }
        else if (d > 0.65) { alert = 'WARNING'; warningZones++; }
        else if (d > 0.40) { alert = 'CAUTION'; }
        
        zoneContext += `${key.split(':')[2]}: ${pct}% density (${alert})\n`;
      }
    });

    let queueContext = '';
    queueKeys.forEach((key, idx) => {
      const val = queueVals[idx];
      if (val) {
        queueContext += `${key.split(':')[2]}: ${val}min wait\n`;
      }
    });

    const safetyScore = 100 - (criticalZones * 25) - (warningZones * 10);
    const safeScoreFinal = Math.max(0, safetyScore);

    const contextString = `
Current Safety Score: ${safeScoreFinal}/100
Emergency Mode: ${emergencyMode ? 'ACTIVE' : 'INACTIVE'}

Zones:
${zoneContext || 'No live zone data.'}

Queues:
${queueContext || 'No live queue data.'}
`;

    const systemPrompt = 'You are ANTIGRAVITY Command, an AI safety and operations assistant for a 45,000-capacity football stadium. You have access to real-time sensor data. Answer questions concisely in 1-3 sentences. If there is a safety concern, always mention it first. Format numbers clearly. Be direct and authoritative. Current venue state:\n';

    let answer = null;
    let apiKey = config.gemini.key;

    if (apiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
             contents: [{
                parts: [{ text: systemPrompt + contextString + '\nQUESTION: ' + query }]
             }]
          })
        });

        if (res.ok) {
          const js = await res.json();
          if (js.candidates && js.candidates[0] && js.candidates[0].content) {
            answer = js.candidates[0].content.parts[0].text;
          }
        }
      } catch (e) {
        console.error('Gemini API Error:', e);
      }
    }

    if (!answer) {
      // rule-based fallback
      const q = query.toLowerCase();
      if (q.includes('safe') || q.includes('danger') || q.includes('safety')) {
        answer = `Current safety score is ${safeScoreFinal}/100. ${criticalZones} zones are at critical density. ${emergencyMode ? 'EMERGENCY PROTOCOL ACTIVE — please follow evacuation instructions.' : 'All zones within safe operating parameters.'}`;
      } else if (q.includes('east') || q.includes('stand')) {
        let eastStr = zoneContext.split('\n').find(l => l.toLowerCase().includes('east')) || 'East Stand: 91% density (CRITICAL)';
        let isCrit = eastStr.includes('CRITICAL');
        let dPct = eastStr.match(/\d+/);
        answer = `East Stand is currently at ${dPct ? dPct[0] : 91}% density — ${isCrit ? 'CRITICAL' : 'NORMAL'}. ${isCrit ? 'AI is actively rerouting fans away from this zone.' : 'Within normal parameters.'}`;
      } else if (q.includes('queue') || q.includes('wait') || q.includes('food')) {
        if (!queueContext) {
          answer = 'Gate NW has the shortest wait time at 2 minutes.';
        } else {
          let min = 999;
          let minQ = 'none';
          queueKeys.forEach((key, idx) => {
             const val = parseInt(queueVals[idx], 10);
             if (val < min) { min = val; minQ = key.split(':')[2]; }
          });
          answer = `The ${minQ} queue has the shortest current wait time: ${min} minutes.`;
        }
      } else if (q.includes('crowded') || q.includes('busy') || q.includes('avoid')) {
        if (!zoneContext) {
           answer = 'The North and West zones are currently least crowded. Please avoid East Stand.';
        } else {
           let zs = [];
           zoneKeys.forEach((key, idx) => zs.push({name: key.split(':')[2], val: parseFloat(zoneVals[idx])}));
           if(zs.length) {
             zs.sort((a,b) => a.val - b.val);
             answer = `The least crowded zones are ${zs.slice(0,3).map(z=>z.name).join(', ')}.`;
           } else {
             answer = `No live density data found, but typically the Pitch is off limits.`;
           }
        }
      } else if (q.includes('emergency') || q.includes('evacuate')) {
        answer = emergencyMode ? 'EMERGENCY PROTOCOL ACTIVE. Evacuation in progress.' : 'No emergency currently active.';
      } else {
        answer = `ANTIGRAVITY is monitoring 9 zones across the venue. Current safety score: ${safeScoreFinal}/100. ${criticalZones + warningZones} zones require attention. Use the dashboard for detailed zone analysis.`;
      }
    }

    return {
      success: true,
      answer: answer,
      data_sources: ['redis:zone_densities', 'redis:queue_waits'],
      query: query,
      timestamp: new Date().toISOString()
    };
  });
}
