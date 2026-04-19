import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const ROLE_HIERARCHY = {
  ATTENDEE: 0, GATE_OFFICER: 1, FOOD_MANAGER: 2,
  SECURITY_LEAD: 3, VENUE_MANAGER: 4, SUPER_ADMIN: 5
};

async function authPlugin(fastify) {
  fastify.decorate('authenticate', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      request.user = payload;
    } catch (err) {
      return reply.status(401).send({ success: false, error: 'Invalid or expired token', code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID' });
    }
  });

  fastify.decorate('requireRole', (minimumRole) => async (request, reply) => {
    await fastify.authenticate(request, reply);
    if (reply.sent) return;
    const userLevel = ROLE_HIERARCHY[request.user.role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 99;
    if (userLevel < requiredLevel) {
      return reply.status(403).send({ success: false, error: `Requires ${minimumRole} role or higher`, code: 'INSUFFICIENT_PERMISSIONS' });
    }
  });

  fastify.decorate('generateTokens', (user) => {
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.accessTTL });
    const refreshToken = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.refreshTTL });
    return { accessToken, refreshToken, expiresIn: config.jwt.accessTTL };
  });
}

export default fp(authPlugin, { name: 'auth' });
