import React, { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Cpu, HardDrive, Database, Activity } from 'lucide-react';

interface MetricsChartProps {
  serviceId?: string;
  cpuUsage?: number;
  memoryUsageMb?: number;
  maxMemoryMb?: number;
  status?: string;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({
  serviceId,
  cpuUsage: fallbackCpu = 0,
  memoryUsageMb: fallbackRam = 0,
  maxMemoryMb: fallbackMaxRam = 2048,
  status = 'RUNNING',
}) => {
  const isRunning = status === 'RUNNING';

  const [realCpu, setRealCpu] = useState<number>(fallbackCpu);
  const [realRamMb, setRealRamMb] = useState<number>(fallbackRam);
  const [maxRamMb, setMaxRamMb] = useState<number>(fallbackMaxRam);
  const [diskUsedMb, setDiskUsedMb] = useState<number>(420);
  const [diskTotalMb, setDiskTotalMb] = useState<number>(10240);
  const [netRxFormatted, setNetRxFormatted] = useState<string>('0 B');
  const [netTxFormatted, setNetTxFormatted] = useState<string>('0 B');

  const [history, setHistory] = useState<Array<{ time: string; cpu: number; ram: number; net: number }>>([
    { time: '10s', cpu: 0, ram: 0, net: 0 },
    { time: '8s', cpu: 0, ram: 0, net: 0 },
    { time: '6s', cpu: 0, ram: 0, net: 0 },
    { time: '4s', cpu: 0, ram: 0, net: 0 },
    { time: '2s', cpu: 0, ram: 0, net: 0 },
    { time: 'Ahora', cpu: 0, ram: 0, net: 0 },
  ]);

  useEffect(() => {
    if (!serviceId || !isRunning) {
      if (!isRunning) {
        setRealCpu(0);
        setRealRamMb(0);
      }
      return;
    }

    const token = localStorage.getItem('nexus_token');
    let prevRx = 0;

    const fetchRealStats = async () => {
      try {
        const res = await fetch(`/api/v1/services/${serviceId}/stats`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const cpu = Number(data.cpuPercent) || 0;
          const ram = Math.round((data.memoryUsageBytes || 0) / (1024 * 1024));
          const limit = Math.round((data.memoryLimitBytes || 2048 * 1024 * 1024) / (1024 * 1024));
          const diskUsed = Math.round((data.diskUsageBytes || 0) / (1024 * 1024));
          const diskLimit = Math.round((data.diskLimitBytes || 10240 * 1024 * 1024) / (1024 * 1024));

          setRealCpu(cpu);
          if (ram > 0) setRealRamMb(ram);
          if (limit > 0) setMaxRamMb(limit);
          if (diskUsed > 0) setDiskUsedMb(diskUsed);
          if (diskLimit > 0) setDiskTotalMb(diskLimit);

          setNetRxFormatted(data.networkRxFormatted || '0 B');
          setNetTxFormatted(data.networkTxFormatted || '0 B');

          const rxDelta = Math.max(0, (data.networkRxBytes || 0) - prevRx);
          prevRx = data.networkRxBytes || 0;
          const netKb = Math.round(rxDelta / 1024);

          setHistory((prev) => {
            const next = [...prev.slice(1)];
            next.push({ time: 'Ahora', cpu, ram, net: netKb });
            return next;
          });
        }
      } catch {}
    };

    fetchRealStats();
    const interval = setInterval(fetchRealStats, 2000);
    return () => clearInterval(interval);
  }, [serviceId, isRunning]);

  const ramPercent = Math.min(100, Math.round((realRamMb / Math.max(1, maxRamMb)) * 100));
  const diskPercent = Math.min(100, Math.round((diskUsedMb / Math.max(1, diskTotalMb)) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* 1. CPU Card */}
      <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-zinc-300">Uso de CPU</span>
          </div>
          <span className="text-sm font-mono font-bold text-sky-400">
            {isRunning ? `${realCpu.toFixed(1)}%` : '0.0%'}
          </span>
        </div>
        <div className="h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '11px', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2} fill="url(#cpuGradient)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Memory RAM Card */}
      <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-zinc-300">Memoria RAM</span>
          </div>
          <span className="text-xs font-mono font-bold text-blue-400">
            {isRunning ? `${realRamMb} MB (${ramPercent}%)` : `0 MB / ${maxRamMb} MB`}
          </span>
        </div>
        <div className="h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '11px', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="ram" stroke="#3b82f6" strokeWidth={2} fill="url(#ramGradient)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Disk Space Card */}
      <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-zinc-300">Espacio en Disco</span>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">
            {diskUsedMb} MB / {(diskTotalMb / 1024).toFixed(0)} GB ({diskPercent}%)
          </span>
        </div>
        <div className="space-y-2 mt-auto">
          <div className="w-full bg-[#18181b] h-2 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${Math.max(4, diskPercent)}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>Usado: {diskUsedMb} MB</span>
            <span>Libre: {Math.max(0, diskTotalMb - diskUsedMb)} MB</span>
          </div>
        </div>
      </div>

      {/* 4. Network Card */}
      <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-300">Red (Tráfico In / Out)</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {isRunning ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div className="space-y-1.5 mt-auto">
          <div className="flex justify-between items-center text-xs font-mono bg-[#18181b] px-2.5 py-1 rounded-lg">
            <span className="text-zinc-400">Entrada (Rx):</span>
            <span className="text-emerald-400 font-bold">{netRxFormatted}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono bg-[#18181b] px-2.5 py-1 rounded-lg">
            <span className="text-zinc-400">Salida (Tx):</span>
            <span className="text-sky-400 font-bold">{netTxFormatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
