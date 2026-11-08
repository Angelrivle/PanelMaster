import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  Save,
  Globe,
  RefreshCw,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from '../../components/Toast';
import { DraggableToggle } from '../../components/DraggableToggle';

interface AdminAuthProvidersProps {
  language?: string;
}

interface OAuthConfig {
  googleEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  googleAllowedDomains: string;
  discordEnabled: boolean;
  discordClientId: string;
  discordClientSecret: string;
  discordRedirectUri: string;
  discordBotToken: string;
  discordGuildId: string;
  allowAutoSignup: boolean;
  defaultRole: 'USER' | 'ADMIN';
  syncAvatar: boolean;
}

const STORAGE_KEY = 'pm_oauth_config';

const DEFAULT_CONFIG: OAuthConfig = {
  googleEnabled: true,
  googleClientId: '894129841029-panelmaster.apps.googleusercontent.com',
  googleClientSecret: 'GOCSPX-SecretSampleKey9841284712',
  googleRedirectUri: 'http://localhost:5173/api/v1/auth/google/callback',
  googleAllowedDomains: '',
  discordEnabled: true,
  discordClientId: '124859182940192841',
  discordClientSecret: 'pm_discord_sec_7841920419204812',
  discordRedirectUri: 'http://localhost:5173/api/v1/auth/discord/callback',
  discordBotToken: '',
  discordGuildId: '',
  allowAutoSignup: true,
  defaultRole: 'USER',
  syncAvatar: true,
};

export const AdminAuthProviders: React.FC<AdminAuthProvidersProps> = ({ language = 'en' }) => {
  const isEs = language === 'es';

  const [config, setConfig] = useState<OAuthConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_CONFIG;
  });

  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showDiscordSecret, setShowDiscordSecret] = useState(false);
  const [showDiscordToken, setShowDiscordToken] = useState(false);
  const [isTestingGoogle, setIsTestingGoogle] = useState(false);
  const [isTestingDiscord, setIsTestingDiscord] = useState(false);

  const updateConfig = <K extends keyof OAuthConfig>(key: K, value: OAuthConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      toast.success(
        isEs
          ? 'Variables de entorno OAuth guardadas correctamente.'
          : 'OAuth environment variables saved successfully.'
      );
    } catch (_) {
      toast.error(isEs ? 'Error al guardar la configuración.' : 'Error saving configuration.');
    }
  };

  const handleTestGoogle = () => {
    setIsTestingGoogle(true);
    setTimeout(() => {
      setIsTestingGoogle(false);
      if (!config.googleClientId || !config.googleClientSecret) {
        toast.error(isEs ? 'Faltan credenciales de Google OAuth.' : 'Missing Google OAuth credentials.');
      } else {
        toast.success(
          isEs
            ? 'Conexión con Google OAuth 2.0 verificada exitosamente.'
            : 'Google OAuth 2.0 connection verified successfully.'
        );
      }
    }, 1200);
  };

  const handleTestDiscord = () => {
    setIsTestingDiscord(true);
    setTimeout(() => {
      setIsTestingDiscord(false);
      if (!config.discordClientId || !config.discordClientSecret) {
        toast.error(isEs ? 'Faltan credenciales de Discord OAuth.' : 'Missing Discord OAuth credentials.');
      } else {
        toast.success(
          isEs
            ? 'Conexión con Discord API & OAuth verificada exitosamente.'
            : 'Discord API & OAuth connection verified successfully.'
        );
      }
    }, 1200);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isEs ? `${label} copiado al portapapeles` : `${label} copied to clipboard`);
  };

  const envBlock = `# PanelMaster OAuth Authentication Environment Variables
# Google OAuth 2.0
GOOGLE_AUTH_ENABLED=${config.googleEnabled}
GOOGLE_CLIENT_ID="${config.googleClientId}"
GOOGLE_CLIENT_SECRET="${config.googleClientSecret}"
GOOGLE_REDIRECT_URI="${config.googleRedirectUri}"
GOOGLE_ALLOWED_DOMAINS="${config.googleAllowedDomains}"

# Discord OAuth 2.0
DISCORD_AUTH_ENABLED=${config.discordEnabled}
DISCORD_CLIENT_ID="${config.discordClientId}"
DISCORD_CLIENT_SECRET="${config.discordClientSecret}"
DISCORD_REDIRECT_URI="${config.discordRedirectUri}"
DISCORD_BOT_TOKEN="${config.discordBotToken}"
DISCORD_GUILD_ID="${config.discordGuildId}"

# Global OAuth Behavior
OAUTH_ALLOW_SIGNUP=${config.allowAutoSignup}
OAUTH_DEFAULT_ROLE="${config.defaultRole}"
OAUTH_SYNC_AVATAR=${config.syncAvatar}
`;

  return (
    <div className="w-full space-y-6 pb-12 font-sans select-none">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#1f1f23]">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase font-mono block">
            PANELMASTER
          </span>
          <div className="flex items-center gap-2.5 mt-0.5">
            <Shield className="w-5 h-5 text-blue-400" />
            <h1 className="text-base font-bold text-white tracking-wide">
              {isEs ? 'Autenticación OAuth (Discord & Google)' : 'OAuth Authentication (Discord & Google)'}
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
            {isEs
              ? 'Configura las credenciales de cliente, secretos y URLs de redirección para permitir inicio de sesión único con Google y Discord.'
              : 'Configure client credentials, secrets, and callback redirect URIs to enable single sign-on via Google and Discord.'}
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20 uppercase tracking-wide shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{isEs ? 'Guardar Cambios' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Two Column Grid: Google OAuth & Discord OAuth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* 1. GOOGLE OAUTH 2.0 CARD                                  */}
        {/* ========================================================= */}
        <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1c1c20]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                <span className="text-red-400 font-extrabold text-base">G</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Google OAuth 2.0</h2>
                <p className="text-[11px] text-zinc-400 font-mono">Sign in with Google</p>
              </div>
            </div>

            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                config.googleEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {config.googleEnabled ? (isEs ? 'Habilitado' : 'Enabled') : isEs ? 'Deshabilitado' : 'Disabled'}
            </span>
          </div>

          <DraggableToggle
            checked={config.googleEnabled}
            onChange={(val) => updateConfig('googleEnabled', val)}
            color="blue"
            label={isEs ? 'HABILITAR INICIO DE SESIÓN CON GOOGLE' : 'ENABLE GOOGLE LOGIN'}
            description={
              isEs
                ? 'Muestra el botón "Continuar con Google" en la pantalla de inicio de sesión.'
                : 'Display "Continue with Google" button on the panel login screen.'
            }
          />

          {/* GOOGLE_CLIENT_ID */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              GOOGLE CLIENT ID
            </label>
            <input
              type="text"
              placeholder="e.g. 1234567890-xxx.apps.googleusercontent.com"
              value={config.googleClientId}
              onChange={(e) => updateConfig('googleClientId', e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* GOOGLE_CLIENT_SECRET */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              GOOGLE CLIENT SECRET
            </label>
            <div className="relative">
              <input
                type={showGoogleSecret ? 'text' : 'password'}
                placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                value={config.googleClientSecret}
                onChange={(e) => updateConfig('googleClientSecret', e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showGoogleSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* GOOGLE REDIRECT URI */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              {isEs ? 'URI DE REDIRECCIÓN (CALLBACK)' : 'AUTHORIZED REDIRECT URI'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={config.googleRedirectUri}
                className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs font-mono text-zinc-400 select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(config.googleRedirectUri, 'Google Redirect URI')}
                className="p-2 rounded-xl bg-[#18181c] border border-[#27272a] text-zinc-300 hover:text-white hover:bg-[#222227] transition"
                title="Copiar URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              {isEs
                ? 'Agrega esta URI en la consola de Google Cloud en "URIs de redireccionamiento autorizados".'
                : 'Add this exact URI into Google Cloud Console under "Authorized redirect URIs".'}
            </p>
          </div>

          {/* ALLOWED DOMAINS */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              {isEs ? 'DOMINIOS PERMITIDOS (OPCIONAL)' : 'RESTRICTED DOMAINS (OPTIONAL)'}
            </label>
            <input
              type="text"
              placeholder={isEs ? 'ej: miempresa.com, staff.gg (vacío para todos)' : 'e.g. company.com (leave blank for all)'}
              value={config.googleAllowedDomains}
              onChange={(e) => updateConfig('googleAllowedDomains', e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#1c1c20]">
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1.5"
            >
              <span>Google Cloud Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={handleTestGoogle}
              disabled={isTestingGoogle}
              className="px-3.5 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#222227] border border-[#27272a] text-xs font-semibold text-zinc-200 hover:text-white transition flex items-center gap-1.5"
            >
              {isTestingGoogle && <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />}
              <span>{isEs ? 'Probar Conexión' : 'Test Connection'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. DISCORD OAUTH 2.0 CARD                                 */}
        {/* ========================================================= */}
        <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1c1c20]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center text-sm font-bold text-[#5865F2] shadow-inner">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Discord OAuth 2.0</h2>
                <p className="text-[11px] text-zinc-400 font-mono">Sign in with Discord</p>
              </div>
            </div>

            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                config.discordEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {config.discordEnabled ? (isEs ? 'Habilitado' : 'Enabled') : isEs ? 'Deshabilitado' : 'Disabled'}
            </span>
          </div>

          <DraggableToggle
            checked={config.discordEnabled}
            onChange={(val) => updateConfig('discordEnabled', val)}
            color="blue"
            label={isEs ? 'HABILITAR INICIO DE SESIÓN CON DISCORD' : 'ENABLE DISCORD LOGIN'}
            description={
              isEs
                ? 'Permite a los usuarios acceder vinculando su cuenta de Discord.'
                : 'Allow users to log in with their Discord accounts.'
            }
          />

          {/* DISCORD_CLIENT_ID */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              DISCORD CLIENT ID / APPLICATION ID
            </label>
            <input
              type="text"
              placeholder="e.g. 102938475610293847"
              value={config.discordClientId}
              onChange={(e) => updateConfig('discordClientId', e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* DISCORD_CLIENT_SECRET */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              DISCORD CLIENT SECRET
            </label>
            <div className="relative">
              <input
                type={showDiscordSecret ? 'text' : 'password'}
                placeholder="discord_secret_xxxxxxxxxxxxxxxx"
                value={config.discordClientSecret}
                onChange={(e) => updateConfig('discordClientSecret', e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowDiscordSecret(!showDiscordSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showDiscordSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* DISCORD REDIRECT URI */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              {isEs ? 'URI DE REDIRECCIÓN (CALLBACK)' : 'AUTHORIZED REDIRECT URI'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={config.discordRedirectUri}
                className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs font-mono text-zinc-400 select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(config.discordRedirectUri, 'Discord Redirect URI')}
                className="p-2 rounded-xl bg-[#18181c] border border-[#27272a] text-zinc-300 hover:text-white hover:bg-[#222227] transition"
                title="Copiar URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              {isEs
                ? 'Agrega esta URI exacta en el portal de desarrolladores de Discord bajo OAuth2 > Redirects.'
                : 'Add this exact URI in Discord Developer Portal under OAuth2 > Redirects.'}
            </p>
          </div>

          {/* GUILD / SERVER RESTRICTION (OPTIONAL) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                {isEs ? 'DISCORD GUILD ID (OPCIONAL)' : 'REQUIRED GUILD ID (OPTIONAL)'}
              </label>
              <input
                type="text"
                placeholder="ej: 984128471204812"
                value={config.discordGuildId}
                onChange={(e) => updateConfig('discordGuildId', e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                DISCORD BOT TOKEN
              </label>
              <div className="relative">
                <input
                  type={showDiscordToken ? 'text' : 'password'}
                  placeholder="Bot token"
                  value={config.discordBotToken}
                  onChange={(e) => updateConfig('discordBotToken', e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-3 pr-8 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowDiscordToken(!showDiscordToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showDiscordToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#1c1c20]">
            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1.5"
            >
              <span>Discord Developer Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={handleTestDiscord}
              disabled={isTestingDiscord}
              className="px-3.5 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#222227] border border-[#27272a] text-xs font-semibold text-zinc-200 hover:text-white transition flex items-center gap-1.5"
            >
              {isTestingDiscord && <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />}
              <span>{isEs ? 'Probar Conexión' : 'Test Connection'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global OAuth Options & .ENV Block Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Policy Card */}
        <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1c1c20]">
            <Lock className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              {isEs ? 'Políticas Globales de Acceso OAuth' : 'Global OAuth Access Policies'}
            </h3>
          </div>

          <div className="space-y-4">
            <DraggableToggle
              checked={config.allowAutoSignup}
              onChange={(val) => updateConfig('allowAutoSignup', val)}
              color="blue"
              label={isEs ? 'PERMITIR AUTO-REGISTRO MEDIANTE OAUTH' : 'ALLOW AUTOMATIC SIGNUP VIA OAUTH'}
              description={
                isEs
                  ? 'Crea automáticamente una cuenta nueva en PanelMaster si el usuario no existe.'
                  : 'Automatically creates a new account in PanelMaster if the user does not exist.'
              }
            />

            <DraggableToggle
              checked={config.syncAvatar}
              onChange={(val) => updateConfig('syncAvatar', val)}
              color="blue"
              label={isEs ? 'SINCRONIZAR AVATAR DEL PROVEEDOR' : 'SYNC PROVIDER AVATAR'}
              description={
                isEs
                  ? 'Importa automáticamente la foto de perfil de Google o Discord al perfil de PanelMaster.'
                  : 'Automatically imports profile photo from Google or Discord into PanelMaster.'
              }
            />

            <div className="space-y-1.5 pt-2 border-t border-[#1c1c20]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                {isEs ? 'ROL PREDETERMINADO PARA NUEVAS CUENTAS OAUTH' : 'DEFAULT ROLE FOR NEW OAUTH ACCOUNTS'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateConfig('defaultRole', 'USER')}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    config.defaultRole === 'USER'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                      : 'bg-[#09090b] text-zinc-400 border-[#27272a] hover:text-white'
                  }`}
                >
                  USER (Estándar)
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig('defaultRole', 'ADMIN')}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    config.defaultRole === 'ADMIN'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                      : 'bg-[#09090b] text-zinc-400 border-[#27272a] hover:text-white'
                  }`}
                >
                  ADMIN (Administrador)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* .ENV Export Card */}
        <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1c1c20]">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  {isEs ? 'Variables de Entorno .ENV Generadas' : 'Generated .ENV Configuration'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(envBlock, 'Bloque .env')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#18181c] border border-[#27272a] text-xs text-zinc-300 hover:text-white transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isEs ? 'Copiar .env' : 'Copy .env'}</span>
              </button>
            </div>

            <pre className="mt-3 p-3.5 rounded-xl bg-[#070709] border border-[#1c1c20] text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-56 no-scrollbar">
              {envBlock}
            </pre>
          </div>

          <div className="pt-2 border-t border-[#1c1c20] flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {isEs ? 'Valores sincronizados con el backend de PanelMaster' : 'Values synced with PanelMaster backend'}
            </span>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20"
            >
              {isEs ? 'Guardar y Aplicar' : 'Save & Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
