import nodemailer from 'nodemailer';
import axios from 'axios';
import Redis from 'ioredis';
import { config } from '../config';

export type TemplateKey =
  | 'password_reset'
  | 'account_created'
  | 'server_installed'
  | 'added_to_server'
  | 'removed_from_server'
  | 'test_message';

export interface TemplateContent {
  subject: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  postText: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  encryption: 'TLS' | 'SSL' | 'NONE';
  user: string;
  password?: string;
  senderName: string;
  senderEmail: string;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  smtpConfig?: Partial<SmtpConfig>;
}

export const DEFAULT_TEMPLATES: Record<TemplateKey, TemplateContent> = {
  password_reset: {
    subject: 'Restablecer Contraseña - PanelMaster',
    heading: '¡Hola {{user}}!',
    body: 'Estás recibiendo este correo porque se solicitó restablecer la contraseña de tu cuenta en PanelMaster. Haz clic en el botón inferior para definir una nueva contraseña segura.',
    ctaText: 'Restablecer mi Contraseña',
    ctaUrl: '{{resetUrl}}',
    postText: 'Si no solicitaste este cambio, puedes ignorar este mensaje con seguridad. Este enlace expira en 2 horas.',
  },
  account_created: {
    subject: 'Bienvenido a PanelMaster - Cuenta Activada',
    heading: '¡Bienvenido a bordo, {{user}}!',
    body: 'Tu cuenta ha sido creada exitosamente. Ya puedes configurar tus credenciales de acceso y comenzar a desplegar y gestionar tus servidores.',
    ctaText: 'Activar Cuenta & Iniciar Sesión',
    ctaUrl: '{{loginUrl}}',
    postText: 'Nombre de usuario asignado: {{user}}\nCorreo registrado: {{email}}',
  },
  server_installed: {
    subject: 'Servidor "{{server}}" Instalado & Listo',
    heading: '¡Tu servidor está listo, {{user}}!',
    body: 'Tu servidor "{{server}}" ha completado el proceso de aprovisionamiento e instalación correctamente. Ya está disponible para ser encendido, configurado y conectado.',
    ctaText: 'Ir a la Consola del Servidor',
    ctaUrl: '{{serverUrl}}',
    postText: 'Dirección de Conexión: {{ip}}:{{port}}',
  },
  added_to_server: {
    subject: 'Has sido añadido al servidor "{{server}}"',
    heading: '¡Acceso Concedido!',
    body: 'Se te han otorgado permisos de subusuario para administrar el servidor "{{server}}". Ahora puedes acceder a sus recursos desde tu panel.',
    ctaText: 'Ver Servidor Asignado',
    ctaUrl: '{{serverUrl}}',
    postText: 'Permisos asignados: {{role}}',
  },
  removed_from_server: {
    subject: 'Acceso Revocado en servidor "{{server}}"',
    heading: 'Acceso Revocado',
    body: 'Tus permisos de subusuario en el servidor "{{server}}" han sido revocados por el administrador o dueño del servidor.',
    ctaText: 'Ir al Dashboard',
    ctaUrl: '{{dashboardUrl}}',
    postText: 'Si consideras que esto fue un error, por favor ponte en contacto con el dueño del servidor.',
  },
  test_message: {
    subject: 'Mensaje de Prueba - PanelMaster',
    heading: 'Verificación de Correo Exitosa',
    body: 'Este es un mensaje de prueba para verificar que el motor de correo y las plantillas visuales están funcionando al 100% en PanelMaster.',
    ctaText: 'Abrir Panel de Control',
    ctaUrl: '{{dashboardUrl}}',
    postText: 'Todos los diagnósticos de entrega y formato pasaron con éxito.',
  },
};

// In-memory fallback if Redis is unavailable
let inMemoryConfig: SmtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.resend.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  encryption: (process.env.SMTP_ENCRYPTION?.toUpperCase() as any) || 'TLS',
  user: process.env.SMTP_USER || 'resend',
  password: process.env.SMTP_PASSWORD || '',
  senderName: process.env.SMTP_FROM_NAME || 'PanelMaster',
  senderEmail: process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev',
};

let inMemoryTemplates: Record<TemplateKey, TemplateContent> = { ...DEFAULT_TEMPLATES };

const REDIS_SETTINGS_KEY = 'panelmaster:smtp_settings';
const REDIS_TEMPLATES_KEY = 'panelmaster:mail_templates';

let redis: Redis | null = null;
try {
  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  redis.connect().catch(() => {});
} catch {
  redis = null;
}

export async function getSmtpSettings(): Promise<SmtpConfig> {
  if (redis) {
    try {
      const data = await redis.get(REDIS_SETTINGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
  }
  return inMemoryConfig;
}

export async function saveSmtpSettings(newSettings: Partial<SmtpConfig>): Promise<SmtpConfig> {
  const current = await getSmtpSettings();
  const updated: SmtpConfig = {
    ...current,
    ...newSettings,
  };

  inMemoryConfig = updated;

  if (redis) {
    try {
      await redis.set(REDIS_SETTINGS_KEY, JSON.stringify(updated));
    } catch {}
  }

  return updated;
}

export async function getMailTemplates(): Promise<Record<TemplateKey, TemplateContent>> {
  if (redis) {
    try {
      const data = await redis.get(REDIS_TEMPLATES_KEY);
      if (data) {
        return { ...DEFAULT_TEMPLATES, ...JSON.parse(data) };
      }
    } catch {}
  }
  return inMemoryTemplates;
}

export async function saveMailTemplates(
  templates: Partial<Record<TemplateKey, TemplateContent>>
): Promise<Record<TemplateKey, TemplateContent>> {
  const current = await getMailTemplates();
  const updated = { ...current, ...templates };
  inMemoryTemplates = updated;

  if (redis) {
    try {
      await redis.set(REDIS_TEMPLATES_KEY, JSON.stringify(updated));
    } catch {}
  }

  return updated;
}

export function interpolateVariables(template: TemplateContent, variables: Record<string, string>): TemplateContent {
  const replace = (str: string) => {
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  };

  return {
    subject: replace(template.subject),
    heading: replace(template.heading),
    body: replace(template.body),
    ctaText: replace(template.ctaText),
    ctaUrl: replace(template.ctaUrl),
    postText: replace(template.postText),
  };
}

export function renderEmailHtml(
  content: TemplateContent,
  branding?: { senderName?: string; accentColor?: string }
): string {
  const accent = branding?.accentColor || '#3b82f6';
  const name = branding?.senderName || 'PanelMaster';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px; background-color: #09090b;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #111114; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              <tr>
                <td style="height: 4px; background-color: ${accent};"></td>
              </tr>
              <tr>
                <td style="padding: 36px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom: 24px;">
                        <span style="font-size: 19px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff;">
                          PANEL<span style="color: ${accent};">MASTER</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 16px;">
                        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em;">
                          ${content.heading}
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 28px; font-size: 14px; line-height: 1.6; color: #a1a1aa; white-space: pre-line;">
                        ${content.body}
                      </td>
                    </tr>
                    ${
                      content.ctaUrl && content.ctaText
                        ? `
                    <tr>
                      <td style="padding-bottom: 28px;">
                        <a href="${content.ctaUrl}" style="display: inline-block; background-color: ${accent}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 13px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);">
                          ${content.ctaText}
                        </a>
                      </td>
                    </tr>
                    `
                        : ''
                    }
                    ${
                      content.postText
                        ? `
                    <tr>
                      <td style="padding-bottom: 24px; font-size: 13px; line-height: 1.5; color: #71717a; white-space: pre-line; border-top: 1px solid #1f1f23; padding-top: 20px;">
                        ${content.postText}
                      </td>
                    </tr>
                    `
                        : ''
                    }
                    <tr>
                      <td style="border-top: 1px solid #1f1f23; padding-top: 20px; font-size: 11px; color: #52525b; line-height: 1.5;">
                        <div>Enviado automáticamente por <strong>${name}</strong>.</div>
                        <div style="margin-top: 4px;">PanelMaster Cloud · Todos los derechos reservados.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendEmail(
  options: SendMailOptions
): Promise<{ success: boolean; messageId?: string; provider: string; details?: any }> {
  const savedConfig = await getSmtpSettings();
  const activeConfig: SmtpConfig = {
    ...savedConfig,
    ...(options.smtpConfig || {}),
  };

  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const formattedFrom = activeConfig.senderName
    ? `"${activeConfig.senderName}" <${activeConfig.senderEmail}>`
    : activeConfig.senderEmail;

  const isResend =
    activeConfig.host.toLowerCase().includes('resend') ||
    activeConfig.user.toLowerCase() === 'resend' ||
    (activeConfig.password && activeConfig.password.startsWith('re_'));

  // 1. If provider is Resend, use Resend's REST API first
  if (isResend && activeConfig.password) {
    try {
      const resendPayload = {
        from: formattedFrom,
        to: toList,
        subject: options.subject,
        html: options.html || options.text || '',
        text: options.text || undefined,
      };

      const response = await axios.post('https://api.resend.com/emails', resendPayload, {
        headers: {
          Authorization: `Bearer ${activeConfig.password.trim()}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return {
        success: true,
        messageId: response.data?.id,
        provider: 'resend-api',
        details: response.data,
      };
    } catch (err: any) {
      const resendErr = err.response?.data;
      if (resendErr) {
        let errorMsg = resendErr.message || 'Error al enviar correo con Resend';
        if (resendErr.name === 'validation_error' && errorMsg.includes('domain')) {
          errorMsg = `Resend: El dominio del remitente (${activeConfig.senderEmail}) no está verificado en Resend. Si estás en modo de prueba, usa "onboarding@resend.dev" o verifica tu dominio en https://resend.com/domains`;
        } else if (resendErr.name === 'invalid_api_key' || err.response?.status === 401) {
          errorMsg = 'Resend: Tu API Key es inválida o ha expirado. Verifica que comience con "re_".';
        }
        throw new Error(errorMsg);
      }
    }
  }

  // 2. Standard Nodemailer SMTP
  const isSecure = activeConfig.encryption === 'SSL' || activeConfig.port === 465;

  const transporter = nodemailer.createTransport({
    host: activeConfig.host,
    port: activeConfig.port,
    secure: isSecure,
    auth: activeConfig.user
      ? {
          user: activeConfig.user,
          pass: activeConfig.password || '',
        }
      : undefined,
    tls: {
      rejectUnauthorized: activeConfig.encryption !== 'NONE',
    },
    connectionTimeout: 10000,
  });

  try {
    const info = await transporter.sendMail({
      from: formattedFrom,
      to: toList.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return {
      success: true,
      messageId: info.messageId,
      provider: 'smtp',
      details: info,
    };
  } catch (error: any) {
    let message = error.message || 'Error de conexión con el servidor SMTP';
    if (error.code === 'EAUTH') {
      message = 'Fallo de autenticación SMTP: Usuario o contraseña incorrectos.';
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      message = `No se pudo conectar al servidor SMTP en ${activeConfig.host}:${activeConfig.port} (${error.code}). Verifica el puerto y firewall.`;
    }
    throw new Error(message);
  }
}

export async function sendTemplateEmail(
  templateKey: TemplateKey,
  to: string,
  variables: Record<string, string> = {}
): Promise<{ success: boolean; messageId?: string; provider: string }> {
  const templates = await getMailTemplates();
  const rawTemplate = templates[templateKey] || DEFAULT_TEMPLATES[templateKey];
  if (!rawTemplate) {
    throw new Error(`Plantilla no encontrada: ${templateKey}`);
  }

  const baseVariables: Record<string, string> = {
    user: to.split('@')[0],
    email: to,
    server: 'survival-main',
    ip: '127.0.0.1',
    port: '25565',
    role: 'Consola, Archivos y Control de Energía',
    resetUrl: 'http://localhost:5173/auth/reset-password?token=pt-' + Date.now(),
    loginUrl: 'http://localhost:5173/login',
    serverUrl: 'http://localhost:5173/dashboard',
    dashboardUrl: 'http://localhost:5173/dashboard',
    company: 'PanelMaster',
    ...variables,
  };

  const processed = interpolateVariables(rawTemplate, baseVariables);
  const smtpConfig = await getSmtpSettings();
  const html = renderEmailHtml(processed, {
    senderName: smtpConfig.senderName,
  });

  const plainText = `${processed.heading}\n\n${processed.body}\n\n${processed.ctaText}: ${processed.ctaUrl}\n\n${processed.postText}`;

  return await sendEmail({
    to,
    subject: processed.subject,
    html,
    text: plainText,
  });
}
