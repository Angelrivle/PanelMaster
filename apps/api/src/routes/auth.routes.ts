import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { z } from 'zod';
import { prisma } from '../prisma';
import { sendTemplateEmail } from '../services/mail.service';

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const registerSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      username: z.string().min(3).max(32),
      orgName: z.string().min(2).optional(),
    });

    const body = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.username }] },
    });

    if (existingUser) {
      return reply.status(409).send({ error: 'Email or username already registered' });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const userCount = await prisma.user.count();
    const isSuperAdmin = userCount === 0; // First registered user is automatically Super Admin

    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash,
        isSuperAdmin,
        isEmailVerified: true,
      },
    });

    // Create default Organization for user
    const orgName = body.orgName || `${body.username}'s Org`;
    const slug = body.username.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-team';

    const organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
        memberships: {
          create: {
            userId: user.id,
            role: 'ORGANIZATION_OWNER',
          },
        },
      },
    });

    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin },
      { expiresIn: '15m' }
    );

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Send account_created template email
    sendTemplateEmail('account_created', user.email, {
      user: user.username,
      email: user.email,
      loginUrl: 'http://localhost:5173/login',
    }).catch((err) => {
      fastify.log.warn(`Could not send welcome email: ${err.message}`);
    });

    return reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isSuperAdmin: user.isSuperAdmin,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
      token,
      refreshToken,
    });
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string(),
      twoFactorCode: z.string().optional(),
    });

    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // 2FA Verification if enabled
    if (user.twoFactorEnabled) {
      if (!body.twoFactorCode) {
        return reply.status(403).send({ error: '2FA_REQUIRED', message: 'Two-factor authentication code required' });
      }
      if (!user.twoFactorSecret || !authenticator.verify({ token: body.twoFactorCode, secret: user.twoFactorSecret })) {
        return reply.status(401).send({ error: 'Invalid 2FA code' });
      }
    }

    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin },
      { expiresIn: '15m' }
    );

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Send account_created template email
    sendTemplateEmail('account_created', user.email, {
      user: user.username,
      email: user.email,
      loginUrl: 'http://localhost:5173/login',
    }).catch((err) => {
      fastify.log.warn(`Could not send welcome email: ${err.message}`);
    });

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isSuperAdmin: user.isSuperAdmin,
      },
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
      token,
      refreshToken,
    });
  });

  // Setup 2FA
  fastify.post('/2fa/setup', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userContext = request.userContext!;
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(userContext.email, 'NexusPanel', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Temporarily save secret awaiting confirmation
    await prisma.user.update({
      where: { id: userContext.userId },
      data: { twoFactorSecret: secret },
    });

    return reply.send({ secret, qrCodeDataUrl });
  });

  // Verify and enable 2FA
  fastify.post('/2fa/verify', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { code } = z.object({ code: z.string() }).parse(request.body);
    const userContext = request.userContext!;

    const user = await prisma.user.findUnique({ where: { id: userContext.userId } });
    if (!user || !user.twoFactorSecret) {
      return reply.status(400).send({ error: '2FA not initiated' });
    }

    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!isValid) {
      return reply.status(400).send({ error: 'Invalid TOTP code' });
    }

    await prisma.user.update({
      where: { id: userContext.userId },
      data: { twoFactorEnabled: true },
    });

    return reply.send({ success: true, message: '2FA successfully activated' });
  });

  // Forgot Password / Restablecer Contraseña (Template: password_reset)
  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.send({ success: true, message: 'Si el correo existe, se enviará el enlace de restablecimiento.' });
    }

    const resetToken = fastify.jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      { expiresIn: '2h' }
    );

    const resetUrl = `http://localhost:5173/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    try {
      await sendTemplateEmail('password_reset', user.email, {
        user: user.username,
        resetUrl,
      });
      return reply.send({ success: true, message: 'Correo de restablecimiento enviado exitosamente.' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Error al enviar correo de recuperación.' });
    }
  });
}
