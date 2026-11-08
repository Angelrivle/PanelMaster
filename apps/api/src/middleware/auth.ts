import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma';

export interface AuthContext {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  currentOrgId?: string;
  roles?: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    userContext?: AuthContext;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await request.jwtVerify<{ userId: string; email: string; isSuperAdmin: boolean }>();

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, isSuperAdmin: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({ error: 'User inactive or revoked' });
    }

    const orgHeader = request.headers['x-organization-id'] as string | undefined;

    request.userContext = {
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      currentOrgId: orgHeader,
    };
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid or expired authentication token' });
  }
}

export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userContext) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (request.userContext.isSuperAdmin) {
      return; // Super admin bypasses permission checks
    }

    const { userId, currentOrgId } = request.userContext;
    if (!currentOrgId) {
      return reply.status(403).send({ error: 'Organization context required' });
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: currentOrgId,
        },
      },
    });

    if (!membership) {
      return reply.status(403).send({ error: 'Forbidden: No membership found in organization' });
    }

    // Role-level checks
    if (membership.role === 'ORGANIZATION_OWNER' || membership.role === 'ORGANIZATION_ADMIN') {
      return;
    }

    // Custom granular permissions check logic can be evaluated here
  };
}
