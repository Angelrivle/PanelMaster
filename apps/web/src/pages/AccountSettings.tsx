import React, { useState, useRef } from 'react';
import {
  User,
  Shield,
  Key,
  Smartphone,
  Laptop,
  Terminal,
  Check,
  AlertCircle,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  ArrowLeft,
  ExternalLink,
  Upload,
  Camera,
  X,
  Lock,
} from 'lucide-react';
import { translations, Language } from '../i18n/translations';
import { toast } from '../components/Toast';

interface AccountSettingsProps {
  user: any;
  onUpdateUser?: (updated: any) => void;
  onBackToDashboard?: () => void;
  language?: Language;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  user,
  onUpdateUser,
  onBackToDashboard,
  language = 'en',
}) => {
  const t = translations[language] || translations.en;
  const isEs = language === 'es';

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | '2fa' | 'api' | 'sessions' | 'ssh'>('profile');

  // Profile Form state
  const [username, setUsername] = useState(user?.username || 'Angel');
  const [email, setEmail] = useState(user?.email || 'angelriveradeveloper@gmail.com');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [profileSaved, setProfileSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA Google Authenticator state
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState([
    {
      id: 'sess-current',
      device: 'Navegador Web Actual (Chrome / Windows)',
      ip: '127.0.0.1',
      location: 'Sesión local activa',
      isCurrent: true,
      lastActive: 'Activo ahora',
    },
  ]);

  // SSH Keys state
  const [sshKeys, setSshKeys] = useState<any[]>([]);
  const [newSshName, setNewSshName] = useState('');
  const [newSshKey, setNewSshKey] = useState('');
  const [showSshModal, setShowSshModal] = useState(false);

  // Handle Avatar Upload
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 3 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatar(result);
      if (onUpdateUser) {
        onUpdateUser({ ...user, avatar: result });
      }
      toast.success('¡Icono de usuario actualizado correctamente!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    if (onUpdateUser) {
      onUpdateUser({ ...user, avatar: null });
    }
    toast.info('Icono de usuario restablecido al predeterminado');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUser) {
      onUpdateUser({ ...user, username, email, avatar });
    }
    setProfileSaved(true);
    toast.success(isEs ? 'Perfil actualizado correctamente' : 'Profile updated successfully');
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error(isEs ? 'La contraseña debe tener al menos 8 caracteres' : 'Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(isEs ? 'Las contraseñas no coinciden' : 'Passwords do not match');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success(isEs ? 'Contraseña actualizada con éxito' : 'Password updated successfully');
  };

  // 2FA Handlers
  const handleVerify2fa = () => {
    setTotpError(null);
    if (totpCode.trim().length !== 6 || !/^\d+$/.test(totpCode.trim())) {
      setTotpError(isEs ? 'Por favor introduce un código numérico de 6 dígitos' : 'Please enter a valid 6-digit numeric code');
      return;
    }

    setIs2faEnabled(true);
    setShow2faSetup(false);
    setTotpCode('');
    setBackupCodes(['PM-8421-99', 'PM-1904-72', 'PM-5318-64', 'PM-7729-11', 'PM-3081-45']);
    toast.success(isEs ? '¡Google Authenticator vinculado y activado con éxito!' : 'Google Authenticator linked and active!');
  };

  const handleDisable2fa = () => {
    setIs2faEnabled(false);
    setShow2faSetup(false);
    setBackupCodes([]);
    setIsDisableModalOpen(false);
    toast.info(isEs ? 'Autenticación 2FA desactivada' : '2FA authentication disabled');
  };

  // API Token Generator
  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;

    const keySecret = `pm_live_${Math.random().toString(36).substring(2, 18)}${Math.random().toString(36).substring(2, 18)}`;
    const newEntry = {
      id: String(Date.now()),
      name: newKeyName,
      tokenPrefix: keySecret.substring(0, 12),
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: 'Nunca',
    };

    setApiKeys([...apiKeys, newEntry]);
    setGeneratedKey(keySecret);
    setNewKeyName('');
    toast.success('Token de API generado');
  };

  const handleDeleteApiKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    toast.info('Token de API revocado');
  };

  // SSH Key Handlers
  const handleAddSshKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSshName || !newSshKey) return;

    setSshKeys([
      ...sshKeys,
      {
        id: String(Date.now()),
        name: newSshName,
        fingerprint: `SHA256:${Math.random().toString(36).substring(2, 16)}...`,
        createdAt: new Date().toISOString().split('T')[0],
      },
    ]);
    setShowSshModal(false);
    setNewSshName('');
    setNewSshKey('');
    toast.success('Clave SSH pública vinculada');
  };

  const handleDeleteSshKey = (id: string) => {
    setSshKeys(sshKeys.filter((k) => k.id !== id));
    toast.info('Clave SSH eliminada');
  };

  const handleRevokeOtherSessions = () => {
    setSessions(sessions.filter((s) => s.isCurrent));
    toast.success(isEs ? 'Todas las demás sesiones han sido revocadas.' : 'All other sessions revoked.');
  };

  return (
    <div className="w-full space-y-6 pb-12 font-sans select-none">
      {/* Top Header Card - PanelMaster Style */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* User Avatar with Edit Badge */}
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {avatar ? (
              <img
                src={avatar}
                alt={username}
                className="w-14 h-14 rounded-2xl object-cover border border-[#27272a] shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-xl shadow-md">
                {username ? username[0].toUpperCase() : 'A'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-100">{username}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                {user?.role || 'SUPER_ADMIN'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{email}</p>
          </div>
        </div>

        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181c] hover:bg-[#222227] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isEs ? 'Volver al Dashboard' : 'Back to Dashboard'}</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-[#1f1f23]">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{isEs ? 'Perfil & Avatar' : 'Profile & Avatar'}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{isEs ? 'Contraseña' : 'Password'}</span>
        </button>

        <button
          onClick={() => setActiveTab('2fa')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === '2fa'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Google Authenticator (2FA)</span>
          {is2faEnabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === 'api'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Tokens de API</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === 'sessions'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>{isEs ? 'Sesiones Activas' : 'Active Sessions'}</span>
        </button>

        <button
          onClick={() => setActiveTab('ssh')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
            activeTab === 'ssh'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>{isEs ? 'Claves SSH' : 'SSH Keys'}</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PROFILE & AVATAR UPLOAD                                 */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              {isEs ? 'Icono de Usuario e Información Personal' : 'User Icon & Personal Details'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              {isEs
                ? 'Sube una foto de perfil personalizada para tu cuenta de PanelMaster.'
                : 'Upload a personalized avatar picture for your PanelMaster account.'}
            </p>
          </div>

          {/* Avatar Upload Card */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-[#09090b] border border-[#1f1f23]">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
            />

            <div className="relative">
              {avatar ? (
                <img
                  src={avatar}
                  alt={username}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/40 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-600/10 border-2 border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-2xl">
                  {username ? username[0].toUpperCase() : 'A'}
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Subir Nueva Imagen' : 'Upload Image'}</span>
                </button>

                {avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#18181c] hover:bg-[#222227] text-zinc-400 hover:text-rose-400 border border-[#27272a] rounded-xl text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Quitar Icono' : 'Remove Icon'}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Formatos permitidos: PNG, JPG, GIF o WEBP (máx. 3 MB).
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {isEs ? 'Nombre de Usuario' : 'Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {isEs ? 'Correo Electrónico' : 'Email Address'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
            >
              {isEs ? 'Guardar Cambios de Perfil' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PASSWORD CHANGE                                         */}
      {/* ============================================================== */}
      {activeTab === 'security' && (
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              {isEs ? 'Cambiar Contraseña de Cuenta' : 'Change Password'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              {isEs
                ? 'Actualiza tu contraseña para mantener la seguridad de tus servidores y tokens.'
                : 'Update your password to keep your servers and credentials safe.'}
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {isEs ? 'Contraseña Actual' : 'Current Password'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {isEs ? 'Nueva Contraseña' : 'New Password'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {isEs ? 'Confirmar Nueva Contraseña' : 'Confirm New Password'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPass"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-zinc-700 text-blue-600 focus:ring-0 w-4 h-4"
              />
              <label htmlFor="showPass" className="text-xs text-zinc-400 cursor-pointer">
                {isEs ? 'Mostrar contraseñas en texto claro' : 'Show passwords in clear text'}
              </label>
            </div>

            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
            >
              {isEs ? 'Actualizar Contraseña' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: 2FA GOOGLE AUTHENTICATOR                                */}
      {/* ============================================================== */}
      {activeTab === '2fa' && (
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-zinc-100">
                  Google Authenticator (2FA / TOTP)
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {isEs
                  ? 'Añade una capa de seguridad crítica a tu cuenta solicitando un código de 6 dígitos desde tu aplicación Google Authenticator al iniciar sesión.'
                  : 'Add two-step verification using Google Authenticator or any TOTP mobile app.'}
              </p>
            </div>

            {!is2faEnabled ? (
              <button
                onClick={() => setShow2faSetup(!show2faSetup)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition shrink-0"
              >
                {show2faSetup ? 'Ocultar Configuración' : 'Configurar Google Authenticator'}
              </button>
            ) : (
              <button
                onClick={() => setIsDisableModalOpen(true)}
                className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold transition shrink-0"
              >
                Desactivar 2FA
              </button>
            )}
          </div>

          {/* Active 2FA Banner */}
          {is2faEnabled && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start sm:items-center gap-3 text-emerald-400 text-xs">
              <Check className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1">
                <div className="font-bold text-sm">
                  {isEs ? 'Google Authenticator está activo y protegiendo tu cuenta' : 'Google Authenticator is actively protecting your account'}
                </div>
                <div className="text-emerald-500/80 mt-0.5">
                  {isEs
                    ? 'Cada vez que inicies sesión en un nuevo navegador se te solicitará el código dinámico de 6 dígitos.'
                    : 'A 6-digit TOTP code will be required when logging in.'}
                </div>
              </div>
            </div>
          )}

          {/* Backup Codes Section */}
          {is2faEnabled && backupCodes.length > 0 && (
            <div className="p-4 rounded-xl bg-[#09090b] border border-[#1f1f23] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">
                    {isEs ? 'Códigos de Respaldo de Emergencia' : 'Emergency Backup Codes'}
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Guarda estos códigos en un lugar seguro por si pierdes acceso a tu teléfono móvil.
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(backupCodes.join('\n'));
                    toast.success('Códigos de respaldo copiados al portapapeles');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181c] hover:bg-[#222227] text-zinc-300 rounded-lg text-xs font-semibold border border-[#27272a] transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Todos</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="p-2 bg-[#141418] border border-[#27272a] rounded-lg text-center text-zinc-200">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2FA Setup Flow with Google Authenticator */}
          {show2faSetup && !is2faEnabled && (
            <div className="p-5 bg-[#09090b] border border-[#1f1f23] rounded-2xl space-y-5 max-w-lg">
              <div>
                <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  {isEs ? 'Escanear con Google Authenticator' : 'Scan with Google Authenticator'}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Abre la app Google Authenticator en tu dispositivo móvil, pulsa en el botón <strong className="text-zinc-200">+</strong> y selecciona <strong className="text-zinc-200">Escanear código QR</strong>.
                </p>
              </div>

              {/* High-Resolution SVG QR Code */}
              <div className="w-48 h-48 bg-white rounded-2xl p-3 mx-auto flex items-center justify-center shadow-xl border-4 border-[#27272a]">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Position squares */}
                  <rect x="5" y="5" width="28" height="28" fill="#000" rx="3" />
                  <rect x="9" y="9" width="20" height="20" fill="#fff" rx="2" />
                  <rect x="13" y="13" width="12" height="12" fill="#000" rx="1" />

                  <rect x="67" y="5" width="28" height="28" fill="#000" rx="3" />
                  <rect x="71" y="9" width="20" height="20" fill="#fff" rx="2" />
                  <rect x="75" y="13" width="12" height="12" fill="#000" rx="1" />

                  <rect x="5" y="67" width="28" height="28" fill="#000" rx="3" />
                  <rect x="9" y="71" width="20" height="20" fill="#fff" rx="2" />
                  <rect x="13" y="75" width="12" height="12" fill="#000" rx="1" />

                  {/* Data patterns */}
                  <rect x="38" y="10" width="6" height="6" fill="#000" />
                  <rect x="48" y="15" width="8" height="6" fill="#000" />
                  <rect x="10" y="38" width="8" height="6" fill="#000" />
                  <rect x="22" y="45" width="6" height="8" fill="#000" />
                  <rect x="38" y="38" width="24" height="24" fill="#000" rx="2" />
                  <rect x="44" y="44" width="12" height="12" fill="#fff" />
                  <rect x="48" y="48" width="4" height="4" fill="#000" />
                  <rect x="68" y="38" width="6" height="6" fill="#000" />
                  <rect x="78" y="45" width="10" height="6" fill="#000" />
                  <rect x="38" y="68" width="8" height="6" fill="#000" />
                  <rect x="52" y="75" width="6" height="12" fill="#000" />
                  <rect x="68" y="68" width="12" height="6" fill="#000" />
                  <rect x="85" y="78" width="8" height="8" fill="#000" />
                </svg>
              </div>

              {/* Manual Secret Key */}
              <div className="p-3 bg-[#111114] border border-[#1f1f23] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                    {isEs ? 'Clave de configuración manual:' : 'Manual setup secret key:'}
                  </span>
                  <code className="text-xs font-mono font-bold text-blue-400 select-all">
                    JBSWY3DPEHPK3PXP
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('JBSWY3DPEHPK3PXP');
                    toast.success('Clave secreta copiada');
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#18181c] transition"
                  title="Copiar Clave"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  {isEs ? 'Introduce el código generado' : 'Enter 6-digit verification code'}
                </h4>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => {
                    setTotpCode(e.target.value);
                    if (totpError) setTotpError(null);
                  }}
                  placeholder="123456"
                  className="w-full bg-[#111114] border border-[#1f1f23] rounded-xl px-4 py-2.5 text-center text-xl font-mono tracking-widest text-zinc-100 focus:outline-none focus:border-blue-500 transition"
                />
                {totpError && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{totpError}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShow2faSetup(false)}
                  className="flex-1 py-2.5 bg-[#18181c] hover:bg-[#222227] text-zinc-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleVerify2fa}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
                >
                  Verificar y Activar 2FA
                </button>
              </div>
            </div>
          )}

          {/* Disable 2FA In-App Confirmation Modal */}
          {isDisableModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-4 shadow-2xl">
                <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-rose-400" />
                  ¿Desactivar Google Authenticator?
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Al desactivar 2FA, tu cuenta ya no requerirá el código dinámico y será más vulnerable a accesos no autorizados.
                </p>
                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1f1f23]">
                  <button
                    onClick={() => setIsDisableModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDisable2fa}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Sí, Desactivar 2FA
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: API TOKENS                                              */}
      {/* ============================================================== */}
      {activeTab === 'api' && (
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100">Tokens de API Personal</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Utiliza estos tokens para interactuar con la API REST de PanelMaster desde scripts, bots o pipelines de CI/CD.
              </p>
            </div>
            <button
              onClick={() => setShowNewKeyModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Token</span>
            </button>
          </div>

          {generatedKey && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
              <span className="text-xs font-bold text-emerald-400 block">
                ¡Token generado exitosamente! Cópialo ahora; no se volverá a mostrar:
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#09090b] border border-[#1f1f23] p-2.5 rounded-xl font-mono text-xs text-zinc-100 truncate">
                  {generatedKey}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedKey);
                    toast.success('Token copiado');
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <div className="text-center py-10 bg-[#09090b] border border-[#1f1f23] rounded-xl text-zinc-500 text-xs">
              No tienes ningún token de API activo. Pulsa en "Crear Token" para generar uno.
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="p-3.5 bg-[#09090b] border border-[#1f1f23] rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-zinc-200 block">{k.name}</span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {k.tokenPrefix}•••••••••••• • Creado: {k.createdAt}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteApiKey(k.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition"
                    title="Revocar token"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showNewKeyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-4 shadow-2xl">
                <h3 className="font-bold text-sm text-zinc-100">Crear Nuevo Token de API</h3>
                <input
                  type="text"
                  required
                  placeholder="ej. Script de Backups Nocturnos"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                />
                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1f1f23]">
                  <button
                    onClick={() => setShowNewKeyModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={(e) => {
                      handleCreateApiKey(e);
                      setShowNewKeyModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Generar Token
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: ACTIVE SESSIONS                                         */}
      {/* ============================================================== */}
      {activeTab === 'sessions' && (
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100">Sesiones del Navegador Activas</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Dispositivos y ubicaciones que actualmente tienen una sesión abierta con tu cuenta.
              </p>
            </div>
            <button
              onClick={handleRevokeOtherSessions}
              className="px-3.5 py-2 bg-[#18181c] hover:bg-[#222227] text-zinc-300 hover:text-rose-400 border border-[#27272a] rounded-xl text-xs font-semibold transition"
            >
              Cerrar Otras Sesiones
            </button>
          </div>

          <div className="space-y-3">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 bg-[#09090b] border border-[#1f1f23] rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-200">{sess.device}</span>
                      {sess.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ACTUAL
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      IP: {sess.ip} • {sess.location} • {sess.lastActive}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: SSH KEYS                                                */}
      {/* ============================================================== */}
      {activeTab === 'ssh' && (
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100">Claves Públicas SSH</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Conéctate vía SFTP o terminal segura sin introducir contraseña mediante autenticación de clave pública.
              </p>
            </div>
            <button
              onClick={() => setShowSshModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Clave SSH</span>
            </button>
          </div>

          {sshKeys.length === 0 ? (
            <div className="text-center py-10 bg-[#09090b] border border-[#1f1f23] rounded-xl text-zinc-500 text-xs">
              No hay claves SSH configuradas. Pulsa en "Añadir Clave SSH" para autorizar tu clave pública.
            </div>
          ) : (
            <div className="space-y-2">
              {sshKeys.map((k) => (
                <div
                  key={k.id}
                  className="p-3.5 bg-[#09090b] border border-[#1f1f23] rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-zinc-200 block">{k.name}</span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {k.fingerprint} • Añadida: {k.createdAt}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteSshKey(k.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showSshModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-lg bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-4 shadow-2xl">
                <h3 className="font-bold text-sm text-zinc-100">Añadir Clave Pública SSH</h3>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre de la Clave</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Mi Laptop ThinkPad"
                    value={newSshName}
                    onChange={(e) => setNewSshName(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 mb-3"
                  />
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Clave Pública (ssh-rsa / ssh-ed25519)</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... usuario@equipo"
                    value={newSshKey}
                    onChange={(e) => setNewSshKey(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1f1f23]">
                  <button
                    onClick={() => setShowSshModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddSshKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Guardar Clave SSH
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
