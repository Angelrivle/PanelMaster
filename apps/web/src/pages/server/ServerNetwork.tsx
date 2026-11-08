import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  Info,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { toast } from '../../components/Toast';

interface ServerNetworkProps {
  server: any;
}

export const ServerNetwork: React.FC<ServerNetworkProps> = ({ server }) => {
  const isMinecraft = server?.type === 'GAME_SERVER' || server?.template?.toLowerCase().includes('minecraft');

  const [ports, setPorts] = useState([
    { port: server?.port || 25565, protocol: 'TCP/UDP', isPrimary: true, notes: 'Puerto Principal de Conexión' },
    { port: 25575, protocol: 'TCP', isPrimary: false, notes: 'RCON Remote Management' },
    { port: 8123, protocol: 'TCP', isPrimary: false, notes: 'Dynmap / Web Map' },
  ]);

  const [domain, setDomain] = useState('play.panelmaster-smp.net');
  const [targetIp, setTargetIp] = useState('192.168.0.160');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [linkedSuccess, setLinkedSuccess] = useState(false);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSetPrimary = (targetPort: number) => {
    setPorts(
      ports.map((p) => ({
        ...p,
        isPrimary: p.port === targetPort,
      }))
    );
  };

  const handleAddPort = () => {
    const nextPort = Math.max(...ports.map((p) => p.port), 25565) + 1;
    setPorts([
      ...ports,
      {
        port: nextPort,
        protocol: 'TCP',
        isPrimary: false,
        notes: 'Puerto Adicional Asignado',
      },
    ]);
  };

  const handleDeletePort = (targetPort: number) => {
    setPorts(ports.filter((p) => p.port !== targetPort));
    toast.info(`Puerto ${targetPort} desasignado del servidor.`);
  };

  const handleLinkDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;
    setIsLinking(true);
    setTimeout(() => {
      setIsLinking(false);
      setLinkedSuccess(true);
      setTimeout(() => setLinkedSuccess(false), 3000);
    }, 800);
  };

  const primaryPort = ports.find((p) => p.isPrimary)?.port || 25565;

  return (
    <div className="w-full space-y-5">
      {/* Ports Allocation Management - Edge to edge Full Width */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              Gestión de Puertos del Servidor
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Administra los puertos asignados para juego, Dynmap, Votifier, RCON, APIs o proxies de conexión.
            </p>
          </div>

          <button
            onClick={handleAddPort}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            Asignar Nuevo Puerto
          </button>
        </div>

        <div className="space-y-2.5">
          {ports.map((p) => (
            <div
              key={p.port}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition ${
                p.isPrimary
                  ? 'bg-blue-600/10 border-blue-500/40 shadow-sm'
                  : 'bg-[#09090b] border-[#1f1f23] hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-zinc-100">{p.port}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18181c] text-zinc-300 border border-[#27272a]">
                  {p.protocol}
                </span>
                {p.isPrimary && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                    PRIMARIO
                  </span>
                )}
                <span className="text-xs text-zinc-400 hidden sm:inline">{p.notes}</span>
              </div>

              <div className="flex items-center gap-2">
                {!p.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(p.port)}
                    className="px-2.5 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                  >
                    Hacer Primario
                  </button>
                )}
                {!p.isPrimary && (
                  <button
                    onClick={() => handleDeletePort(p.port)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connect Custom Domain & DNS Guide - Full Width */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Vincular Dominio Personalizado & Guía DNS
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Conecta un dominio propio para que tus jugadores o usuarios ingresen con un nombre amigable sin escribir el número de puerto.
          </p>
        </div>

        <form onSubmit={handleLinkDomain} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="play.tudominio.com"
            className="flex-1 bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
          <button
            type="submit"
            disabled={isLinking}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition disabled:opacity-50 shrink-0"
          >
            {isLinking ? 'Verificando...' : linkedSuccess ? '¡Vinculado con Éxito!' : 'Vincular Dominio'}
          </button>
        </form>

        {/* DNS Table Guide */}
        <div className="p-4 rounded-xl bg-[#09090b] border border-[#1f1f23] space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Configuración de Registros DNS en tu Proveedor (Cloudflare, Namecheap, GoDaddy, etc.)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#1f1f23] text-[10px] text-zinc-500 uppercase tracking-wider">
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2">Nombre / Host</th>
                  <th className="pb-2">Prioridad / Peso</th>
                  <th className="pb-2">Puerto</th>
                  <th className="pb-2">Destino (Target)</th>
                  <th className="pb-2 text-right">Copiar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f23] text-zinc-300">
                <tr>
                  <td className="py-2.5 font-bold text-blue-400">A</td>
                  <td className="py-2.5">{domain.split('.')[0] || 'play'}</td>
                  <td className="py-2.5 text-zinc-500">-</td>
                  <td className="py-2.5 text-zinc-500">-</td>
                  <td className="py-2.5 text-zinc-100">{targetIp}</td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => copy(targetIp, 'ip')}
                      className="p-1 hover:text-white transition"
                    >
                      {copiedKey === 'ip' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                    </button>
                  </td>
                </tr>

                {isMinecraft && (
                  <tr>
                    <td className="py-2.5 font-bold text-purple-400">SRV</td>
                    <td className="py-2.5">_minecraft._tcp.{domain.split('.')[0] || 'play'}</td>
                    <td className="py-2.5 text-zinc-400">0 / 5</td>
                    <td className="py-2.5 text-emerald-400 font-bold">{primaryPort}</td>
                    <td className="py-2.5 text-zinc-100">{domain}</td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => copy(`_minecraft._tcp.${domain.split('.')[0] || 'play'}`, 'srv')}
                        className="p-1 hover:text-white transition"
                      >
                        {copiedKey === 'srv' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
