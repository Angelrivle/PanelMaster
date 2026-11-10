import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, Loader2, CheckCircle2, AlertCircle, RefreshCw, Terminal } from 'lucide-react';
import { toast } from '../../components/Toast';

interface ServerImportProps {
  server: any;
  onNavigate?: (tab: string) => void;
}

export const ServerImport: React.FC<ServerImportProps> = ({ server, onNavigate }) => {
  const [serverType, setServerType] = useState<'SFTP' | 'FTP'>('SFTP');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(2022);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [baseDirectory, setBaseDirectory] = useState('/');
  const [deleteFiles, setDeleteFiles] = useState(false);

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobStatus, setJobStatus] = useState<any>(null);

  // Auto-switch port when changing server type
  const handleTypeChange = (type: 'SFTP' | 'FTP') => {
    setServerType(type);
    if (type === 'SFTP' && port === 21) setPort(2022);
    if (type === 'FTP' && port === 2022) setPort(21);
  };

  // Poll active migration job status
  useEffect(() => {
    if (!server?.id) return;
    let isMounted = true;

    const checkJob = async () => {
      try {
        const token = localStorage.getItem('nexus_token');
        const res = await fetch(`/api/v1/services/${server.id}/import/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data && data.status !== 'IDLE') {
            setJobStatus(data);
          }
        }
      } catch {}
    };

    checkJob();
    const interval = setInterval(checkJob, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [server?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      host: true,
      username: true,
      password: true,
      port: true,
    });

    if (!host.trim() || !username.trim() || !password.trim() || !port) {
      toast.error('Por favor completa todos los campos requeridos para la migración.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`/api/v1/services/${server.id}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          serverType,
          host: host.trim(),
          port: Number(port),
          username: username.trim(),
          password,
          baseDirectory: baseDirectory.trim() || '/',
          deleteFiles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar con el servidor remoto.');
      }

      toast.success('Migración iniciada en segundo plano.');
      setJobStatus(data.job || { status: 'CONNECTING' });
    } catch (err: any) {
      toast.error(err.message || 'Error al iniciar la importación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHostError = touched.host && !host.trim();
  const isUserError = touched.username && !username.trim();
  const isPassError = touched.password && !password.trim();
  const isPortError = touched.port && !port;

  return (
    <div className="w-full space-y-6">
      {/* Active Job Progress Banner */}
      {jobStatus && (jobStatus.status === 'CONNECTING' || jobStatus.status === 'TRANSFERRING') && (
        <div className="bg-[#181a20] border border-orange-500/30 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
              <div>
                <h4 className="text-sm font-bold text-zinc-100">
                  Importando archivos desde {jobStatus.serverType} ({jobStatus.host})
                </h4>
                <p className="text-xs text-zinc-400 font-mono">
                  {jobStatus.currentFile ? `Descargando: ${jobStatus.currentFile}` : 'Conectando y enumerando archivos...'}
                </p>
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('console')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#272b34] hover:bg-[#343a46] text-zinc-200 text-xs font-semibold rounded-lg border border-[#3b414f] transition cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-orange-400" />
                Ver Consola
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-1">
            <span>Archivos transferidos: <strong className="text-zinc-200">{jobStatus.transferredFiles || 0}</strong></span>
            <span>Total descargado: <strong className="text-orange-400">{((jobStatus.bytesTransferred || 0) / (1024 * 1024)).toFixed(1)} MB</strong></span>
          </div>
        </div>
      )}

      {jobStatus && jobStatus.status === 'COMPLETED' && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-300">Migración completada con éxito</h4>
              <p className="text-xs text-zinc-400">
                Se transfirieron {jobStatus.transferredFiles} archivos ({((jobStatus.bytesTransferred || 0) / (1024 * 1024)).toFixed(1)} MB). La configuración de arranque ha sido auto-detectada.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('console')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
            >
              Ir a la Consola
            </button>
          )}
        </div>
      )}

      {jobStatus && jobStatus.status === 'FAILED' && (
        <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-rose-300">Fallo en la importación</h4>
            <p className="text-xs text-zinc-400">{jobStatus.error || 'No se pudo conectar al servidor remoto.'}</p>
          </div>
        </div>
      )}

      {/* Main Import Form Card matching the uploaded Screenshot */}
      <div className="w-full bg-[#181a20] border border-[#2b303c] rounded-xl overflow-hidden shadow-xl">
        {/* Orange Banner Header */}
        <div className="bg-[#ea580c] text-white px-6 py-3.5 flex items-center justify-between font-bold tracking-wider text-sm uppercase">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-white" />
            <span>IMPORT SERVER</span>
          </div>
          <span className="text-xs font-mono font-medium opacity-90">PTERODACTYL & FTP READY</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-xs sm:text-sm text-zinc-300 font-sans">
            You can import files from a remote file server here.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-5">
              {/* SERVER TYPE */}
              <div>
                <label className="text-[11px] font-mono font-bold tracking-wider text-zinc-400 uppercase block mb-1.5">
                  SERVER TYPE
                </label>
                <select
                  value={serverType}
                  onChange={(e) => handleTypeChange(e.target.value as any)}
                  className="w-full bg-[#272b34] text-zinc-100 font-mono text-sm px-4 py-3 rounded-lg border border-[#3b414f] focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="SFTP">SFTP (Pterodactyl, Bloom, Wisp - Puerto 2022 / 22)</option>
                  <option value="FTP">FTP (Multicraft, cPanel, Legacy - Puerto 21)</option>
                </select>
              </div>

              {/* HOST */}
              <div>
                <label className="text-[11px] font-mono font-bold tracking-wider text-zinc-400 uppercase block mb-1.5">
                  HOST
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, host: true }))}
                  placeholder="ej. mia-251008.bloom.host o 51.38.125.71"
                  className={`w-full bg-[#272b34] text-zinc-100 font-mono text-sm px-4 py-3 rounded-lg border focus:outline-none transition ${
                    isHostError ? 'border-red-500' : 'border-[#3b414f] focus:border-orange-500'
                  }`}
                />
                {isHostError && (
                  <span className="text-[11px] text-red-500 font-mono block mt-1">Host is a required field</span>
                )}
              </div>

              {/* PORT */}
              <div>
                <label className="text-[11px] font-mono font-bold tracking-wider text-zinc-400 uppercase block mb-1.5">
                  PORT
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  onBlur={() => setTouched((p) => ({ ...p, port: true }))}
                  placeholder="2022"
                  className={`w-full bg-[#272b34] text-zinc-100 font-mono text-sm px-4 py-3 rounded-lg border focus:outline-none transition ${
                    isPortError ? 'border-red-500' : 'border-[#3b414f] focus:border-orange-500'
                  }`}
                />
                {isPortError && (
                  <span className="text-[11px] text-red-500 font-mono block mt-1">Port is a required field</span>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* USERNAME */}
              <div>
                <label className="text-[11px] font-mono font-bold tracking-wider text-zinc-400 uppercase block mb-1.5">
                  USERNAME
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, username: true }))}
                  placeholder="ej. angelriveradeveloperooa.7083669c"
                  className={`w-full bg-[#272b34] text-zinc-100 font-mono text-sm px-4 py-3 rounded-lg border focus:outline-none transition ${
                    isUserError ? 'border-red-500' : 'border-[#3b414f] focus:border-orange-500'
                  }`}
                />
                {isUserError && (
                  <span className="text-[11px] text-red-500 font-mono block mt-1">Username is a required field</span>
                )}
              </div>

              {/* PASSWORD */}
              <div>
                <label className="text-[11px] font-mono font-bold tracking-wider text-zinc-400 uppercase block mb-1.5">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                  placeholder="••••••••••••••••"
                  className={`w-full bg-[#272b34] text-zinc-100 font-mono text-sm px-4 py-3 rounded-lg border focus:outline-none transition ${
                    isPassError ? 'border-red-500' : 'border-[#3b414f] focus:border-orange-500'
                  }`}
                />
                {isPassError && (
                  <span className="text-[11px] text-red-500 font-mono block mt-1">Password is a required field</span>
                )}
              </div>

              {/* BASE DIRECTORY */}
              <div>
                <label className="text-[11px] font-mono font-bold tracking-wider text-zinc-400 uppercase block mb-1.5">
                  BASE DIRECTORY
                </label>
                <input
                  type="text"
                  value={baseDirectory}
                  onChange={(e) => setBaseDirectory(e.target.value)}
                  placeholder="/"
                  className="w-full bg-[#272b34] text-zinc-100 font-mono text-sm px-4 py-3 rounded-lg border border-[#3b414f] focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* DELETE FILES Toggle Row matching screenshot */}
          <div className="pt-2 flex items-start gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={deleteFiles}
              onClick={() => setDeleteFiles(!deleteFiles)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                deleteFiles ? 'bg-[#ea580c]' : 'bg-[#272b34]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  deleteFiles ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-zinc-300 uppercase block">
                DELETE FILES
              </span>
              <p className="text-xs text-zinc-400 font-sans mt-0.5 max-w-2xl">
                This option will toggle if the local files on the server should be moved to the recycle bin before importing. If this is not selected, any duplicate files imported will overwrite existing files.
              </p>
            </div>
          </div>

          {/* Bottom Right Submit Button */}
          <div className="flex justify-end pt-4 border-t border-[#272b34]">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded font-bold uppercase text-xs tracking-wider transition shadow-lg cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando Migración...
                </>
              ) : (
                'IMPORT SERVER'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
