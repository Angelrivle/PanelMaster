import React, { useState } from 'react';
import { Activity, User, Filter, Calendar, Terminal } from 'lucide-react';

interface ServerActivityProps {
  server: any;
}

export const ServerActivity: React.FC<ServerActivityProps> = ({ server }) => {
  const [userFilter, setUserFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');

  // Empty initial activity log (No dummy data)
  const [logs, setLogs] = useState<any[]>([]);

  const filteredLogs = logs.filter((log) => {
    const matchUser = userFilter === 'all' || log.user.toLowerCase().includes(userFilter.toLowerCase());
    const matchEvent = eventFilter === 'all' || log.category === eventFilter;
    return matchUser && matchEvent;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex items-center gap-4 bg-[#0e1424] p-4 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-white">Filtros de Auditoría:</span>
        </div>

        {/* User Filter */}
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="bg-[#0a0f19] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
        >
          <option value="all">Todos los usuarios</option>
          <option value="Angel">Angel</option>
          <option value="CarlosDev">CarlosDev</option>
          <option value="Sistema">Sistema Automático</option>
        </select>

        {/* Event Filter */}
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="bg-[#0a0f19] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
        >
          <option value="all">Todos los eventos</option>
          <option value="power">Encendido / Apagado / Reinicio</option>
          <option value="files">Modificaciones de Archivos</option>
          <option value="backups">Copias de Seguridad</option>
          <option value="settings">Ajustes & Versiones</option>
        </select>
      </div>

      {/* Audit Log Table or Empty State */}
      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-[#1f1f23] bg-[#0c0c0e] rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#141418] border border-[#27272a] flex items-center justify-center text-blue-400 shadow-md">
            <Activity className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-zinc-200">
              No hay actividad registrada
            </h4>
            <p className="text-xs text-zinc-500">
              Las acciones de inicio, edición de archivos y copias de seguridad aparecerán aquí.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1f1f23] bg-[#09090b] text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Acción</th>
                <th className="py-3 px-4">Detalle del Evento</th>
                <th className="py-3 px-4">Dirección IP</th>
                <th className="py-3 px-4 text-right">Fecha / Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f23] text-xs text-zinc-300">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/20 transition">
                  <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] text-blue-400">
                      {log.user[0]}
                    </div>
                    <span>{log.user}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-blue-400">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-300">{log.description}</td>
                  <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">{log.ip}</td>
                  <td className="py-3 px-4 text-right text-zinc-400 text-[11px] font-mono">{log.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
