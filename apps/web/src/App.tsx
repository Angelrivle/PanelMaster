import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { AccountSettings } from './pages/AccountSettings';
import { Login } from './pages/Login';
import { CreateServiceModal } from './components/CreateServiceModal';
import { Language } from './i18n/translations';
import { ToastContainer } from './components/Toast';
import { loadSavedTheme, applyThemeToDocument } from './utils/themeManager';

import { ServerConsole } from './pages/server/ServerConsole';
import { ServerFiles } from './pages/server/ServerFiles';
import { ServerDatabases } from './pages/server/ServerDatabases';
import { ServerNetwork } from './pages/server/ServerNetwork';
import { ServerStartup } from './pages/server/ServerStartup';
import { ServerBackups } from './pages/server/ServerBackups';
import { ServerUsers } from './pages/server/ServerUsers';
import { ServerActivity } from './pages/server/ServerActivity';
import { ServerSettings } from './pages/server/ServerSettings';
import { ServerVersions } from './pages/server/ServerVersions';
import { ServerModpacks } from './pages/server/ServerModpacks';

export function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('nexus_token'));
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('nexus_lang') as Language) || 'en');
  const [user, setUser] = useState<any>({
    username: 'Angel',
    email: 'angelriveradeveloper@gmail.com',
    role: 'SUPER_ADMIN',
  });

  useEffect(() => {
    const saved = loadSavedTheme();
    applyThemeToDocument(saved);
  }, []);

  const handleToggleLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('nexus_lang', lang);
  };

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Persistent servers state
  const [servers, setServers] = useState<any[]>(() => {
    const cached = localStorage.getItem('pm_servers_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  // Sync servers with backend
  useEffect(() => {
    if (!token) return;
    const fetchServices = async () => {
      try {
        const res = await fetch('/api/v1/services', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setServers((prev) => {
              const mergedMap = new Map();
              prev.forEach((s) => mergedMap.set(s.id, s));
              data.forEach((s: any) => {
                const existing = mergedMap.get(s.id) || {};
                const mem = s.memoryLimitBytes ? Math.round(s.memoryLimitBytes / (1024 * 1024)) : 2048;
                mergedMap.set(s.id, {
                  ...existing,
                  id: s.id,
                  name: s.name,
                  status: s.status,
                  egg: s.template?.name || existing.egg || 'Minecraft Java (Paper)',
                  maxRamMb: mem,
                  ramMb: Math.round(mem * 0.35),
                  ram: `${((mem * 0.35) / 1024).toFixed(1)} / ${(mem / 1024).toFixed(0)} GB`,
                  cpuUsage: 1.8,
                  cpu: '1.8%',
                  port: s.instances?.[0]?.ports?.[0]?.port || 25565,
                  node: s.instances?.[0]?.node?.name || 'node-01',
                  ip: s.instances?.[0]?.node?.fqdn || '127.0.0.1',
                });
              });
              const result = Array.from(mergedMap.values());
              localStorage.setItem('pm_servers_cache', JSON.stringify(result));
              return result;
            });
          }
        }
      } catch {}
    };
    fetchServices();
  }, [token]);

  const [selectedServer, setSelectedServer] = useState<any | null>(null);

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    setToken(newToken);
    if (loggedUser) setUser(loggedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_refresh');
    localStorage.removeItem('nexus_org_id');
    setToken(null);
  };

  const handleSelectServer = (srv: any | null) => {
    setSelectedServer(srv);
    if (srv) {
      setCurrentView('console');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleServerAction = (serverId: string, action: 'START' | 'STOP' | 'RESTART' | 'KILL') => {
    const nextStatus = action === 'STOP' || action === 'KILL' ? 'STOPPED' : 'RUNNING';
    const updated = servers.map((s) => (s.id === serverId ? { ...s, status: nextStatus } : s));
    setServers(updated);
    localStorage.setItem('pm_servers_cache', JSON.stringify(updated));

    if (selectedServer && selectedServer.id === serverId) {
      setSelectedServer({
        ...selectedServer,
        status: nextStatus,
      });
    }

    // Notify backend
    const currentToken = localStorage.getItem('nexus_token');
    fetch(`/api/v1/services/${serverId}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
      body: JSON.stringify({ action }),
    }).catch(() => {});
  };

  const handleCreatedServer = (newSrv: any) => {
    const mem = newSrv.maxRamMb || newSrv.memoryMb || 2048;
    const initialUsedRam = Math.round(mem * 0.38);
    const serverObj = {
      ...newSrv,
      maxRamMb: mem,
      ramMb: initialUsedRam,
      ram: `${(initialUsedRam / 1024).toFixed(1)} / ${(mem / 1024).toFixed(0)} GB`,
      cpuUsage: 2.1,
      cpu: '2.1%',
    };
    const updated = [...servers, serverObj];
    setServers(updated);
    localStorage.setItem('pm_servers_cache', JSON.stringify(updated));
    setSelectedServer(serverObj);
    setCurrentView('console');
  };

  if (!token) {
    return (
      <Login
        onSuccess={handleLoginSuccess}
        language={language}
        onToggleLanguage={handleToggleLanguage}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar matching the screenshots */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view === 'dashboard' || view === 'admin' || view === 'account') {
            setSelectedServer(null);
          }
        }}
        selectedServer={selectedServer}
        onSelectServer={handleSelectServer}
        allServers={servers}
        user={user}
        onLogout={handleLogout}
        language={language}
      />

      {/* Main Content Area - Full width, zero constrained margins */}
      <main className={`flex-1 ${currentView === 'files' ? 'p-0 overflow-hidden' : 'p-6 overflow-y-auto'} no-scrollbar h-full w-full flex flex-col`}>
        {currentView === 'dashboard' && (
          <Dashboard
            servers={servers}
            onSelectServer={handleSelectServer}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onAction={handleServerAction}
            language={language}
            onToggleLanguage={handleToggleLanguage}
          />
        )}

        {currentView.startsWith('admin') && (
          <AdminPanel
            servers={servers}
            onBackToDashboard={() => setCurrentView('dashboard')}
            activeTab={currentView === 'admin' ? 'overview' : currentView.replace('admin-', '')}
            onTabChange={(tab) => setCurrentView(`admin-${tab}`)}
            onUpdateServers={(updated) => setServers(updated)}
            onOpenCreateServer={() => setIsCreateModalOpen(true)}
            user={user}
            language={language}
          />
        )}

        {currentView === 'account' && (
          <AccountSettings
            user={user}
            onUpdateUser={(updated) => setUser(updated)}
            onBackToDashboard={() => setCurrentView('dashboard')}
            language={language}
          />
        )}

        {selectedServer && currentView === 'console' && (
          <ServerConsole
            server={selectedServer}
            onAction={(act) => handleServerAction(selectedServer.id, act)}
          />
        )}

        {selectedServer && currentView === 'files' && (
          <ServerFiles server={selectedServer} language={language} />
        )}

        {selectedServer && currentView === 'databases' && (
          <ServerDatabases server={selectedServer} />
        )}

        {selectedServer && currentView === 'versions' && (
          <ServerVersions server={selectedServer} />
        )}

        {selectedServer && currentView === 'modpacks' && (
          <ServerModpacks server={selectedServer} />
        )}

        {selectedServer && currentView === 'network' && (
          <ServerNetwork server={selectedServer} />
        )}

        {selectedServer && currentView === 'startup' && (
          <ServerStartup server={selectedServer} />
        )}

        {selectedServer && currentView === 'backups' && (
          <ServerBackups server={selectedServer} />
        )}

        {selectedServer && currentView === 'users' && (
          <ServerUsers server={selectedServer} />
        )}

        {selectedServer && currentView === 'activity' && (
          <ServerActivity server={selectedServer} />
        )}

        {selectedServer && currentView === 'settings' && (
          <ServerSettings
            server={selectedServer}
            onUpdateServer={(updated) => {
              setSelectedServer(updated);
              setServers(servers.map((s) => (s.id === updated.id ? updated : s)));
            }}
          />
        )}
      </main>

      {/* Create Server Wizard Modal */}
      <CreateServiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreatedServer}
      />

      {/* Global In-App Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
