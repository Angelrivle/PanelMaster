import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma';

export async function nodesRoutes(fastify: FastifyInstance) {
  // List nodes
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const nodes = await prisma.node.findMany({
      include: {
        region: true,
        _count: { select: { serviceInstances: true } },
      },
      orderBy: { name: 'asc' },
    });
    return reply.send(nodes);
  });

  // Register node
  fastify.post('/register', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!request.userContext?.isSuperAdmin) {
      return reply.status(403).send({ error: 'Only Super Admins can register nodes' });
    }

    const registerSchema = z.object({
      name: z.string().min(2),
      regionCode: z.string().default('default'),
      fqdn: z.string(),
      agentPort: z.number().default(8443),
      cpuCores: z.number().min(1),
      memoryTotalMb: z.number().min(1024),
      diskTotalMb: z.number().min(5120),
    });

    const body = registerSchema.parse(request.body);

    let region = await prisma.region.findUnique({ where: { code: body.regionCode } });
    if (!region) {
      region = await prisma.region.create({
        data: {
          code: body.regionCode,
          name: body.regionCode.toUpperCase(),
        },
      });
    }

    const node = await prisma.node.create({
      data: {
        name: body.name,
        regionId: region.id,
        fqdn: body.fqdn,
        agentPort: body.agentPort,
        agentTokenHash: 'nexus-dev-secret-token',
        cpuCores: body.cpuCores,
        memoryTotalBytes: BigInt(body.memoryTotalMb) * BigInt(1024 * 1024),
        diskTotalBytes: BigInt(body.diskTotalMb) * BigInt(1024 * 1024),
        status: 'ONLINE',
      },
    });

    return reply.status(201).send(node);
  });
}
