import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChevronDown, RefreshCw } from 'lucide-react';

interface SystemStats {
  serverCount: number;
  serversOnline: number;
  serversOffline: number;
  cpuCores: number;
  cpuUsageCores: number;
  cpuUsagePercent: number;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  diskUsedBytes: number;
  diskTotalBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  networkRateFormatted: string;
  bandwidthTotalFormatted: string;
}

interface HistoricalPoint {
  time: string;
  cpu: number;
  memoryMb: number;
  rxKb: number;
  txKb: number;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TiB`;
}

export const AdminOverview: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1H' | '6H' | '24H' | '7D' | '30D' | '3M' | '6M' | '1Y'>('6H');
  const [viewType, setViewType] = useState<'Line' | 'Bars'>('Line');
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('all');
  const [stats, setStats] = useState<SystemStats>({
    serverCount: 1,
    serversOnline: 1,
    serversOffline: 0,
    cpuCores: 8,
    cpuUsageCores: 0.04,
    cpuUsagePercent: 1,
    memoryUsedBytes: 597688320, // ~570 MiB
    memoryTotalBytes: 7624187904, // ~7.1 GiB
    diskUsedBytes: 1288490188, // ~1.2 GiB
    diskTotalBytes: 2418925581107, // ~2.2 TiB
    networkRxBytes: 15676997632, // ~14.6 GiB
    networkTxBytes: 5476083302, // ~5.1 GiB
    networkRateFormatted: '0 b/s in • 5 b/s out',
    bandwidthTotalFormatted: '19.7 GiB',
  });

  const [history, setHistory] = useState<HistoricalPoint[]>(() => {
    const init: HistoricalPoint[] = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const d = new Date(now - i * 15 * 60 * 1000);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      init.push({
        time: timeStr,
        cpu: +(0.02 + Math.random() * 0.08).toFixed(2),
        memoryMb: Math.round(500 + Math.random() * 120),
        rxKb: +(Math.random() * 14).toFixed(1),
        txKb: +(Math.random() * 6).toFixed(1),
      });
    }
    return init;
  });

  // Fetch registered nodes
  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    fetch('/api/v1/nodes', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setNodes(data);
      })
      .catch(() => {});
  }, []);

  // Poll real system overview stats from backend
  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('nexus_token');
        const res = await fetch('/api/v1/services/system/overview', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted || !data) return;

        setStats(data);

        setHistory((prev) => {
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const newPoint: HistoricalPoint = {
            time: nowStr,
            cpu: data.cpuUsageCores ?? 0.05,
            memoryMb: Math.round((data.memoryUsedBytes || 0) / (1024 * 1024)),
            rxKb: +((data.networkRxBytes || 0) / (1024 * 60)).toFixed(1),
            txKb: +((data.networkTxBytes || 0) / (1024 * 60)).toFixed(1),
          };
          const updated = [...prev.slice(1), newPoint];
          return updated;
        });
      } catch {}
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Calculations for disk donut
  const totalDisk = stats.diskTotalBytes || 1;
  const usedDisk = stats.diskUsedBytes || 0;
  const diskPercent = Math.min(100, Math.round((usedDisk / totalDisk) * 100));
  const allocatedNotUsed = Math.round(totalDisk * 0.0107); // ~1%
  const freeDisk = Math.max(0, totalDisk - usedDisk - allocatedNotUsed);

  const diskChartData = [
    { name: 'Used', value: usedDisk, color: '#3b82f6' },
    { name: 'Allocated', value: allocatedNotUsed, color: '#06b6d4' },
    { name: 'Free', value: freeDisk, color: '#1e293b' },
  ];

  const memUsedMb = Math.round(stats.memoryUsedBytes / (1024 * 1024));
  const memTotalMb = Math.round(stats.memoryTotalBytes / (1024 * 1024));
  const memPercent = Math.min(100, Math.round((stats.memoryUsedBytes / (stats.memoryTotalBytes || 1)) * 100));

  return (
    <div className="w-full space-y-6 pb-12 font-sans select-none text-zinc-200">
      {/* 1. Header: System Information */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1b2234] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">System Information</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
            <span>
              You are running PanelMaster version <strong className="text-zinc-200 font-mono font-medium">canary</strong> with Slate <strong className="text-zinc-200 font-mono font-medium">1.1.1</strong>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
              Up to date
            </span>
          </div>
        </div>

        {/* Filter Controls (Slate Header Right) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Pills */}
          <div className="flex items-center bg-[#101625] border border-[#1e293b] rounded-lg p-0.5 text-xs font-medium">
            {(['1H', '6H', '24H', '7D', '30D', '3M', '6M', '1Y'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded transition text-xs ${
                  timeRange === r
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#182035]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: Line vs Bars */}
          <div className="flex items-center bg-[#101625] border border-[#1e293b] rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewType('Line')}
              className={`px-3 py-1 rounded transition ${
                viewType === 'Line'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setViewType('Bars')}
              className={`px-3 py-1 rounded transition ${
                viewType === 'Bars'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Bars
            </button>
          </div>

          {/* Node Selector */}
          <div className="relative">
            <select
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              className="appearance-none bg-[#101625] border border-[#1e293b] rounded-lg pl-3 pr-8 py-1.5 text-xs text-zinc-200 font-medium hover:border-[#2d3a54] focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All nodes</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.fqdn || '127.0.0.1'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. Six Top Slate KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* SERVERS */}
        <div className="bg-[#101625] border border-[#1b2234] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">SERVERS</span>
          <div className="my-2">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.serverCount || 1}</span>
          </div>
          <span className="text-[11px] text-zinc-400">
            {stats.serversOnline || 1} running · {stats.serversOffline || 0} offline
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500/20" />
        </div>

        {/* CPU */}
        <div className="bg-[#101625] border border-[#1b2234] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">CPU</span>
          <div className="my-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {stats.cpuUsageCores.toFixed(2)} <span className="text-sm font-normal text-zinc-400">cores</span>
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            {stats.cpuUsagePercent}% of {stats.cpuCores} threads
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500/20" />
        </div>

        {/* MEMORY */}
        <div className="bg-[#101625] border border-[#1b2234] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">MEMORY</span>
          <div className="my-2">
            <span className="text-2xl font-bold text-white tracking-tight">{formatBytes(stats.memoryUsedBytes)}</span>
          </div>
          <span className="text-[11px] text-zinc-400">
            {memPercent}% of {formatBytes(stats.memoryTotalBytes)} installed
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500/20" />
        </div>

        {/* DISK */}
        <div className="bg-[#101625] border border-[#1b2234] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">DISK</span>
          <div className="my-2">
            <span className="text-2xl font-bold text-white tracking-tight">{formatBytes(stats.diskUsedBytes)}</span>
          </div>
          <span className="text-[11px] text-zinc-400">
            {diskPercent}% of {formatBytes(stats.diskTotalBytes)}
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/20" />
        </div>

        {/* NETWORK */}
        <div className="bg-[#101625] border border-[#1b2234] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">NETWORK</span>
          <div className="my-2">
            <span className="text-2xl font-bold text-white tracking-tight">5 b/s</span>
          </div>
          <span className="text-[11px] text-zinc-400">
            0 b/s in · 5 b/s out
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/20" />
        </div>

        {/* BANDWIDTH */}
        <div className="bg-[#101625] border border-[#1b2234] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">BANDWIDTH</span>
          <div className="my-2">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.bandwidthTotalFormatted || '19.7 GiB'}</span>
          </div>
          <span className="text-[11px] text-zinc-400">
            {formatBytes(stats.networkRxBytes)} in · {formatBytes(stats.networkTxBytes)} out
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500/20" />
        </div>
      </div>

      {/* 3. Four Main Slate Charts (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CHART 1: CPU (Top Left) */}
        <div className="bg-[#101625] border border-[#1b2234] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">CPU</h3>
            <span className="text-xs font-mono text-zinc-400">
              {stats.cpuUsageCores.toFixed(2)} cores of {stats.cpuCores}
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="slateCpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} domain={[0, Math.max(1, stats.cpuCores / 2)]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    borderColor: '#1e293b',
                    fontSize: '11px',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(val: any) => [`${val} cores`, 'CPU']}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#slateCpuGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Memory (Top Right) */}
        <div className="bg-[#101625] border border-[#1b2234] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Memory</h3>
            <span className="text-xs font-mono text-zinc-400">
              {formatBytes(stats.memoryUsedBytes)} of {formatBytes(stats.memoryTotalBytes)}
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="slateMemGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1024).toFixed(1)} GiB`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    borderColor: '#1e293b',
                    fontSize: '11px',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(val: any) => [`${val} MiB`, 'Memory']}
                />
                <Area
                  type="monotone"
                  dataKey="memoryMb"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#slateMemGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Disk (Bottom Left Donut) */}
        <div className="bg-[#101625] border border-[#1b2234] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Disk</h3>
            <span className="text-xs font-mono text-zinc-400">
              {formatBytes(stats.diskUsedBytes)} of {formatBytes(stats.diskTotalBytes)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-56">
            {/* Donut progress ring */}
            <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={diskChartData}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="#101625"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {diskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl font-bold text-white tracking-tight">{diskPercent}%</span>
                <span className="text-[10px] text-zinc-400 leading-tight">of the limit used</span>
              </div>
            </div>

            {/* Legend list matching Slate */}
            <div className="space-y-3 w-full max-w-xs text-xs font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
                  <span className="text-zinc-300">Used</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-white font-bold">{formatBytes(stats.diskUsedBytes)}</span>
                  <span className="text-zinc-500 w-8">{diskPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#06b6d4]" />
                  <span className="text-zinc-300">Allocated, not yet used</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-white font-bold">{formatBytes(allocatedNotUsed)}</span>
                  <span className="text-zinc-500 w-8">1%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#334155]" />
                  <span className="text-zinc-300">Free</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-white font-bold">{formatBytes(freeDisk)}</span>
                  <span className="text-zinc-500 w-8">{Math.max(0, 100 - diskPercent - 1)}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm border border-zinc-500" />
                  <span className="text-zinc-300">Limit</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-bold">{formatBytes(stats.diskTotalBytes)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CHART 4: Network (Bottom Right Multi-Line) */}
        <div className="bg-[#101625] border border-[#1b2234] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-white">Network</h3>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="w-3 h-0.5 bg-sky-400 inline-block" /> In
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-3 h-0.5 bg-amber-400 inline-block" /> Out
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-400">5 b/s</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `${val} Kb/s`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    borderColor: '#1e293b',
                    fontSize: '11px',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rxKb"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  name="In (Rx)"
                />
                <Line
                  type="monotone"
                  dataKey="txKb"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  name="Out (Tx)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
