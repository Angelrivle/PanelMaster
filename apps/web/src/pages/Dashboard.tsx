import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  RotateCw,
  Square,
  Play,
  Star,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Plus,
  Shield,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { translations, Language } from '../i18n/translations';

interface DashboardProps {
  servers: any[];
  onSelectServer: (server: any) => void;
  onOpenCreateModal: () => void;
  onAction: (serverId: string, action: 'START' | 'STOP' | 'RESTART') => void;
  language: Language;
  onToggleLanguage: (lang: Language) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  servers,
  onSelectServer,
  onOpenCreateModal,
  onAction,
  language,
  onToggleLanguage,
}) => {
  const t = translations[language] || translations.en;
  const isEs = language === 'es';

  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pinned'>('all');
  const [pinnedServers, setPinnedServers] = useState<string[]>(['srv-minecraft-demo']);
  const [showOtherUsers, setShowOtherUsers] = useState(false);
  const [isRedacted, setIsRedacted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Language Dropdown state
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinnedServers.includes(id)) {
      setPinnedServers(pinnedServers.filter((s) => s !== id));
    } else {
      setPinnedServers([...pinnedServers, id]);
    }
  };

  const handleCopyIp = (ipText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ipText);
    setCopiedIp(ipText);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Filter servers
  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (s.template && s.template.toLowerCase().includes(filterQuery.toLowerCase())) ||
      s.id.toLowerCase().includes(filterQuery.toLowerCase());

    if (activeTab === 'pinned') {
      return matchesSearch && pinnedServers.includes(s.id);
    }
    return matchesSearch;
  });

  const totalInstances = servers.length;
  const runningCount = servers.filter((s) => s.status === 'RUNNING').length;
  const offlineCount = totalInstances - runningCount;

  // Background artwork themes for cards matching Image 5
  const getCardHeaderBg = (srv: any) => {
    const type = srv.template?.toLowerCase() || srv.type?.toLowerCase() || '';
    if (type.includes('minecraft') || type.includes('paper')) {
      // Minecraft nether/overworld volcanic landscape gradient
      return 'from-amber-900/60 via-orange-950/40 to-slate-950';
    }
    if (type.includes('discord') || type.includes('bot')) {
      // Discord bot cyber gradient
      return 'from-indigo-900/60 via-purple-950/40 to-slate-950';
    }
    if (type.includes('redis') || type.includes('database')) {
      // Database dark emerald/cyan gradient
      return 'from-emerald-950/60 via-teal-950/40 to-slate-950';
    }
    return 'from-blue-950/60 via-slate-900/40 to-slate-950';
  };

  return (
    <div className="space-y-6 pb-12 font-sans select-none w-full">
      {/* ============================================================== */}
      {/* 1. TOP BREADCRUMB & UTILITY BAR (Exact replica of Image 5)     */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#181d28]">
        {/* Left Breadcrumb & Latency Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-slate-500 font-semibold">org:demo</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-bold">{t.dashboard}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>16ms</span>
          </div>
        </div>

        {/* Center / Right Utilities */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Quick Search Jump Ctrl+K */}
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-[#0b0e17] border border-[#1c2230] hover:border-slate-700 rounded-xl pl-9 pr-12 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition shadow-inner"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-[#151a27] border border-slate-700/60 rounded text-[10px] font-mono text-slate-400">
              {t.shortcut}
            </div>
          </div>

          {/* Redact Toggle */}
          <button
            onClick={() => setIsRedacted(!isRedacted)}
            title="Redact sensitive data"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition ${
              isRedacted
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-[#0b0e17] border-[#1c2230] hover:border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isRedacted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isRedacted ? 'Redact: ON' : t.redact}</span>
          </button>

          {/* LANGUAGE DROPDOWN SELECTOR (Requested by User) */}
          <div className="relative" ref={langDropdownRef}>
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0b0e17] border border-[#1c2230] hover:border-slate-700 text-slate-300 hover:text-white transition shadow-sm"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'en' ? 'English' : 'Español'}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-40 bg-[#0d111c] border border-[#22293a] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in-50 duration-100">
                <button
                  onClick={() => {
                    onToggleLanguage('en');
                    setIsLangDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition ${
                    language === 'en'
                      ? 'bg-blue-600/15 text-blue-400 font-bold'
                      : 'text-slate-300 hover:bg-[#151b2a] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🇺🇸</span>
                    <span>English</span>
                  </span>
                  {language === 'en' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                <button
                  onClick={() => {
                    onToggleLanguage('es');
                    setIsLangDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition ${
                    language === 'es'
                      ? 'bg-blue-600/15 text-blue-400 font-bold'
                      : 'text-slate-300 hover:bg-[#151b2a] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🇪🇸</span>
                    <span>Español</span>
                  </span>
                  {language === 'es' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SUB-HEADER & TITLE (Exact replica of Image 5)                */}
      {/* ============================================================== */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-slate-500">
          org:demo / <span className="text-slate-400">your instances</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t.instancesOverview}
        </h1>
      </div>

      {/* ============================================================== */}
      {/* 3. METRICS RIBBON: INSTANCES, RUNNING, OFFLINE, NODES           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Instances */}
        <div className="bg-[#0b0e17] border border-[#181d28] rounded-xl p-3.5">
          <div className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">
            {t.instances}
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {totalInstances}
          </div>
        </div>

        {/* Running Instances */}
        <div className="bg-[#0b0e17] border border-[#181d28] rounded-xl p-3.5">
          <div className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{t.running}</span>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {runningCount}
          </div>
        </div>

        {/* Offline Instances */}
        <div className="bg-[#0b0e17] border border-[#181d28] rounded-xl p-3.5">
          <div className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>{t.offline}</span>
          </div>
          <div className="text-2xl font-black text-slate-400 mt-1">
            {offlineCount}
          </div>
        </div>

        {/* Nodes */}
        <div className="bg-[#0b0e17] border border-[#181d28] rounded-xl p-3.5">
          <div className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>{t.nodes}</span>
          </div>
          <div className="text-2xl font-black text-blue-400 mt-1 flex items-baseline gap-1.5">
            <span>1</span>
            <span className="text-xs font-normal text-slate-500">online</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. FILTER / TABS / ACTIONS BAR (Exact replica of Image 5)      */}
      {/* ============================================================== */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
        {/* Left: Search filter, Other users toggle, All/Pinned tabs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t.filterServers}
              className="w-full bg-[#0b0e17] border border-[#181d28] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* OTHER USERS' SERVERS Toggle */}
          <button
            onClick={() => setShowOtherUsers(!showOtherUsers)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition ${
              showOtherUsers
                ? 'bg-blue-600/15 border-blue-500/40 text-blue-400'
                : 'bg-[#0b0e17] border-[#181d28] text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.otherUsersServers}
          </button>

          {/* All instances vs Pinned Tabs */}
          <div className="flex items-center bg-[#0b0e17] border border-[#181d28] rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.allInstances} ({servers.length})
            </button>
            <button
              onClick={() => setActiveTab('pinned')}
              className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'pinned'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>{t.pinned} ({pinnedServers.length})</span>
            </button>
          </div>
        </div>

        {/* Right: Layout switches & Create Server Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-[#0b0e17] border border-[#181d28] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-[#182030] text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-[#182030] text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createServer}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. INSTANCES GRID OR MINIMALIST EMPTY STATE                    */}
      {/* ============================================================== */}
      {filteredServers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 border border-[#1f1f23] bg-[#0c0c0e] rounded-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#141418] border border-[#27272a] flex items-center justify-center text-blue-400 shadow-md">
            <Layers className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-bold text-zinc-100">
              {isEs ? 'No tienes servidores creados' : 'No instances yet'}
            </h3>
            <p className="text-xs text-zinc-400">
              {isEs
                ? 'Comienza desplegando tu primer servidor de juegos, bot o servicio en la nube.'
                : 'Get started by deploying your first game server, bot, or cloud service.'}
            </p>
          </div>
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createServer}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServers.map((srv) => {
          const isOnline = srv.status === 'RUNNING';
          const isPinned = pinnedServers.includes(srv.id);
          const headerGradient = getCardHeaderBg(srv);
          const ipText = isRedacted ? '•••.•••.•••:•••••' : `127.0.0.1:${srv.port || 25565}`;

          const cpuVal = srv.cpuUsage || (isOnline ? 24.5 : 0);
          const ramVal = srv.ramMb || (isOnline ? 3200 : 0);
          const maxRam = srv.maxRamMb || 4096;
          const ramPct = Math.round((ramVal / maxRam) * 100);

          return (
            <div
              key={srv.id}
              onClick={() => onSelectServer(srv)}
              className="group bg-[#090d16] border border-[#161c2b] hover:border-blue-500/50 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-blue-950/20 cursor-pointer flex flex-col justify-between"
            >
              {/* Top Banner Artwork (Image 5 style) */}
              <div
                className={`h-24 bg-gradient-to-br ${headerGradient} p-3.5 flex flex-col justify-between relative border-b border-[#182030]/60`}
              >
                {/* Artwork texture overlay */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Top Row: Status Pill, Node tag, Star button */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide ${
                        isOnline
                          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800/80 border border-slate-700 text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      <span>{isOnline ? 'RUNNING' : 'OFFLINE'}</span>
                    </span>

                    <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded-full border border-slate-800">
                      node-us-east-1
                    </span>
                  </div>

                  <button
                    onClick={(e) => togglePin(srv.id, e)}
                    className="p-1 rounded-lg bg-black/30 hover:bg-black/60 text-slate-400 hover:text-amber-400 transition"
                    title={isPinned ? 'Desanclar' : 'Anclar'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isPinned ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Bottom Row of Banner: IP / Port badge */}
                <div className="flex items-center justify-between relative z-10">
                  <div
                    onClick={(e) => handleCopyIp(`127.0.0.1:${srv.port || 25565}`, e)}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-black/50 hover:bg-black/70 px-2 py-0.5 rounded-lg border border-slate-800 cursor-copy transition"
                    title="Click to copy IP"
                  >
                    <span>{ipText}</span>
                    <Copy className="w-3 h-3 text-slate-400" />
                    {copiedIp && <span className="text-[10px] text-emerald-400 font-bold ml-1">Copied!</span>}
                  </div>
                </div>
              </div>

              {/* Card Body: Server Name, Template, Metric Gauges */}
              <div className="p-4 space-y-4 flex-1">
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition truncate">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate font-mono">
                    {srv.template || srv.type}
                  </p>
                </div>

                {/* Gauges: CPU, RAM, Disk */}
                <div className="space-y-2.5 pt-1">
                  {/* CPU Gauge */}
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>CPU</span>
                      <span className="text-white font-semibold">{isOnline ? `${cpuVal}%` : '0%'}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#141926] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(cpuVal, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Gauge */}
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>RAM</span>
                      <span className="text-white font-semibold">
                        {isOnline ? `${(ramVal / 1024).toFixed(1)} / ${(maxRam / 1024).toFixed(0)} GB` : '0 / 4 GB'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#141926] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${isOnline ? ramPct : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Disk Gauge */}
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>DISK</span>
                      <span className="text-white font-semibold">14.2 / 50 GB</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#141926] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '28%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Server ID, Power Action buttons, Manage CTA */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-3 bg-[#070a12] border-t border-[#161c2b] flex items-center justify-between"
              >
                <div className="text-[10px] font-mono text-slate-500 truncate max-w-[90px]">
                  {srv.id}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Restart */}
                  <button
                    onClick={() => onAction(srv.id, 'RESTART')}
                    title="Restart"
                    className="p-1.5 rounded-lg bg-[#111624] border border-slate-800 hover:border-amber-500/50 hover:text-amber-400 text-slate-400 transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Stop */}
                  <button
                    onClick={() => onAction(srv.id, 'STOP')}
                    title="Stop"
                    className="p-1.5 rounded-lg bg-[#111624] border border-slate-800 hover:border-rose-500/50 hover:text-rose-400 text-slate-400 transition"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>

                  {/* Start */}
                  <button
                    onClick={() => onAction(srv.id, 'START')}
                    title="Start"
                    className="p-1.5 rounded-lg bg-[#111624] border border-slate-800 hover:border-emerald-500/50 hover:text-emerald-400 text-slate-400 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  {/* Manage Button */}
                  <button
                    onClick={() => onSelectServer(srv)}
                    className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#182032] hover:bg-blue-600 text-[11px] font-bold text-slate-200 hover:text-white transition"
                  >
                    <span>{t.manage}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
