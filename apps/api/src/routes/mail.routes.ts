import { FastifyPluginAsync } from 'fastify';
import {
  getSmtpSettings,
  saveSmtpSettings,
  getMailTemplates,
  saveMailTemplates,
  sendTemplateEmail,
  sendEmail,
  SmtpConfig,
  TemplateKey,
  TemplateContent,
} from '../services/mail.service';

export const mailRoutes: FastifyPluginAsync = async (app) => {
  // GET SMTP Settings
  app.get('/settings', async (request, reply) => {
    try {
      const settings = await getSmtpSettings();
      return {
        ...settings,
        hasPassword: Boolean(settings.password),
        password: settings.password ? '••••••••••••••••' : '',
      };
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Error al obtener configuración de correo' });
    }
  });

  // POST SMTP Settings
  app.post('/settings', async (request, reply) => {
    try {
      const body = request.body as Partial<SmtpConfig>;
      if (body.password && body.password.includes('•••')) {
        delete body.password;
      }
      const updated = await saveSmtpSettings(body);
      return {
        success: true,
        settings: {
          ...updated,
          hasPassword: Boolean(updated.password),
          password: updated.password ? '••••••••••••••••' : '',
        },
      };
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Error al guardar configuración de correo' });
    }
  });

  // GET Templates
  app.get('/templates', async (request, reply) => {
    try {
      const templates = await getMailTemplates();
      return { success: true, templates };
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Error al cargar plantillas' });
    }
  });

  // POST Save Templates
  app.post('/templates', async (request, reply) => {
    try {
      const body = request.body as { templates: Partial<Record<TemplateKey, TemplateContent>> };
      const updated = await saveMailTemplates(body.templates || {});
      return { success: true, templates: updated };
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Error al guardar plantillas' });
    }
  });

  // POST Send Template Email (Functions: password_reset, account_created, server_installed, added_to_server, removed_from_server, test_message)
  app.post('/send-template', async (request, reply) => {
    try {
      const body = request.body as {
        templateKey: TemplateKey;
        to: string;
        variables?: Record<string, string>;
      };

      if (!body.templateKey) {
        return reply.status(400).send({ error: 'Debes especificar el templateKey a enviar.' });
      }

      if (!body.to || !body.to.includes('@')) {
        return reply.status(400).send({ error: 'Debes proporcionar una dirección de correo válida en "to".' });
      }

      const result = await sendTemplateEmail(body.templateKey, body.to.trim(), body.variables || {});

      return {
        success: true,
        message: `Correo de plantilla "${body.templateKey}" enviado a ${body.to}.`,
        messageId: result.messageId,
        provider: result.provider,
      };
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        error: error.message || 'Error al emitir el correo de plantilla',
      });
    }
  });

  // POST Send Test Email
  app.post('/test', async (request, reply) => {
    try {
      const body = request.body as {
        to: string;
        subject?: string;
        html?: string;
        text?: string;
        smtpConfig?: Partial<SmtpConfig>;
      };

      if (!body.to || !body.to.includes('@')) {
        return reply.status(400).send({ error: 'Debes proporcionar un correo de destino válido.' });
      }

      if (body.smtpConfig && body.smtpConfig.password && body.smtpConfig.password.includes('•••')) {
        const current = await getSmtpSettings();
        body.smtpConfig.password = current.password;
      }

      const defaultSubject = body.subject || 'PanelMaster - Correo de Prueba SMTP';
      const defaultHtml =
        body.html ||
        `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #111114; border: 1px solid #27272a; border-radius: 16px; padding: 32px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
              <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.03em; color: #ffffff;">PANEL<span style="color: #3b82f6;">MASTER</span></span>
            </div>
            <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 16px;">Prueba de Conexión Exitosa</h1>
            <p style="font-size: 14px; line-height: 1.6; color: #a1a1aa; margin-bottom: 24px;">
              ¡Felicidades! Si estás leyendo este mensaje, significa que la configuración SMTP de tu panel está funcionando al 100%.
            </p>
            <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-family: monospace; font-size: 12px; color: #e4e4e7;">
              <div><strong>Fecha:</strong> ${new Date().toLocaleString()}</div>
              <div><strong>Destinatario:</strong> ${body.to}</div>
              <div><strong>Estado:</strong> Entregado correctamente</div>
            </div>
            <p style="font-size: 12px; color: #71717a; margin-top: 32px; border-top: 1px solid #27272a; padding-top: 16px;">
              Enviado automáticamente por el motor de notificaciones de PanelMaster.
            </p>
          </div>
        </div>
      `;

      const result = await sendEmail({
        to: body.to,
        subject: defaultSubject,
        html: defaultHtml,
        text: body.text || 'Prueba de conexión SMTP exitosa en PanelMaster.',
        smtpConfig: body.smtpConfig,
      });

      return {
        success: true,
        message: 'Correo de prueba enviado con éxito.',
        messageId: result.messageId,
        provider: result.provider,
      };
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        error: error.message || 'Error desconocido al intentar enviar el correo',
      });
    }
  });
};
