import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import WebSocket from 'ws';
import { prisma } from '../prisma';
import { Orchestrator } from '../services/orchestrator';
import { AgentClient } from '../services/agent-client';

const orchestrator = new Orchestrator();

export async function servicesRoutes(fastify: FastifyInstance) {
  // List Services
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const orgId = request.headers['x-organization-id'] as string;
    if (!orgId) {
      return reply.status(400).send({ error: 'x-organization-id header required' });
    }

    const services = await prisma.service.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        template: { select: { name: true, category: true, iconUrl: true } },
        instances: {
          include: {
            node: { select: { name: true, fqdn: true } },
            ports: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(services);
  });

  // Get Single Service Detail
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        template: true,
        templateVersion: true,
        instances: {
          include: {
            node: true,
            ports: true,
          },
        },
        environmentVars: true,
        domains: true,
        backups: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    return reply.send(service);
  });

  // Create Service
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userContext = request.userContext!;
    const orgId = request.headers['x-organization-id'] as string;
    if (!orgId) {
      return reply.status(400).send({ error: 'x-organization-id header required' });
    }

    const createSchema = z.object({
      name: z.string().min(2).max(64),
      templateId: z.string(),
      templateVersionId: z.string(),
      memoryMb: z.number().min(512).default(2048),
      cpuCores: z.number().min(0.5).default(2.0),
      diskMb: z.number().min(1024).default(10240),
      environment: z.record(z.string()).optional(),
    });

    const body = createSchema.parse(request.body);
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

    // Create DB service record
    const service = await prisma.service.create({
      data: {
        name: body.name,
        slug,
        organizationId: orgId,
        ownerId: userContext.userId,
        templateId: body.templateId,
        templateVersionId: body.templateVersionId,
        memoryLimitBytes: BigInt(body.memoryMb) * BigInt(1024 * 1024),
        cpuLimitCores: body.cpuCores,
        diskLimitBytes: BigInt(body.diskMb) * BigInt(1024 * 1024),
        status: 'INSTALLING',
        environmentVars: body.environment
          ? {
              create: Object.entries(body.environment).map(([key, value]) => ({ key, value })),
            }
          : undefined,
      },
    });

    // Schedule and deploy asynchronously via Orchestrator
    try {
      await orchestrator.deployService(service.id);
    } catch (err: any) {
      await prisma.service.update({
        where: { id: service.id },
        data: { status: 'ERROR' },
      });
      return reply.status(500).send({ error: `Orchestration error: ${err.message}`, serviceId: service.id });
    }

    return reply.status(201).send(service);
  });

  // Service Actions (Start, Stop, Restart)
  fastify.post('/:id/actions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action } = z.object({ action: z.enum(['START', 'STOP', 'RESTART']) }).parse(request.body);

    const service = await prisma.service.findUnique({
      where: { id },
      include: { instances: { include: { node: true } } },
    });

    if (!service || service.instances.length === 0) {
      return reply.status(404).send({ error: 'Service or active instance not found' });
    }

    const instance = service.instances[0];
    const node = instance.node;
    const agent = new AgentClient(node.fqdn, node.agentPort, 'nexus-dev-secret-token');

    if (action === 'STOP') {
      if (instance.containerId) {
        await agent.stopService(instance.containerId, service.id);
      }
      await prisma.service.update({ where: { id }, data: { status: 'STOPPED' } });
    } else if (action === 'RESTART') {
      if (instance.containerId) {
        await agent.restartService(instance.containerId, service.id);
      }
      await prisma.service.update({ where: { id }, data: { status: 'RUNNING' } });
    }

    return reply.send({ success: true, action, status: 'EXECUTED' });
  });

  // Files: List
  fastify.get('/:id/files', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const path = (request.query as any)?.path || '';

    const service = await prisma.service.findUnique({
      where: { id },
      include: { instances: { include: { node: true } } },
    });
    if (!service || service.instances.length === 0) {
      return reply.status(404).send({ error: 'Service instance not found' });
    }

    const node = service.instances[0].node;
    const agent = new AgentClient(node.fqdn, node.agentPort, 'nexus-dev-secret-token');
    const items = await agent.listFiles(service.id, path);
    return reply.send(items);
  });

  // Files: Read
  fastify.get('/:id/files/content', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const path = (request.query as any)?.path;
    if (!path) return reply.status(400).send({ error: 'path parameter required' });

    const service = await prisma.service.findUnique({
      where: { id },
      include: { instances: { include: { node: true } } },
    });
    if (!service || service.instances.length === 0) {
      return reply.status(404).send({ error: 'Service instance not found' });
    }

    const node = service.instances[0].node;
    const agent = new AgentClient(node.fqdn, node.agentPort, 'nexus-dev-secret-token');
    const content = await agent.readFile(service.id, path);
    return reply.send({ content });
  });

  // Files: Write
  fastify.post('/:id/files/content', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { path, content } = z.object({ path: z.string(), content: z.string() }).parse(request.body);

    const service = await prisma.service.findUnique({
      where: { id },
      include: { instances: { include: { node: true } } },
    });
    if (!service || service.instances.length === 0) {
      return reply.status(404).send({ error: 'Service instance not found' });
    }

    const node = service.instances[0].node;
    const agent = new AgentClient(node.fqdn, node.agentPort, 'nexus-dev-secret-token');
    await agent.writeFile(service.id, path, content);
    return reply.send({ success: true });
  });

  // WebSocket Live Console Gateway Tunnel
  fastify.get('/:id/console', { websocket: true }, (connection: any, req) => {
    const { id } = req.params as { id: string };
    const wsClient = connection.socket || connection;

    prisma.service
      .findUnique({
        where: { id },
        include: { instances: { include: { node: true } } },
      })
      .then((service) => {
        if (!service || service.instances.length === 0 || !service.instances[0].containerId) {
          wsClient.send('Error: Service or active container not found\r\n');
          wsClient.close();
          return;
        }

        const instance = service.instances[0];
        const node = instance.node;
        const agent = new AgentClient(node.fqdn, node.agentPort, 'nexus-dev-secret-token');
        const agentWsUrl = agent.getConsoleWsUrl(instance.containerId!);

        // Open backend connection to node agent
        const agentWs = new WebSocket(agentWsUrl);

        agentWs.on('open', () => {
          wsClient.send(`\x1b[32m[NexusPanel]\x1b[0m Connected to console on node ${node.name}...\r\n`);
        });

        agentWs.on('message', (data: any) => {
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(data.toString());
          }
        });

        agentWs.on('error', (err: any) => {
          wsClient.send(`\x1b[31m[Agent Error]\x1b[0m ${err.message}\r\n`);
        });

        agentWs.on('close', () => {
          wsClient.close();
        });

        wsClient.on('message', (msg: any) => {
          if (agentWs.readyState === WebSocket.OPEN) {
            agentWs.send(msg.toString());
          }
        });

        wsClient.on('close', () => {
          if (agentWs.readyState === WebSocket.OPEN) {
            agentWs.close();
          }
        });
      })
      .catch((err: any) => {
        wsClient.send(`Internal server error: ${err.message}\r\n`);
        wsClient.close();
      });
  });
}
