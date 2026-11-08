import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

export async function templatesRoutes(fastify: FastifyInstance) {
  // List all templates with versions
  fastify.get('/', async (request, reply) => {
    const templates = await prisma.template.findMany({
      include: {
        versions: {
          include: { variables: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return reply.send(templates);
  });

  // Seed default templates helper
  fastify.post('/seed-defaults', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!request.userContext?.isSuperAdmin) {
      return reply.status(403).send({ error: 'Super Admin required' });
    }

    const defaultTemplates = [
      {
        slug: 'minecraft-paper',
        name: 'Minecraft Java (Paper)',
        category: 'minecraft',
        description: 'High-performance Minecraft Paper server with plugin support',
        type: 'GAME_SERVER',
        versions: [
          {
            version: '1.20.4',
            dockerImage: 'itzg/minecraft-server:latest',
            startupCommand: '',
            minCpuCores: 2.0,
            minMemoryMb: 2048,
            minDiskMb: 10240,
            variables: [
              { name: 'TYPE', displayName: 'Server Software Type', defaultValue: 'PAPER' },
              { name: 'EULA', displayName: 'Accept Mojang EULA', defaultValue: 'TRUE' },
              { name: 'VERSION', displayName: 'Minecraft Version', defaultValue: '1.20.4' },
              { name: 'MEMORY', displayName: 'Server Max Memory', defaultValue: '2G' },
            ],
          },
        ],
      },
      {
        slug: 'discord-bot-nodejs',
        name: 'Discord Bot (Node.js)',
        category: 'bots',
        description: 'Discord bot runtime with Node.js 20 LTS',
        type: 'DISCORD_BOT',
        versions: [
          {
            version: '20-alpine',
            dockerImage: 'node:20-alpine',
            startupCommand: 'node index.js',
            minCpuCores: 0.5,
            minMemoryMb: 512,
            minDiskMb: 2048,
            variables: [
              { name: 'BOT_TOKEN', displayName: 'Discord Bot Token', defaultValue: '', isSecret: true },
            ],
          },
        ],
      },
      {
        slug: 'redis-valkey',
        name: 'Redis / Valkey Cache',
        category: 'databases',
        description: 'In-memory fast key-value database',
        type: 'DATABASE',
        versions: [
          {
            version: '7-alpine',
            dockerImage: 'redis:7-alpine',
            startupCommand: 'redis-server --protected-mode no',
            minCpuCores: 0.5,
            minMemoryMb: 512,
            minDiskMb: 2048,
            variables: [],
          },
        ],
      },
    ];

    for (const t of defaultTemplates) {
      const existing = await prisma.template.findUnique({ where: { slug: t.slug } });
      if (!existing) {
        await prisma.template.create({
          data: {
            slug: t.slug,
            name: t.name,
            category: t.category,
            description: t.description,
            type: t.type as any,
            versions: {
              create: t.versions.map((v) => ({
                version: v.version,
                dockerImage: v.dockerImage,
                startupCommand: v.startupCommand,
                minCpuCores: v.minCpuCores,
                minMemoryMb: v.minMemoryMb,
                minDiskMb: v.minDiskMb,
                variables: {
                  create: v.variables.map((va) => ({
                    name: va.name,
                    displayName: va.displayName,
                    defaultValue: va.defaultValue,
                    isSecret: (va as any).isSecret || false,
                  })),
                },
              })),
            },
          },
        });
      }
    }

    return reply.send({ success: true, message: 'Default templates seeded' });
  });
}
