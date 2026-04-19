import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';

async function prismaPlugin(fastify) {
  const prisma = new PrismaClient({
    datasources: { db: { url: config.database.url } },
    log: config.env === 'development' ? ['query', 'warn', 'error'] : ['error']
  });

  await prisma.$connect();
  fastify.log.info('PostgreSQL connected via Prisma');

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}

export default fp(prismaPlugin, { name: 'prisma' });
