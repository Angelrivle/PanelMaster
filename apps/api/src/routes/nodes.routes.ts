import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma';

function serializeNode(node: any) {
  return {
    ...node,
    memoryTotalBytes: Number(node.memoryTotalBytes),
    diskTotalBytes: Number(node.diskTotalBytes),
    memoryAllocated: Number(node.memoryAllocated || 0),
    diskAllocated: Number(node.diskAllocated || 0),
    totalMemoryMb: Math.round(Number(node.memoryTotalBytes) / (1024 * 1024)),
    diskSpaceMb: Math.round(Number(node.diskTotalBytes) / (1024 * 1024)),
  };
}

export async function nodesRoutes(fastify: FastifyInstance) {
  // List nodes
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      let nodes = await prisma.node.findMany({
        include: {
          region: true,
          _count: { select: { serviceInstances: true } },
        },
        orderBy: { name: 'asc' },
      });

      // Auto-seed primary node if cluster has 0 nodes
      if (nodes.length === 0) {
        let defaultRegion = await prisma.region.findFirst();
        if (!defaultRegion) {
          defaultRegion = await prisma.region.create({
            data: { code: 'default', name: 'LOCAL CLUSTER' },
          });
        }
        const defaultNode = await prisma.node.create({
          data: {
            name: 'node-01',
            regionId: defaultRegion.id,
            fqdn: process.env.PANEL_DOMAIN || '127.0.0.1',
            agentPort: 8080,
            agentTokenHash: 'nexus-dev-secret-token',
            cpuCores: 8,
            memoryTotalBytes: BigInt(32768) * BigInt(1024 * 1024),
            diskTotalBytes: BigInt(256000) * BigInt(1024 * 1024),
            status: 'ONLINE',
          },
          include: {
            region: true,
            _count: { select: { serviceInstances: true } },
          },
        });
        nodes = [defaultNode];
      }

      return reply.send(nodes.map(serializeNode));
    } catch (err: any) {
      fastify.log.error(`Error fetching nodes: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to fetch nodes' });
    }
  });

  // Register new node
  fastify.post('/register', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const registerSchema = z.object({
      name: z.string().min(2),
      regionCode: z.string().default('default'),
      location: z.string().optional(),
      fqdn: z.string(),
      agentPort: z.number().default(8080),
      cpuCores: z.number().min(1).default(8),
      memoryTotalMb: z.number().min(512).default(4096),
      diskTotalMb: z.number().min(1024).default(20480),
    });

    const body = registerSchema.parse(request.body);
    const regionName = body.location || body.regionCode;

    let region = await prisma.region.findFirst({
      where: { OR: [{ code: body.regionCode }, { name: regionName }] },
    });

    if (!region) {
      region = await prisma.region.create({
        data: {
          code: body.regionCode.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: regionName,
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
      include: {
        region: true,
        _count: { select: { serviceInstances: true } },
      },
    });

    return reply.status(201).send(serializeNode(node));
  });

  // Update node
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      fqdn: z.string().optional(),
      agentPort: z.number().optional(),
      cpuCores: z.number().optional(),
      memoryTotalMb: z.number().optional(),
      diskTotalMb: z.number().optional(),
      isUnderMaintenance: z.boolean().optional(),
    });

    const body = updateSchema.parse(request.body);

    const updated = await prisma.node.update({
      where: { id },
      data: {
        name: body.name,
        fqdn: body.fqdn,
        agentPort: body.agentPort,
        cpuCores: body.cpuCores,
        memoryTotalBytes: body.memoryTotalMb ? BigInt(body.memoryTotalMb) * BigInt(1024 * 1024) : undefined,
        diskTotalBytes: body.diskTotalMb ? BigInt(body.diskTotalMb) * BigInt(1024 * 1024) : undefined,
        isUnderMaintenance: body.isUnderMaintenance,
      },
      include: {
        region: true,
        _count: { select: { serviceInstances: true } },
      },
    });

    return reply.send(serializeNode(updated));
  });

  // Delete node
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.node.delete({ where: { id } });
    return reply.send({ success: true });
  });
}
