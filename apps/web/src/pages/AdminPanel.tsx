import React, { useState, useEffect } from 'react';
import {
  Shield,
  Server as ServerIcon,
  Users,
  Activity,
  HardDrive,
  Settings,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Copy,
  Check,
  RotateCw,
  Search,
  Mail,
  Lock,
  Globe,
  Sliders,
  Cpu,
  Database,
  ArrowLeft,
  Edit,
  ExternalLink,
  Save,
  Key,
  Flame,
  Terminal,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { toast } from '../components/Toast';
import { DraggableToggle } from '../components/DraggableToggle';
import { AdminMailTemplates } from './admin/AdminMailTemplates';
import { AdminThemeEditor } from './admin/AdminThemeEditor';
import { AdminAuthProviders } from './admin/AdminAuthProviders';
import { AdminOverview } from './admin/AdminOverview';
import { CreateServiceModal } from '../components/CreateServiceModal';

interface AdminPanelProps {
  servers?: any[];
  onBackToDashboard: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onUpdateServers?: (servers: any[]) => void;
  onOpenCreateServer?: () => void;
  user?: any;
  language?: string;
}

interface NodeItem {
  id: string;
  name: string;
  description: string;
  location: string;
  fqdn: string;
  ssl: 'http' | 'https';
  allowAutoAllocation: boolean;
  behindProxy: boolean;
  maintenanceMode: boolean;
  totalMemoryMb: number;
  memoryOverallocatePercent: number;
  diskSpaceMb: number;
  diskOverallocatePercent: number;
  maxUploadFilesizeMb: number;
  daemonPort: number;
  daemonSftpPort: number;
  daemonBasePath: string;
  cpuCores: number;
  cpuUsage: string;
  status: 'ONLINE' | 'OFFLINE';
  allocations: { id: string; ip: string; port: number; alias?: string; serverId?: string; serverName?: string }[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  servers = [],
  onBackToDashboard,
  activeTab: controlledTab,
  onTabChange,
  onUpdateServers,
  onOpenCreateServer,
  user,
  language = 'en',
}) => {
  const isEs = language === 'es';

  // Section Routing: 'overview' | 'activity' | 'settings' | 'users' | 'servers' | 'nodes' | 'eggs' | 'mail-templates' | 'theme-editor' | 'auth'
  const [internalTab, setInternalTab] = useState<
    'overview' | 'activity' | 'settings' | 'users' | 'servers' | 'nodes' | 'eggs' | 'mail-templates' | 'theme-editor' | 'auth'
  >('overview');
  const activeSection = controlledTab ? (controlledTab.replace('admin-', '') as any) : internalTab;

  const handleSwitchSection = (
    sec: 'overview' | 'activity' | 'settings' | 'users' | 'servers' | 'nodes' | 'eggs' | 'mail-templates' | 'theme-editor' | 'auth'
  ) => {
    setEditingServer(null);
    setEditingNode(null);
    setInternalTab(sec);
    if (onTabChange) onTabChange(sec);
  };

  // ==========================================
  // 1. ACTIVIDAD (Platform wide logs)
  // ==========================================
  const [activitySearch, setActivitySearch] = useState('');
  const [activityCategory, setActivityCategory] = useState<string>('all');
  const [platformLogs, setPlatformLogs] = useState<any[]>([
    {
      id: 'log-1',
      category: 'security',
      event: 'LOGIN_SUCCESS',
      user: 'Angel (angelriveradeveloper@gmail.com)',
      ip: '190.237.45.18',
      description: 'Sesión administrativa iniciada con 2FA verificado',
      timestamp: 'Hace 5 minutos',
    },
    {
      id: 'log-2',
      category: 'servers',
      event: 'SERVER_PROVISIONED',
      user: 'Angel',
      ip: '127.0.0.1',
      description: 'Contenedor Docker instanciado para servidor "survival-production"',
      timestamp: 'Hace 22 minutos',
    },
    {
      id: 'log-3',
      category: 'nodes',
      event: 'NODE_HEARTBEAT',
      user: 'Daemon Service',
      ip: '127.0.0.1:8080',
      description: 'Nodo maestro "node-primary-01" sincronizado exitosamente',
      timestamp: 'Hace 35 minutos',
    },
    {
      id: 'log-4',
      category: 'users',
      event: 'ROLE_UPDATE',
      user: 'Sistema',
      ip: 'internal',
      description: 'Permiso SUPER_ADMIN concedido a Angel Rivera',
      timestamp: 'Hace 1 hora',
    },
    {
      id: 'log-5',
      category: 'security',
      event: 'SMTP_CONFIG_SAVED',
      user: 'Angel',
      ip: '127.0.0.1',
      description: 'Configuración SMTP actualizada (smtp.mailgun.org:587 TLS)',
      timestamp: 'Hace 2 horas',
    },
  ]);

  // ==========================================
  // 2. SETTINGS (General & SMTP)
  // ==========================================
  const [companyName, setCompanyName] = useState('PanelMaster Cloud');
  const [require2FA, setRequire2FA] = useState(false);
  const [defaultLang, setDefaultLang] = useState('es');
  const [allowRegistration, setAllowRegistration] = useState(false);
  const [panelMaintenance, setPanelMaintenance] = useState(false);

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('smtp.resend.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('resend');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpEncryption, setSmtpEncryption] = useState<'TLS' | 'SSL' | 'NONE'>('TLS');
  const [smtpSenderName, setSmtpSenderName] = useState('PanelMaster');
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('onboarding@resend.dev');
  const [smtpTestRecipient, setSmtpTestRecipient] = useState('');
  const [isSendingTestMail, setIsSendingTestMail] = useState(false);

  useEffect(() => {
    // Load persisted SMTP settings from API or local fallback
    fetch('/api/v1/mail/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.host) {
          setSmtpHost(data.host);
          setSmtpPort(data.port || 587);
          setSmtpEncryption(data.encryption || 'TLS');
          setSmtpUser(data.user || 'resend');
          if (data.password) setSmtpPassword(data.password);
          if (data.senderName) setSmtpSenderName(data.senderName);
          if (data.senderEmail) setSmtpSenderEmail(data.senderEmail);
        } else {
          try {
            const saved = localStorage.getItem('pm_smtp_settings');
            if (saved) {
              const p = JSON.parse(saved);
              if (p.host) setSmtpHost(p.host);
              if (p.port) setSmtpPort(p.port);
              if (p.encryption) setSmtpEncryption(p.encryption);
              if (p.user) setSmtpUser(p.user);
              if (p.password) setSmtpPassword(p.password);
              if (p.senderName) setSmtpSenderName(p.senderName);
              if (p.senderEmail) setSmtpSenderEmail(p.senderEmail);
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // ==========================================
  // 3. USUARIOS
  // ==========================================
  const [usersSearch, setUsersSearch] = useState('');
  const [usersList, setUsersList] = useState<any[]>([
    {
      id: 'u-1',
      username: 'Angel',
      firstName: 'Angel',
      lastName: 'Rivera',
      email: 'angelriveradeveloper@gmail.com',
      language: 'es',
      role: 'SUPER_ADMIN',
      isAdmin: true,
      twoFactorEnabled: true,
      serversCount: servers.length,
      assignedServerIds: servers.map((s) => s.id),
      createdAt: '2026-11-06',
    },
    {
      id: 'u-2',
      username: 'demo_developer',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@panelmaster.dev',
      language: 'en',
      role: 'USER',
      isAdmin: false,
      twoFactorEnabled: false,
      serversCount: 0,
      assignedServerIds: [],
      createdAt: '2026-11-07',
    },
  ]);

  // User Modals
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    language: 'es',
    isAdmin: false,
  });

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserData, setEditUserData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    language: 'es',
    isAdmin: false,
    twoFactorEnabled: false,
    assignedServerIds: [] as string[],
  });

  const [confirmDeleteUser, setConfirmDeleteUser] = useState<any | null>(null);

  // ==========================================
  // 4. SERVIDORES (List & Pterodactyl-Style Edit View)
  // ==========================================
  const [serversSearch, setServersSearch] = useState('');
  const [isCreateServerModalOpen, setIsCreateServerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<any | null>(null);

  const handleAdminCreatedServer = (newServer: any) => {
    if (onUpdateServers) {
      onUpdateServers([...servers, newServer]);
    }
  };
  const [serverEditTab, setServerEditTab] = useState<
    'about' | 'details' | 'build' | 'startup' | 'database' | 'mounts' | 'manage' | 'delete'
  >('about');

  // Server Edit Fields
  const [serverNameEdit, setServerNameEdit] = useState('');
  const [serverOwnerEdit, setServerOwnerEdit] = useState('');
  const [serverDescEdit, setServerDescEdit] = useState('');
  const [serverCpuLimit, setServerCpuLimit] = useState(100);
  const [serverCpuPinning, setServerCpuPinning] = useState('');
  const [serverMemoryMb, setServerMemoryMb] = useState(2048);
  const [serverSwapMb, setServerSwapMb] = useState(0);
  const [serverDiskMb, setServerDiskMb] = useState(10240);
  const [serverBlockIo, setServerBlockIo] = useState(500);
  const [serverDbLimit, setServerDbLimit] = useState(2);
  const [serverAllocLimit, setServerAllocLimit] = useState(3);
  const [serverBackupLimit, setServerBackupLimit] = useState(3);
  const [serverStartupCmd, setServerStartupCmd] = useState('java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui');
  const [serverDefaultCmd, setServerDefaultCmd] = useState('java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui');
  const [serverEgg, setServerEgg] = useState('Paper Minecraft');
  const [serverJarFile, setServerJarFile] = useState('server.jar');
  const [serverDockerImage, setServerDockerImage] = useState('ghcr.io/pterodactyl/yolks:java_17');

  // Confirmation Modals for Server Actions
  const [serverActionConfirm, setServerActionConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'reinstall' | 'suspend' | 'safely_delete' | 'force_delete' | 'install_status' | 'transfer';
  } | null>(null);

  // ==========================================
  // 5. NODOS (List & Pterodactyl-Style Edit View)
  // ==========================================
  const [nodesSearch, setNodesSearch] = useState('');
  const [nodesList, setNodesList] = useState<NodeItem[]>(() => {
    const cached = localStorage.getItem('pm_nodes_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
      {
        id: 'node-01',
        name: 'node-01',
        description: 'Nodo maestro primario Docker local',
        location: 'Lima (pe-1)',
        fqdn: '127.0.0.1',
        ssl: 'http',
        allowAutoAllocation: true,
        behindProxy: false,
        maintenanceMode: false,
        totalMemoryMb: 32768,
        memoryOverallocatePercent: 0,
        diskSpaceMb: 256000,
        diskOverallocatePercent: 0,
        maxUploadFilesizeMb: 100,
        daemonPort: 8080,
        daemonSftpPort: 2022,
        daemonBasePath: '/var/lib/panelmaster/volumes',
        cpuCores: 8,
        cpuUsage: '2.8%',
        status: 'ONLINE',
        allocations: [
          { id: 'alloc-1', ip: '127.0.0.1', port: 25565, alias: 'play.panelmaster.local', serverName: 'survival-production' },
          { id: 'alloc-2', ip: '127.0.0.1', port: 25566, alias: '' },
          { id: 'alloc-3', ip: '127.0.0.1', port: 25567, alias: '' },
          { id: 'alloc-4', ip: '127.0.0.1', port: 8081, alias: '' },
        ],
      },
    ];
  });

  // Sync nodes with backend API on mount
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const token = localStorage.getItem('nexus_token');
        const res = await fetch('/api/v1/nodes', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: NodeItem[] = data.map((n: any) => ({
              id: n.id,
              name: n.name,
              description: n.description || 'Nodo registrado en el clúster',
              location: n.region?.name || 'Local',
              fqdn: n.fqdn,
              ssl: 'http',
              allowAutoAllocation: true,
              behindProxy: false,
              maintenanceMode: n.isUnderMaintenance || false,
              totalMemoryMb: n.totalMemoryMb || 32768,
              memoryOverallocatePercent: 0,
              diskSpaceMb: n.diskSpaceMb || 256000,
              diskOverallocatePercent: 0,
              maxUploadFilesizeMb: 100,
              daemonPort: n.agentPort || 8080,
              daemonSftpPort: 2022,
              daemonBasePath: '/var/lib/panelmaster/volumes',
              cpuCores: n.cpuCores || 8,
              cpuUsage: '2.1%',
              status: n.status || 'ONLINE',
              allocations: [
                { id: `alloc-${n.id}-1`, ip: n.fqdn, port: 25565, alias: `play.${n.name}.online`, serverName: '' },
                { id: `alloc-${n.id}-2`, ip: n.fqdn, port: 25566, alias: '' },
                { id: `alloc-${n.id}-3`, ip: n.fqdn, port: 25567, alias: '' },
              ],
            }));
            setNodesList(mapped);
            localStorage.setItem('pm_nodes_cache', JSON.stringify(mapped));
          }
        }
      } catch (err) {
        console.warn('Nodes backend fetch fallback:', err);
      }
    };
    fetchNodes();
  }, []);

  const [editingNode, setEditingNode] = useState<NodeItem | null>(null);
  const [nodeEditTab, setNodeEditTab] = useState<'about' | 'settings' | 'configuration' | 'allocation' | 'servers'>('about');

  // Node Edit Fields
  const [nodeNameEdit, setNodeNameEdit] = useState('');
  const [nodeDescEdit, setNodeDescEdit] = useState('');
  const [nodeLocationEdit, setNodeLocationEdit] = useState('Lima (pe-1)');
  const [nodeFqdnEdit, setNodeFqdnEdit] = useState('');
  const [nodeSslEdit, setNodeSslEdit] = useState<'http' | 'https'>('http');
  const [nodeAllowAutoAlloc, setNodeAllowAutoAlloc] = useState(true);
  const [nodeBehindProxy, setNodeBehindProxy] = useState(false);
  const [nodeMaintenance, setNodeMaintenance] = useState(false);
  const [nodeTotalMem, setNodeTotalMem] = useState(32768);
  const [nodeMemOverall, setNodeMemOverall] = useState(0);
  const [nodeDiskSpace, setNodeDiskSpace] = useState(256000);
  const [nodeDiskOverall, setNodeDiskOverall] = useState(0);
  const [nodeMaxUpload, setNodeMaxUpload] = useState(100);
  const [nodeDaemonPort, setNodeDaemonPort] = useState(8080);
  const [nodeDaemonSftp, setNodeDaemonSftp] = useState(2022);
  const [nodeBasePath, setNodeBasePath] = useState('/var/lib/panelmaster/volumes');

  // Node Allocation Fields
  const [newAllocIp, setNewAllocIp] = useState('127.0.0.1');
  const [newAllocAlias, setNewAllocAlias] = useState('');
  const [newAllocPorts, setNewAllocPorts] = useState('');

  // Node Configuration Auto-Deploy
  const [generatedDeployToken, setGeneratedDeployToken] = useState<string | null>(null);
  const [isNewNodeModalOpen, setIsNewNodeModalOpen] = useState(false);
  const [createNodeForm, setCreateNodeForm] = useState({
    name: '',
    fqdn: '',
    location: 'Lima (pe-1)',
    ramMb: 16384,
    diskMb: 100000,
  });

  // ==========================================
  // 6. EGGS (Service Templates)
  // ==========================================
  const [eggsCategory, setEggsCategory] = useState<'minecraft' | 'discord' | 'web' | 'databases' | 'steam'>('minecraft');
  const [eggsCatalog, setEggsCatalog] = useState<any[]>([
    {
      id: 'egg-paper',
      category: 'minecraft',
      name: 'Paper (Minecraft)',
      author: 'PanelMaster Official',
      description: 'Servidor Bukkit/Spigot de alto rendimiento con optimizaciones multihilo y parches de exploits.',
      dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}} nogui',
      variables: ['SERVER_JARFILE', 'MINECRAFT_VERSION', 'BUILD_NUMBER'],
    },
    {
      id: 'egg-forge',
      category: 'minecraft',
      name: 'Forge Modded',
      author: 'PanelMaster Official',
      description: 'Cargador de mods clásico con instalador automático para modpacks de CurseForge y Modrinth.',
      dockerImage: 'ghcr.io/pterodactyl/yolks:java_17',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui',
      variables: ['SERVER_JARFILE', 'FORGE_VERSION'],
    },
    {
      id: 'egg-discord-node',
      category: 'discord',
      name: 'Node.js Discord Bot',
      author: 'PanelMaster Official',
      description: 'Ambiente aislado con Node.js 20/22 para bots de Discord.js, TypeScript y wrappers REST.',
      dockerImage: 'ghcr.io/parkervcp/yolks:nodejs_20',
      startup: 'npm start || node index.js',
      variables: ['BOT_TOKEN', 'COMMAND_PREFIX'],
    },
    {
      id: 'egg-discord-python',
      category: 'discord',
      name: 'Python Discord Bot',
      author: 'PanelMaster Official',
      description: 'Host para discord.py, disnake y pycord con soporte pip virtualenv.',
      dockerImage: 'ghcr.io/parkervcp/yolks:python_3.11',
      startup: 'python3 main.py',
      variables: ['BOT_TOKEN'],
    },
    {
      id: 'egg-mariadb',
      category: 'databases',
      name: 'MariaDB / MySQL 8.0',
      author: 'PanelMaster Official',
      description: 'Servidor de base de datos relacional MySQL nativo con conexiones remotas e importador SQL.',
      dockerImage: 'ghcr.io/parkervcp/yolks:mariadb_11',
      startup: 'mysqld --user=mysql --console',
      variables: ['MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'],
    },
  ]);

  // ==========================================
  // HANDLERS
  // ==========================================

  // Save General Settings
  const handleSaveGeneralSettings = () => {
    toast.success('Configuración general del panel actualizada correctamente.');
  };

  // Test Email
  const handleSendTestEmail = async () => {
    const targetRecipient = smtpTestRecipient.trim() || smtpSenderEmail.trim();
    if (!targetRecipient || !targetRecipient.includes('@')) {
      toast.error('Introduce un correo de destino válido para la prueba.');
      return;
    }

    setIsSendingTestMail(true);
    try {
      const payload = {
        to: targetRecipient,
        smtpConfig: {
          host: smtpHost,
          port: Number(smtpPort),
          encryption: smtpEncryption,
          user: smtpUser,
          password: smtpPassword,
          senderName: smtpSenderName,
          senderEmail: smtpSenderEmail,
        },
      };

      const res = await fetch('/api/v1/mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al intentar enviar el correo de prueba.');
      }

      if (data.provider === 'resend-api') {
        toast.success(`¡Correo enviado vía Resend con éxito! (ID: ${data.messageId}). Ya puedes verlo en resend.com/emails.`);
      } else {
        toast.success(`Correo enviado exitosamente a ${targetRecipient} vía ${smtpHost}:${smtpPort}.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de conexión con el servicio de correo.');
    } finally {
      setIsSendingTestMail(false);
    }
  };

  // Save SMTP Settings
  const handleSaveSmtpSettings = async () => {
    try {
      const payload = {
        host: smtpHost.trim(),
        port: Number(smtpPort),
        encryption: smtpEncryption,
        user: smtpUser.trim(),
        password: smtpPassword,
        senderName: smtpSenderName.trim(),
        senderEmail: smtpSenderEmail.trim(),
      };

      try {
        localStorage.setItem('pm_smtp_settings', JSON.stringify(payload));
      } catch {}

      const res = await fetch('/api/v1/mail/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar configuración SMTP en el servidor.');
      }

      toast.success('Variables SMTP guardadas y sincronizadas exitosamente.');
    } catch (err: any) {
      toast.error(err.message || 'No se pudo sincronizar la configuración SMTP.');
    }
  };

  // Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username || !newUserData.email || !newUserData.password) {
      toast.error('Por favor completa todos los campos obligatorios.');
      return;
    }

    const newUser = {
      id: `u-${Date.now()}`,
      username: newUserData.username.trim(),
      firstName: newUserData.firstName.trim() || newUserData.username.trim(),
      lastName: newUserData.lastName.trim(),
      email: newUserData.email.trim(),
      language: newUserData.language,
      role: newUserData.isAdmin ? 'ADMIN' : 'USER',
      isAdmin: newUserData.isAdmin,
      twoFactorEnabled: false,
      serversCount: 0,
      assignedServerIds: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    setUsersList([...usersList, newUser]);
    setIsCreateUserModalOpen(false);
    setNewUserData({ username: '', firstName: '', lastName: '', email: '', password: '', language: 'es', isAdmin: false });

    // Disparar plantilla oficial: account_created
    fetch('/api/v1/mail/send-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateKey: 'account_created',
        to: newUser.email,
        variables: {
          user: newUser.username,
          email: newUser.email,
          loginUrl: 'http://localhost:5173/login',
        },
      }),
    }).catch(() => {});

    toast.success(`Usuario "${newUser.username}" creado y correo de bienvenida/activación emitido.`);
  };

  // Enviar restablecimiento de contraseña manual a usuario
  const handleSendPasswordResetToUser = (targetEmail: string, targetUsername: string) => {
    if (!targetEmail || !targetEmail.includes('@')) {
      toast.error('El usuario no posee una dirección de correo válida.');
      return;
    }
    fetch('/api/v1/mail/send-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateKey: 'password_reset',
        to: targetEmail.trim(),
        variables: {
          user: targetUsername,
          resetUrl: `http://localhost:5173/auth/reset-password?email=${encodeURIComponent(targetEmail)}&token=pt-${Date.now()}`,
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          toast.success(`Correo de restablecimiento enviado a ${targetEmail} (ID: ${data.messageId || 'OK'}).`);
        } else {
          toast.error(data.error || 'Error al emitir correo de restablecimiento.');
        }
      })
      .catch((err) => toast.error(err.message));
  };

  // Start Editing User
  const handleStartEditUser = (u: any) => {
    setEditingUser(u);
    setEditUserData({
      username: u.username,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email,
      password: '',
      language: u.language || 'es',
      isAdmin: u.isAdmin || u.role === 'SUPER_ADMIN' || u.role === 'ADMIN',
      twoFactorEnabled: !!u.twoFactorEnabled,
      assignedServerIds: u.assignedServerIds || [],
    });
  };

  // Save Edit User
  const handleSaveEditUser = () => {
    if (!editingUser) return;
    const updated = usersList.map((u) => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          username: editUserData.username,
          firstName: editUserData.firstName,
          lastName: editUserData.lastName,
          email: editUserData.email,
          language: editUserData.language,
          isAdmin: editUserData.isAdmin,
          role: editUserData.isAdmin ? (u.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN') : 'USER',
          twoFactorEnabled: editUserData.twoFactorEnabled,
          assignedServerIds: editUserData.assignedServerIds,
          serversCount: editUserData.assignedServerIds.length,
        };
      }
      return u;
    });

    setUsersList(updated);
    setEditingUser(null);
    toast.success(`Datos del usuario "${editUserData.username}" guardados correctamente.`);
  };

  // Delete User
  const handleDeleteUser = () => {
    if (!confirmDeleteUser) return;
    if (confirmDeleteUser.role === 'SUPER_ADMIN') {
      toast.warning('No puedes eliminar al usuario Super Administrador principal.');
      setConfirmDeleteUser(null);
      return;
    }

    setUsersList(usersList.filter((u) => u.id !== confirmDeleteUser.id));
    setConfirmDeleteUser(null);
    toast.success(`Usuario eliminado del sistema.`);
  };

  // Start Editing Server
  const handleOpenServerEdit = (srv: any) => {
    setEditingServer(srv);
    setServerEditTab('about');
    setServerNameEdit(srv.name || '');
    setServerOwnerEdit(srv.owner || 'Angel (angelriveradeveloper@gmail.com)');
    setServerDescEdit(srv.description || 'Servidor administrado en PanelMaster');
    setServerCpuLimit(srv.cpuLimit || 100);
    setServerCpuPinning(srv.cpuPinning || '');
    setServerMemoryMb(srv.maxRamMb || srv.memoryMb || 2048);
    setServerSwapMb(srv.swapMb || 0);
    setServerDiskMb(srv.diskMb || 10240);
    setServerBlockIo(srv.blockIo || 500);
    setServerDbLimit(srv.dbLimit || 2);
    setServerAllocLimit(srv.allocLimit || 3);
    setServerBackupLimit(srv.backupLimit || 3);
    setServerStartupCmd(srv.startupCmd || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui');
    setServerDefaultCmd('java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui');
    setServerEgg(srv.template || 'Paper Minecraft');
    setServerJarFile(srv.jarFile || 'server.jar');
    setServerDockerImage(srv.dockerImage || 'ghcr.io/pterodactyl/yolks:java_17');
  };

  // Save Server Details / Build / Startup
  const handleSaveServerDetails = () => {
    if (!editingServer) return;
    const updated = servers.map((s) => {
      if (s.id === editingServer.id) {
        return {
          ...s,
          name: serverNameEdit,
          owner: serverOwnerEdit,
          description: serverDescEdit,
          cpuLimit: serverCpuLimit,
          cpuPinning: serverCpuPinning,
          maxRamMb: serverMemoryMb,
          swapMb: serverSwapMb,
          diskMb: serverDiskMb,
          blockIo: serverBlockIo,
          dbLimit: serverDbLimit,
          allocLimit: serverAllocLimit,
          backupLimit: serverBackupLimit,
          startupCmd: serverStartupCmd,
          template: serverEgg,
          jarFile: serverJarFile,
          dockerImage: serverDockerImage,
        };
      }
      return s;
    });

    if (onUpdateServers) onUpdateServers(updated);
    setEditingServer({ ...editingServer, name: serverNameEdit, maxRamMb: serverMemoryMb });
    toast.success('Configuración del servidor guardada exitosamente.');
  };

  // Execute Server Action (Reinstall, Suspend, Safe Delete, Force Delete)
  const handleExecuteServerAction = () => {
    if (!serverActionConfirm || !editingServer) return;

    if (serverActionConfirm.type === 'reinstall') {
      // Disparar plantilla: server_installed
      fetch('/api/v1/mail/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: 'server_installed',
          to: editingServer.ownerEmail || 'admin@panelmaster.dev',
          variables: {
            user: editingServer.owner || 'Usuario',
            server: editingServer.name,
            ip: editingServer.ip || '127.0.0.1',
            port: String(editingServer.port || 25565),
            serverUrl: `http://localhost:5173/server/${editingServer.id}/console`,
          },
        }),
      }).catch(() => {});
      toast.success(`El servidor "${editingServer.name}" ha sido enviado a reinstalación y se notificará por correo.`);
    } else if (serverActionConfirm.type === 'suspend') {
      const isSusp = editingServer.status === 'SUSPENDED';
      const nextStatus = isSusp ? 'STOPPED' : 'SUSPENDED';
      const updated = servers.map((s) => (s.id === editingServer.id ? { ...s, status: nextStatus } : s));
      if (onUpdateServers) onUpdateServers(updated);
      setEditingServer({ ...editingServer, status: nextStatus });
      toast.success(isSusp ? 'Servidor reactivado exitosamente.' : 'Servidor suspendido y procesos detenidos.');
    } else if (serverActionConfirm.type === 'install_status') {
      fetch('/api/v1/mail/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: 'server_installed',
          to: editingServer.ownerEmail || 'admin@panelmaster.dev',
          variables: {
            user: editingServer.owner || 'Usuario',
            server: editingServer.name,
            ip: editingServer.ip || '127.0.0.1',
            port: String(editingServer.port || 25565),
            serverUrl: `http://localhost:5173/server/${editingServer.id}/console`,
          },
        }),
      }).catch(() => {});
      toast.success('Estado de instalación invertido y correo emitido.');
    } else if (serverActionConfirm.type === 'transfer') {
      toast.info('Transferencia iniciada en background hacia nodo de destino.');
    } else if (serverActionConfirm.type === 'safely_delete' || serverActionConfirm.type === 'force_delete') {
      const updated = servers.filter((s) => s.id !== editingServer.id);
      if (onUpdateServers) onUpdateServers(updated);
      setEditingServer(null);
      toast.success(`Servidor eliminado ${serverActionConfirm.type === 'force_delete' ? 'permanentemente' : 'de forma segura'}.`);
    }

    setServerActionConfirm(null);
  };

  // Start Editing Node
  const handleOpenNodeEdit = (node: NodeItem) => {
    setEditingNode(node);
    setNodeEditTab('about');
    setNodeNameEdit(node.name);
    setNodeDescEdit(node.description);
    setNodeLocationEdit(node.location);
    setNodeFqdnEdit(node.fqdn);
    setNodeSslEdit(node.ssl);
    setNodeAllowAutoAlloc(node.allowAutoAllocation);
    setNodeBehindProxy(node.behindProxy);
    setNodeMaintenance(node.maintenanceMode);
    setNodeTotalMem(node.totalMemoryMb);
    setNodeMemOverall(node.memoryOverallocatePercent);
    setNodeDiskSpace(node.diskSpaceMb);
    setNodeDiskOverall(node.diskOverallocatePercent);
    setNodeMaxUpload(node.maxUploadFilesizeMb);
    setNodeDaemonPort(node.daemonPort);
    setNodeDaemonSftp(node.daemonSftpPort);
    setNodeBasePath(node.daemonBasePath);
  };

  // Save Node Settings
  const handleSaveNodeSettings = () => {
    if (!editingNode) return;
    const updated = nodesList.map((n) => {
      if (n.id === editingNode.id) {
        return {
          ...n,
          name: nodeNameEdit,
          description: nodeDescEdit,
          location: nodeLocationEdit,
          fqdn: nodeFqdnEdit,
          ssl: nodeSslEdit,
          allowAutoAllocation: nodeAllowAutoAlloc,
          behindProxy: nodeBehindProxy,
          maintenanceMode: nodeMaintenance,
          totalMemoryMb: nodeTotalMem,
          memoryOverallocatePercent: nodeMemOverall,
          diskSpaceMb: nodeDiskSpace,
          diskOverallocatePercent: nodeDiskOverall,
          maxUploadFilesizeMb: nodeMaxUpload,
          daemonPort: nodeDaemonPort,
          daemonSftpPort: nodeDaemonSftp,
          daemonBasePath: nodeBasePath,
        };
      }
      return n;
    });

    setNodesList(updated);
    setEditingNode({ ...editingNode, name: nodeNameEdit });
    toast.success(`Ajustes del nodo "${nodeNameEdit}" guardados exitosamente.`);
  };

  // Add Allocations to Node
  const handleCreateAllocations = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode || !newAllocPorts) {
      toast.error('Por favor especifica un puerto o rango de puertos (ej: 25565-25570).');
      return;
    }

    const newAllocs = [...editingNode.allocations];
    let addedCount = 0;

    if (newAllocPorts.includes('-')) {
      const [start, end] = newAllocPorts.split('-').map((p) => parseInt(p.trim(), 10));
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        for (let p = start; p <= Math.min(start + 50, end); p++) {
          newAllocs.push({
            id: `alloc-${Date.now()}-${p}`,
            ip: newAllocIp.trim() || '127.0.0.1',
            port: p,
            alias: newAllocAlias.trim() || undefined,
          });
          addedCount++;
        }
      }
    } else {
      const p = parseInt(newAllocPorts.trim(), 10);
      if (!isNaN(p)) {
        newAllocs.push({
          id: `alloc-${Date.now()}-${p}`,
          ip: newAllocIp.trim() || '127.0.0.1',
          port: p,
          alias: newAllocAlias.trim() || undefined,
        });
        addedCount++;
      }
    }

    const updatedNode = { ...editingNode, allocations: newAllocs };
    setNodesList(nodesList.map((n) => (n.id === editingNode.id ? updatedNode : n)));
    setEditingNode(updatedNode);
    setNewAllocPorts('');
    toast.success(`${addedCount} asignación(es) creadas en el nodo.`);
  };

  // Delete Allocation
  const handleDeleteAllocation = (allocId: string) => {
    if (!editingNode) return;
    const filtered = editingNode.allocations.filter((a) => a.id !== allocId);
    const updated = { ...editingNode, allocations: filtered };
    setNodesList(nodesList.map((n) => (n.id === editingNode.id ? updated : n)));
    setEditingNode(updated);
    toast.success('Puerto de asignación eliminado.');
  };

  // Generate Deploy Token
  const handleGenerateDeployToken = () => {
    const token = `pm_deploy_${Math.random().toString(36).substring(2, 14)}_${Date.now()}`;
    setGeneratedDeployToken(token);
    toast.success('Token de auto-despliegue generado.');
  };

  // =========================================================================
  // RENDER: SERVER EDIT VIEW (Matches Pterodactyl-style Images 1 & 2)
  // =========================================================================
  const renderServerEdit = () => {
    if (!editingServer) return null;
    return (
      <div className="w-full space-y-5 pb-10">
        {/* Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between border-b border-[#1f1f23] pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingServer(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111114] border border-[#1f1f23] text-xs font-semibold text-zinc-300 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>{isEs ? 'Volver a Servidores' : 'Back to Servers'}</span>
            </button>
            <h1 className="text-base font-bold text-white tracking-wide">
              {editingServer.name}{' '}
              <span className="text-xs font-mono font-normal text-zinc-500">({editingServer.id})</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                editingServer.status === 'RUNNING'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : editingServer.status === 'SUSPENDED'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {editingServer.status}
            </span>
          </div>
        </div>

        {/* Server Edit Tabs - Matches Image 6 */}
        <div className="flex items-center gap-6 border-b border-[#1f1f23] text-xs font-semibold overflow-x-auto no-scrollbar">
          {(['about', 'details', 'build', 'startup', 'database', 'mounts', 'manage', 'delete'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setServerEditTab(tab)}
              className={`pb-2.5 transition capitalize relative ${
                serverEditTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-500 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab === 'about'
                ? 'About'
                : tab === 'details'
                ? 'Details'
                : tab === 'build'
                ? 'Build'
                : tab === 'startup'
                ? 'Startup'
                : tab === 'database'
                ? 'Database'
                : tab === 'mounts'
                ? 'Mounts'
                : tab === 'manage'
                ? 'Manage'
                : 'Delete'}
            </button>
          ))}
        </div>

        {/* TAB 1: ABOUT (Matches Image 1) */}
        {serverEditTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: INFORMATION TABLE */}
            <div className="lg:col-span-2 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                INFORMATION
              </span>

              <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl divide-y divide-[#1c1c20] text-xs">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Internal Identifier</span>
                  <span className="font-mono text-zinc-200 font-semibold">{editingServer.id || 1}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">External Identifier</span>
                  <span className="font-mono text-zinc-500">Not Set</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">UUID / Docker Container ID</span>
                  <span className="font-mono text-zinc-300 select-all text-[11px]">
                    {editingServer.containerId || '863f2ea7-3525-48a7-b77d-3164c06de910'}
                  </span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Current Egg</span>
                  <span className="font-semibold text-blue-400">{editingServer.template || 'Paper Minecraft'}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Server Name</span>
                  <span className="font-mono text-zinc-200 font-semibold">{editingServer.name}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">CPU Limit</span>
                  <span className="font-mono text-zinc-200">{serverCpuLimit}%</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">CPU Pinning</span>
                  <span className="font-mono text-zinc-500">{serverCpuPinning || 'Not Set'}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Memory</span>
                  <span className="font-mono text-zinc-200">{serverMemoryMb}MiB / Not Set</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Disk Space</span>
                  <span className="font-mono text-zinc-200">{serverDiskMb}MiB</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Block IO Weight</span>
                  <span className="font-mono text-zinc-200">{serverBlockIo}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Default Connection</span>
                  <span className="font-mono text-zinc-200">{editingServer.ip || '127.0.0.1'}:{editingServer.port || 25565}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Connection Alias</span>
                  <span className="font-mono text-zinc-300">play.panelmaster.local:{editingServer.port || 25565}</span>
                </div>
              </div>
            </div>

            {/* Right: SERVER ASSIGNMENT CARD */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                SERVER ASSIGNMENT
              </span>

              <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-4 divide-y divide-[#1c1c20] text-xs">
                <div className="pb-3 space-y-1">
                  <div className="text-zinc-400 text-[11px]">Owner</div>
                  <div className="font-bold text-zinc-100">{serverOwnerEdit}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">angelriveradeveloper@gmail.com</div>
                </div>

                <div className="py-3 space-y-1">
                  <div className="text-zinc-400 text-[11px]">Node</div>
                  <div className="font-bold text-zinc-100">node-01</div>
                  <div className="text-[10px] text-zinc-500 font-mono">127.0.0.1</div>
                </div>

                <div className="pt-3 space-y-1">
                  <div className="text-zinc-400 text-[11px]">Location</div>
                  <div className="font-bold text-zinc-100">pe-1</div>
                  <div className="text-[10px] text-zinc-500">Lima, Perú DataCenter</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DETAILS */}
        {serverEditTab === 'details' && (
          <div className="max-w-2xl bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              DETALLES BÁSICOS DEL SERVIDOR
            </span>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Nombre del Servidor</label>
              <input
                type="text"
                value={serverNameEdit}
                onChange={(e) => setServerNameEdit(e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Dueño del Servidor (Owner)</label>
              <select
                value={serverOwnerEdit}
                onChange={(e) => setServerOwnerEdit(e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                {usersList.map((u) => (
                  <option key={u.id} value={`${u.username} (${u.email})`}>
                    {u.username} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Descripción</label>
              <textarea
                value={serverDescEdit}
                onChange={(e) => setServerDescEdit(e.target.value)}
                rows={3}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleSaveServerDetails}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        )}

        {/* TAB 3: BUILD CONFIGURATION */}
        {serverEditTab === 'build' && (
          <div className="max-w-3xl bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-5">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              BUILD CONFIGURATION & RECURSOS
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">CPU Limit (%)</label>
                <input
                  type="number"
                  value={serverCpuLimit}
                  onChange={(e) => setServerCpuLimit(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">CPU Pinning (Threads)</label>
                <input
                  type="text"
                  placeholder="ej: 0,1 o vacío"
                  value={serverCpuPinning}
                  onChange={(e) => setServerCpuPinning(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Allocated Memory (MiB)</label>
                <input
                  type="number"
                  value={serverMemoryMb}
                  onChange={(e) => setServerMemoryMb(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Allocated SWAP (MiB)</label>
                <input
                  type="number"
                  value={serverSwapMb}
                  onChange={(e) => setServerSwapMb(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Disk Space Limit (MiB)</label>
                <input
                  type="number"
                  value={serverDiskMb}
                  onChange={(e) => setServerDiskMb(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Block IO Weight</label>
                <input
                  type="number"
                  value={serverBlockIo}
                  onChange={(e) => setServerBlockIo(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Database Limit</label>
                <input
                  type="number"
                  value={serverDbLimit}
                  onChange={(e) => setServerDbLimit(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Allocation Limit (Puertos)</label>
                <input
                  type="number"
                  value={serverAllocLimit}
                  onChange={(e) => setServerAllocLimit(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Backup Limit</label>
                <input
                  type="number"
                  value={serverBackupLimit}
                  onChange={(e) => setServerBackupLimit(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>
            </div>

            <button
              onClick={handleSaveServerDetails}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Recursos de Build</span>
            </button>
          </div>
        )}

        {/* TAB 4: STARTUP CONFIGURATION */}
        {serverEditTab === 'startup' && (
          <div className="max-w-3xl bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              STARTUP COMMAND & IMAGEN
            </span>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Comando de Inicio (Startup Command)</label>
              <input
                type="text"
                value={serverStartupCmd}
                onChange={(e) => setServerStartupCmd(e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-blue-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Default Command</label>
              <input
                type="text"
                disabled
                value={serverDefaultCmd}
                className="w-full bg-[#18181c] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-500 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Egg Asociado</label>
                <select
                  value={serverEgg}
                  onChange={(e) => setServerEgg(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                >
                  <option value="Paper Minecraft">Paper Minecraft</option>
                  <option value="Forge Modded">Forge Modded</option>
                  <option value="Fabric Modded">Fabric Modded</option>
                  <option value="Purpur">Purpur</option>
                  <option value="Bungeecord">Bungeecord</option>
                  <option value="Node.js Discord Bot">Node.js Discord Bot</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Server JAR Name</label>
                <input
                  type="text"
                  value={serverJarFile}
                  onChange={(e) => setServerJarFile(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs text-zinc-400">Docker Image</label>
                <input
                  type="text"
                  value={serverDockerImage}
                  onChange={(e) => setServerDockerImage(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100"
                />
              </div>
            </div>

            <button
              onClick={handleSaveServerDetails}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Startup</span>
            </button>
          </div>
        )}

        {/* TAB: DATABASE (Matches Image 6) */}
        {serverEditTab === 'database' && (
          <div className="max-w-3xl bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-5">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              {isEs ? 'BASES DE DATOS DEL SERVIDOR' : 'SERVER DATABASES'}
            </span>
            <div className="p-4 bg-[#09090b] border border-[#1c1c20] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-200">
                  {isEs ? 'Límite de Bases de Datos Asignadas' : 'Allocated Database Limit'}
                </span>
                <p className="text-[11px] text-zinc-500">
                  {isEs ? 'Número máximo de bases de datos que el usuario puede crear.' : 'Maximum number of databases the user can create.'}
                </p>
              </div>
              <span className="text-sm font-bold font-mono text-blue-400">{serverDbLimit}</span>
            </div>
            <div className="border-t border-[#1c1c20] pt-4">
              <span className="text-xs text-zinc-400 block mb-2 font-mono">
                {isEs ? `Bases de Datos Creadas (0 / ${serverDbLimit})` : `Created Databases (0 / ${serverDbLimit})`}
              </span>
              <p className="text-xs text-zinc-500 italic">
                {isEs ? 'No hay bases de datos asociadas a este servidor actualmente.' : 'No databases associated with this server currently.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB: MOUNTS (Matches Image 6) */}
        {serverEditTab === 'mounts' && (
          <div className="max-w-3xl bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              {isEs ? 'MONTURAS DE DIRECTORIOS (MOUNTS)' : 'DIRECTORY MOUNTS'}
            </span>
            <p className="text-xs text-zinc-400">
              {isEs
                ? 'Conecta directorios del host o de almacenamiento compartido directamente dentro del contenedor del servidor.'
                : 'Mount directories from the host or shared storage into the server container.'}
            </p>
            <div className="p-8 text-center bg-[#09090b] border border-[#1c1c20] rounded-xl text-zinc-500 text-xs">
              {isEs ? 'No hay monturas asignadas a este servidor.' : 'No mounts assigned to this server.'}
            </div>
          </div>
        )}

        {/* TAB 5: MANAGE (Matches Image 2 Exactly) */}
        {serverEditTab === 'manage' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. REINSTALL SERVER */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                REINSTALL SERVER
              </span>

              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-300 font-sans">
                  <span className="font-bold">Danger!</span> This could overwrite server data.
                </div>
              </div>

              <p className="text-xs text-zinc-400">
                This will reinstall the server with the assigned service scripts.
              </p>

              <button
                onClick={() =>
                  setServerActionConfirm({
                    open: true,
                    title: 'Reinstalar Servidor',
                    message: '¿Estás seguro de reinstalar este servidor? Se ejecutarán los scripts base del Egg.',
                    type: 'reinstall',
                  })
                }
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/20 uppercase tracking-wide"
              >
                REINSTALL SERVER
              </button>
            </div>

            {/* 2. INSTALL STATUS */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                INSTALL STATUS
              </span>

              <p className="text-xs text-zinc-400">
                If you need to change the install status from uninstalled to installed, or vice versa, you may do so with the button below.
              </p>

              <button
                onClick={() =>
                  setServerActionConfirm({
                    open: true,
                    title: 'Alternar Estado de Instalación',
                    message: '¿Deseas invertir el flag de instalación del servidor?',
                    type: 'install_status',
                  })
                }
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-amber-600/20 uppercase tracking-wide"
              >
                TOGGLE INSTALL STATUS
              </button>
            </div>

            {/* 3. SUSPEND SERVER */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                SUSPEND SERVER
              </span>

              <p className="text-xs text-zinc-400">
                This will suspend the server, stop any running processes, and immediately block the user from accessing their files or managing the server.
              </p>

              <button
                onClick={() =>
                  setServerActionConfirm({
                    open: true,
                    title: editingServer.status === 'SUSPENDED' ? 'Reactivar Servidor' : 'Suspender Servidor',
                    message:
                      editingServer.status === 'SUSPENDED'
                        ? '¿Deseas reactivar el servidor para el usuario?'
                        : '¿Confirmas suspender inmediatamente el servidor y bloquear el acceso al usuario?',
                    type: 'suspend',
                  })
                }
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-amber-600/20 uppercase tracking-wide"
              >
                {editingServer.status === 'SUSPENDED' ? 'UNSUSPEND SERVER' : 'SUSPEND SERVER'}
              </button>
            </div>

            {/* 4. TRANSFER SERVER */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                TRANSFER SERVER
              </span>

              <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300 font-sans">
                  <span className="font-bold">Warning!</span> This feature may have bugs.
                </div>
              </div>

              <p className="text-xs text-zinc-400">
                Transfer this server to another node connected to this panel.
              </p>

              <button
                onClick={() =>
                  setServerActionConfirm({
                    open: true,
                    title: 'Transferir Servidor de Nodo',
                    message: '¿Iniciar migración hacia otro nodo del clúster?',
                    type: 'transfer',
                  })
                }
                className="w-full sm:w-auto px-5 py-2.5 bg-[#18181c] border border-[#27272a] hover:bg-[#222227] text-zinc-300 text-xs font-bold rounded-xl transition uppercase tracking-wide"
              >
                TRANSFER SERVER
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: DELETE (Safely vs Force) */}
        {serverEditTab === 'delete' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                SAFELY DELETE SERVER
              </span>
              <p className="text-xs text-zinc-400">
                Elimina de forma segura el servidor del panel y notifica al daemon para liberar los puertos y recursos sin afectar logs históricos.
              </p>
              <button
                onClick={() =>
                  setServerActionConfirm({
                    open: true,
                    title: 'Eliminación Segura',
                    message: `¿Estás seguro de eliminar el servidor "${editingServer.name}" de forma segura?`,
                    type: 'safely_delete',
                  })
                }
                className="px-5 py-2.5 bg-[#18181c] border border-rose-900/50 hover:bg-rose-950/30 text-rose-400 text-xs font-bold rounded-xl transition uppercase"
              >
                Safely Delete
              </button>
            </div>

            <div className="bg-[#111114] border border-rose-900/40 rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-rose-500 uppercase font-mono block">
                FORCE DELETE SERVER
              </span>
              <p className="text-xs text-rose-300/80">
                Destruye inmediatamente el contenedor Docker, todos sus volúmenes y archivos del disco sin esperar respuesta del daemon. Acción irreversible.
              </p>
              <button
                onClick={() =>
                  setServerActionConfirm({
                    open: true,
                    title: 'Eliminación Forzada Definitiva',
                    message: `¡ATENCIÓN! Se destruirá irreversiblemente el contenedor y todos los datos de "${editingServer.name}". ¿Proceder?`,
                    type: 'force_delete',
                  })
                }
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition uppercase shadow-lg shadow-rose-600/30"
              >
                Force Delete
              </button>
            </div>
          </div>
        )}

        {/* Action Confirmation In-App Modal */}
        {serverActionConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#111114] border border-[#27272a] rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">{serverActionConfirm.title}</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{serverActionConfirm.message}</p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setServerActionConfirm(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-[#18181c]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecuteServerAction}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20"
                >
                  Confirmar Acción
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // RENDER: NODE EDIT VIEW (Matches Pterodactyl-style Images 3, 4, 5)
  // =========================================================================
  const renderNodeEdit = () => {
    if (!editingNode) return null;
    return (
      <div className="w-full space-y-5 pb-10">
        {/* Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between border-b border-[#1f1f23] pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingNode(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111114] border border-[#1f1f23] text-xs font-semibold text-zinc-300 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>{isEs ? 'Volver a Nodos' : 'Back to Nodes'}</span>
            </button>
            <h1 className="text-base font-bold text-white tracking-wide">
              {editingNode.name}{' '}
              <span className="text-xs font-mono font-normal text-zinc-500">({editingNode.fqdn})</span>
            </h1>
          </div>

          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
            ONLINE
          </span>
        </div>

        {/* Node Edit Tabs */}
        <div className="flex items-center gap-6 border-b border-[#1f1f23] text-xs font-semibold overflow-x-auto no-scrollbar">
          {(['about', 'settings', 'configuration', 'allocation', 'servers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setNodeEditTab(tab)}
              className={`pb-2.5 transition capitalize relative ${
                nodeEditTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-500 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab === 'about'
                ? isEs ? 'Información' : 'About'
                : tab === 'settings'
                ? isEs ? 'Ajustes' : 'Settings'
                : tab === 'configuration'
                ? isEs ? 'Configuración' : 'Configuration'
                : tab === 'allocation'
                ? isEs ? 'Asignación' : 'Allocation'
                : isEs ? 'Servidores' : 'Servers'}
            </button>
          ))}
        </div>

        {/* TAB 1: ABOUT */}
        {nodeEditTab === 'about' && (
          <div className="max-w-2xl bg-[#111114] border border-[#1f1f23] rounded-2xl divide-y divide-[#1c1c20] text-xs">
            <div className="p-4 flex items-center justify-between">
              <span className="text-zinc-400">{isEs ? 'ID Interno del Nodo' : 'Node Internal ID'}</span>
              <span className="font-mono text-zinc-200 font-semibold">{editingNode.id}</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-zinc-400">FQDN / Hostname</span>
              <span className="font-mono text-blue-400 font-semibold">{editingNode.fqdn}</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-zinc-400">{isEs ? 'Conexión SSL' : 'SSL Connection'}</span>
              <span className="font-mono text-zinc-300 uppercase">{editingNode.ssl}</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-zinc-400">{isEs ? 'Memoria Asignada' : 'Allocated Memory'}</span>
              <span className="font-mono text-zinc-200">
                {servers.reduce((acc, s) => acc + (s.maxRamMb || 2048), 0)} MiB / {editingNode.totalMemoryMb} MiB
              </span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-zinc-400">{isEs ? 'Espacio en Disco' : 'Disk Space'}</span>
              <span className="font-mono text-zinc-200">{editingNode.diskSpaceMb} MiB</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-zinc-400">{isEs ? 'Versión Daemon Docker' : 'Docker Daemon Version'}</span>
              <span className="font-mono text-emerald-400">v26.1.1 (Healthy)</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-zinc-400">{isEs ? 'Total de Asignaciones' : 'Total Allocations'}</span>
              <span className="font-mono text-zinc-200">{editingNode.allocations.length} {isEs ? 'puertos' : 'ports'}</span>
            </div>
          </div>
        )}

        {/* TAB 2: SETTINGS (Matches Image 3 Exactly) */}
        {nodeEditTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: SETTINGS */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                {isEs ? 'AJUSTES' : 'SETTINGS'}
              </span>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">{isEs ? 'NOMBRE DEL NODO' : 'NODE NAME'}</label>
                <input
                  type="text"
                  value={nodeNameEdit}
                  onChange={(e) => setNodeNameEdit(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
                <p className="text-[11px] text-zinc-500">
                  {isEs ? 'Un identificador corto para distinguir este nodo de otros.' : 'A short identifier used to distinguish this node from others.'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">{isEs ? 'DESCRIPCIÓN' : 'DESCRIPTION'}</label>
                <input
                  type="text"
                  value={nodeDescEdit}
                  onChange={(e) => setNodeDescEdit(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">{isEs ? 'UBICACIÓN' : 'LOCATION'}</label>
                <select
                  value={nodeLocationEdit}
                  onChange={(e) => setNodeLocationEdit(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                >
                  <option value="Lima (pe-1)">Lima (pe-1)</option>
                  <option value="São Paulo (br-1)">São Paulo (br-1)</option>
                  <option value="US East (us-1)">US East (us-1)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">FQDN / Hostname</label>
                <input
                  type="text"
                  value={nodeFqdnEdit}
                  onChange={(e) => setNodeFqdnEdit(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100"
                />
                <p className="text-[11px] text-zinc-500">
                  {isEs ? 'Nombre de dominio o IP pública que apunta a este nodo.' : 'The domain name or IP address that points to this node.'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">{isEs ? 'COMUNICACIÓN MEDIANTE SSL' : 'COMMUNICATE OVER SSL'}</label>
                <select
                  value={nodeSslEdit}
                  onChange={(e) => setNodeSslEdit(e.target.value as any)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                >
                  <option value="http">{isEs ? 'Usar Conexión HTTP (http)' : 'Use HTTP Connection (http)'}</option>
                  <option value="https">{isEs ? 'Usar Conexión Segura SSL (https)' : 'Use SSL Connection (https)'}</option>
                </select>
              </div>

              {/* Draggable Toggles */}
              <div className="pt-3 space-y-4 border-t border-[#1c1c20]">
                <DraggableToggle
                  checked={nodeAllowAutoAlloc}
                  onChange={setNodeAllowAutoAlloc}
                  color="blue"
                  label={isEs ? 'PERMITIR ASIGNACIÓN AUTOMÁTICA' : 'ALLOW AUTOMATIC ALLOCATION'}
                  description={isEs ? 'Los nodos públicos están disponibles para el despliegue automático de servidores.' : 'Public nodes are available for automatic server deployment.'}
                />

                <DraggableToggle
                  checked={nodeBehindProxy}
                  onChange={setNodeBehindProxy}
                  color="blue"
                  label={isEs ? 'DETRÁS DE PROXY' : 'BEHIND PROXY'}
                  description={isEs ? 'Activa si este nodo se encuentra detrás de un proxy inverso o Cloudflare.' : 'Enable if this node sits behind a proxy such as Cloudflare.'}
                />

                <DraggableToggle
                  checked={nodeMaintenance}
                  onChange={setNodeMaintenance}
                  color="blue"
                  label={isEs ? 'MODO DE MANTENIMIENTO' : 'MAINTENANCE MODE'}
                  description={isEs ? 'Los servidores en un nodo en modo mantenimiento no pueden ser iniciados.' : 'Servers on a node in maintenance mode cannot be accessed.'}
                />
              </div>

              <button
                onClick={handleSaveNodeSettings}
                className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
              >
                {isEs ? 'Guardar Ajustes' : 'Save Settings'}
              </button>
            </div>

            {/* Right Column: ALLOCATION LIMITS & GENERAL CONFIGURATION */}
            <div className="space-y-6">
              {/* ALLOCATION LIMITS */}
              <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
                <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                  {isEs ? 'LÍMITES DE ASIGNACIÓN' : 'ALLOCATION LIMITS'}
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">{isEs ? 'MEMORIA TOTAL (MiB)' : 'TOTAL MEMORY (MiB)'}</label>
                    <input
                      type="number"
                      value={nodeTotalMem}
                      onChange={(e) => setNodeTotalMem(Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">{isEs ? 'SOBRE-ASIGNACIÓN (%)' : 'OVERALLOCATE (%)'}</label>
                    <input
                      type="number"
                      value={nodeMemOverall}
                      onChange={(e) => setNodeMemOverall(Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">{isEs ? 'ESPACIO EN DISCO (MiB)' : 'DISK SPACE (MiB)'}</label>
                    <input
                      type="number"
                      value={nodeDiskSpace}
                      onChange={(e) => setNodeDiskSpace(Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">{isEs ? 'SOBRE-ASIGNACIÓN (%)' : 'OVERALLOCATE (%)'}</label>
                    <input
                      type="number"
                      value={nodeDiskOverall}
                      onChange={(e) => setNodeDiskOverall(Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              {/* GENERAL CONFIGURATION */}
              <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
                <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                  {isEs ? 'CONFIGURACIÓN GENERAL' : 'GENERAL CONFIGURATION'}
                </span>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">{isEs ? 'TAMAÑO MÁXIMO DE SUBIDA WEB (MiB)' : 'MAXIMUM WEB UPLOAD FILESIZE (MiB)'}</label>
                  <input
                    type="number"
                    value={nodeMaxUpload}
                    onChange={(e) => setNodeMaxUpload(Number(e.target.value))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">{isEs ? 'PUERTO DEL DAEMON' : 'DAEMON PORT'}</label>
                    <input
                      type="number"
                      value={nodeDaemonPort}
                      onChange={(e) => setNodeDaemonPort(Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">{isEs ? 'PUERTO SFTP DEL DAEMON' : 'DAEMON SFTP PORT'}</label>
                    <input
                      type="number"
                      value={nodeDaemonSftp}
                      onChange={(e) => setNodeDaemonSftp(Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">{isEs ? 'DIRECTORIO BASE DEL DAEMON' : 'DAEMON BASE PATH'}</label>
                  <input
                    type="text"
                    value={nodeBasePath}
                    onChange={(e) => setNodeBasePath(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURATION (Matches Image 4) */}
        {nodeEditTab === 'configuration' && (
          <div className="space-y-6">
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono">
                  {isEs ? 'CONFIG.YML DEL DAEMON (RUNNER / WINGS)' : 'DAEMON CONFIG.YML (RUNNER / WINGS)'}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`debug: false\nuuid: ${editingNode.id}\ntoken_id: ${editingNode.id}\ntoken: auto_generated_token\napi:\n  host: 0.0.0.0\n  port: ${editingNode.daemonPort}\n  ssl:\n    enabled: ${editingNode.ssl === 'https'}\nsystem:\n  data: ${editingNode.daemonBasePath}\n  sftp:\n    bind_port: ${editingNode.daemonSftpPort}\n`);
                    toast.success(isEs ? 'config.yml copiado al portapapeles' : 'config.yml copied to clipboard');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181c] border border-[#27272a] text-xs text-zinc-300 hover:text-white transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Copiar Configuración' : 'Copy Configuration'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-[#070709] border border-[#1c1c20] text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`debug: false
uuid: ${editingNode.id}
token_id: "${editingNode.id}"
token: "pm_auth_token_secret_cluster_9841"
api:
  host: 0.0.0.0
  port: ${editingNode.daemonPort}
  ssl:
    enabled: ${editingNode.ssl === 'https'}
system:
  root_directory: ${editingNode.daemonBasePath}
  log_directory: /var/log/panelmaster
  sftp:
    bind_port: ${editingNode.daemonSftpPort}
allowed_mounts: []
docker:
  network:
    name: panelmaster_network`}
              </pre>
            </div>

            {/* Auto-Deploy Card */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                {isEs ? 'COMANDO DE AUTO-DESPLIEGUE' : 'AUTO-DEPLOY COMMAND'}
              </span>
              <p className="text-xs text-zinc-400">
                {isEs
                  ? 'Genera un token temporal para configurar automáticamente este nodo ejecutando un único comando en el host Linux.'
                  : 'Generate a temporary token to automatically configure this node by executing a single command on the Linux host.'}
              </p>

              {generatedDeployToken ? (
                <div className="space-y-2">
                  <div className="p-3 bg-[#070709] border border-blue-500/30 rounded-xl font-mono text-xs text-blue-400 flex items-center justify-between">
                    <span className="truncate">sudo panelmaster-runner configure --token {generatedDeployToken}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`sudo panelmaster-runner configure --token ${generatedDeployToken}`);
                        toast.success(isEs ? 'Comando copiado' : 'Command copied');
                      }}
                      className="p-1 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerateDeployToken}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-blue-600/20 uppercase font-mono"
                >
                  {isEs ? 'GENERAR TOKEN' : 'GENERATE TOKEN'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ALLOCATION (Matches Image 5 Exactly) */}
        {nodeEditTab === 'allocation' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: EXISTING ALLOCATIONS TABLE */}
            <div className="lg:col-span-2 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                {isEs ? 'ASIGNACIONES EXISTENTES' : 'EXISTING ALLOCATIONS'} ({editingNode.allocations.length})
              </span>

              <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#1f1f23] text-zinc-400 text-[11px] font-mono">
                      <th className="p-3.5">{isEs ? 'DIRECCIÓN IP' : 'IP ADDRESS'}</th>
                      <th className="p-3.5">{isEs ? 'PUERTO' : 'PORT'}</th>
                      <th className="p-3.5">ALIAS</th>
                      <th className="p-3.5">{isEs ? 'SERVIDOR' : 'SERVER'}</th>
                      <th className="p-3.5 text-right">{isEs ? 'ACCIÓN' : 'ACTION'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18181c]">
                    {editingNode.allocations.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-[#141418] transition">
                        <td className="p-3.5 font-mono text-zinc-300">{alloc.ip}</td>
                        <td className="p-3.5 font-mono font-bold text-blue-400">{alloc.port}</td>
                        <td className="p-3.5 font-mono text-zinc-400">{alloc.alias || '-'}</td>
                        <td className="p-3.5">
                          {alloc.serverName ? (
                            <span className="font-semibold text-blue-400">{alloc.serverName}</span>
                          ) : (
                            <span className="text-zinc-500 italic">{isEs ? 'Sin Asignar' : 'Unassigned'}</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteAllocation(alloc.id)}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: ASSIGN NEW ALLOCATIONS FORM */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                {isEs ? 'CREAR NUEVAS ASIGNACIONES' : 'ASSIGN NEW ALLOCATIONS'}
              </span>

              <form onSubmit={handleCreateAllocations} className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-4 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px]">{isEs ? 'DIRECCIÓN IP' : 'IP ADDRESS'}</label>
                  <input
                    type="text"
                    value={newAllocIp}
                    onChange={(e) => setNewAllocIp(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px]">{isEs ? 'ALIAS DE IP' : 'IP ALIAS'}</label>
                  <input
                    type="text"
                    placeholder={isEs ? 'ej: play.midominio.com' : 'e.g. play.mydomain.com'}
                    value={newAllocAlias}
                    onChange={(e) => setNewAllocAlias(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px]">{isEs ? 'PUERTOS (RANGO O INDIVIDUAL)' : 'PORTS RANGE'}</label>
                  <input
                    type="text"
                    placeholder="ej: 25565 o 25565-25575"
                    value={newAllocPorts}
                    onChange={(e) => setNewAllocPorts(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-blue-400"
                  />
                  <p className="text-[10px] text-zinc-500">
                    {isEs ? 'Puedes ingresar un solo puerto o un rango con guión.' : 'You can enter a single port or range separated by a hyphen.'}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-md shadow-blue-600/20"
                >
                  {isEs ? 'Crear Asignaciones' : 'Create Allocations'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: SERVERS */}
        {nodeEditTab === 'servers' && (
          <div className="space-y-4">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              {isEs ? 'SERVIDORES HOSPEDADOS EN ESTE NODO' : 'SERVERS HOSTED ON THIS NODE'} ({servers.length})
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map((s) => (
                <div key={s.id} className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{s.name}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    RAM: {s.maxRamMb || 2048} MB • {isEs ? 'Puerto' : 'Port'}: {s.port || 25565}
                  </div>
                  <button
                    onClick={() => handleOpenServerEdit(s)}
                    className="w-full py-1.5 text-center rounded-lg bg-[#18181c] border border-[#27272a] text-xs text-blue-400 hover:text-white transition font-semibold"
                  >
                    {isEs ? 'Administrar Servidor' : 'Manage Server'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // MAIN VIEW SECTIONS
  // =========================================================================
  return (
    <div className="w-full space-y-5 pb-10">
      {/* SECTION 0: OVERVIEW (SLATE 1.1.1 SYSTEM OVERVIEW) */}
      {activeSection === 'overview' && <AdminOverview />}

      {/* SECTION 1: ACTIVIDAD */}
      {activeSection === 'activity' && (
        <div className="space-y-5">
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white tracking-wide">
                  Actividad Global del Panel
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Auditoría centralizada de inicios de sesión, registros, cambios de permisos y eventos de infraestructura.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {['all', 'security', 'users', 'servers', 'nodes'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActivityCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition capitalize ${
                    activityCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#18181c] text-zinc-400 hover:text-white border border-[#27272a]'
                  }`}
                >
                  {cat === 'all'
                    ? 'Todos'
                    : cat === 'security'
                    ? 'Seguridad & Logins'
                    : cat === 'users'
                    ? 'Usuarios & Roles'
                    : cat === 'servers'
                    ? 'Servidores'
                    : 'Nodos'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#111114] border border-[#1f1f23] rounded-xl text-xs text-zinc-300">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar en el registro de auditoría (por usuario, evento o IP)..."
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-zinc-100 placeholder-zinc-500 font-sans"
            />
          </div>

          {/* Logs Table */}
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl overflow-hidden divide-y divide-[#1c1c20] text-xs">
            {platformLogs
              .filter(
                (l) =>
                  (activityCategory === 'all' || l.category === activityCategory) &&
                  (!activitySearch ||
                    l.user.toLowerCase().includes(activitySearch.toLowerCase()) ||
                    l.description.toLowerCase().includes(activitySearch.toLowerCase()) ||
                    l.event.toLowerCase().includes(activitySearch.toLowerCase()))
              )
              .map((log) => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#141418] transition">
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase mt-0.5 ${
                        log.category === 'security'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : log.category === 'servers'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}
                    >
                      {log.event}
                    </span>
                    <div>
                      <div className="text-zinc-200 font-medium">{log.description}</div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        Por: <span className="text-zinc-400">{log.user}</span> • IP: {log.ip}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-500 shrink-0 self-end sm:self-auto">
                    {log.timestamp}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SECTION 2: SETTINGS */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5">
            <div className="flex items-center gap-2.5">
              <Settings className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                Configuración General del Panel
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Personaliza el nombre de la empresa, políticas globales de seguridad y variables SMTP de correo.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* General Settings Card */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                GENERAL & BRANDING
              </span>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Nombre de la Compañía / Panel</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Idioma Predeterminado para Nuevos Usuarios</label>
                <select
                  value={defaultLang}
                  onChange={(e) => setDefaultLang(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                >
                  <option value="es">Español (Latinoamérica)</option>
                  <option value="en">English (US)</option>
                </select>
              </div>

              <div className="pt-2 space-y-4 border-t border-[#1c1c20]">
                <DraggableToggle
                  checked={require2FA}
                  onChange={setRequire2FA}
                  color="blue"
                  label="Requerir 2FA Obligatorio"
                  description="Exige autenticación de dos factores (Google Authenticator) a todos los usuarios."
                />

                <DraggableToggle
                  checked={allowRegistration}
                  onChange={setAllowRegistration}
                  color="blue"
                  label="Registro Público de Usuarios"
                  description="Permite que cualquier visitante se registre de forma abierta sin invitación previa."
                />

                <DraggableToggle
                  checked={panelMaintenance}
                  onChange={setPanelMaintenance}
                  color="blue"
                  label="Modo Mantenimiento del Panel"
                  description="Bloquea el acceso al panel a todos los usuarios que no sean administradores."
                />
              </div>

              <button
                onClick={handleSaveGeneralSettings}
                className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
              >
                Guardar Ajustes Generales
              </button>
            </div>

            {/* SMTP Settings Card */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                CONFIGURACIÓN SMTP (CORREO ELECTRÓNICO)
              </span>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-zinc-400">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">SMTP Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Cifrado</label>
                  <select
                    value={smtpEncryption}
                    onChange={(e) => setSmtpEncryption(e.target.value as any)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="TLS">TLS</option>
                    <option value="SSL">SSL</option>
                    <option value="NONE">None</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-zinc-400">Usuario SMTP</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-400">Contraseña SMTP / Resend API Key</label>
                    <span className="text-[10px] text-zinc-500 font-mono">Ej: re_123456...</span>
                  </div>
                  <input
                    type="password"
                    placeholder="re_..."
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Nombre de Remitente</label>
                  <input
                    type="text"
                    value={smtpSenderName}
                    onChange={(e) => setSmtpSenderName(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Correo de Remitente</label>
                  <input
                    type="email"
                    value={smtpSenderEmail}
                    onChange={(e) => setSmtpSenderEmail(e.target.value)}
                    placeholder="onboarding@resend.dev o info@tudominio.com"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-xs text-zinc-100"
                  />
                </div>
              </div>

              {/* Resend Tip Card */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1 text-xs text-zinc-300">
                <div className="flex items-center gap-1.5 font-bold text-blue-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Integración oficial con Resend</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Para enviar mediante <strong>Resend</strong>: Host <code>smtp.resend.com</code>, Puerto <code>587</code> (TLS), Usuario <code>resend</code> y tu API Key (<code>re_...</code>). Si tu dominio no está verificado aún en Resend, usa <code>onboarding@resend.dev</code> como remitente de prueba.
                </p>
              </div>

              {/* Live Test Sender */}
              <div className="p-3.5 bg-[#0d0d10] border border-[#27272a] rounded-xl space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">Enviar Correo de Prueba en Vivo a:</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="email"
                    value={smtpTestRecipient}
                    onChange={(e) => setSmtpTestRecipient(e.target.value)}
                    placeholder="tu_correo_personal@ejemplo.com"
                    className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleSendTestEmail}
                    disabled={isSendingTestMail}
                    className="px-4 py-2 bg-[#18181c] border border-[#27272a] hover:bg-[#222227] text-blue-400 hover:text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isSendingTestMail ? 'Enviando...' : 'Enviar Prueba en Vivo'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveSmtpSettings}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-blue-600/20"
                >
                  Guardar Configuración SMTP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: USUARIOS */}
      {activeSection === 'users' && (
        <div className="space-y-5">
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white tracking-wide">
                  Gestión de Usuarios del Panel
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Crea cuentas, administra permisos de administrador, estado de 2FA y asignación de servidores.
              </p>
            </div>

            <button
              onClick={() => setIsCreateUserModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Usuario</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#111114] border border-[#1f1f23] rounded-xl text-xs text-zinc-300">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar usuarios por username, nombre o email..."
              value={usersSearch}
              onChange={(e) => setUsersSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-zinc-100 placeholder-zinc-500 font-sans"
            />
          </div>

          {/* Users Table */}
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl overflow-hidden divide-y divide-[#1c1c20] text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1f1f23] text-zinc-400 text-[11px] font-mono">
                  <th className="p-3.5">USUARIO</th>
                  <th className="p-3.5">EMAIL</th>
                  <th className="p-3.5">ROL / PERMISOS</th>
                  <th className="p-3.5">2FA</th>
                  <th className="p-3.5">SERVIDORES</th>
                  <th className="p-3.5 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181c]">
                {usersList
                  .filter(
                    (u) =>
                      !usersSearch ||
                      u.username.toLowerCase().includes(usersSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(usersSearch.toLowerCase())
                  )
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-[#141418] transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                            {u.username[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white">{u.username}</div>
                            <div className="text-[10px] text-zinc-500">
                              {u.firstName} {u.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-300">{u.email}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            u.isAdmin || u.role === 'SUPER_ADMIN'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {u.isAdmin ? 'ADMINISTRADOR' : 'CLIENTE'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            u.twoFactorEnabled
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-zinc-500 bg-zinc-800'
                          }`}
                        >
                          {u.twoFactorEnabled ? 'Activo' : 'Desactivado'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-300">{u.serversCount || 0}</td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleStartEditUser(u)}
                          className="px-2.5 py-1 rounded-lg bg-[#18181c] border border-[#27272a] text-zinc-300 hover:text-white transition font-semibold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteUser(u)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Create User In-App Modal */}
          {isCreateUserModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleCreateUser} className="w-full max-w-lg bg-[#111114] border border-[#27272a] rounded-2xl p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23]">
                  <h3 className="text-sm font-bold text-white">Crear Nuevo Usuario</h3>
                  <button type="button" onClick={() => setIsCreateUserModalOpen(false)} className="text-zinc-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2 space-y-1">
                    <label className="text-zinc-400">Username *</label>
                    <input
                      type="text"
                      required
                      value={newUserData.username}
                      onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">Primer Nombre</label>
                    <input
                      type="text"
                      value={newUserData.firstName}
                      onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">Apellidos</label>
                    <input
                      type="text"
                      value={newUserData.lastName}
                      onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-zinc-400">Email *</label>
                    <input
                      type="email"
                      required
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-zinc-400">Contraseña *</label>
                    <input
                      type="password"
                      required
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="col-span-2 pt-2">
                    <DraggableToggle
                      checked={newUserData.isAdmin}
                      onChange={(val) => setNewUserData({ ...newUserData, isAdmin: val })}
                      color="blue"
                      label="Permiso de Administrador del Panel"
                      description="Otorga acceso completo al panel de control / administración global."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f1f23]">
                  <button
                    type="button"
                    onClick={() => setIsCreateUserModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20"
                  >
                    Crear Cuenta
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit User In-App Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-xl bg-[#111114] border border-[#27272a] rounded-2xl p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23]">
                  <h3 className="text-sm font-bold text-white">Editar Usuario: {editingUser.username}</h3>
                  <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-zinc-400">Username</label>
                    <input
                      type="text"
                      value={editUserData.username}
                      onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">Email</label>
                    <input
                      type="email"
                      value={editUserData.email}
                      onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">Primer Nombre</label>
                    <input
                      type="text"
                      value={editUserData.firstName}
                      onChange={(e) => setEditUserData({ ...editUserData, firstName: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">Apellidos</label>
                    <input
                      type="text"
                      value={editUserData.lastName}
                      onChange={(e) => setEditUserData({ ...editUserData, lastName: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">Idioma</label>
                    <select
                      value={editUserData.language}
                      onChange={(e) => setEditUserData({ ...editUserData, language: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">Cambiar Contraseña (opcional)</label>
                    <input
                      type="password"
                      placeholder="Dejar vacío para no cambiar"
                      value={editUserData.password}
                      onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="col-span-2 pt-2 space-y-3">
                    <DraggableToggle
                      checked={editUserData.isAdmin}
                      onChange={(val) => setEditUserData({ ...editUserData, isAdmin: val })}
                      color="blue"
                      label="Permiso de Administrador del Panel"
                      description="Habilita las opciones del panel de administración global."
                    />

                    <DraggableToggle
                      checked={editUserData.twoFactorEnabled}
                      onChange={(val) => setEditUserData({ ...editUserData, twoFactorEnabled: val })}
                      color="emerald"
                      label="Autenticación 2FA Activada"
                      description="Puedes activar o forzar la deshabilitación del 2FA para el usuario."
                    />
                  </div>

                  {/* Servidores Asignados */}
                  <div className="col-span-2 pt-2 border-t border-[#1f1f23] space-y-2">
                    <span className="text-[11px] font-bold text-zinc-300">Servidores Asignados ({editUserData.assignedServerIds.length})</span>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {servers.map((s) => {
                        const isAssigned = editUserData.assignedServerIds.includes(s.id);
                        return (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-[#09090b] border border-[#1f1f23]">
                            <span className="font-mono text-zinc-200">{s.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isAssigned) {
                                  setEditUserData({
                                    ...editUserData,
                                    assignedServerIds: editUserData.assignedServerIds.filter((id) => id !== s.id),
                                  });
                                } else {
                                  setEditUserData({
                                    ...editUserData,
                                    assignedServerIds: [...editUserData.assignedServerIds, s.id],
                                  });
                                }
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isAssigned ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {isAssigned ? 'Quitar' : 'Asignar'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#1f1f23]">
                  <button
                    type="button"
                    onClick={() => handleSendPasswordResetToUser(editUserData.email, editUserData.username)}
                    className="px-3 py-1.5 bg-[#18181c] border border-[#27272a] hover:bg-[#222227] text-zinc-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Enviar Restablecer Contraseña</span>
                  </button>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEditUser}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
                    >
                      Guardar Usuario
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete User In-App Modal */}
          {confirmDeleteUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#111114] border border-[#27272a] rounded-2xl p-6 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                  <h3 className="text-sm font-bold text-white">Eliminar Usuario</h3>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  ¿Estás seguro de eliminar a <span className="font-bold text-white">"{confirmDeleteUser.username}"</span>? Se revocarán todas sus sesiones y permisos.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setConfirmDeleteUser(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500"
                  >
                    Eliminar Definitivamente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: SERVIDORES */}
      {activeSection === 'servers' &&
        (editingServer ? (
          renderServerEdit()
        ) : (
          <div className="space-y-5">
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <ServerIcon className="w-5 h-5 text-blue-400" />
                  <h2 className="text-base font-bold text-white tracking-wide">
                    {isEs ? 'Servidores del Sistema' : 'System Servers'} ({servers.length})
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {isEs
                    ? 'Visualiza, reconfigura o gestiona las instancias desplegadas en los nodos de PanelMaster.'
                    : 'Manage, reconfigure and monitor instances deployed across PanelMaster nodes.'}
                </p>
              </div>

              <button
                onClick={() => setIsCreateServerModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>{isEs ? 'Crear Servidor' : 'Create Server'}</span>
              </button>
            </div>

          {/* Search Box */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#111114] border border-[#1f1f23] rounded-xl text-xs text-zinc-300">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar servidores por nombre, plantilla o ID..."
              value={serversSearch}
              onChange={(e) => setServersSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-zinc-100 placeholder-zinc-500 font-sans"
            />
          </div>

          {/* Servers Table */}
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl overflow-hidden divide-y divide-[#1c1c20] text-xs">
            {servers.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <ServerIcon className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-zinc-400 font-semibold">No hay servidores registrados en el clúster.</p>
                <p className="text-xs text-zinc-600">Crea uno nuevo desde el Dashboard o mediante la API de despliegue.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#1f1f23] text-zinc-400 text-[11px] font-mono">
                    <th className="p-3.5">SERVIDOR</th>
                    <th className="p-3.5">DUEÑO</th>
                    <th className="p-3.5">NODO</th>
                    <th className="p-3.5">CONEXIÓN</th>
                    <th className="p-3.5">MEMORIA</th>
                    <th className="p-3.5">ESTADO</th>
                    <th className="p-3.5 text-right">GESTIÓN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18181c]">
                  {servers
                    .filter(
                      (s) =>
                        !serversSearch ||
                        s.name.toLowerCase().includes(serversSearch.toLowerCase()) ||
                        (s.template && s.template.toLowerCase().includes(serversSearch.toLowerCase()))
                    )
                    .map((srv) => (
                      <tr key={srv.id} className="hover:bg-[#141418] transition">
                        <td className="p-3.5">
                          <div className="font-bold text-white">{srv.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{srv.template || srv.type}</div>
                        </td>
                        <td className="p-3.5 text-zinc-300">
                          {srv.owner || 'Angel (angelriveradeveloper@gmail.com)'}
                        </td>
                        <td className="p-3.5 font-mono text-zinc-400">node-01</td>
                        <td className="p-3.5 font-mono text-zinc-300">
                          {srv.ip || '127.0.0.1'}:{srv.port || 25565}
                        </td>
                        <td className="p-3.5 font-mono text-zinc-300">{srv.maxRamMb || 2048} MB</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              srv.status === 'RUNNING'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : srv.status === 'SUSPENDED'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            {srv.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleOpenServerEdit(srv)}
                            className="px-3 py-1 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition font-semibold"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ))}

      {/* Admin Create Server Wizard Modal */}
      <CreateServiceModal
        isOpen={isCreateServerModalOpen}
        onClose={() => setIsCreateServerModalOpen(false)}
        onCreated={handleAdminCreatedServer}
        nodes={nodesList}
        users={usersList}
      />

      {/* SECTION 5: NODOS */}
      {activeSection === 'nodes' &&
        (editingNode ? (
          renderNodeEdit()
        ) : (
          <div className="space-y-5">
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white tracking-wide">
                  {isEs ? 'Nodos de Cómputo' : 'Compute Nodes'} ({nodesList.length})
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {isEs
                  ? 'Servidores físicos o VPS conectados que ejecutan el agente daemon y albergan los contenedores.'
                  : 'Physical servers or VPS running the daemon agent to host containers.'}
              </p>
            </div>

            <button
              onClick={() => setIsNewNodeModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>{isEs ? 'Registrar Nuevo Nodo' : 'Register New Node'}</span>
            </button>
          </div>

          {/* Nodes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {nodesList.map((node) => (
              <div
                key={node.id}
                className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4 hover:border-blue-500/40 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <h3 className="font-bold text-sm text-white tracking-wide">{node.name}</h3>
                      <span className="text-[10px] font-mono text-zinc-500">({node.location})</span>
                    </div>
                    <div className="text-xs font-mono text-blue-400 mt-1">{node.fqdn}</div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {node.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#18181c] text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-zinc-500">CPU CORES</div>
                    <div className="font-bold text-zinc-200">{node.cpuCores} {isEs ? 'núcleos' : 'cores'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">{isEs ? 'MEMORIA ASIGNADA' : 'ALLOCATED RAM'}</div>
                    <div className="font-bold text-zinc-200">
                      {servers.reduce((acc, s) => acc + (s.maxRamMb || 2048), 0)} / {node.totalMemoryMb} MB
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">{isEs ? 'PUERTOS ALLOC' : 'ALLOC PORTS'}</div>
                    <div className="font-bold text-blue-400">{node.allocations.length} {isEs ? 'puertos' : 'ports'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-zinc-500">Daemon SFTP: :{node.daemonSftpPort}</span>
                  <button
                    onClick={() => handleOpenNodeEdit(node)}
                    className="px-4 py-1.5 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition font-semibold text-xs"
                  >
                    {isEs ? 'Administrar Nodo' : 'Manage Node'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Register Node In-App Modal */}
          {isNewNodeModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!createNodeForm.name || !createNodeForm.fqdn) {
                    toast.error(isEs ? 'Completa los campos requeridos' : 'Fill required fields');
                    return;
                  }
                  const token = localStorage.getItem('nexus_token');
                  let generatedId = `node-${Date.now()}`;

                  try {
                    const res = await fetch('/api/v1/nodes/register', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({
                        name: createNodeForm.name.trim(),
                        fqdn: createNodeForm.fqdn.trim(),
                        location: createNodeForm.location,
                        regionCode: createNodeForm.location.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                        memoryTotalMb: createNodeForm.ramMb,
                        diskTotalMb: createNodeForm.diskMb,
                        cpuCores: 8,
                        agentPort: 8080,
                      }),
                    });
                    if (res.ok) {
                      const saved = await res.json();
                      if (saved && saved.id) generatedId = saved.id;
                    }
                  } catch (err) {
                    console.warn('Could not register node in backend:', err);
                  }

                  const newNode: NodeItem = {
                    id: generatedId,
                    name: createNodeForm.name.trim(),
                    description: 'Nodo registrado en el panel',
                    location: createNodeForm.location,
                    fqdn: createNodeForm.fqdn.trim(),
                    ssl: 'http',
                    allowAutoAllocation: true,
                    behindProxy: false,
                    maintenanceMode: false,
                    totalMemoryMb: createNodeForm.ramMb,
                    memoryOverallocatePercent: 0,
                    diskSpaceMb: createNodeForm.diskMb,
                    diskOverallocatePercent: 0,
                    maxUploadFilesizeMb: 100,
                    daemonPort: 8080,
                    daemonSftpPort: 2022,
                    daemonBasePath: '/var/lib/panelmaster/volumes',
                    cpuCores: 8,
                    cpuUsage: '1.2%',
                    status: 'ONLINE',
                    allocations: [
                      { id: `alloc-${generatedId}-1`, ip: createNodeForm.fqdn.trim(), port: 25565, alias: '', serverName: '' },
                      { id: `alloc-${generatedId}-2`, ip: createNodeForm.fqdn.trim(), port: 25566, alias: '', serverName: '' },
                    ],
                  };
                  const updatedNodes = [...nodesList, newNode];
                  setNodesList(updatedNodes);
                  localStorage.setItem('pm_nodes_cache', JSON.stringify(updatedNodes));
                  setIsNewNodeModalOpen(false);
                  toast.success(isEs ? `Nodo "${newNode.name}" creado exitosamente.` : `Node "${newNode.name}" created successfully.`);
                }}
                className="w-full max-w-md bg-[#111114] border border-[#27272a] rounded-2xl p-6 space-y-4 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23]">
                  <h3 className="text-sm font-bold text-white">{isEs ? 'Registrar Nuevo Nodo de Cómputo' : 'Register New Compute Node'}</h3>
                  <button type="button" onClick={() => setIsNewNodeModalOpen(false)} className="text-zinc-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-zinc-400">{isEs ? 'Nombre del Nodo *' : 'Node Name *'}</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: node-eu-02"
                      value={createNodeForm.name}
                      onChange={(e) => setCreateNodeForm({ ...createNodeForm, name: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">FQDN / IP Pública *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: 198.51.100.25 o node.midominio.com"
                      value={createNodeForm.fqdn}
                      onChange={(e) => setCreateNodeForm({ ...createNodeForm, fqdn: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 font-mono text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">{isEs ? 'Ubicación' : 'Location'}</label>
                    <input
                      type="text"
                      value={createNodeForm.location}
                      onChange={(e) => setCreateNodeForm({ ...createNodeForm, location: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-400">{isEs ? 'RAM Total (MiB)' : 'Total RAM (MiB)'}</label>
                      <input
                        type="number"
                        value={createNodeForm.ramMb}
                        onChange={(e) => setCreateNodeForm({ ...createNodeForm, ramMb: Number(e.target.value) })}
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">{isEs ? 'Disco Total (MiB)' : 'Total Disk (MiB)'}</label>
                      <input
                        type="number"
                        value={createNodeForm.diskMb}
                        onChange={(e) => setCreateNodeForm({ ...createNodeForm, diskMb: Number(e.target.value) })}
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f1f23]">
                  <button
                    type="button"
                    onClick={() => setIsNewNodeModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    {isEs ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
                  >
                    {isEs ? 'Registrar Nodo' : 'Register Node'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ))}

      {/* SECTION 6: EGGS */}
      {activeSection === 'eggs' && (
        <div className="space-y-5">
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white tracking-wide">
                  Plantillas y Eggs de Servicios
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Catálogo ordenado de definiciones de imágenes de contenedor, comandos de arranque y variables de entorno.
              </p>
            </div>

            {/* Eggs Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'minecraft', label: 'Minecraft' },
                { id: 'discord', label: 'Discord Bots' },
                { id: 'web', label: 'Web & APIs' },
                { id: 'databases', label: 'Databases' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setEggsCategory(c.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    eggsCategory === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#18181c] text-zinc-400 hover:text-white border border-[#27272a]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Eggs List */}
          <div className="space-y-4">
            {eggsCatalog
              .filter((e) => e.category === eggsCategory)
              .map((egg) => (
                <div key={egg.id} className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white">{egg.name}</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{egg.description}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                      OFICIAL
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[#18181c]">
                    <div className="text-[11px] font-mono text-zinc-400">Docker Image:</div>
                    <div className="p-2 rounded-lg bg-[#09090b] border border-[#1f1f23] font-mono text-xs text-emerald-400">
                      {egg.dockerImage}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-zinc-400">Startup Command:</div>
                    <div className="p-2 rounded-lg bg-[#09090b] border border-[#1f1f23] font-mono text-xs text-blue-400 truncate">
                      {egg.startup}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500 font-mono">Variables:</span>
                      {egg.variables.map((v: string) => (
                        <span key={v} className="px-1.5 py-0.5 rounded bg-[#18181c] text-[10px] font-mono text-zinc-400">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(egg, null, 2));
                        toast.success(`Definición JSON de ${egg.name} copiada al portapapeles.`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#18181c] border border-[#27272a] text-xs text-zinc-300 hover:text-white transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Exportar JSON</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SECTION 7: OAUTH AUTH PROVIDERS */}
      {activeSection === 'auth' && <AdminAuthProviders language={language} />}

      {/* SECTION 8: MAIL TEMPLATES */}
      {activeSection === 'mail-templates' && <AdminMailTemplates language={language} />}

      {/* SECTION 9: THEME EDITOR */}
      {activeSection === 'theme-editor' && <AdminThemeEditor language={language} />}
    </div>
  );
};
