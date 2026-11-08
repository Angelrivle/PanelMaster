import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Check,
  X,
  Edit2,
  Terminal,
  FolderTree,
  Database,
  Archive,
  Power,
  GitBranch,
  Sliders,
  Globe,
  Settings,
  Key,
} from 'lucide-react';
import { toast } from '../../components/Toast';

interface ServerUsersProps {
  server: any;
}

interface PermissionItem {
  id: string;
  name: string;
  description: string;
}

interface PermissionGroup {
  category: string;
  icon: any;
  items: PermissionItem[];
}

export const ServerUsers: React.FC<ServerUsersProps> = ({ server }) => {
  const [users, setUsers] = useState<any[]>([
    {
      id: '1',
      username: 'Angel',
      email: 'angelriveradeveloper@gmail.com',
      role: 'Propietario',
      isOwner: true,
      permissions: ['ALL'],
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const permissionGroups: PermissionGroup[] = [
    {
      category: 'Control de Energía & Ciclo de Vida',
      icon: Power,
      items: [
        { id: 'server.start', name: 'Iniciar Servidor', description: 'Permite arrancar el contenedor cuando esté detenido.' },
        { id: 'server.stop', name: 'Detener Servidor', description: 'Envía señal de apagado seguro al proceso.' },
        { id: 'server.restart', name: 'Reiniciar Servidor', description: 'Detiene e inicia nuevamente el servicio.' },
        { id: 'server.kill', name: 'Forzar Apagado (Kill)', description: 'Mata el contenedor en caso de congelamiento crítico.' },
      ],
    },
    {
      category: 'Consola & Comandos',
      icon: Terminal,
      items: [
        { id: 'console.read', name: 'Ver Consola en Vivo', description: 'Permite visualizar los logs y salida en tiempo real.' },
        { id: 'console.write', name: 'Enviar Comandos', description: 'Permite ejecutar comandos interactivos en la terminal.' },
      ],
    },
    {
      category: 'Archivos & Acceso SFTP',
      icon: FolderTree,
      items: [
        { id: 'files.sftp', name: 'Acceso SFTP', description: 'Conectarse por clientes como FileZilla o WinSCP.' },
        { id: 'files.read', name: 'Listar y Ver Archivos', description: 'Explorar directorios y árbol de archivos.' },
        { id: 'files.download', name: 'Descargar Archivos', description: 'Descargar archivos y carpetas a su equipo.' },
        { id: 'files.upload', name: 'Subir Archivos', description: 'Subir nuevos archivos vía web o drag & drop.' },
        { id: 'files.edit', name: 'Editar y Guardar Código', description: 'Modificar código con el editor Monaco integrado.' },
        { id: 'files.compress', name: 'Comprimir Archivos', description: 'Empaquetar carpetas en archivos .zip / .tar.gz.' },
        { id: 'files.decompress', name: 'Descomprimir Archivos', description: 'Extraer archivos comprimidos en el servidor.' },
        { id: 'files.delete', name: 'Mover a Papelera / Borrar', description: 'Eliminar archivos y carpetas del servidor.' },
      ],
    },
    {
      category: 'Bases de Datos MySQL',
      icon: Database,
      items: [
        { id: 'database.read', name: 'Ver Bases de Datos', description: 'Inspeccionar bases de datos asignadas y credenciales.' },
        { id: 'database.create', name: 'Crear Base de Datos', description: 'Crear nuevas instancias de base de datos MySQL.' },
        { id: 'database.edit', name: 'Modificar y Resetear', description: 'Cambiar contraseñas, ver tablas y ejecutar consultas SQL.' },
        { id: 'database.delete', name: 'Eliminar Base de Datos', description: 'Destruir bases de datos MySQL del servidor.' },
      ],
    },
    {
      category: 'Copias de Seguridad (Backups)',
      icon: Archive,
      items: [
        { id: 'backup.create', name: 'Crear Backup', description: 'Generar copias de seguridad completas o selectivas.' },
        { id: 'backup.download', name: 'Descargar Backup', description: 'Descargar el archivo .tar.gz del backup generado.' },
        { id: 'backup.restore', name: 'Restaurar Servidor', description: 'Revertir el estado de archivos desde un backup previo.' },
        { id: 'backup.delete', name: 'Eliminar Backup', description: 'Borrar copias de seguridad para liberar espacio.' },
      ],
    },
    {
      category: 'Versiones & Modpacks',
      icon: GitBranch,
      items: [
        { id: 'version.install', name: 'Instalar Versión / Fork', description: 'Cambiar fork (Paper, Purpur, Forge, Folia, etc.).' },
        { id: 'modpack.install', name: 'Instalar Modpacks', description: 'Instalar modpacks de Modrinth o CurseForge.' },
      ],
    },
    {
      category: 'Gestión de Sub-usuarios',
      icon: Users,
      items: [
        { id: 'users.add', name: 'Añadir Colaboradores', description: 'Invitar usuarios para administrar el servidor.' },
        { id: 'users.edit', name: 'Editar Permisos', description: 'Modificar la lista de permisos de otros usuarios.' },
        { id: 'users.delete', name: 'Expulsar Colaboradores', description: 'Revocar acceso de usuarios existentes.' },
      ],
    },
    {
      category: 'Red, Parámetros & Ajustes',
      icon: Sliders,
      items: [
        { id: 'startup.manage', name: 'Configurar Inicio (Startup)', description: 'Editar flags Java, Docker Image y archivo .jar.' },
        { id: 'network.manage', name: 'Gestionar Puertos y Dominios', description: 'Asignar puertos y vincular registros DNS.' },
        { id: 'settings.manage', name: 'Ajustes y Reinstalación', description: 'Modificar detalles y solicitar reinstalación.' },
      ],
    },
  ];

  const allPermissionIds = permissionGroups.flatMap((g) => g.items.map((i) => i.id));

  const handleTogglePermission = (id: string) => {
    if (selectedPermissions.includes(id)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== id));
    } else {
      setSelectedPermissions([...selectedPermissions, id]);
    }
  };

  const handleToggleGroup = (group: PermissionGroup) => {
    const groupIds = group.items.map((i) => i.id);
    const allInGroup = groupIds.every((id) => selectedPermissions.includes(id));

    if (allInGroup) {
      setSelectedPermissions(selectedPermissions.filter((id) => !groupIds.includes(id)));
    } else {
      const newSelected = new Set([...selectedPermissions, ...groupIds]);
      setSelectedPermissions(Array.from(newSelected));
    }
  };

  const handleSelectAll = () => {
    setSelectedPermissions(allPermissionIds);
  };

  const handleDeselectAll = () => {
    setSelectedPermissions([]);
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setUserEmail('');
    setSelectedPermissions([]);
    setIsModalOpen(true);
  };

  const openEditModal = (targetUser: any) => {
    if (targetUser.isOwner) {
      toast.warning('Los permisos del propietario no pueden ser modificados.');
      return;
    }
    setEditingUserId(targetUser.id);
    setUserEmail(targetUser.email);
    setSelectedPermissions(targetUser.permissions);
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;

    if (editingUserId) {
      setUsers(
        users.map((u) =>
          u.id === editingUserId
            ? {
                ...u,
                permissions: selectedPermissions,
                role:
                  selectedPermissions.length === allPermissionIds.length
                    ? 'Admin Colaborador'
                    : 'Colaborador',
              }
            : u
        )
      );
      toast.success('Permisos de colaborador actualizados correctamente.');
    } else {
      setUsers([
        ...users,
        {
          id: String(Date.now()),
          username: userEmail.split('@')[0],
          email: userEmail,
          role:
            selectedPermissions.length === allPermissionIds.length
              ? 'Admin Colaborador'
              : 'Colaborador',
          isOwner: false,
          permissions: selectedPermissions,
        },
      ]);
      // Disparar plantilla: added_to_server
      fetch('/api/v1/mail/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: 'added_to_server',
          to: userEmail.trim(),
          variables: {
            user: userEmail.split('@')[0],
            server: server?.name || 'Servidor',
            role:
              selectedPermissions.length === allPermissionIds.length
                ? 'Administrador Completo (Todos los permisos)'
                : `${selectedPermissions.length} permisos concedidos`,
            serverUrl: `http://localhost:5173/server/${server?.id || 'srv-1'}`,
          },
        }),
      }).catch(() => {});
      toast.success('Nuevo colaborador añadido al servidor y correo de notificación enviado.');
    }

    setIsModalOpen(false);
  };

  const handleDeleteUser = (id: string, name: string) => {
    const targetUser = users.find((u) => u.id === id);
    if (targetUser && targetUser.email) {
      // Disparar plantilla: removed_from_server
      fetch('/api/v1/mail/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: 'removed_from_server',
          to: targetUser.email.trim(),
          variables: {
            user: targetUser.username || targetUser.email.split('@')[0],
            server: server?.name || 'Servidor',
            dashboardUrl: 'http://localhost:5173/dashboard',
          },
        }),
      }).catch(() => {});
    }
    setUsers(users.filter((u) => u.id !== id));
    toast.info(`Colaborador "${name}" revocado y correo de notificación emitido.`);
  };

  return (
    <div className="w-full space-y-5">
      {/* Top Header Card */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Usuarios y Sub-usuarios del Servidor
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Control de acceso granular: asigna permisos precisos para SFTP, consola, archivos, bases de datos MySQL, backups y energía.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Añadir Colaborador
        </button>
      </div>

      {/* Users List - Full Width */}
      <div className="w-full space-y-3">
        {users.map((u) => (
          <div
            key={u.id}
            className="w-full flex items-center justify-between p-4 bg-[#111114] border border-[#1f1f23] hover:border-zinc-700 rounded-2xl transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#18181c] border border-[#27272a] flex items-center justify-center font-bold text-blue-400 text-sm">
                {u.username[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-zinc-100">{u.username}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      u.isOwner
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">{u.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
                {u.isOwner ? (
                  <span className="text-emerald-400 font-semibold">Acceso Total (Root)</span>
                ) : (
                  `${u.permissions.length} de ${allPermissionIds.length} permisos`
                )}
              </span>

              {!u.isOwner && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(u)}
                    title="Editar Permisos"
                    className="p-2 text-zinc-400 hover:text-white hover:bg-[#18181c] rounded-xl border border-transparent hover:border-[#27272a] transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id, u.username)}
                    title="Expulsar Usuario"
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#111114] border border-[#1f1f23] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1f1f23] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">
                    {editingUserId ? 'Editar Permisos de Colaborador' : 'Añadir Colaborador al Servidor'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Define exactamente a qué áreas y acciones tendrá acceso este usuario.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#18181c] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
              {/* User Email */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Correo Electrónico del Usuario
                </label>
                <input
                  type="email"
                  required
                  disabled={!!editingUserId}
                  placeholder="usuario@ejemplo.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 disabled:opacity-60 transition"
                />
              </div>

              {/* Quick Actions (Select All, Deselect All) */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#09090b] border border-[#1f1f23]">
                <div className="text-xs font-mono text-zinc-400">
                  <span className="text-blue-400 font-bold">{selectedPermissions.length}</span> de{' '}
                  <span className="text-zinc-200">{allPermissionIds.length}</span> permisos concedidos
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 transition"
                  >
                    Seleccionar Todo
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#18181c] text-zinc-400 hover:text-white hover:bg-[#222227] transition"
                  >
                    Desmarcar Todo
                  </button>
                </div>
              </div>

              {/* Categorized Permissions Grid */}
              <div className="space-y-4">
                {permissionGroups.map((group) => {
                  const Icon = group.icon;
                  const groupIds = group.items.map((i) => i.id);
                  const allSelected = groupIds.every((id) => selectedPermissions.includes(id));
                  const someSelected = groupIds.some((id) => selectedPermissions.includes(id)) && !allSelected;

                  return (
                    <div
                      key={group.category}
                      className="rounded-xl border border-[#1f1f23] bg-[#09090b]/50 overflow-hidden"
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#141418] border-b border-[#1f1f23]">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-bold text-zinc-200">{group.category}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleGroup(group)}
                          className="text-[11px] font-mono text-zinc-400 hover:text-blue-400 transition"
                        >
                          {allSelected ? 'Desmarcar sección' : 'Marcar todos'}
                        </button>
                      </div>

                      {/* Items in Group */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                        {group.items.map((item) => {
                          const isChecked = selectedPermissions.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              onClick={() => handleTogglePermission(item.id)}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                                isChecked
                                  ? 'bg-blue-600/10 border-blue-500/30'
                                  : 'bg-[#111114] border-[#1f1f23] hover:border-zinc-700'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition ${
                                  isChecked
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-zinc-700 bg-[#09090b]'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-zinc-200 block truncate">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">
                                  {item.description}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#1f1f23] bg-[#0d0d10] flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
              >
                {editingUserId ? 'Guardar Cambios' : 'Guardar y Otorgar Permisos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
