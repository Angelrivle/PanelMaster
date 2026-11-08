import React, { useState } from 'react';
import { translations, Language } from '../i18n/translations';
import {
  Layers,
  User,
  Shield,
  Terminal,
  FolderTree,
  Database,
  Archive,
  Globe,
  Sliders,
  Users,
  Activity,
  Settings,
  Sparkles,
  Boxes,
  Package,
  HardDrive,
  SlidersHorizontal,
  GitBranch,
  HelpCircle,
  LogOut,
  Zap,
  ArrowLeft,
  Server as ServerIcon,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ChevronLeft,
  Mail,
  Palette,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  selectedServer: any | null;
  onSelectServer: (server: any | null) => void;
  allServers: any[];
  user: any;
  onLogout: () => void;
  language?: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  selectedServer,
  onSelectServer,
  allServers,
  user,
  onLogout,
  language = 'en',
}) => {
  const t = translations[language] || translations.en;
  const isEs = language === 'es';

  // Collapsed Sidebar state (Icon-only mode)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('nexus_sidebar_collapsed') === 'true';
    } catch (_) {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nexus_sidebar_collapsed', next.toString());
      } catch (_) {}
      return next;
    });
  };

  const isMinecraft =
    selectedServer?.type === 'GAME_SERVER' ||
    selectedServer?.template?.toLowerCase().includes('minecraft');

  const primaryPort = selectedServer?.port || 25565;
  const isOnline = selectedServer?.status === 'RUNNING';

  // -------------------------------------------------------------
  // STATE 1.5: ADMIN PANEL SIDEBAR (Inside Admin Panel)
  // -------------------------------------------------------------
  if (currentView.startsWith('admin')) {
    const adminTabs = [
      { id: 'admin-activity', label: isEs ? 'Actividad' : 'Activity', icon: Activity },
      { id: 'admin-settings', label: 'Settings', icon: Settings },
      { id: 'admin-auth', label: isEs ? 'OAuth & Autenticación' : 'OAuth & Auth Envs', icon: Shield },
      { id: 'admin-users', label: isEs ? 'Usuarios' : 'Users', icon: Users },
      { id: 'admin-servers', label: isEs ? 'Servidores' : 'Servers', icon: ServerIcon },
      { id: 'admin-nodes', label: isEs ? 'Nodos' : 'Nodes', icon: HardDrive },
      { id: 'admin-eggs', label: 'Eggs', icon: Package },
      { id: 'admin-mail-templates', label: 'Mail Templates', icon: Mail },
      { id: 'admin-theme-editor', label: 'Theme Editor', icon: Palette },
    ];

    const currentAdminTab = currentView === 'admin' ? 'admin-activity' : currentView;

    return (
      <aside
        className={`${
          isCollapsed ? 'w-16' : 'w-64'
        } border-r border-[#1f1f23] bg-[#09090b] flex flex-col justify-between select-none shrink-0 h-full transition-[width] duration-200 overflow-hidden z-20`}
      >
        <div className="p-3 space-y-4 overflow-y-auto no-scrollbar flex-1">
          {/* Header: Back to Dashboard & Collapse button */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 pb-2 border-b border-[#1f1f23]">
              <button
                onClick={toggleCollapse}
                title={isEs ? 'Expandir barra lateral' : 'Expand sidebar'}
                className="p-1.5 rounded-lg hover:bg-[#141418] text-zinc-400 hover:text-blue-400 transition"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                title={isEs ? 'Volver al Dashboard' : 'Back to Dashboard'}
                className="p-2 rounded-xl bg-[#111114] hover:bg-[#18181c] border border-[#1f1f23] text-blue-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23] gap-1.5">
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-[#111114] hover:bg-[#18181c] border border-[#1f1f23] transition flex-1 truncate"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{isEs ? '← Dashboard' : '← Dashboard'}</span>
              </button>
              <button
                onClick={toggleCollapse}
                title={isEs ? 'Colapsar barra lateral' : 'Collapse sidebar'}
                className="p-1.5 rounded-lg hover:bg-[#141418] text-zinc-400 hover:text-white transition"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Admin Header Title */}
          {!isCollapsed && (
            <div className="px-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono">
                {isEs ? 'ADMINISTRACIÓN' : 'ADMIN PANEL'}
              </span>
            </div>
          )}

          {/* Admin Navigation Tabs */}
          <div className="space-y-1">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentAdminTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  title={isCollapsed ? tab.label : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
                  } rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  {!isCollapsed && <span>{tab.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1f1f23] bg-[#070709] space-y-1">
          <button
            onClick={onLogout}
            title={isCollapsed ? t.logout : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'gap-2 px-2.5 py-1.5'
            } rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>{t.logout}</span>}
          </button>
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // STATE 1: DASHBOARD / GLOBAL SIDEBAR (No server selected)
  // -------------------------------------------------------------
  if (!selectedServer) {
    return (
      <aside
        className={`${
          isCollapsed ? 'w-16' : 'w-64'
        } border-r border-[#1f1f23] bg-[#09090b] flex flex-col justify-between select-none shrink-0 h-full transition-[width] duration-200 overflow-hidden z-20`}
      >
        <div className="p-3 space-y-4 overflow-y-auto no-scrollbar flex-1">
          {/* Header: ONLY TEXT "PANELMASTER" + TOP COLLAPSE BUTTON ONLY */}
          {isCollapsed ? (
            <div className="flex justify-center pb-2 border-b border-[#1f1f23]">
              <button
                onClick={toggleCollapse}
                title={isEs ? 'Expandir barra lateral' : 'Expand sidebar'}
                className="p-1.5 rounded-lg hover:bg-[#141418] text-zinc-400 hover:text-blue-400 transition"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23] px-1">
              <span className="font-extrabold text-xs tracking-widest text-zinc-100 uppercase font-mono">
                PANELMASTER
              </span>
              <button
                onClick={toggleCollapse}
                title={isEs ? 'Colapsar barra lateral' : 'Collapse sidebar'}
                className="p-1.5 rounded-lg hover:bg-[#141418] text-zinc-400 hover:text-white transition"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Navigation */}
          <div className="space-y-1">
            {!isCollapsed && (
              <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase font-mono px-1 block mb-1">
                {isEs ? 'PANEL PRINCIPAL' : 'MAIN MENU'}
              </span>
            )}

            {/* Dashboard */}
            <button
              onClick={() => onNavigate('dashboard')}
              title={isCollapsed ? t.dashboard : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
              } rounded-xl text-xs font-semibold transition ${
                currentView === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>{t.dashboard}</span>}
            </button>

            {/* Admin Panel */}
            <button
              onClick={() => onNavigate('admin')}
              title={isCollapsed ? t.adminPanel : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
              } rounded-xl text-xs font-medium transition ${
                currentView === 'admin'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>{t.adminPanel}</span>}
            </button>

            {/* Account Settings */}
            <button
              onClick={() => onNavigate('account')}
              title={isCollapsed ? t.accountSettings : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
              } rounded-xl text-xs font-medium transition ${
                currentView === 'account'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
              }`}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.username || 'User'}
                  className="w-4 h-4 rounded-full object-cover shrink-0 border border-blue-400/40"
                />
              ) : (
                <User className="w-4 h-4 shrink-0" />
              )}
              {!isCollapsed && <span>{t.accountSettings}</span>}
            </button>
          </div>

          {/* SERVERS LIST */}
          <div className="pt-2">
            {!isCollapsed && (
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase font-mono">
                  {isEs ? 'SERVIDORES' : 'INSTANCES'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {allServers.length}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              {allServers.map((s) => {
                const sOnline = s.status === 'RUNNING';
                if (isCollapsed) {
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        onSelectServer(s);
                        onNavigate('console');
                      }}
                      title={`${s.name} (${sOnline ? 'Online' : 'Offline'})`}
                      className="w-full group p-2.5 rounded-xl border border-[#1f1f23] hover:border-blue-500/50 bg-[#111114] hover:bg-[#18181c] cursor-pointer flex items-center justify-center relative transition"
                    >
                      <ServerIcon className="w-4 h-4 text-blue-400" />
                      <span
                        className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                          sOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                        }`}
                      />
                    </button>
                  );
                }

                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectServer(s);
                      onNavigate('console');
                    }}
                    className="w-full text-left group p-2.5 rounded-xl border border-[#1f1f23] hover:border-blue-500/50 bg-[#111114] hover:bg-[#18181c] cursor-pointer flex items-center justify-between transition"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <ServerIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-blue-400 truncate">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate">
                          {s.template || s.type}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        sOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                      }`}
                      title={sOnline ? 'Online' : 'Offline'}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1f1f23] bg-[#070709] space-y-1">
          <a
            href="https://docs.panelmaster.dev"
            target="_blank"
            rel="noreferrer"
            title={isCollapsed ? t.documentation : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'gap-2 px-2.5 py-1.5'
            } rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#141418] transition`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>{t.documentation}</span>}
          </a>

          <button
            onClick={onLogout}
            title={isCollapsed ? t.logout : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'gap-2 px-2.5 py-1.5'
            } rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>{t.logout}</span>}
          </button>
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // STATE 2: SERVER MANAGEMENT SIDEBAR (Inside a specific server)
  // ZenMicroHoster style: Top Back button, Server status card, Categorized sections
  // -------------------------------------------------------------
  const serverGeneralTabs = [
    { id: 'console', label: t.console, icon: Terminal },
    { id: 'files', label: isEs ? 'Archivos & Código' : 'Files & Code', icon: FolderTree },
    { id: 'databases', label: t.databases, icon: Database },
    { id: 'network', label: t.network, icon: Globe },
    { id: 'startup', label: t.startup, icon: Sliders },
    { id: 'backups', label: t.backups, icon: Archive },
    { id: 'users', label: t.users, icon: Users },
    { id: 'activity', label: t.activity, icon: Activity },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  const minecraftTabs = [
    { id: 'versions', label: isEs ? 'Versiones' : 'Versions', icon: GitBranch },
    { id: 'modpacks', label: 'Modpacks', icon: Package },
    { id: 'properties', label: t.properties, icon: SlidersHorizontal },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } border-r border-[#1f1f23] bg-[#09090b] flex flex-col justify-between select-none shrink-0 h-full transition-[width] duration-200 overflow-hidden z-20`}
    >
      <div className="p-3 space-y-3.5 overflow-y-auto no-scrollbar flex-1">
        {/* Top: Back to Dashboard & Collapse button */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 pb-2 border-b border-[#1f1f23]">
            <button
              onClick={toggleCollapse}
              title={isEs ? 'Expandir barra lateral' : 'Expand sidebar'}
              className="p-1.5 rounded-lg hover:bg-[#141418] text-zinc-400 hover:text-blue-400 transition"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onSelectServer(null);
                onNavigate('dashboard');
              }}
              title={isEs ? 'Volver al Dashboard' : 'Back to Dashboard'}
              className="p-2 rounded-xl bg-[#111114] hover:bg-[#18181c] border border-[#1f1f23] text-blue-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23] gap-1.5">
            <button
              onClick={() => {
                onSelectServer(null);
                onNavigate('dashboard');
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-[#111114] hover:bg-[#18181c] border border-[#1f1f23] transition flex-1 truncate"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{isEs ? '← Volver' : '← Dashboard'}</span>
            </button>
            <button
              onClick={toggleCollapse}
              title={isEs ? 'Colapsar barra lateral' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg hover:bg-[#141418] text-zinc-400 hover:text-white transition shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Server Info Card */}
        {isCollapsed ? (
          <div className="flex justify-center py-1">
            <div
              className="w-9 h-9 rounded-xl bg-[#111114] border border-[#1f1f23] flex items-center justify-center relative"
              title={`${selectedServer.name} (${isOnline ? 'Online' : 'Offline'})`}
            >
              <ServerIcon className="w-4 h-4 text-blue-400" />
              <span
                className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                }`}
              />
            </div>
          </div>
        ) : (
          <div className="bg-[#111114] border border-[#1f1f23] rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">
                {isEs ? 'SERVIDOR ACTIVO' : 'ACTIVE INSTANCE'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                }`}
              />
            </div>
            <div className="text-xs font-bold text-white truncate">
              {selectedServer.name}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 truncate">
              {selectedServer.ip || '127.0.0.1'}:{primaryPort}
            </div>
          </div>
        )}

        {/* Server Navigation Tabs */}
        <div className="space-y-1 pt-1">
          {!isCollapsed && (
            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase font-mono px-1 block mb-1">
              {t.general}
            </span>
          )}

          {serverGeneralTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                title={isCollapsed ? tab.label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
                } rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                {!isCollapsed && <span className="truncate">{tab.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Minecraft Features (if Minecraft) */}
        {isMinecraft && (
          <div className="space-y-1 pt-2 border-t border-[#1f1f23]">
            {!isCollapsed && (
              <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase font-mono px-1 block mb-1">
                {t.minecraft}
              </span>
            )}

            {minecraftTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  title={isCollapsed ? tab.label : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
                  } rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-zinc-400 hover:text-white hover:bg-[#141418]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  {!isCollapsed && <span className="truncate">{tab.label}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#1f1f23] bg-[#070709]">
        {isCollapsed ? (
          <button
            onClick={() => {
              onSelectServer(null);
              onNavigate('dashboard');
            }}
            title={isEs ? 'Volver al Dashboard' : 'Back to Dashboard'}
            className="w-full flex justify-center p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#141418] transition"
          >
            <Layers className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono px-1">
            <span>PanelMaster v1.0</span>
            <span className="text-emerald-400">● {isOnline ? 'Online' : 'Standby'}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
