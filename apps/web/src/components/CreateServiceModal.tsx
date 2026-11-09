import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Gamepad2,
  Bot,
  Database,
  Globe,
  Radio,
  Sliders,
  Cpu,
  HardDrive,
  Network,
  Terminal,
  Layers,
  CheckCircle2,
  ChevronRight,
  Shield,
  Info,
  Code,
  Flame,
} from 'lucide-react';
import { toast } from './Toast';
import { DraggableToggle } from './DraggableToggle';

interface CreateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newService: any) => void;
  nodes?: any[];
  users?: any[];
}

export interface EggDefinition {
  id: string;
  name: string;
  category: 'minecraft' | 'steam' | 'bots' | 'databases' | 'web';
  categoryLabel: string;
  desc: string;
  defaultPort: number;
  defaultRam: number;
  defaultDisk: number;
  defaultCpu: number;
  dockerImage: string;
  dockerImagesList: string[];
  startup: string;
  variables: { key: string; label: string; defaultValue: string; desc: string }[];
}

export const COMPREHENSIVE_EGGS: EggDefinition[] = [
  // --- MINECRAFT ---
  {
    id: 'mc-paper',
    name: 'Minecraft Java (Paper)',
    category: 'minecraft',
    categoryLabel: 'Minecraft',
    desc: 'PaperMC de alto rendimiento con optimizaciones de ticks, parches de exploits y compatibilidad total con Spigot/Bukkit plugins.',
    defaultPort: 25565,
    defaultRam: 4096,
    defaultDisk: 20480,
    defaultCpu: 200,
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
    dockerImagesList: [
      'ghcr.io/pterodactyl/yolks:java_21',
      'ghcr.io/pterodactyl/yolks:java_17',
      'ghcr.io/pterodactyl/yolks:java_11',
      'ghcr.io/pterodactyl/yolks:java_8',
    ],
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}} nogui',
    variables: [
      { key: 'SERVER_JARFILE', label: 'Archivo JAR Principal', defaultValue: 'paper.jar', desc: 'Nombre del archivo .jar de inicio' },
      { key: 'MINECRAFT_VERSION', label: 'Versión de Minecraft', defaultValue: 'latest', desc: '1.21.4, 1.20.4, 1.16.5 o latest' },
      { key: 'BUILD_NUMBER', label: 'Número de Build Paper', defaultValue: 'latest', desc: 'Versión compilada específica de PaperMC' },
    ],
  },
  {
    id: 'mc-purpur',
    name: 'Minecraft (Purpur Fork)',
    category: 'minecraft',
    categoryLabel: 'Minecraft',
    desc: 'Fork ultra-optimizado de Paper con opciones avanzadas de jugabilidad, ridable mobs e inmunidad a exploits de lag.',
    defaultPort: 25565,
    defaultRam: 4096,
    defaultDisk: 20480,
    defaultCpu: 200,
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
    dockerImagesList: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17'],
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui',
    variables: [
      { key: 'SERVER_JARFILE', label: 'Archivo JAR', defaultValue: 'purpur.jar', desc: 'Binario principal de Purpur' },
      { key: 'MINECRAFT_VERSION', label: 'Versión', defaultValue: 'latest', desc: 'Versión de Minecraft soportada' },
    ],
  },
  {
    id: 'mc-fabric',
    name: 'Minecraft (Fabric Modded)',
    category: 'minecraft',
    categoryLabel: 'Minecraft',
    desc: 'Cargador de mods ultraliviano y moderno con soporte para Sodium, Lithium, FerriteCore y mods Fabric de última generación.',
    defaultPort: 25565,
    defaultRam: 6144,
    defaultDisk: 25600,
    defaultCpu: 300,
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
    dockerImagesList: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17'],
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui',
    variables: [
      { key: 'SERVER_JARFILE', label: 'Jarfile Fabric', defaultValue: 'fabric-server-launch.jar', desc: 'Jar de inicio de Fabric Loader' },
      { key: 'FABRIC_VERSION', label: 'Versión Loader', defaultValue: 'latest', desc: 'Versión del cargador Fabric' },
    ],
  },
  {
    id: 'mc-forge',
    name: 'Minecraft (Forge / NeoForge)',
    category: 'minecraft',
    categoryLabel: 'Minecraft',
    desc: 'El cargador de mods más popular del mundo para modpacks pesados de CurseForge, FTB, Pixelmon y RLCraft.',
    defaultPort: 25565,
    defaultRam: 8192,
    defaultDisk: 30720,
    defaultCpu: 400,
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_17',
    dockerImagesList: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17', 'ghcr.io/pterodactyl/yolks:java_8'],
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui',
    variables: [
      { key: 'SERVER_JARFILE', label: 'Jarfile Forge', defaultValue: 'forge.jar', desc: 'Binario principal Forge' },
      { key: 'FORGE_VERSION', label: 'Versión Forge', defaultValue: 'latest', desc: 'Build de Forge compatible con mods' },
    ],
  },
  {
    id: 'mc-velocity',
    name: 'Velocity / BungeeCord Proxy',
    category: 'minecraft',
    categoryLabel: 'Minecraft',
    desc: 'Proxy de red moderno y rápido para interconectar múltiples servidores Minecraft en una sola red con balanceo de carga.',
    defaultPort: 25577,
    defaultRam: 1024,
    defaultDisk: 5120,
    defaultCpu: 100,
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
    dockerImagesList: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17'],
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
    variables: [
      { key: 'SERVER_JARFILE', label: 'Jarfile Proxy', defaultValue: 'velocity.jar', desc: 'Jar de Velocity o BungeeCord' },
    ],
  },
  {
    id: 'mc-bedrock',
    name: 'Minecraft Bedrock (BDS)',
    category: 'minecraft',
    categoryLabel: 'Minecraft',
    desc: 'Servidor dedicado oficial de Bedrock para usuarios de teléfonos móviles, tabletas, Xbox, PlayStation y Nintendo Switch.',
    defaultPort: 19132,
    defaultRam: 2048,
    defaultDisk: 10240,
    defaultCpu: 150,
    dockerImage: 'ghcr.io/parkervcp/yolks:bedrock',
    dockerImagesList: ['ghcr.io/parkervcp/yolks:bedrock'],
    startup: './bedrock_server',
    variables: [
      { key: 'BEDROCK_VERSION', label: 'Versión Bedrock', defaultValue: 'latest', desc: 'Versión del BDS oficial' },
    ],
  },

  // --- STEAM & SOURCE GAMES ---
  {
    id: 'steam-cs2',
    name: 'Counter-Strike 2 (CS2)',
    category: 'steam',
    categoryLabel: 'Steam Games',
    desc: 'Servidor dedicado oficial de Counter-Strike 2 con Source2 engine, soporte para Matchmaking privado, scrims y Metamod:Source.',
    defaultPort: 27015,
    defaultRam: 8192,
    defaultDisk: 40960,
    defaultCpu: 400,
    dockerImage: 'ghcr.io/parkervcp/steamcmd:latest',
    dockerImagesList: ['ghcr.io/parkervcp/steamcmd:latest'],
    startup: './game/bin/linuxsteamrt64/cs2 -dedicated +ip 0.0.0.0 -port {{SERVER_PORT}} +map de_dust2 +game_type 0 +game_mode 1',
    variables: [
      { key: 'SRCDS_TOKEN', label: 'Steam GSLT Token', defaultValue: '', desc: 'Token de servidor de Steam (GSLT)' },
      { key: 'MAP', label: 'Mapa Inicial', defaultValue: 'de_dust2', desc: 'de_dust2, de_mirage, de_inferno, de_nuke' },
    ],
  },
  {
    id: 'steam-rust',
    name: 'Rust Dedicated Server',
    category: 'steam',
    categoryLabel: 'Steam Games',
    desc: 'Servidor de supervivencia Rust con soporte completo para Oxide (uMod) o Carbon, wipes automáticos y mapas procedurales.',
    defaultPort: 28015,
    defaultRam: 10240,
    defaultDisk: 35840,
    defaultCpu: 400,
    dockerImage: 'ghcr.io/parkervcp/steamcmd:latest',
    dockerImagesList: ['ghcr.io/parkervcp/steamcmd:latest'],
    startup: './RustDedicated -batchmode +server.port {{SERVER_PORT}} +server.level "Procedural Map" +server.seed 12345 +server.worldsize 3500 +server.maxplayers 50 +server.hostname "{{SERVER_NAME}}"',
    variables: [
      { key: 'SERVER_SEED', label: 'Semilla de Mapa', defaultValue: '12345', desc: 'Semilla para generación procedural' },
      { key: 'WORLD_SIZE', label: 'Tamaño del Mapa', defaultValue: '3500', desc: 'Tamaño de mapa entre 1000 y 6000' },
      { key: 'OXIDE', label: 'Instalar Oxide/uMod', defaultValue: '1', desc: '1 para activar plugins, 0 para vanilla' },
    ],
  },
  {
    id: 'steam-palworld',
    name: 'Palworld Dedicated Server',
    category: 'steam',
    categoryLabel: 'Steam Games',
    desc: 'Servidor multijugador masivo de Palworld con soporte para clanes cooperativos, automatización de bases y optimización de RAM.',
    defaultPort: 8211,
    defaultRam: 12288,
    defaultDisk: 30720,
    defaultCpu: 400,
    dockerImage: 'ghcr.io/parkervcp/steamcmd:latest',
    dockerImagesList: ['ghcr.io/parkervcp/steamcmd:latest'],
    startup: './PalServer.sh -port={{SERVER_PORT}} -players=32 -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS',
    variables: [
      { key: 'SERVER_PASSWORD', label: 'Contraseña del Servidor', defaultValue: '', desc: 'Dejar vacío para servidor público' },
      { key: 'MAX_PLAYERS', label: 'Jugadores Máximos', defaultValue: '32', desc: 'Límite de jugadores simultáneos' },
    ],
  },
  {
    id: 'steam-terraria',
    name: 'Terraria (tModLoader / Vanilla)',
    category: 'steam',
    categoryLabel: 'Steam Games',
    desc: 'Servidor dedicado 2D de Terraria con soporte para mundos grandes y paquetes de expansión como Calamity Mod.',
    defaultPort: 7777,
    defaultRam: 4096,
    defaultDisk: 10240,
    defaultCpu: 200,
    dockerImage: 'ghcr.io/parkervcp/steamcmd:latest',
    dockerImagesList: ['ghcr.io/parkervcp/steamcmd:latest'],
    startup: './TerrariaServer.bin.x86_64 -config serverconfig.txt',
    variables: [
      { key: 'WORLD_NAME', label: 'Nombre del Mundo', defaultValue: 'World1', desc: 'Nombre del archivo .wld' },
      { key: 'DIFFICULTY', label: 'Dificultad', defaultValue: '1', desc: '0=Classic, 1=Expert, 2=Master' },
    ],
  },

  // --- VOICE & BOTS ---
  {
    id: 'bot-nodejs',
    name: 'Discord Bot (Node.js 20 LTS)',
    category: 'bots',
    categoryLabel: 'Bots & Apps',
    desc: 'Entorno de ejecución aislado con Node.js 20/22, npm, pnpm y yarn para bots Discord.js, Sapphire o integraciones REST API.',
    defaultPort: 3000,
    defaultRam: 1024,
    defaultDisk: 5120,
    defaultCpu: 100,
    dockerImage: 'ghcr.io/parkervcp/yolks:nodejs_20',
    dockerImagesList: ['ghcr.io/parkervcp/yolks:nodejs_20', 'ghcr.io/parkervcp/yolks:nodejs_22'],
    startup: 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -d node_modules ]]; then npm install; fi; npm start || node index.js',
    variables: [
      { key: 'MAIN_FILE', label: 'Archivo Principal', defaultValue: 'index.js', desc: 'index.js, bot.js, o dist/index.js' },
      { key: 'AUTO_UPDATE', label: 'Git Pull al Iniciar', defaultValue: '0', desc: '1 para actualizar repo automáticamente' },
    ],
  },
  {
    id: 'bot-python',
    name: 'Discord Bot (Python 3.11)',
    category: 'bots',
    categoryLabel: 'Bots & Apps',
    desc: 'Ambiente optimizado para discord.py, Pycord, Disnake y FastAPI con soporte automático para requirements.txt y virtualenv.',
    defaultPort: 8000,
    defaultRam: 1024,
    defaultDisk: 5120,
    defaultCpu: 100,
    dockerImage: 'ghcr.io/parkervcp/yolks:python_3.11',
    dockerImagesList: ['ghcr.io/parkervcp/yolks:python_3.11', 'ghcr.io/parkervcp/yolks:python_3.12'],
    startup: 'if [[ -f requirements.txt ]]; then pip install -r requirements.txt; fi; python3 {{MAIN_FILE}}',
    variables: [
      { key: 'MAIN_FILE', label: 'Archivo Principal', defaultValue: 'main.py', desc: 'main.py o bot.py' },
    ],
  },

  // --- DATABASES & WEB ---
  {
    id: 'db-postgres',
    name: 'PostgreSQL 16 Enterprise',
    category: 'databases',
    categoryLabel: 'Bases de Datos',
    desc: 'Motor de base de datos relacional potente con extensiones JSONB, PostGIS y almacenamiento en disco de alta velocidad.',
    defaultPort: 5432,
    defaultRam: 2048,
    defaultDisk: 15360,
    defaultCpu: 200,
    dockerImage: 'postgres:16-alpine',
    dockerImagesList: ['postgres:16-alpine', 'postgres:15-alpine'],
    startup: 'docker-entrypoint.sh postgres',
    variables: [
      { key: 'POSTGRES_DB', label: 'Nombre Base de Datos', defaultValue: 'appdb', desc: 'Base de datos creada por defecto' },
      { key: 'POSTGRES_USER', label: 'Usuario Administrador', defaultValue: 'dbuser', desc: 'Usuario principal' },
      { key: 'POSTGRES_PASSWORD', label: 'Contraseña de Acceso', defaultValue: 'dbpass123', desc: 'Contraseña para conexiones remotas' },
    ],
  },
  {
    id: 'db-mariadb',
    name: 'MariaDB / MySQL 8.0',
    category: 'databases',
    categoryLabel: 'Bases de Datos',
    desc: 'Servidor MySQL/MariaDB nativo ultrarrápido para plugins de Minecraft (LuckPerms, CoreProtect) y sistemas web.',
    defaultPort: 3306,
    defaultRam: 1024,
    defaultDisk: 10240,
    defaultCpu: 150,
    dockerImage: 'ghcr.io/parkervcp/yolks:mariadb_11',
    dockerImagesList: ['ghcr.io/parkervcp/yolks:mariadb_11'],
    startup: 'mysqld --user=mysql --console',
    variables: [
      { key: 'MYSQL_DATABASE', label: 'Base de Datos', defaultValue: 'minecraft', desc: 'Nombre del esquema inicial' },
      { key: 'MYSQL_USER', label: 'Usuario', defaultValue: 'paneluser', desc: 'Usuario con privilegios' },
      { key: 'MYSQL_PASSWORD', label: 'Contraseña', defaultValue: 'panelpass123', desc: 'Contraseña de conexión' },
    ],
  },
  {
    id: 'db-redis',
    name: 'Redis / Valkey Cache',
    category: 'databases',
    categoryLabel: 'Bases de Datos',
    desc: 'Almacén de datos en memoria ultrarrápido utilizado para caché de alta concurrencia, colas y pub/sub distribuido.',
    defaultPort: 6379,
    defaultRam: 512,
    defaultDisk: 5120,
    defaultCpu: 100,
    dockerImage: 'redis:7-alpine',
    dockerImagesList: ['redis:7-alpine'],
    startup: 'redis-server --protected-mode no --appendonly yes',
    variables: [],
  },
  {
    id: 'web-nginx',
    name: 'Nginx Web Server',
    category: 'web',
    categoryLabel: 'Servicios Web',
    desc: 'Servidor web ultraliviano para alojar páginas HTML, landing pages, interfaces React / Vue y proxies inversos.',
    defaultPort: 80,
    defaultRam: 512,
    defaultDisk: 5120,
    defaultCpu: 100,
    dockerImage: 'nginx:alpine',
    dockerImagesList: ['nginx:alpine'],
    startup: 'nginx -g "daemon off;"',
    variables: [],
  },
];

export const CreateServiceModal: React.FC<CreateServiceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  nodes = [],
  users = [],
}) => {
  // Navigation wizard tabs
  const [activeTab, setActiveTab] = useState<'identity' | 'egg' | 'resources' | 'network' | 'startup' | 'limits'>('egg');

  // Step 1: Identity & Ownership
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerEmail, setOwnerEmail] = useState(users[0]?.email || 'admin@panelmaster.dev');
  const [startOnCompletion, setStartOnCompletion] = useState(true);
  const [externalId, setExternalId] = useState('');

  // Step 2: Egg Selection
  const [eggCategory, setEggCategory] = useState<'all' | 'minecraft' | 'steam' | 'bots' | 'databases' | 'web'>('all');
  const [selectedEggId, setSelectedEggId] = useState('mc-paper');

  const selectedEgg = COMPREHENSIVE_EGGS.find((e) => e.id === selectedEggId) || COMPREHENSIVE_EGGS[0];

  // Step 3: Hardware Resources
  const [memoryMb, setMemoryMb] = useState(selectedEgg.defaultRam);
  const [swapMb, setSwapMb] = useState(0);
  const [cpuLimit, setCpuLimit] = useState(selectedEgg.defaultCpu);
  const [cpuPinning, setCpuPinning] = useState('');
  const [diskMb, setDiskMb] = useState(selectedEgg.defaultDisk);
  const [blockIoWeight, setBlockIoWeight] = useState(500);
  const [oomKiller, setOomKiller] = useState(true);

  // Step 4: Network & Allocations
  const [availableNodes, setAvailableNodes] = useState<any[]>(() => {
    if (nodes && nodes.length > 0) return nodes;
    const cached = localStorage.getItem('pm_nodes_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [{ id: 'node-01', name: 'node-01', fqdn: 'panel.zenforge.online', location: 'Local Node' }];
  });

  const [selectedNode, setSelectedNode] = useState(() => {
    return availableNodes[0]?.name || availableNodes[0]?.id || 'node-01';
  });

  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    fetch('/api/v1/nodes', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableNodes(data);
          setSelectedNode(data[0].name || data[0].id);
        }
      })
      .catch(() => {});
  }, []);
  const [primaryPort, setPrimaryPort] = useState(selectedEgg.defaultPort);
  const [allocationCount, setAllocationCount] = useState(1);

  // Step 5: Startup & Environment
  const [dockerImage, setDockerImage] = useState(selectedEgg.dockerImage);
  const [customStartup, setCustomStartup] = useState(selectedEgg.startup);
  const [eggVariables, setEggVariables] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    selectedEgg.variables.forEach((v) => {
      init[v.key] = v.defaultValue;
    });
    return init;
  });

  // Step 6: Feature Limits
  const [databaseLimit, setDatabaseLimit] = useState(2);
  const [allocationLimit, setAllocationLimit] = useState(3);
  const [backupLimit, setBackupLimit] = useState(5);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // When egg changes, sync defaults
  const handleSelectEgg = (egg: EggDefinition) => {
    setSelectedEggId(egg.id);
    setMemoryMb(egg.defaultRam);
    setDiskMb(egg.defaultDisk);
    setCpuLimit(egg.defaultCpu);
    setPrimaryPort(egg.defaultPort);
    setDockerImage(egg.dockerImage);
    setCustomStartup(egg.startup);

    const vars: Record<string, string> = {};
    egg.variables.forEach((v) => {
      vars[v.key] = v.defaultValue;
    });
    setEggVariables(vars);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setActiveTab('identity');
      toast.error('Por favor escribe un nombre para el servidor.');
      return;
    }

    setIsSubmitting(true);

    try {
      const serverId = `srv-${Date.now()}`;
      const newService = {
        id: serverId,
        name: name.trim(),
        description: description.trim() || 'Servidor administrado en PanelMaster',
        owner: ownerEmail.split('@')[0],
        ownerEmail: ownerEmail.trim(),
        template: selectedEgg.name,
        egg: selectedEgg.name,
        eggId: selectedEgg.id,
        category: selectedEgg.category,
        type:
          selectedEgg.category === 'minecraft' || selectedEgg.category === 'steam'
            ? 'GAME_SERVER'
            : selectedEgg.category === 'bots'
            ? 'DISCORD_BOT'
            : selectedEgg.category === 'web'
            ? 'WEB_STATIC'
            : 'DATABASE',
        status: startOnCompletion ? 'RUNNING' : 'STOPPED',
        node: selectedNode,
        ip: window.location.hostname || 'panel.zenforge.online',
        port: primaryPort,
        memoryMb: memoryMb,
        maxRamMb: memoryMb,
        ramMb: Math.round(memoryMb * 0.35),
        ram: `${((memoryMb * 0.35) / 1024).toFixed(1)} / ${(memoryMb / 1024).toFixed(0)} GB`,
        cpuUsage: 1.8,
        cpu: `${cpuLimit}%`,
        cpuLimit: cpuLimit,
        cpuPinning: cpuPinning,
        diskMb: diskMb,
        swapMb: swapMb,
        blockIoWeight: blockIoWeight,
        dockerImage: dockerImage,
        startup: customStartup,
        variables: eggVariables,
        limits: {
          databases: databaseLimit,
          allocations: allocationLimit,
          backups: backupLimit,
        },
        externalId: externalId.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      // Disparar plantilla oficial: server_installed si está marcado para inicio
      if (startOnCompletion) {
        fetch('/api/v1/mail/send-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateKey: 'server_installed',
            to: ownerEmail.trim(),
            variables: {
              user: ownerEmail.split('@')[0],
              server: name.trim(),
              ip: window.location.hostname || 'panel.zenforge.online',
              port: String(primaryPort),
              serverUrl: `http://localhost:5173/server/${serverId}/console`,
            },
          }),
        }).catch(() => {});
      }

      // Registrar servidor en backend / base de datos
      try {
        const token = localStorage.getItem('nexus_token');
        await fetch('/api/v1/services', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            id: serverId,
            name: name.trim(),
            egg: selectedEgg.name,
            dockerImage: dockerImage,
            memoryMb: memoryMb,
            cpuCores: cpuLimit / 100,
            diskMb: diskMb,
            port: primaryPort,
            environment: eggVariables,
            startOnCompletion: startOnCompletion,
          }),
        });
      } catch (backendErr) {
        console.warn('Backend server registration notice:', backendErr);
      }

      onCreated(newService);
      toast.success(`Servidor "${newService.name}" aprovisionado y listo para usar.`);
      onClose();
    } catch (err: any) {
      toast.error('Error al desplegar el servidor en el clúster.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEggs =
    eggCategory === 'all'
      ? COMPREHENSIVE_EGGS
      : COMPREHENSIVE_EGGS.filter((e) => e.category === eggCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md font-sans select-none">
      <div className="w-full max-w-4xl bg-[#111114] border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f23] bg-[#0c0c0e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Crear Nuevo Servidor / Despliegue de Workload
              </h2>
              <p className="text-[11px] text-zinc-400">
                Configura los recursos, red, egg e imágenes de inicio con los estándares completos de PanelMaster.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Navigation Tabs */}
        <div className="flex items-center border-b border-[#1f1f23] bg-[#0e0e11] px-6 text-xs font-semibold overflow-x-auto no-scrollbar gap-1">
          {[
            { id: 'egg', label: '1. Egg & Workload', icon: Layers },
            { id: 'identity', label: '2. Identidad & Dueño', icon: Shield },
            { id: 'resources', label: '3. Hardware & RAM', icon: Sliders },
            { id: 'network', label: '4. Red & Puertos', icon: Network },
            { id: 'startup', label: '5. Comando & Docker', icon: Terminal },
            { id: 'limits', label: '6. Límites de Panel', icon: HardDrive },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: EGG SELECTION */}
          {activeTab === 'egg' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono">
                  CATÁLOGO OFICIAL DE EGGS & PLANTILLAS
                </span>
                {/* Category filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'minecraft', label: 'Minecraft' },
                    { id: 'steam', label: 'Steam Games' },
                    { id: 'bots', label: 'Bots & Apps' },
                    { id: 'databases', label: 'Bases de Datos' },
                    { id: 'web', label: 'Web' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEggCategory(c.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        eggCategory === c.id
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-[#18181c] border border-[#27272a] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Egg Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredEggs.map((egg) => {
                  const isSelected = selectedEggId === egg.id;
                  return (
                    <div
                      key={egg.id}
                      onClick={() => handleSelectEgg(egg)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10'
                          : 'bg-[#09090b] border-[#27272a] hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              egg.category === 'minecraft'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : egg.category === 'steam'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : egg.category === 'bots'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {egg.categoryLabel}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            Port {egg.defaultPort}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                          {egg.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                          {egg.desc}
                        </p>
                      </div>

                      <div className="pt-2 mt-2 border-t border-[#1f1f23] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span>RAM Def: {(egg.defaultRam / 1024).toFixed(0)} GB</span>
                        <span>Disk: {(egg.defaultDisk / 1024).toFixed(0)} GB</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs text-zinc-300">
                <span>
                  Egg Seleccionado: <strong className="text-blue-400">{selectedEgg.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('identity')}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1"
                >
                  Continuar
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IDENTITY & OWNER */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                IDENTIFICACIÓN DEL SERVIDOR & DUEÑO
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-zinc-400 font-semibold">Nombre del Servidor *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ej. Survival 1.21.4 Temporada 2 / CS2 Scrim Server"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-zinc-400 font-semibold">Descripción del Servidor</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Notas o descripción visible en la lista de servidores..."
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Propietario del Servidor *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="admin@panelmaster.dev"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-zinc-500">
                    El usuario recibirá el correo de notificación y tendrá propiedad completa del servidor.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Identificador Externo (Opcional)</label>
                  <input
                    type="text"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    placeholder="ext-whmcs-1094"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-zinc-500">
                    Útil para vinculación con facturación (WHMCS, Blesta o API externa).
                  </span>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-[#1f1f23]">
                  <DraggableToggle
                    checked={startOnCompletion}
                    onChange={setStartOnCompletion}
                    color="blue"
                    label="Iniciar Servidor tras la Instalación"
                    description="Arranca el contenedor Docker automáticamente una vez descargado y preparado."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HARDWARE RESOURCES */}
          {activeTab === 'resources' && (
            <div className="space-y-5">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                ASIGNACIÓN DE RECURSOS DE HARDWARE
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* RAM */}
                <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">Límite de Memoria RAM</span>
                    <span className="font-mono text-blue-400 font-bold text-sm">
                      {memoryMb} MB ({(memoryMb / 1024).toFixed(1)} GB)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="32768"
                    step="512"
                    value={memoryMb}
                    onChange={(e) => setMemoryMb(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  {/* Presets */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1024, 2048, 4096, 6144, 8192, 16384].map((ram) => (
                      <button
                        key={ram}
                        type="button"
                        onClick={() => setMemoryMb(ram)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                          memoryMb === ram
                            ? 'bg-blue-600 border-blue-500 text-white font-bold'
                            : 'bg-[#18181c] border-[#27272a] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {ram / 1024}G
                      </button>
                    ))}
                  </div>
                </div>

                {/* CPU */}
                <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">Límite de CPU (%)</span>
                    <span className="font-mono text-blue-400 font-bold text-sm">
                      {cpuLimit === 0 ? 'Ilimitado' : `${cpuLimit}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="800"
                    step="50"
                    value={cpuLimit}
                    onChange={(e) => setCpuLimit(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 pt-1">
                    {[100, 200, 300, 400, 600, 800].map((cpu) => (
                      <button
                        key={cpu}
                        type="button"
                        onClick={() => setCpuLimit(cpu)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                          cpuLimit === cpu
                            ? 'bg-blue-600 border-blue-500 text-white font-bold'
                            : 'bg-[#18181c] border-[#27272a] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {cpu}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* DISK */}
                <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">Espacio en Disco</span>
                    <span className="font-mono text-blue-400 font-bold text-sm">
                      {diskMb} MB ({(diskMb / 1024).toFixed(0)} GB)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2048"
                    max="102400"
                    step="2048"
                    value={diskMb}
                    onChange={(e) => setDiskMb(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 pt-1">
                    {[5120, 10240, 20480, 40960, 81920].map((disk) => (
                      <button
                        key={disk}
                        type="button"
                        onClick={() => setDiskMb(disk)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                          diskMb === disk
                            ? 'bg-blue-600 border-blue-500 text-white font-bold'
                            : 'bg-[#18181c] border-[#27272a] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {disk / 1024}G
                      </button>
                    ))}
                  </div>
                </div>

                {/* SWAP & PINNING */}
                <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">Memoria SWAP</span>
                    <span className="font-mono text-zinc-300">{swapMb} MB</span>
                  </div>
                  <input
                    type="number"
                    value={swapMb}
                    onChange={(e) => setSwapMb(Number(e.target.value))}
                    className="w-full bg-[#111114] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono"
                  />
                  <div className="pt-2">
                    <label className="text-zinc-400 font-semibold block mb-1">CPU Pinning (Opcional)</label>
                    <input
                      type="text"
                      value={cpuPinning}
                      onChange={(e) => setCpuPinning(e.target.value)}
                      placeholder="ej. 0,1 o 2-4"
                      className="w-full bg-[#111114] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-[#1f1f23]">
                  <DraggableToggle
                    checked={oomKiller}
                    onChange={setOomKiller}
                    color="blue"
                    label="Habilitar OOM Killer"
                    description="Permite que el kernel termine procesos huérfanos que excedan el límite de memoria asignado."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NETWORK & NODES */}
          {activeTab === 'network' && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                ASIGNACIÓN DE NODO & PUERTOS DE RED
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Nodo de Despliegue *</label>
                  <select
                    value={selectedNode}
                    onChange={(e) => setSelectedNode(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  >
                    {availableNodes.map((n: any) => (
                      <option key={n.id || n.name} value={n.name || n.id}>
                        {n.name} ({n.fqdn || '127.0.0.1'} - {n.region?.name || n.location || 'Online'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Puerto Primario (Default Allocation) *</label>
                  <input
                    type="number"
                    required
                    value={primaryPort}
                    onChange={(e) => setPrimaryPort(Number(e.target.value))}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-zinc-500">
                    Puerto público donde los jugadores o clientes se conectarán.
                  </span>
                </div>

                <div className="sm:col-span-2 p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-zinc-400 space-y-1">
                  <div className="font-semibold text-zinc-200">Asignaciones adicionales</div>
                  <p className="text-[11px] leading-relaxed">
                    Se asignará automáticamente el puerto primario <strong>{primaryPort}</strong> al contenedor. Las asignaciones adicionales (para plugins de mapas como Dynmap, BlueMap, Votifier o bases de datos) se pueden reservar en la pestaña Red del servidor.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STARTUP & DOCKER IMAGE */}
          {activeTab === 'startup' && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                CONFIGURACIÓN DE INICIO & IMAGEN DOCKER
              </span>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Imagen Docker del Contenedor</label>
                  <select
                    value={dockerImage}
                    onChange={(e) => setDockerImage(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  >
                    {selectedEgg.dockerImagesList.map((img) => (
                      <option key={img} value={img}>
                        {img}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Comando de Inicio (Startup Command)</label>
                  <textarea
                    rows={3}
                    value={customStartup}
                    onChange={(e) => setCustomStartup(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Egg Specific Variables */}
                {selectedEgg.variables.length > 0 && (
                  <div className="pt-2 border-t border-[#1f1f23] space-y-3">
                    <span className="text-[11px] font-bold text-zinc-300 uppercase font-mono block">
                      Variables de Entorno del Egg
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedEgg.variables.map((v) => (
                        <div key={v.key} className="space-y-1">
                          <label className="text-zinc-400 font-semibold">{v.label}</label>
                          <input
                            type="text"
                            value={eggVariables[v.key] ?? v.defaultValue}
                            onChange={(e) =>
                              setEggVariables({
                                ...eggVariables,
                                [v.key]: e.target.value,
                              })
                            }
                            className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                          />
                          <span className="text-[10px] text-zinc-500">{v.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: LIMITS */}
          {activeTab === 'limits' && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
                LÍMITES DE FUNCIONES DEL SERVIDOR
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl space-y-2">
                  <label className="text-zinc-400 font-semibold block">Límite de Bases de Datos</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={databaseLimit}
                    onChange={(e) => setDatabaseLimit(Number(e.target.value))}
                    className="w-full bg-[#111114] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                  />
                  <span className="text-[10px] text-zinc-500">
                    Bases de datos MySQL que el cliente puede crear.
                  </span>
                </div>

                <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl space-y-2">
                  <label className="text-zinc-400 font-semibold block">Límite de Puertos (Allocations)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={allocationLimit}
                    onChange={(e) => setAllocationLimit(Number(e.target.value))}
                    className="w-full bg-[#111114] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                  />
                  <span className="text-[10px] text-zinc-500">
                    Puertos adicionales reservables para el servidor.
                  </span>
                </div>

                <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl space-y-2">
                  <label className="text-zinc-400 font-semibold block">Límite de Copias de Seguridad</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={backupLimit}
                    onChange={(e) => setBackupLimit(Number(e.target.value))}
                    className="w-full bg-[#111114] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                  />
                  <span className="text-[10px] text-zinc-500">
                    Backups simultáneos permitidos en el almacenamiento.
                  </span>
                </div>
              </div>

              {/* Summary overview card */}
              <div className="p-4 bg-[#0c0c0e] border border-[#27272a] rounded-xl space-y-2 text-zinc-300">
                <span className="text-xs font-bold text-white block">Resumen de Despliegue</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-zinc-400">
                  <div>Servidor: <strong className="text-zinc-200">{name || 'Sin nombre'}</strong></div>
                  <div>Egg: <strong className="text-zinc-200">{selectedEgg.name}</strong></div>
                  <div>RAM: <strong className="text-blue-400">{memoryMb} MB</strong></div>
                  <div>Puerto: <strong className="text-blue-400">{primaryPort}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#1f1f23]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'limits' ? (
                <button
                  type="button"
                  onClick={() => {
                    const order: any[] = ['egg', 'identity', 'resources', 'network', 'startup', 'limits'];
                    const nextIdx = order.indexOf(activeTab) + 1;
                    if (nextIdx < order.length) setActiveTab(order[nextIdx]);
                  }}
                  className="px-4 py-2 bg-[#18181c] border border-[#27272a] hover:bg-[#222227] text-zinc-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <span>Siguiente Paso</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Aprovisionando...' : 'Crear & Desplegar Servidor'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
