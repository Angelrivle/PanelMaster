import React, { useState } from 'react';
import { Archive, Download, RotateCcw, Trash2, Plus, X, Lock, CheckCircle2, Folder, File, AlertTriangle } from 'lucide-react';
import { toast } from '../../components/Toast';

interface ServerBackupsProps {
  server: any;
}

export const ServerBackups: React.FC<ServerBackupsProps> = ({ server }) => {
  // Empty initial backups list (No dummy data)
  const [backups, setBackups] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [backupType, setBackupType] = useState<'full' | 'selective'>('full');
  const [selectedFolders, setSelectedFolders] = useState<string[]>(['world', 'plugins']);
  const [isCreating, setIsCreating] = useState(false);

  // Deletion confirmation modal state (Strict confirmation to prevent accidental loss)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    backup: any | null;
  }>({
    open: false,
    backup: null,
  });

  // Restore confirmation modal
  const [restoreConfirmation, setRestoreConfirmation] = useState<{
    open: boolean;
    backup: any | null;
  }>({
    open: false,
    backup: null,
  });

  const availableFolders = [
    { name: 'world', desc: 'Overworld, Nether y The End' },
    { name: 'plugins', desc: 'Plugins y configuraciones .yml' },
    { name: 'mods', desc: 'Archivos mod .jar' },
    { name: 'config', desc: 'Configuraciones de mods' },
    { name: 'server.properties', desc: 'Ajustes del servidor' },
  ];

  const handleCreate = () => {
    setIsCreating(true);
    setTimeout(() => {
      setBackups([
        {
          id: `bk-${Date.now()}`,
          name: backupName || 'Backup Manual',
          size: backupType === 'full' ? '1.5 GB' : '920 MB',
          createdAt: 'Recién creado',
          isLocked: false,
          type: backupType === 'full' ? 'COMPLETO' : 'SELECTIVO',
        },
        ...backups,
      ]);
      setIsCreating(false);
      setIsModalOpen(false);
      setBackupName('');
    }, 1500);
  };

  const executeDelete = () => {
    if (!deleteConfirmation.backup) return;
    setBackups(backups.filter((b) => b.id !== deleteConfirmation.backup.id));
    setDeleteConfirmation({ open: false, backup: null });
  };

  return (
    <div className="w-full space-y-6 pb-12 font-sans select-none">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0b0f19] p-5 border border-[#181d28] rounded-2xl shadow-lg">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-400" />
            <span>Copias de Seguridad (Backups)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Crea respaldos completos o selecciona archivos específicos para restaurar tu servidor en cualquier momento.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Copia de Seguridad</span>
        </button>
      </div>

      {/* Backups List or Empty State */}
      {backups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-[#1f1f23] bg-[#0c0c0e] rounded-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#141418] border border-[#27272a] flex items-center justify-center text-blue-400 shadow-md">
            <Archive className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-bold text-zinc-100">
              No hay copias de seguridad creadas
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Crea copias de seguridad completas o selectivas para proteger tus mundos, configuraciones y datos de servidor ante cualquier imprevisto.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primera Copia de Seguridad</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {backups.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-4 bg-[#0c0c0e] border border-[#1f1f23] rounded-2xl hover:border-zinc-700 transition"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#141418] border border-[#27272a] flex items-center justify-center text-blue-400">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-white">{b.name}</h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {b.type}
                    </span>
                    {b.isLocked && (
                      <span title="Protegido contra auto-purga">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {b.size} • Creado: {b.createdAt}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast.info(`Iniciando descarga de ${b.name}...`)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-[#141418] rounded-lg transition"
                  title="Descargar archivo .tar.gz"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRestoreConfirmation({ open: true, backup: b })}
                  className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition"
                  title="Restaurar este backup"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmation({ open: true, backup: b })}
                  className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                  title="Eliminar backup"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE BACKUP (Strict Confirmation) */}
      {deleteConfirmation.open && deleteConfirmation.backup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in-50 duration-100">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white tracking-tight">
                ¿Eliminar copia de seguridad permanentemente?
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Estás a punto de eliminar de forma irreversible la copia de seguridad:{' '}
              <strong className="text-white font-mono">{deleteConfirmation.backup.name}</strong> ({deleteConfirmation.backup.size}).
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-300">
              ⚠️ Esta acción destruirá el archivo del disco permanentemente. Esta acción no se puede deshacer y no pasa por la papelera del editor.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmation({ open: false, backup: null })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#0e121d] hover:bg-[#182030] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/30"
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESTORE BACKUP */}
      {restoreConfirmation.open && restoreConfirmation.backup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in-50 duration-100">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              <span>¿Restaurar copia de seguridad?</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Deseas restaurar el servidor al punto de restauración{' '}
              <strong className="text-white font-mono">{restoreConfirmation.backup.name}</strong>?
              Los archivos actuales del servidor se reemplazarán con los datos de esta copia.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreConfirmation({ open: false, backup: null })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#0e121d] hover:bg-[#182030] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success('Restaurando servidor... El servidor se reiniciará con el backup seleccionado.');
                  setRestoreConfirmation({ open: false, backup: null });
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition shadow-lg shadow-amber-600/30"
              >
                Confirmar y Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE BACKUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0e1526] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0a0f19]">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-blue-400" />
                Nueva Copia de Seguridad
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nombre del Respaldo</label>
                <input
                  type="text"
                  placeholder="ej. Respaldo Semanal / Pre-mantenimiento"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Tipo de Respaldo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBackupType('full')}
                    className={`p-3 rounded-xl border text-left transition ${
                      backupType === 'full'
                        ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                        : 'bg-[#111827] border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Completo</div>
                    <div className="text-[11px] text-slate-500 mt-1">Copia exacta de todos los archivos y bases de datos.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBackupType('selective')}
                    className={`p-3 rounded-xl border text-left transition ${
                      backupType === 'selective'
                        ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                        : 'bg-[#111827] border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Selectivo</div>
                    <div className="text-[11px] text-slate-500 mt-1">Elige qué carpetas incluir y cuáles omitir.</div>
                  </button>
                </div>
              </div>

              {backupType === 'selective' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Archivos y Carpetas a incluir</label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                    {availableFolders.map((item) => {
                      const isSelected = selectedFolders.includes(item.name);
                      return (
                        <div
                          key={item.name}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedFolders(selectedFolders.filter((f) => f !== item.name));
                            } else {
                              setSelectedFolders([...selectedFolders, item.name]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-500/10 border-blue-500/30 text-white'
                              : 'bg-[#111827] border-slate-800/80 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                            <span className="font-mono">{item.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{item.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#111827] hover:bg-[#182030]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={handleCreate}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-600/25 disabled:opacity-50"
                >
                  {isCreating ? 'Comprimiendo y guardando...' : 'Crear Copia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
