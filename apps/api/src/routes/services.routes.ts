import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import WebSocket from 'ws';
import { prisma } from '../prisma';
import { dockerService } from '../services/docker.service';

function serializeService(s: any) {
  return {
    ...s,
    memoryLimitBytes: Number(s.memoryLimitBytes),
    diskLimitBytes: Number(s.diskLimitBytes),
  };
}

export async function servicesRoutes(fastify: FastifyInstance) {
  // List Services
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const services = await prisma.service.findMany({
        where: { deletedAt: null },
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

      return reply.send(services.map(serializeService));
    } catch (err: any) {
      fastify.log.error(`Error listing services: ${err.message}`);
      return reply.send([]);
    }
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

    return reply.send(serializeService(service));
  });

  // Create Service
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userContext = request.userContext!;
    let orgId = request.headers['x-organization-id'] as string;

    if (!orgId) {
      const firstOrg = await prisma.organization.findFirst();
      orgId = firstOrg ? firstOrg.id : 'panelmaster-root';
    }

    const createSchema = z.object({
      id: z.string().optional(),
      name: z.string().min(2).max(64),
      egg: z.string().optional(),
      templateId: z.string().optional(),
      templateVersionId: z.string().optional(),
      dockerImage: z.string().optional(),
      memoryMb: z.number().min(256).default(2048),
      cpuCores: z.number().min(0.2).default(2.0),
      diskMb: z.number().min(512).default(10240),
      port: z.number().optional().default(25565),
      environment: z.record(z.any()).optional(),
      startOnCompletion: z.boolean().optional().default(true),
    });

    const body = createSchema.parse(request.body);
    const serviceId = body.id || `srv-${Date.now()}`;
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

    // Ensure template & templateVersion exist in DB
    let template = body.templateId ? await prisma.template.findUnique({ where: { id: body.templateId } }) : null;
    if (!template) {
      template = await prisma.template.findFirst({
        where: { name: body.egg || 'Minecraft Java (Paper)' },
      });
      if (!template) {
        template = await prisma.template.create({
          data: {
            name: body.egg || 'Minecraft Java (Paper)',
            slug: slug + '-tmpl',
            category: 'minecraft',
            type: 'GAME_SERVER',
          },
        });
      }
    }

    let version = body.templateVersionId
      ? await prisma.templateVersion.findUnique({ where: { id: body.templateVersionId } })
      : null;
    if (!version) {
      version = await prisma.templateVersion.findFirst({
        where: { templateId: template.id },
      });
      if (!version) {
        version = await prisma.templateVersion.create({
          data: {
            templateId: template.id,
            version: 'latest',
            dockerImage: body.dockerImage || 'itzg/minecraft-server:latest',
            startupCommand: '',
            minCpuCores: body.cpuCores,
            minMemoryMb: body.memoryMb,
            minDiskMb: body.diskMb,
          },
        });
      }
    }

    // Ensure an online node exists
    let node = await prisma.node.findFirst({ where: { status: 'ONLINE' } });
    if (!node) {
      let region = await prisma.region.findFirst();
      if (!region) {
        region = await prisma.region.create({ data: { code: 'default', name: 'LOCAL CLUSTER' } });
      }
      node = await prisma.node.create({
        data: {
          name: 'node-01',
          regionId: region.id,
          fqdn: process.env.PANEL_DOMAIN || '127.0.0.1',
          agentPort: 8080,
          agentTokenHash: 'nexus-dev-secret-token',
          cpuCores: 8,
          memoryTotalBytes: BigInt(32768) * BigInt(1024 * 1024),
          diskTotalBytes: BigInt(256000) * BigInt(1024 * 1024),
          status: 'ONLINE',
        },
      });
    }

    // Create DB service record
    const service = await prisma.service.create({
      data: {
        id: serviceId,
        name: body.name,
        slug,
        organizationId: orgId,
        ownerId: userContext.userId,
        templateId: template.id,
        templateVersionId: version.id,
        memoryLimitBytes: BigInt(body.memoryMb) * BigInt(1024 * 1024),
        cpuLimitCores: body.cpuCores,
        diskLimitBytes: BigInt(body.diskMb) * BigInt(1024 * 1024),
        status: body.startOnCompletion ? 'RUNNING' : 'STOPPED',
      },
    });

    // Create service instance
    const instance = await prisma.serviceInstance.create({
      data: {
        serviceId: service.id,
        nodeId: node.id,
        containerId: `nexus-${service.id}`,
        containerName: `nexus-${service.id}`,
        hostDataPath: `/var/lib/panelmaster/volumes/${service.id}`,
        status: service.status,
        startedAt: new Date(),
      },
    });

    // Create port allocation
    await prisma.portAllocation.create({
      data: {
        nodeId: node.id,
        port: body.port || 25565,
        protocol: 'TCP',
        serviceInstanceId: instance.id,
        isPrimary: true,
      },
    });

    // Spawn REAL Docker container on host
    try {
      await dockerService.createServiceContainer({
        serviceId: service.id,
        name: service.name,
        image: version.dockerImage || 'itzg/minecraft-server:latest',
        port: body.port || 25565,
        memoryMb: body.memoryMb,
        cpuCores: body.cpuCores,
        environment: body.environment as Record<string, string>,
        startNow: body.startOnCompletion,
      });
    } catch (dockerErr: any) {
      fastify.log.warn(`[Docker] Notice on container start: ${dockerErr.message}`);
    }

    return reply.status(201).send(serializeService(service));
  });

  // Service Actions (Start, Stop, Restart)
  fastify.post('/:id/actions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action } = z.object({ action: z.enum(['START', 'STOP', 'RESTART']) }).parse(request.body);

    const nextStatus = action === 'STOP' ? 'STOPPED' : 'RUNNING';

    try {
      await prisma.service.updateMany({
        where: { id },
        data: { status: nextStatus },
      });
      await prisma.serviceInstance.updateMany({
        where: { serviceId: id },
        data: { status: nextStatus },
      });
    } catch {}

    // Send action to real Docker container
    const containerName = `nexus-${id}`;
    let container = await dockerService.findContainerByName(containerName);

    if (container) {
      if (action === 'START') await dockerService.startContainer(container.Id);
      if (action === 'STOP') await dockerService.stopContainer(container.Id);
      if (action === 'RESTART') await dockerService.restartContainer(container.Id);
    } else if (action === 'START') {
      // Re-create container if missing
      await dockerService.createServiceContainer({
        serviceId: id,
        name: id,
        startNow: true,
      });
    }

    return reply.send({ success: true, action, status: nextStatus });
  });

  // WebSocket Live Console Gateway Tunnel
  fastify.get('/:id/console', { websocket: true }, async (connection: any, req: any) => {
    const { id } = req.params as { id: string };
    const wsClient = connection.socket || connection;

    let service = null;
    try {
      service = await prisma.service.findUnique({
        where: { id },
        include: { instances: { include: { node: true } } },
      });
    } catch {}

    const srvName = service?.name || 'Servidor';
    const containerName = `nexus-${id}`;

    wsClient.send(`\x1b[1;36m[PanelMaster Terminal]\x1b[0m Conectado a la consola de \x1b[1;37m${srvName}\x1b[0m\r\n`);
    wsClient.send(`\x1b[1;32m✓ Canal de comunicación seguro establecido con el host.\x1b[0m\r\n\r\n`);

    // Check if real Docker container exists on the host
    let dockerContainer = await dockerService.findContainerByName(containerName);

    // If container doesn't exist yet, auto-create it on Docker
    if (!dockerContainer && dockerService.isAvailable()) {
      wsClient.send(`\x1b[33m[PanelMaster]\x1b[0m Inicializando contenedor Docker en el host (itzg/minecraft-server:latest)...\r\n`);
      const created = await dockerService.createServiceContainer({
        serviceId: id,
        name: srvName,
        image: 'itzg/minecraft-server:latest',
        port: 25565,
        memoryMb: 2048,
        startNow: true,
      });
      if (created && created.Id) {
        dockerContainer = { Id: created.Id };
      }
    }

    if (dockerContainer) {
      wsClient.send(`\x1b[32m[PanelMaster]\x1b[0m Transmitiendo salida de consola en vivo de Docker...\r\n\r\n`);
      const logStream = dockerService.streamLogs(
        dockerContainer.Id,
        (chunk) => {
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(chunk);
          }
        },
        () => {}
      );

      wsClient.on('close', () => {
        logStream.abort();
      });

      // Handle terminal commands and forward to container
      wsClient.on('message', async (data: any) => {
        const raw = data.toString().trim();
        if (!raw) return;

        // Internal action events
        if (raw.startsWith('__ACTION__:')) {
          const act = raw.replace('__ACTION__:', '');
          if (act === 'START') await dockerService.startContainer(dockerContainer.Id);
          if (act === 'STOP') await dockerService.stopContainer(dockerContainer.Id);
          if (act === 'RESTART') await dockerService.restartContainer(dockerContainer.Id);
          return;
        }

        // Execute real command in Minecraft via rcon-cli
        const res = await dockerService.execCommand(dockerContainer.Id, raw);
        if (res && wsClient.readyState === WebSocket.OPEN) {
          wsClient.send(`${res}\r\n`);
        }
      });
    } else {
      // Fallback message if docker socket is not mounted
      wsClient.send(`\x1b[33m[PanelMaster]\x1b[0m Esperando arranque del servicio en el host...\r\n`);
    }
  });
}
