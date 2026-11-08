import React, { useState } from 'react';
import {
  Database,
  Key,
  Trash2,
  Table,
  Terminal,
  Upload,
  Archive,
  Share2,
  Copy,
  Check,
  Plus,
  Play,
  ArrowLeft,
  X,
  ShieldAlert,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from '../../components/Toast';

interface ServerDatabasesProps {
  server: any;
}

export const ServerDatabases: React.FC<ServerDatabasesProps> = ({ server }) => {
  // Empty initial databases list (No dummy data)
  const [databases, setDatabases] = useState<any[]>([]);
  const [selectedDb, setSelectedDb] = useState<any | null>(null);

  // Sub-tabs inside an active database
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'tables' | 'sql' | 'import' | 'backups'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [sqlResult, setSqlResult] = useState<any[] | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Create Database Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [newDbUser, setNewDbUser] = useState('');
  const [newDbPassword, setNewDbPassword] = useState('');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateDatabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbName.trim()) return;

    const dbSuffix = newDbName.trim().replace(/[^a-zA-Z0-9_]/g, '');
    const fullDbName = `s_${server?.id?.substring(0, 6) || 'srv'}_${dbSuffix}`;
    const fullDbUser = newDbUser.trim() || `u_${dbSuffix.substring(0, 8)}`;
    const fullPassword = newDbPassword.trim() || Math.random().toString(36).substring(2, 14);

    const created = {
      name: fullDbName,
      host: '127.0.0.1',
      port: 3306,
      user: fullDbUser,
      password: fullPassword,
      size: '0.00 KiB',
      rows: '0',
      tables: 0,
      connections: 0,
      createdAt: 'Just now',
    };

    setDatabases([...databases, created]);
    setSelectedDb(created);
    setShowCreateModal(false);
    setNewDbName('');
    setNewDbUser('');
    setNewDbPassword('');
  };

  const executeSql = () => {
    setSqlResult([
      { id: 1, message: 'Query executed successfully. 0 rows returned.' },
    ]);
  };

  const executeDeleteDatabase = () => {
    if (!selectedDb) return;
    setDatabases(databases.filter((d) => d.name !== selectedDb.name));
    setSelectedDb(null);
    setShowDeleteModal(false);
  };

  const sizeHistory = [
    { time: '30d', size: 0 },
    { time: '20d', size: 0 },
    { time: '10d', size: 0 },
    { time: '5d', size: 0 },
    { time: 'Ahora', size: 0 },
  ];

  // ==============================================================
  // VIEW 1: DATABASES OVERVIEW / EMPTY STATE (Before entering a DB)
  // ==============================================================
  if (!selectedDb) {
    return (
      <div className="w-full h-full flex flex-col space-y-6 select-none font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1f1f23]">
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
              Bases de Datos MySQL
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Administra las bases de datos asignadas a este servidor de Minecraft o bot.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Base de Datos</span>
          </button>
        </div>

        {/* Empty State */}
        {databases.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 border border-[#1f1f23] bg-[#0c0c0e] rounded-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#141418] border border-[#27272a] flex items-center justify-center text-blue-400 shadow-md">
              <Database className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-bold text-zinc-100">
                No hay bases de datos creadas
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Crea tu primera base de datos MySQL para almacenar datos de plugins (LuckPerms, CoreProtect, AuthMe, etc.) o servicios web.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Base de Datos</span>
            </button>
          </div>
        ) : (
          /* List of databases */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {databases.map((dbItem) => (
              <div
                key={dbItem.name}
                onClick={() => setSelectedDb(dbItem)}
                className="bg-[#0c0c0e] border border-[#1f1f23] hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-950/20 flex flex-col justify-between space-y-4 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#141418] border border-[#27272a] flex items-center justify-center text-blue-400 group-hover:border-blue-500/40 transition">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-100 group-hover:text-blue-400 transition">
                        {dbItem.name}
                      </div>
                      <div className="text-xs font-mono text-zinc-500">
                        {dbItem.host}:{dbItem.port}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1f1f23] text-[11px] font-mono text-zinc-400">
                  <div>
                    <span className="text-zinc-600 block text-[10px]">USUARIO</span>
                    <span className="text-zinc-300 truncate">{dbItem.user}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 block text-[10px]">TABLAS</span>
                    <span className="text-zinc-300">{dbItem.tables}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 block text-[10px]">TAMAÑO</span>
                    <span className="text-zinc-300">{dbItem.size}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1f1f23] text-xs">
                  <span className="text-zinc-500 text-[11px]">MySQL 8.0</span>
                  <span className="text-blue-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Abrir panel →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Crear Base de Datos */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in-50 duration-100">
              <div className="flex items-center justify-between border-b border-[#1f1f23] pb-3">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span>Nueva Base de Datos MySQL</span>
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDatabase} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nombre de la Base de Datos
                  </label>
                  <input
                    type="text"
                    required
                    value={newDbName}
                    onChange={(e) => setNewDbName(e.target.value)}
                    placeholder="ej. plugins, luckperms, auth"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Usuario (Opcional - se genera automático si está vacío)
                  </label>
                  <input
                    type="text"
                    value={newDbUser}
                    onChange={(e) => setNewDbUser(e.target.value)}
                    placeholder="ej. u_minecraft"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Contraseña (Opcional - se genera segura automáticamente)
                  </label>
                  <input
                    type="password"
                    value={newDbPassword}
                    onChange={(e) => setNewDbPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f1f23]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-[#141418] hover:bg-[#1f1f24] transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-md shadow-blue-600/20"
                  >
                    Crear Base de Datos
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==============================================================
  // VIEW 2: FULL DATABASE MANAGEMENT PANEL (Inside a specific DB)
  // ==============================================================
  return (
    <div className="flex flex-col h-full w-full space-y-4 select-none font-sans">
      {/* Top Breadcrumb & Return to list */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1f1f23] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedDb(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141418] hover:bg-[#1e1e24] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Volver a bases de datos</span>
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white font-mono">{selectedDb.name}</span>
            <span className="text-xs text-zinc-500 font-mono">({selectedDb.host}:{selectedDb.port})</span>
          </div>
        </div>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Eliminar Base de Datos</span>
        </button>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex bg-[#0c0c0e] border border-[#1f1f23] rounded-2xl overflow-hidden shadow-2xl">
        {/* Left Sub-sidebar */}
        <div className="w-60 bg-[#09090b] border-r border-[#1f1f23] flex flex-col p-3 space-y-4 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">
            WORKSPACE
          </span>

          <div className="space-y-1">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left ${
                activeSubTab === 'overview'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-xs">Información General</div>
                <div className="text-[10px] text-zinc-500">Credenciales y uso</div>
              </div>
            </button>

            <button
              onClick={() => setActiveSubTab('tables')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left ${
                activeSubTab === 'tables'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
              }`}
            >
              <Table className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-xs">Tablas</div>
                <div className="text-[10px] text-zinc-500">Examinar y explorar datos</div>
              </div>
            </button>

            <button
              onClick={() => setActiveSubTab('sql')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left ${
                activeSubTab === 'sql'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
              }`}
            >
              <Terminal className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-xs">Consola SQL</div>
                <div className="text-[10px] text-zinc-500">Ejecutar queries directas</div>
              </div>
            </button>

            <button
              onClick={() => setActiveSubTab('import')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left ${
                activeSubTab === 'import'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
              }`}
            >
              <Upload className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-xs">Importar / Exportar</div>
                <div className="text-[10px] text-zinc-500">Archivos .sql y volcados</div>
              </div>
            </button>

            <button
              onClick={() => setActiveSubTab('backups')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left ${
                activeSubTab === 'backups'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
              }`}
            >
              <Archive className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-xs">Snapshots DB</div>
                <div className="text-[10px] text-zinc-500">Copias puntuales</div>
              </div>
            </button>
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Connection Details Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#111114] border border-[#1f1f23] rounded-xl space-y-3">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Punto de Enlace (Host & Puerto)
                  </div>
                  <div className="flex items-center justify-between bg-[#09090b] p-2.5 rounded-lg border border-[#1f1f23] font-mono text-xs text-white">
                    <span>{selectedDb.host}:{selectedDb.port}</span>
                    <button
                      onClick={() => copyToClipboard(`${selectedDb.host}:${selectedDb.port}`, 'host')}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      {copiedKey === 'host' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#111114] border border-[#1f1f23] rounded-xl space-y-3">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Nombre de la Base de Datos
                  </div>
                  <div className="flex items-center justify-between bg-[#09090b] p-2.5 rounded-lg border border-[#1f1f23] font-mono text-xs text-white">
                    <span>{selectedDb.name}</span>
                    <button
                      onClick={() => copyToClipboard(selectedDb.name, 'name')}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      {copiedKey === 'name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#111114] border border-[#1f1f23] rounded-xl space-y-3">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Usuario
                  </div>
                  <div className="flex items-center justify-between bg-[#09090b] p-2.5 rounded-lg border border-[#1f1f23] font-mono text-xs text-white">
                    <span>{selectedDb.user}</span>
                    <button
                      onClick={() => copyToClipboard(selectedDb.user, 'user')}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      {copiedKey === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#111114] border border-[#1f1f23] rounded-xl space-y-3">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Contraseña
                  </div>
                  <div className="flex items-center justify-between bg-[#09090b] p-2.5 rounded-lg border border-[#1f1f23] font-mono text-xs text-white">
                    <span>••••••••••••••••</span>
                    <button
                      onClick={() => copyToClipboard(selectedDb.password, 'pass')}
                      className="text-zinc-400 hover:text-white p-1"
                      title="Copiar contraseña"
                    >
                      {copiedKey === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Usage chart */}
              <div className="p-5 bg-[#111114] border border-[#1f1f23] rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Historial de almacenamiento
                  </span>
                  <span className="text-xs font-mono text-blue-400">{selectedDb.size}</span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sizeHistory}>
                      <defs>
                        <linearGradient id="colorSize" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#52525b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="size" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSize)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TABLES */}
          {activeSubTab === 'tables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Tablas en {selectedDb.name}
                </span>
                <button
                  onClick={() => setActiveSubTab('sql')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Crear Tabla (SQL)
                </button>
              </div>

              <div className="border border-[#1f1f23] rounded-xl p-8 text-center text-zinc-500 text-xs font-mono bg-[#111114]">
                Esta base de datos no contiene tablas creadas todavía. Conéctate desde tu plugin o crea una desde la consola SQL.
              </div>
            </div>
          )}

          {/* TAB 3: SQL CONSOLE */}
          {activeSubTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Consola SQL en vivo
                </span>
                <button
                  onClick={executeSql}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Ejecutar</span>
                </button>
              </div>

              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={5}
                className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500 transition"
              />

              {sqlResult && (
                <div className="p-4 bg-[#111114] border border-[#1f1f23] rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-zinc-400 font-mono">Resultado:</div>
                  <pre className="text-xs font-mono text-emerald-400 bg-black/40 p-2.5 rounded-lg overflow-x-auto">
                    {JSON.stringify(sqlResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: IMPORT / EXPORT */}
          {activeSubTab === 'import' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                Importador y Exportador de Volcados (.SQL)
              </span>

              <div className="border-2 border-dashed border-[#27272a] hover:border-blue-500/50 rounded-2xl p-8 text-center bg-[#111114] transition cursor-pointer">
                <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <div className="text-xs font-bold text-zinc-200">
                  Arrastra un archivo .sql o .sql.gz para importar
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Tamaño máximo admitido: 256 MB
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SNAPSHOTS */}
          {activeSubTab === 'backups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Snapshots y respaldos de la DB
                </span>
                <button
                  onClick={() => toast.success('Snapshot de base de datos MySQL generado con éxito.')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Crear Snapshot Ahora
                </button>
              </div>

              <div className="border border-[#1f1f23] rounded-xl p-8 text-center text-zinc-500 text-xs font-mono bg-[#111114]">
                No hay snapshots generados para esta base de datos.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in-50 duration-100">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>Eliminar Base de Datos MySQL</span>
            </h3>

            <p className="text-xs text-zinc-300 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente la base de datos{' '}
              <strong className="text-white font-mono">{selectedDb.name}</strong>? Se perderán todas las tablas y datos almacenados de forma irreversible.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-[#18181c] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDeleteDatabase}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/30"
              >
                Sí, Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
