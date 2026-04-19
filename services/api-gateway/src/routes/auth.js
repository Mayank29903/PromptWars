import bcrypt from 'bcrypt';
import { config } from '../config.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.js';

export default async function authRoutes(fastify) {
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { 
            type: 'string', 
            enum: ['ATTENDEE', 'GATE_OFFICER', 'FOOD_MANAGER', 'SECURITY_LEAD', 'VENUE_MANAGER', 'SUPER_ADMIN'],
            default: 'ATTENDEE'
          }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password, firstName, lastName, role } = request.body;
    
    const existingUser = await fastify.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw ConflictError('Email already exists');

    const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);

    const user = await fastify.prisma.user.create({
      data: {
        email,
        hashedPassword,
        firstName,
        lastName,
        role: role || 'ATTENDEE'
      }
    });

    if (user.role === 'ATTENDEE') {
      await fastify.prisma.fanProfile.create({
        data: {
          id: user.id
        }
      });
    }

    const tokens = fastify.generateTokens(user);
    await fastify.redis.set(`session:${user.id}`, tokens.refreshToken, 'EX', config.jwt.refreshTTL);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      tokens
    };
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;

    const user = await fastify.prisma.user.findUnique({ where: { email } });
    if (!user) throw UnauthorizedError('Invalid credentials');

    const match = await bcrypt.compare(password, user.hashedPassword);
    if (!match) throw UnauthorizedError('Invalid credentials');

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const tokens = fastify.generateTokens(user);
    await fastify.redis.set(`session:${user.id}`, tokens.refreshToken, 'EX', config.jwt.refreshTTL);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      tokens
    };
  });

  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body;
    if (!refreshToken) throw UnauthorizedError('Refresh token required');

    try {
      const fastifyJwt = await import('jsonwebtoken');
      const payload = fastifyJwt.default.verify(refreshToken, config.jwt.secret);
      
      const storedToken = await fastify.redis.get(`session:${payload.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw UnauthorizedError('Invalid refresh token');
      }

      const user = await fastify.prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) throw UnauthorizedError('User not found');

      const tokens = fastify.generateTokens(user);
      await fastify.redis.set(`session:${user.id}`, tokens.refreshToken, 'EX', config.jwt.refreshTTL);

      return {
        success: true,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn
      };
    } catch (err) {
      throw UnauthorizedError('Invalid or expired refresh token');
    }
  });

  fastify.post('/logout', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    await fastify.redis.del(`session:${request.user.userId}`);
    reply.code(204).send();
  });
}
