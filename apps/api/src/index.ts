import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { authenticate } from './middleware/auth';
import { authRoutes } from './routes/auth.routes';
import { servicesRoutes } from './routes/services.routes';
import { nodesRoutes } from './routes/nodes.routes';
import { templatesRoutes } from './routes/templates.routes';
import { mailRoutes } from './routes/mail.routes';
import { sftpService } from './services/sftp.service';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
  }
}

async function ensureInitialAdmin() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim();
  if (!adminEmail || !adminPassword) return;

  try {
    const existing = await prisma.user.findFirst({
      where: { email: adminEmail },
    });
    if (!existing) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const user = await prisma.user.create({
        data: {
          email: adminEmail,
          username: adminEmail.split('@')[0],
          passwordHash,
          isSuperAdmin: true,
          isEmailVerified: true,
        },
      });

      await prisma.organization.create({
        data: {
          name: 'PanelMaster Cloud',
          slug: 'panelmaster-root',
          memberships: {
            create: {
              userId: user.id,
              role: 'ORGANIZATION_OWNER',
            },
          },
        },
      });
      console.log(`[SEED] Initial Administrator user created: ${adminEmail}`);
    }
  } catch (err: any) {
    console.error(`[SEED] Notice on initial admin: ${err.message}`);
  }
}

async function bootstrap() {
  const app = Fastify({
    logger: true,
  });

  // Security & Plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(jwt, {
    secret: config.jwtSecret,
  });

  await app.register(websocket);

  // Decorate fastify with authentication handler
  app.decorate('authenticate', authenticate);

  // Health checks
  app.get('/healthz', async () => ({ status: 'ok', time: new Date().toISOString() }));
  app.get('/readyz', async () => ({ status: 'ready' }));

  // API v1 routes
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(servicesRoutes, { prefix: '/api/v1/services' });
  app.register(nodesRoutes, { prefix: '/api/v1/nodes' });
  app.register(templatesRoutes, { prefix: '/api/v1/templates' });
  app.register(mailRoutes, { prefix: '/api/v1/mail' });

  // Seed initial administrator if provided in environment
  await ensureInitialAdmin();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 NexusPanel Core API running at http://${config.host}:${config.port}`);

    // Start native SFTP daemon on port 2022
    sftpService.start();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
