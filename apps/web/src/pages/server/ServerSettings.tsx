import React, { useState } from 'react';
import {
  Settings,
  Shield,
  RefreshCw,
  Server,
  AlertTriangle,
  Key,
  HardDrive,
  Check,
  Copy,
  Trash2,
  X,
  Cpu,
} from 'lucide-react';
import { toast } from '../../components/Toast';

interface ServerSettingsProps {
  server: any;
  onUpdateServer?: (updated: any) => void;
  onDeleteServer?: (serverId: string) => void;
}

export const ServerSettings: React.FC<ServerSettingsProps> = ({
  server,
  onUpdateServer,
  onDeleteServer,
}) => {
  const [name, setName] = useState(server?.name || 'Servidor');
  const [description, setDescription] = useState(server?.description || 'Servidor en PanelMaster');
  const [isSaved, setIsSaved] = useState(false);

  const [isReinstallModalOpen, setIsReinstallModalOpen] = useState(false);
  const [isReinstalling, setIsReinstalling] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateServer) {
      onUpdateServer({ ...server, name, description });
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReinstall = () => {
    setIsReinstalling(true);
    setTimeout(() => {
      setIsReinstalling(false);
      setIsReinstallModalOpen(false);
      toast.success('¡Reinstalación completada con éxito!\nEl software del contenedor ha sido reinstalado manteniendo intactos tus mundos y archivos.');
    }, 1500);
  };

  const handleDelete = () => {
    if (deleteConfirmText !== name) {
      toast.error('El nombre del servidor introducido no coincide.');
      return;
    }
    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      if (onDeleteServer) {
        onDeleteServer(server?.id);
      } else {
        toast.info('Servidor eliminado de forma permanente.');
        window.location.reload();
      }
    }, 1200);
  };

  return (
    <div className="w-full space-y-5">
      {/* General Changeable Details - Full Width */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            Detalles Generales del Servidor
          </h3>
          {isSaved && (
            <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> ¡Cambios guardados!
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Nombre del Servidor
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 resize-none transition"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
          >
            Guardar Cambios
          </button>
        </form>
      </div>

      {/* SFTP Connection Details - Full Width */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            Detalles de Conexión SFTP (Acceso a Archivos Externo)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Usa FileZilla, Cyberduck o WinSCP para subir archivos masivos o transferir mods directamente.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#09090b] p-3.5 rounded-xl border border-[#1f1f23] flex justify-between items-center">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Host SFTP</span>
              <span className="font-mono text-xs text-zinc-200 font-bold">sftp.panelmaster.local</span>
            </div>
            <button
              onClick={() => copy('sftp.panelmaster.local', 'host')}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#18181c] rounded-lg transition"
            >
              {copiedKey === 'host' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-[#09090b] p-3.5 rounded-xl border border-[#1f1f23] flex justify-between items-center">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Puerto SFTP</span>
              <span className="font-mono text-xs text-zinc-200 font-bold">2022</span>
            </div>
            <button
              onClick={() => copy('2022', 'port')}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#18181c] rounded-lg transition"
            >
              {copiedKey === 'port' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-[#09090b] p-3.5 rounded-xl border border-[#1f1f23] flex justify-between items-center">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Usuario</span>
              <span className="font-mono text-xs text-zinc-200 font-bold">pm.{server?.id || 'demo'}</span>
            </div>
            <button
              onClick={() => copy(`pm.${server?.id || 'demo'}`, 'user')}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#18181c] rounded-lg transition"
            >
              {copiedKey === 'user' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 font-mono">
          * La contraseña de conexión SFTP es la misma que la de tu cuenta de PanelMaster.
        </div>
      </div>

      {/* Debug & Node Information - Full Width */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            Información de Depuración (Debug & Host)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Datos técnicos del nodo, identificadores UUID y montaje en disco para soporte y diagnóstico.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
          <div className="p-3.5 bg-[#09090b] border border-[#1f1f23] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase">Nodo de Cómputo:</span>
              <span className="text-blue-400 font-bold">node-primary-01 (sa-lima)</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#09090b] border border-[#1f1f23] rounded-xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-zinc-500 block text-[10px] uppercase">Server UUID:</span>
              <span className="text-zinc-200 font-bold truncate block">{server?.id || 'srv-0000-1111-2222'}</span>
            </div>
            <button
              onClick={() => copy(server?.id || 'srv-0000-1111-2222', 'uuid')}
              className="p-1.5 text-zinc-500 hover:text-white rounded-lg"
            >
              {copiedKey === 'uuid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-3.5 bg-[#09090b] border border-[#1f1f23] rounded-xl">
            <span className="text-zinc-500 block text-[10px] uppercase">Docker Container:</span>
            <span className="text-zinc-300">panelmaster-{server?.id || 'local-demo'}</span>
          </div>

          <div className="p-3.5 bg-[#09090b] border border-[#1f1f23] rounded-xl">
            <span className="text-zinc-500 block text-[10px] uppercase">Directorio Montado en Host:</span>
            <span className="text-zinc-400 truncate block">/var/lib/panelmaster/volumes/{server?.id || 'demo'}</span>
          </div>
        </div>
      </div>

      {/* Reinstall Section - Full Width */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Reinstalar Servidor
          </h4>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Descarga nuevamente los binarios y librerías del software base. <strong>No borra tus archivos, configuraciones ni mundos</strong>, únicamente restablece la imagen del contenedor y sus ejecutables originales.
          </p>
        </div>

        <button
          onClick={() => setIsReinstallModalOpen(true)}
          className="px-4 py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition shrink-0"
        >
          Reinstalar Servidor
        </button>
      </div>

      {/* Danger Zone: Delete Server - Full Width */}
      <div className="w-full bg-rose-950/10 border border-rose-500/20 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Zona de Peligro: Eliminar Servidor
          </h4>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Elimina permanentemente este servidor, su contenedor de Docker, archivos montados en disco y bases de datos asociadas. Esta acción no se puede deshacer.
          </p>
        </div>

        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition shrink-0"
        >
          Eliminar Servidor
        </button>
      </div>

      {/* Reinstall Confirmation Modal */}
      {isReinstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              ¿Confirmar reinstalación del servidor?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Esta acción detendrá el servidor, descargará la imagen y ejecutará el script de inicialización sin eliminar tus archivos personales.
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1f1f23]">
              <button
                onClick={() => setIsReinstallModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleReinstall}
                disabled={isReinstalling}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {isReinstalling ? 'Reinstalando...' : 'Sí, Reinstalar Ahora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Server Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111114] border border-rose-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Eliminar Servidor Permanentemente
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Para confirmar que deseas destruir este servidor, escribe el nombre exacto:{' '}
              <strong className="text-white font-mono">{name}</strong>
            </p>
            <input
              type="text"
              placeholder={name}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full bg-[#09090b] border border-rose-500/30 rounded-xl px-4 py-2 font-mono text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1f1f23]">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== name || isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar Servidor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
