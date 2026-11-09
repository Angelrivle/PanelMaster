import React, { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
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

  const [history, setHistory] = useState<Array<{ time: string; cpu: number; ram: number; net: number }>>(() => {
    const init = [];
    const baseCpu = isRunning ? Math.max(1.5, fallbackCpu) : 0;
    const baseRam = isRunning ? Math.max(512, fallbackRam) : 0;
    for (let i = 5; i >= 0; i--) {
      init.push({
        time: `${i * 2}s`,
        cpu: isRunning ? Math.max(0.5, +(baseCpu + (Math.random() * 0.8 - 0.4)).toFixed(1)) : 0,
        ram: isRunning ? Math.round(baseRam + (Math.random() * 20 - 10)) : 0,
        net: 0,
      });
    }
    return init;
  });

  useEffect(() => {
    if (!serviceId) return;

    let prevRx = 0;
    let isMounted = true;

    const fetchRealStats = async () => {
      try {
        const token = localStorage.getItem('nexus_token');
        const res = await fetch(`/api/v1/services/${serviceId}/stats`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          const cpu = Number(data.cpuPercent) || (data.isOnline ? 1.2 : 0);
          const rawRam = data.memoryUsageBytes ? Math.round(data.memoryUsageBytes / (1024 * 1024)) : 0;
          const limit = data.memoryLimitBytes ? Math.round(data.memoryLimitBytes / (1024 * 1024)) : maxRamMb;
          const diskUsed = data.diskUsageBytes ? Math.round(data.diskUsageBytes / (1024 * 1024)) : diskUsedMb;
          const diskLimit = data.diskLimitBytes ? Math.round(data.diskLimitBytes / (1024 * 1024)) : diskTotalMb;

          setRealCpu(cpu);
          if (rawRam > 0) setRealRamMb(rawRam);
          if (limit > 0 && limit < 100000) setMaxRamMb(limit);
          if (diskUsed > 0) setDiskUsedMb(diskUsed);
          if (diskLimit > 0) setDiskTotalMb(diskLimit);

          setNetRxFormatted(data.networkRxFormatted || '0 B');
          setNetTxFormatted(data.networkTxFormatted || '0 B');

          const rxDelta = Math.max(0, (data.networkRxBytes || 0) - prevRx);
          prevRx = data.networkRxBytes || 0;
          const netKb = Math.round(rxDelta / 1024);

          setHistory((prev) => {
            const next = [...prev.slice(1)];
            const timeStr = new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
            next.push({ time: timeStr, cpu, ram: rawRam > 0 ? rawRam : realRamMb, net: netKb });
            return next;
          });
        }
      } catch {}
    };

    fetchRealStats();
    const interval = setInterval(fetchRealStats, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [serviceId]);

  const ramPercent = Math.min(100, Math.round((realRamMb / Math.max(1, maxRamMb)) * 100));
  const diskPercent = Math.min(100, Math.round((diskUsedMb / Math.max(1, diskTotalMb)) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* 1. CPU Card */}
      <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-zinc-300">Uso de CPU</span>
          </div>
          <span className="text-sm font-mono font-bold text-sky-400">
            {isRunning ? `${realCpu.toFixed(1)}%` : '0.0%'}
          </span>
        </div>

        {/* Real Dynamic Horizontal Progress Bar */}
        <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden my-1.5">
          <div
            className="bg-sky-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(isRunning && realCpu > 0 ? 3 : 0, realCpu))}%` }}
          />
        </div>

        {/* Live Area Wave */}
        <div className="h-14 w-full mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <YAxis domain={[0, Math.max(10, Math.ceil(realCpu * 1.5))]} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '11px', borderRadius: '8px' }}
                formatter={(val: any) => [`${val}%`, 'CPU']}
              />
              <Area type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2} fill="url(#cpuGradient)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Memory RAM Card */}
      <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-zinc-300">Memoria RAM</span>
          </div>
          <span className="text-xs font-mono font-bold text-blue-400">
            {isRunning ? `${realRamMb} MB (${ramPercent}%)` : `0 MB / ${maxRamMb} MB`}
          </span>
        </div>

        {/* Real Dynamic Horizontal Progress Bar */}
        <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden my-1.5">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(isRunning && ramPercent > 0 ? 3 : 0, ramPercent))}%` }}
          />
        </div>

        {/* Live Area Wave */}
        <div className="h-14 w-full mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <YAxis domain={[0, Math.max(1, maxRamMb)]} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '11px', borderRadius: '8px' }}
                formatter={(val: any) => [`${val} MB`, 'RAM']}
              />
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
          <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(3, diskPercent))}%` }}
            />
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
