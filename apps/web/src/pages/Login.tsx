import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Globe } from 'lucide-react';
import { translations, Language } from '../i18n/translations';
import { toast } from '../components/Toast';

interface LoginProps {
  onSuccess: (token: string, user: any) => void;
  language?: Language;
  onToggleLanguage?: (lang: Language) => void;
}

export const Login: React.FC<LoginProps> = ({
  onSuccess,
  language = 'en',
  onToggleLanguage,
}) => {
  const t = translations[language] || translations.en;
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      toast.error('Introduce un correo electrónico válido.');
      return;
    }
    setIsSendingForgot(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar restablecimiento');
      toast.success(data.message || 'Correo de restablecimiento enviado exitosamente.');
      setForgotModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo enviar el correo de recuperación.');
    } finally {
      setIsSendingForgot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const endpoint = isRegister ? '/api/v1/auth/register' : '/api/v1/auth/login';
    const payload = isRegister
      ? { email, password, username: username || email.split('@')[0] }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`API server error (${res.status} ${res.statusText})`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Authentication error');
      }

      localStorage.setItem('nexus_token', data.token);
      localStorage.setItem('nexus_refresh', data.refreshToken);
      if (data.organizations?.[0]?.id) {
        localStorage.setItem('nexus_org_id', data.organizations[0].id);
      } else if (data.organization?.id) {
        localStorage.setItem('nexus_org_id', data.organization.id);
      }

      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: 'Google' | 'Discord') => {
    // Simulate OAuth handshake
    setIsLoading(true);
    setTimeout(() => {
      const mockToken = `oauth_${provider.toLowerCase()}_${Date.now()}`;
      localStorage.setItem('nexus_token', mockToken);
      localStorage.setItem('nexus_org_id', 'org-default');
      onSuccess(mockToken, {
        id: 'u-oauth',
        username: `${provider}User`,
        email: `user@${provider.toLowerCase()}.com`,
        role: 'SUPER_ADMIN',
      });
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between items-center p-6 select-none font-sans relative">
      {/* Top Bar with Language Selector */}
      <div className="w-full flex justify-end items-center max-w-4xl pt-2">
        {onToggleLanguage && (
          <div className="flex items-center gap-1.5 bg-[#111624] border border-slate-800 rounded-lg p-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <button
              onClick={() => onToggleLanguage('en')}
              className={`px-2 py-0.5 rounded font-medium transition ${
                language === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onToggleLanguage('es')}
              className={`px-2 py-0.5 rounded font-medium transition ${
                language === 'es' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ES
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-[420px] my-auto">
        {/* Title & Brand Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img src="/logo.png" className="w-14 h-14 object-contain mb-3 drop-shadow-md" alt="PanelMaster Logo" />
          <h1 className="text-2xl font-bold text-center text-white tracking-tight">
            {isRegister ? t.signUpTitle : t.signInTitle}
          </h1>
        </div>

        {/* OAuth Buttons: Google & Discord (Cloudflare style) */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleOAuth('Google')}
            className="flex items-center justify-center gap-2.5 py-2.5 px-4 bg-[#111624] hover:bg-[#161c2e] border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('Discord')}
            className="flex items-center justify-center gap-2.5 py-2.5 px-4 bg-[#111624] hover:bg-[#161c2e] border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            <svg className="w-4 h-4 fill-[#5865F2] shrink-0" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Discord</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-[#07090e] px-3 text-[11px] font-semibold text-slate-500 uppercase">
            OR
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alex_dev"
                className="w-full bg-[#111624] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-[#111624] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#111624] border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember device checkbox */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="remember"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600 bg-slate-900 border-slate-700"
            />
            <label htmlFor="remember" className="text-xs text-slate-400 cursor-pointer">
              Save email and login method on this device
            </label>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-600/20 disabled:opacity-50 mt-4"
          >
            {isLoading ? 'Connecting...' : isRegister ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-2 text-xs">
          <div>
            <span className="text-slate-500">
              {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              {isRegister ? 'Sign in' : 'Sign up'}
            </button>
          </div>

          {!isRegister && (
            <div>
              <span className="text-slate-500">¿Olvidaste tu </span>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotModalOpen(true);
                }}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                contraseña
              </button>
              <span className="text-slate-500">?</span>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleForgotSubmit}
            className="w-full max-w-md bg-[#111114] border border-[#27272a] rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23]">
              <h3 className="text-sm font-bold text-white">Restablecer Contraseña</h3>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Introduce tu correo registrado. Te enviaremos el enlace oficial con el formato de plantilla configurado en el panel.
            </p>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Correo Electrónico</label>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f1f23]">
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSendingForgot}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {isSendingForgot ? 'Enviando...' : 'Enviar Enlace'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Footer Legal Terms (Cloudflare style) */}
      <footer className="text-center text-[11px] text-zinc-500 max-w-sm mt-8">
        By continuing, I agree to PanelMaster's{' '}
        <a href="#terms" className="underline hover:text-zinc-400">terms</a>,{' '}
        <a href="#privacy" className="underline hover:text-zinc-400">privacy policy</a>, and{' '}
        <a href="#cookies" className="underline hover:text-zinc-400">cookie policy</a>.
      </footer>
    </div>
  );
};
