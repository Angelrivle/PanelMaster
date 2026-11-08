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

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
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

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 NexusPanel Core API running at http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
