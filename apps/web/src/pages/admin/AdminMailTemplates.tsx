import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Save,
  Moon,
  Sun,
  Copy,
  Check,
  RotateCw,
  ExternalLink,
  Code,
  FileText,
  Sparkles,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import { toast } from '../../components/Toast';
import { DraggableToggle } from '../../components/DraggableToggle';
import { loadSavedTheme } from '../../utils/themeManager';

interface AdminMailTemplatesProps {
  language?: string;
}

interface TemplateContent {
  subject: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  postText: string;
}

type TemplateKey =
  | 'password_reset'
  | 'account_created'
  | 'server_installed'
  | 'added_to_server'
  | 'removed_from_server'
  | 'test_message';

const DEFAULT_TEMPLATES: Record<TemplateKey, TemplateContent> = {
  password_reset: {
    subject: 'Restablecer Contraseña / Reset Password',
    heading: '¡Hola!',
    body: 'Estás recibiendo este correo porque solicitaste restablecer la contraseña de tu cuenta en PanelMaster.',
    ctaText: 'Restablecer Contraseña',
    ctaUrl: 'http://localhost:5173/auth/password/reset?token=demo_preview_token',
    postText: 'Si no solicitaste este cambio, puedes ignorar este mensaje con seguridad.',
  },
  account_created: {
    subject: 'Bienvenido a PanelMaster - Cuenta Creada',
    heading: '¡Bienvenido a bordo!',
    body: 'Tu cuenta ha sido creada exitosamente. Ya puedes configurar tus credenciales de acceso y comenzar a desplegar tus servicios.',
    ctaText: 'Activar Cuenta & Iniciar Sesión',
    ctaUrl: 'http://localhost:5173/auth/setup/account?token=init-new-account-984',
    postText: 'Este enlace de invitación expirará en 48 horas.',
  },
  server_installed: {
    subject: 'Servidor Instalado & Listo para Usar',
    heading: '¡Tu servidor está listo!',
    body: 'Tu servidor "survival-main" ha finalizado el proceso de instalación y está listo para ser encendido, configurado y personalizado.',
    ctaText: 'Ir a la Consola del Servidor',
    ctaUrl: 'http://localhost:5173/server/srv-9418/console',
    postText: 'Dirección de Conexión: 127.0.0.1:25565',
  },
  added_to_server: {
    subject: 'Permisos de Subusuario Otorgados',
    heading: '¡Has sido añadido a un servidor!',
    body: 'Se te han concedido permisos de subusuario en el servidor "network-proxy". Ahora puedes acceder a su consola y administrar archivos.',
    ctaText: 'Ver Servidor Asignado',
    ctaUrl: 'http://localhost:5173/server/srv-1102',
    postText: 'Permisos concedidos: Acceso a Consola, Explorador de Archivos, Encendido y Apagado.',
  },
  removed_from_server: {
    subject: 'Acceso a Servidor Revocado',
    heading: 'Acceso Revocado',
    body: 'Tus permisos de subusuario en el servidor "network-proxy" han sido revocados por el administrador o dueño del servidor.',
    ctaText: 'Abrir Dashboard Principal',
    ctaUrl: 'http://localhost:5173/dashboard',
    postText: 'Si consideras que esto es un error, por favor contacta al propietario del servidor.',
  },
  test_message: {
    subject: 'Mensaje de Prueba de PanelMaster',
    heading: 'Notificación de Verificación',
    body: 'Este es un mensaje de prueba emitido para verificar que el motor de correo SMTP y las plantillas visuales están funcionando de forma óptima.',
    ctaText: 'Verificar Estado del Panel',
    ctaUrl: 'http://localhost:5173/admin/settings',
    postText: 'Todos los diagnósticos de entrega pasaron con éxito.',
  },
};

const TEMPLATES_STORAGE_KEY = 'pm_mail_custom_templates';
const BRANDING_STORAGE_KEY = 'pm_mail_branding_config';

export const AdminMailTemplates: React.FC<AdminMailTemplatesProps> = ({ language = 'en' }) => {
  const isEs = language === 'es';

  // Sub-tab: branding vs text content editor
  const [leftTab, setLeftTab] = useState<'branding' | 'content'>('content');

  // Branding Controls (Initialized with active theme accent)
  const [useBrandDesign, setUseBrandDesign] = useState(true);
  const [senderName, setSenderName] = useState('PanelMaster Cloud');
  const [logoUrl, setLogoUrl] = useState('https://example.com/logo.png');
  const [logoWidth, setLogoWidth] = useState(140);
  const [accentColor, setAccentColor] = useState(() => {
    try {
      const savedTheme = loadSavedTheme();
      return savedTheme.accentColor || '#3b82f6';
    } catch (_) {
      return '#3b82f6';
    }
  });
  const [backgroundMode, setBackgroundMode] = useState<'dark' | 'light'>('dark');
  const [footerText, setFooterText] = useState('PanelMaster · Game Servers & Cloud Infrastructure');
  const [showSentByLink, setShowSentByLink] = useState(true);

  // Template text state
  const [templates, setTemplates] = useState<Record<TemplateKey, TemplateContent>>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (saved) return { ...DEFAULT_TEMPLATES, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_TEMPLATES;
  });

  useEffect(() => {
    fetch('/api/v1/mail/templates')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.templates) {
          setTemplates((prev) => ({ ...prev, ...data.templates }));
        }
      })
      .catch(() => {});
  }, []);

  // Live Preview Controls
  const [previewFormat, setPreviewFormat] = useState<'html' | 'text'>('html');
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>('password_reset');
  const [testRecipient, setTestRecipient] = useState('admin@panelmaster.local');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const currentTemplate = templates[activeTemplate] || DEFAULT_TEMPLATES[activeTemplate];

  // Update field of current active template
  const handleUpdateTemplateField = (field: keyof TemplateContent, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [activeTemplate]: {
        ...prev[activeTemplate],
        [field]: value,
      },
    }));
  };

  const handleSaveBranding = () => {
    try {
      localStorage.setItem(
        BRANDING_STORAGE_KEY,
        JSON.stringify({
          useBrandDesign,
          senderName,
          logoUrl,
          logoWidth,
          accentColor,
          backgroundMode,
          footerText,
          showSentByLink,
        })
      );
      toast.success(
        isEs
          ? 'Identidad de marca de los correos guardada exitosamente.'
          : 'Mail branding saved successfully.'
      );
    } catch (_) {
      toast.error('Error al guardar configuración');
    }
  };

  const handleSaveTemplates = async () => {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
      await fetch('/api/v1/mail/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates }),
      });
      toast.success(
        isEs
          ? 'Textos de plantillas de correo guardados y sincronizados en el servidor.'
          : 'Mail template texts saved and synced on server.'
      );
    } catch (_) {
      toast.error('Error al guardar textos de plantillas');
    }
  };

  const handleResetTemplates = async () => {
    setTemplates(DEFAULT_TEMPLATES);
    try {
      localStorage.removeItem(TEMPLATES_STORAGE_KEY);
      await fetch('/api/v1/mail/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: DEFAULT_TEMPLATES }),
      });
    } catch (_) {}
    toast.info(
      isEs
        ? 'Plantillas restablecidas a los textos predeterminados.'
        : 'Templates reset to default content.'
    );
  };

  const generateHtmlEmail = () => {
    return `
      <div style="background-color: ${backgroundMode === 'dark' ? '#090b10' : '#f8fafc'}; color: ${backgroundMode === 'dark' ? '#f4f4f5' : '#09090b'}; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; background-color: ${backgroundMode === 'dark' ? '#10141d' : '#ffffff'}; border: 1px solid ${backgroundMode === 'dark' ? '#1f2738' : '#e2e8f0'}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          <div style="height: 4px; background-color: ${accentColor}; width: 100%;"></div>
          <div style="padding: 32px;">
            <div style="font-size: 18px; font-weight: 800; margin-bottom: 24px; color: ${backgroundMode === 'dark' ? '#ffffff' : '#09090b'};">${senderName || 'PanelMaster'}</div>
            <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: ${backgroundMode === 'dark' ? '#ffffff' : '#09090b'};">${currentTemplate.heading}</h1>
            <p style="font-size: 14px; line-height: 1.6; color: ${backgroundMode === 'dark' ? '#d4d4d8' : '#475569'}; margin-bottom: 24px; white-space: pre-line;">${currentTemplate.body}</p>
            <div style="margin-bottom: 24px;">
              <a href="${currentTemplate.ctaUrl}" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 10px;">${currentTemplate.ctaText}</a>
            </div>
            <p style="font-size: 13px; line-height: 1.5; color: ${backgroundMode === 'dark' ? '#a1a1aa' : '#64748b'}; margin-bottom: 24px;">${currentTemplate.postText}</p>
            <div style="font-size: 12px; color: ${backgroundMode === 'dark' ? '#71717a' : '#94a3b8'}; border-top: 1px solid ${backgroundMode === 'dark' ? '#1f2738' : '#e2e8f0'}; padding-top: 16px;">
              ${footerText ? `<div>${footerText}</div>` : ''}
              ${showSentByLink ? `<div style="margin-top: 4px;">Sent by <strong>PanelMaster</strong></div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const generatePlainTextEmail = () => {
    return `${senderName || 'PanelMaster'}\n\n${currentTemplate.heading}\n\n${currentTemplate.body}\n\n${currentTemplate.ctaText}: ${currentTemplate.ctaUrl}\n\n${currentTemplate.postText}\n\n---\n${footerText}`;
  };

  const handleSendTestMail = async () => {
    if (!testRecipient || !testRecipient.includes('@')) {
      toast.error(
        isEs
          ? 'Por favor introduce un correo válido para el envío de prueba.'
          : 'Please enter a valid email address for the test.'
      );
      return;
    }
    setIsSendingTest(true);
    try {
      // Sincronizar plantilla editada antes del envío
      fetch('/api/v1/mail/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates }),
      }).catch(() => {});

      const res = await fetch('/api/v1/mail/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: activeTemplate,
          to: testRecipient.trim(),
          variables: {
            user: testRecipient.split('@')[0],
            email: testRecipient.trim(),
            server: 'survival-main',
            ip: '51.38.125.71',
            port: '25565',
            role: 'Consola, Archivos y Control de Energía',
            resetUrl: 'http://localhost:5173/auth/reset-password?token=demo-token-984',
            loginUrl: 'http://localhost:5173/login',
            serverUrl: 'http://localhost:5173/dashboard',
            dashboardUrl: 'http://localhost:5173/dashboard',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isEs ? 'Error al enviar plantilla' : 'Failed to send template email'));
      }
      toast.success(
        data.provider === 'resend-api'
          ? (isEs
              ? `¡Plantilla "${activeTemplate}" enviada a ${testRecipient} vía Resend! (ID: ${data.messageId}). Ya la puedes ver en tu panel de Resend.`
              : `Template "${activeTemplate}" sent to ${testRecipient} via Resend! (ID: ${data.messageId}). Visible in Resend.`)
          : (isEs
              ? `Correo de plantilla "${currentTemplate.subject}" enviado a ${testRecipient}.`
              : `Template email "${currentTemplate.subject}" sent to ${testRecipient}.`)
      );
    } catch (err: any) {
      toast.error(err.message || (isEs ? 'Error al enviar correo de prueba' : 'Error sending test email'));
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="w-full space-y-5 pb-10 font-sans select-none">
      {/* Top Banner / Header */}
      <div>
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase font-mono block">
          PANELMASTER
        </span>
        <div className="flex items-center gap-2.5 mt-0.5">
          <Mail className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white tracking-wide">
            {isEs ? 'Plantillas de Correo Electrónico' : 'Mail Templates'}
          </h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
          {isEs
            ? 'Personaliza tanto el diseño visual (colores, logo, pie de página) como el texto completo de cada correo automático emitido por la plataforma.'
            : "Customize both the visual identity and the actual wording of all automated panel emails."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================== */}
        {/* LEFT COLUMN: BRANDING & CONTENT EDITOR (5 cols)                */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
          {/* Subtabs: Identidad vs Contenido */}
          <div className="flex items-center bg-[#09090b] border border-[#27272a] rounded-xl p-1 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setLeftTab('content')}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                leftTab === 'content'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEs ? 'Editar Textos' : 'Edit Text Content'}</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('branding')}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                leftTab === 'branding'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEs ? 'Identidad de Marca' : 'Branding & Style'}</span>
            </button>
          </div>

          {/* TAB 1: TEXT CONTENT EDITOR */}
          {leftTab === 'content' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between pb-2 border-b border-[#1c1c20]">
                <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono">
                  {isEs ? 'EDITANDO:' : 'EDITING:'} {activeTemplate.replace(/_/g, ' ').toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={handleResetTemplates}
                  title={isEs ? 'Restablecer a valores de fábrica' : 'Reset to default texts'}
                  className="p-1 rounded text-zinc-500 hover:text-white transition flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isEs ? 'Restablecer' : 'Reset'}</span>
                </button>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  {isEs ? 'ASUNTO DEL CORREO' : 'EMAIL SUBJECT'}
                </label>
                <input
                  type="text"
                  value={currentTemplate.subject}
                  onChange={(e) => handleUpdateTemplateField('subject', e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Heading */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  {isEs ? 'TÍTULO / ENCABEZADO' : 'HEADING / TITLE'}
                </label>
                <input
                  type="text"
                  value={currentTemplate.heading}
                  onChange={(e) => handleUpdateTemplateField('heading', e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  {isEs ? 'CUERPO DEL MENSAJE' : 'MESSAGE BODY'}
                </label>
                <textarea
                  rows={4}
                  value={currentTemplate.body}
                  onChange={(e) => handleUpdateTemplateField('body', e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
                <p className="text-[10px] text-zinc-500">
                  {isEs ? 'Variables dinámicas soportadas: {{user}}, {{server}}, {{panel_name}}' : 'Supported tags: {{user}}, {{server}}, {{panel_name}}'}
                </p>
              </div>

              {/* CTA Text */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  {isEs ? 'TEXTO DEL BOTÓN DE ACCIÓN (CTA)' : 'BUTTON CTA TEXT'}
                </label>
                <input
                  type="text"
                  value={currentTemplate.ctaText}
                  onChange={(e) => handleUpdateTemplateField('ctaText', e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Post Text */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  {isEs ? 'PIE DE NOTA / VENCIMIENTO' : 'POST TEXT / EXPIRY'}
                </label>
                <textarea
                  rows={2}
                  value={currentTemplate.postText}
                  onChange={(e) => handleUpdateTemplateField('postText', e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1c1c20]">
                <span className="text-[11px] text-zinc-500 font-mono">
                  {isEs ? 'Cambios en vivo reflejados' : 'Live preview updated'}
                </span>
                <button
                  onClick={handleSaveTemplates}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20 uppercase tracking-wide"
                >
                  {isEs ? 'GUARDAR TEXTOS' : 'SAVE TEXTS'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: BRANDING CONTROLS */}
          {leftTab === 'branding' && (
            <div className="space-y-4 pt-1">
              <DraggableToggle
                checked={useBrandDesign}
                onChange={setUseBrandDesign}
                color="blue"
                label={isEs ? 'USAR DISEÑO PANELMASTER' : 'USE THE PANELMASTER DESIGN'}
                description={isEs ? 'Para cada correo que el panel envía.' : 'For every mail the panel sends.'}
              />

              {/* SENDER NAME */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  {isEs ? 'NOMBRE DE REMITENTE' : 'SENDER NAME'}
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-zinc-500">
                  {isEs
                    ? 'Visible en la cabecera y en la firma de despedida.'
                    : 'Shown in the header (without a logo) and the sign-off.'}
                </p>
              </div>

              {/* LOGO URL & LOGO WIDTH */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    {isEs ? 'URL DEL LOGOTIPO' : 'LOGO URL'}
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    {isEs ? 'ANCHO (PX)' : 'LOGO WIDTH (PX)'}
                  </label>
                  <input
                    type="number"
                    value={logoWidth}
                    onChange={(e) => setLogoWidth(Number(e.target.value))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* ACCENT COLOUR & BACKGROUND */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    {isEs ? 'COLOR DE ACENTO' : 'ACCENT COLOUR'}
                  </label>
                  <div className="flex items-center gap-2 bg-[#09090b] border border-[#27272a] rounded-xl px-2 py-1.5">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-xs font-mono text-zinc-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    {isEs ? 'FONDO' : 'BACKGROUND'}
                  </label>
                  <div className="flex items-center bg-[#09090b] border border-[#27272a] rounded-xl p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setBackgroundMode('dark')}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        backgroundMode === 'dark'
                          ? 'bg-[#18181c] text-white shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Moon className="w-3 h-3" />
                      <span>{isEs ? 'Oscuro' : 'Dark'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackgroundMode('light')}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        backgroundMode === 'light'
                          ? 'bg-zinc-200 text-zinc-900 shadow-sm font-bold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Sun className="w-3 h-3" />
                      <span>{isEs ? 'Claro' : 'Light'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  {isEs ? 'PIE DE PÁGINA' : 'FOOTER'}
                </label>
                <textarea
                  rows={2}
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* "SENT BY" LINK */}
              <div className="pt-1">
                <DraggableToggle
                  checked={showSentByLink}
                  onChange={setShowSentByLink}
                  color="blue"
                  label={isEs ? 'ENLACE "ENVIADO POR"' : '"SENT BY" LINK'}
                  description={isEs ? 'Un enlace hacia el panel debajo del pie de página.' : 'A link back to the panel under the footer.'}
                />
              </div>

              {/* Bottom Save Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1c1c20]">
                <span className="text-[11px] text-zinc-500">{isEs ? 'Listo' : 'Saved'}</span>
                <button
                  onClick={handleSaveBranding}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20 uppercase tracking-wide"
                >
                  {isEs ? 'GUARDAR ESTILO' : 'SAVE BRANDING'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: LIVE PREVIEW (7 cols)                            */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
            {/* Top View Toggle: HTML / Plain text */}
            <div className="flex items-center justify-between border-b border-[#1c1c20] pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                {isEs ? 'Vista previa en vivo' : 'Live preview'}
              </span>

              <div className="flex items-center bg-[#09090b] border border-[#27272a] rounded-xl p-1 gap-1 text-xs">
                <button
                  onClick={() => setPreviewFormat('html')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    previewFormat === 'html'
                      ? 'bg-[#18181c] text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>HTML</span>
                </button>
                <button
                  onClick={() => setPreviewFormat('text')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    previewFormat === 'text'
                      ? 'bg-[#18181c] text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Texto plano' : 'Plain text'}</span>
                </button>
              </div>
            </div>

            {/* Template Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              {[
                { id: 'password_reset', label: isEs ? 'Restablecer contraseña' : 'Password reset' },
                { id: 'account_created', label: isEs ? 'Cuenta creada' : 'Account created' },
                { id: 'server_installed', label: isEs ? 'Servidor instalado' : 'Server installed' },
                { id: 'added_to_server', label: isEs ? 'Añadido a servidor' : 'Added to a server' },
                { id: 'removed_from_server', label: isEs ? 'Removido de servidor' : 'Removed from a server' },
                { id: 'test_message', label: isEs ? 'Mensaje de prueba' : 'Test message' },
              ].map((tab) => {
                const isSelected = activeTemplate === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTemplate(tab.id as TemplateKey)}
                    style={isSelected ? { borderColor: accentColor, color: accentColor } : {}}
                    className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                      isSelected
                        ? 'bg-[#18181c] border shadow-sm font-semibold'
                        : 'text-zinc-400 hover:text-white bg-[#09090b] border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Subject Line */}
            <div className="text-xs font-mono text-zinc-400 px-1 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-zinc-500">SUBJECT</span>
              <span className="text-zinc-200 font-semibold">{currentTemplate.subject}</span>
            </div>

            {/* Simulated Email Container */}
            {previewFormat === 'html' ? (
              <div
                className={`w-full rounded-2xl p-8 border transition-colors select-none ${
                  backgroundMode === 'dark'
                    ? 'bg-[#090b10] border-[#181e2b] text-zinc-100'
                    : 'bg-[#f8fafc] border-zinc-200 text-zinc-900'
                }`}
              >
                <div className="max-w-md mx-auto space-y-6">
                  {/* Sender Header */}
                  <div className="font-bold text-base tracking-wide flex items-center gap-2">
                    {senderName || 'PanelMaster Cloud'}
                  </div>

                  {/* Card Box */}
                  <div
                    className={`rounded-2xl p-6 border space-y-5 shadow-xl relative overflow-hidden ${
                      backgroundMode === 'dark'
                        ? 'bg-[#10141d] border-[#1f2738]'
                        : 'bg-white border-zinc-200'
                    }`}
                  >
                    {/* Top Accent Line */}
                    <div
                      style={{ backgroundColor: accentColor }}
                      className="absolute top-0 left-0 right-0 h-1"
                    />

                    {/* Heading */}
                    <h3 className="text-xl font-bold tracking-tight">
                      {currentTemplate.heading}
                    </h3>

                    {/* Body */}
                    <p
                      className={`text-xs leading-relaxed whitespace-pre-line ${
                        backgroundMode === 'dark' ? 'text-zinc-300' : 'text-zinc-600'
                      }`}
                    >
                      {currentTemplate.body}
                    </p>

                    {/* CTA Button */}
                    <div>
                      <button
                        style={{ backgroundColor: accentColor }}
                        className="px-5 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-lg"
                      >
                        {currentTemplate.ctaText}
                      </button>
                    </div>

                    {/* Post Text */}
                    <p
                      className={`text-xs leading-relaxed ${
                        backgroundMode === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    >
                      {currentTemplate.postText}
                    </p>

                    {/* Sign-off */}
                    <div
                      className={`text-xs ${
                        backgroundMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
                      }`}
                    >
                      <div>Regards,</div>
                      <div className="font-semibold text-zinc-200">{senderName}</div>
                    </div>

                    {/* Fallback URL Box */}
                    <div className="pt-4 border-t border-[#1c2333]/50 text-[10px] space-y-1">
                      <div className="text-zinc-500">Button not working? Paste this into your browser:</div>
                      <div
                        style={{ color: accentColor }}
                        className="font-mono break-all hover:underline cursor-pointer"
                      >
                        {currentTemplate.ctaUrl}
                      </div>
                    </div>
                  </div>

                  {/* Mail Footer */}
                  <div className="text-center text-[11px] text-zinc-500 space-y-1 pt-2">
                    <div>{footerText}</div>
                    {showSentByLink && (
                      <div className="text-[10px]">
                        Sent by{' '}
                        <span style={{ color: accentColor }} className="hover:underline cursor-pointer font-semibold">
                          {senderName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <pre className="p-5 rounded-2xl bg-[#090b10] border border-[#181e2b] text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto select-all whitespace-pre-wrap">
{`From: ${senderName} <noreply@panelmaster.dev>
Subject: ${currentTemplate.subject}

${currentTemplate.heading}

${currentTemplate.body}

${currentTemplate.ctaText}:
${currentTemplate.ctaUrl}

${currentTemplate.postText}

Regards,
${senderName}

--------------------------------------------------
${footerText}
${showSentByLink ? `Sent by ${senderName}` : ''}`}
              </pre>
            )}

            {/* SEND A TEST CARD */}
            <div className="pt-4 border-t border-[#1c1c20] space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase font-mono block">
                {isEs ? 'ENVIAR CORREO DE PRUEBA' : 'SEND A TEST'}
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />

                <button
                  onClick={handleSendTestMail}
                  disabled={isSendingTest}
                  className="px-4 py-2 bg-[#18181c] hover:bg-[#222227] border border-[#27272a] text-blue-400 hover:text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 uppercase tracking-wide shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? (isEs ? 'Enviando...' : 'Sending...') : (isEs ? 'ENVIAR PRUEBA' : 'SEND TEST')}</span>
                </button>
              </div>

              <p className="text-[10px] text-zinc-500">
                {isEs
                  ? 'Envío en vivo activo: utiliza la configuración SMTP o Resend guardada en Settings.'
                  : 'Live sending active: uses the SMTP or Resend credentials configured in Settings.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
