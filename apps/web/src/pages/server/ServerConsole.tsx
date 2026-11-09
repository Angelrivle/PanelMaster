import React from 'react';
import { ConsoleTerminal } from '../../components/ConsoleTerminal';
import { MetricsChart } from '../../components/MetricsChart';
import { Gamepad2, Bot, Database, Globe } from 'lucide-react';

interface ServerConsoleProps {
  server: any;
  onAction: (action: 'START' | 'STOP' | 'RESTART') => void;
}

export const ServerConsole: React.FC<ServerConsoleProps> = ({ server, onAction }) => {
  const maxRam = server.maxRamMb || server.memoryMb || 2048;
  const isRunning = server.status === 'RUNNING';
  const serverIp =
    server.ip && server.ip !== '127.0.0.1' && server.ip !== '51.38.125.71'
      ? server.ip
      : typeof window !== 'undefined'
      ? window.location.hostname
      : 'panel.zenforge.online';
  const serverPort = server.port || 25565;

  return (
    <div className="w-full space-y-5">
      {/* Top Server Info & Status Bar - Full Width PanelMaster Style */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            {server.type === 'GAME_SERVER' ? (
              <Gamepad2 className="w-6 h-6" />
            ) : server.type === 'DISCORD_BOT' ? (
              <Bot className="w-6 h-6" />
            ) : (
              <Globe className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight">{server.name}</h2>
              <span
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                  isRunning
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                  }`}
                />
                {server.status || 'RUNNING'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              IP / Puerto:{' '}
              <span className="text-blue-400 font-semibold select-all">
                {serverIp}:{serverPort}
              </span>{' '}
              • Software: {server.template || 'Minecraft Paper'} • Memoria asignada: {maxRam} MB
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Dynamic Telemetry Metrics (CPU, RAM, Disk, Network) */}
      <MetricsChart
        serviceId={server.id}
        cpuUsage={server.cpuUsage ?? 2.1}
        memoryUsageMb={server.ramMb ?? Math.round(maxRam * 0.38)}
        maxMemoryMb={maxRam}
        status={server.status || 'RUNNING'}
      />

      {/* Isolated Interactive Console */}
      <ConsoleTerminal
        serviceId={server.id}
        serviceStatus={server.status || 'RUNNING'}
        onAction={onAction}
      />
    </div>
  );
};
