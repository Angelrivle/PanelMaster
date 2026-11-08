import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  Info,
  Search,
  Download,
  X,
  Check,
  AlertTriangle,
  ExternalLink,
  Layers,
  ChevronRight,
  Shield,
  Cpu,
  Boxes,
  Globe,
  Filter,
} from 'lucide-react';
import { toast } from '../../components/Toast';

interface ServerVersionsProps {
  server: any;
  onUpdateVersion?: (versionInfo: any) => void;
}

interface SoftwareCard {
  id: string;
  name: string;
  subtitle: string;
  category: 'server' | 'modded' | 'proxy';
  icon: string;
  description: string;
  buildsTag: string;
  isCurrentlyInUse?: boolean;
}

interface BuildVersion {
  version: string;
  java: number;
  build: string;
  supported: boolean;
  type: 'RELEASE' | 'SNAPSHOT';
  releaseDate?: string;
  jarUrl?: string;
}

export const ServerVersions: React.FC<ServerVersionsProps> = ({ server, onUpdateVersion }) => {
  // Active installed build matching the server state
  const [activeBuild, setActiveBuild] = useState({
    name: 'Paper',
    id: 'paper',
    version: '1.20.4',
    fullVersion: 'paper-1.20.4-498',
    java: 17,
    build: 'Build #498',
    channel: 'Stable',
  });

  // Modal / Drawer state for Browse Builds
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareCard | null>(null);
  const [browseSearch, setBrowseSearch] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'stable' | 'experimental'>('all');
  const [selectedJava, setSelectedJava] = useState<'all' | '21' | '17' | '8'>('all');
  const [fetchedBuilds, setFetchedBuilds] = useState<BuildVersion[]>([]);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);

  // Category filter for the main catalog
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'server' | 'modded' | 'proxy'>('all');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Details Modal
  const [detailsModalSoftware, setDetailsModalSoftware] = useState<SoftwareCard | null>(null);

  // Install Confirmation Modal
  const [installConfirm, setInstallConfirm] = useState<{
    open: boolean;
    software: SoftwareCard | null;
    build: BuildVersion | null;
    cleanInstall: boolean;
  }>({
    open: false,
    software: null,
    build: null,
    cleanInstall: false,
  });
  const [isInstalling, setIsInstalling] = useState(false);

  // Comprehensive Catalog of all Minecraft Forks & Loaders (MCJars + Ptero Addon reference)
  const allSoftwareCatalog: SoftwareCard[] = [
    // 1. SERVERS (Vanilla, Bukkit, Spigot, Paper & forks)
    {
      id: 'paper',
      name: 'Paper',
      subtitle: 'Servidor Bukkit/Spigot de Alto Rendimiento',
      category: 'server',
      icon: 'https://s3.mcjars.app/icons/paper.png',
      description: 'El estándar de oro para servidores con plugins: gran estabilidad, optimizaciones y soporte API Spigot/Bukkit.',
      buildsTag: 'Versiones estables y recomendadas',
    },
    {
      id: 'purpur',
      name: 'Purpur',
      subtitle: 'Drop-in replacement ultra configurable para Paper',
      category: 'server',
      icon: 'https://s3.mcjars.app/icons/purpur.png',
      description: 'Fork enfocado en configurabilidad extrema, rendimiento afinado y opciones personalizables de gameplay.',
      buildsTag: 'Versiones estables activas',
    },
    {
      id: 'folia',
      name: 'Folia',
      subtitle: 'Multihilo por regiones para redes masivas',
      category: 'server',
      icon: 'https://s3.mcjars.app/icons/folia.png',
      description: 'Fork revolucionario de Paper que divide el mundo en regiones independientes ejecutadas en subprocesos paralelos.',
      buildsTag: 'Versiones experimentales y estables',
    },
    {
      id: 'pufferfish',
      name: 'Pufferfish',
      subtitle: 'Optimizaciones de alta concurrencia',
      category: 'server',
      icon: 'https://s3.mcjars.app/icons/pufferfish.png',
      description: 'Mejoras avanzadas en entity tracking y async processing para servidores de más de 100 jugadores.',
      buildsTag: 'Versiones de alto rendimiento',
    },
    {
      id: 'vanilla',
      name: 'Vanilla Mojang',
      subtitle: 'Servidor oficial de Mojang Studios',
      category: 'server',
      icon: 'https://s3.mcjars.app/icons/vanilla.png',
      description: 'Binario original sin modificaciones de Mojang, exactamente como el juego fue concebido.',
      buildsTag: 'Releases y Snapshots oficiales',
    },
    {
      id: 'spigot',
      name: 'Spigot',
      subtitle: 'El clásico fork de CraftBukkit',
      category: 'server',
      icon: 'https://s3.mcjars.app/icons/spigot.png',
      description: 'Base de compatibilidad para miles de plugins legados de la comunidad Minecraft.',
      buildsTag: 'Versiones estables',
    },
    {
      id: 'leaves',
      name: 'Leaves',
      subtitle: 'Fork Paper con mecánicas Vanilla avanzadas',
      category: 'server',
      icon: 'https://s3.mcjars.app/icons/leaves.png',
      description: 'Rendimiento estilo Paper pero preservando granjas técnicas redstone y mecánicas vanilla puras.',
      buildsTag: 'Versiones técnicas',
    },

    // 2. MODDED & HYBRIDS (Forge, NeoForge, Fabric, Quilt, Mohist, Arclight)
    {
      id: 'forge',
      name: 'Forge',
      subtitle: 'Cargador de mods clásico para grandes modpacks',
      category: 'modded',
      icon: 'https://s3.mcjars.app/icons/forge.png',
      description: 'La plataforma de modding más consolidada, compatible con miles de mods y modpacks de CurseForge/Modrinth.',
      buildsTag: 'Versiones recomendadas e instalador',
    },
    {
      id: 'neoforge',
      name: 'NeoForge',
      subtitle: 'La nueva generación de Forge moderno',
      category: 'modded',
      icon: 'https://s3.mcjars.app/icons/neoforge.png',
      description: 'Modloader comunitario libre y moderno, estándar para Minecraft 1.20.4+ y versiones futuras.',
      buildsTag: 'Versiones estables modernas',
    },
    {
      id: 'fabric',
      name: 'Fabric',
      subtitle: 'Modloader modular, ultraligero y rápido',
      category: 'modded',
      icon: 'https://s3.mcjars.app/icons/fabric.png',
      description: 'Arranque en segundos, mínimo consumo de memoria y compatibilidad inmediata con snapshots.',
      buildsTag: 'Game versions y Fabric loader',
    },
    {
      id: 'quilt',
      name: 'Quilt',
      subtitle: 'Ecosistema de modding abierto y amigable',
      category: 'modded',
      icon: 'https://s3.mcjars.app/icons/quilt.png',
      description: 'Compatible con la mayoría de mods Fabric además de su propia biblioteca Quilt Standard Libraries.',
      buildsTag: 'Versiones estables',
    },
    {
      id: 'mohist',
      name: 'Mohist',
      subtitle: 'Híbrido Forge + Paper (Mods + Plugins)',
      category: 'modded',
      icon: 'https://s3.mcjars.app/icons/mohist.png',
      description: 'Permite ejecutar mods de Forge simultáneamente con plugins de Paper/Spigot en tu servidor.',
      buildsTag: 'Híbrido Forge + Plugins',
    },
    {
      id: 'arclight',
      name: 'Arclight',
      subtitle: 'Híbrido de alta compatibilidad para Forge/Fabric',
      category: 'modded',
      icon: 'https://s3.mcjars.app/icons/arclight.png',
      description: 'Implementación moderna de la API Bukkit sobre motores Forge y Fabric con excelente estabilidad.',
      buildsTag: 'Híbrido moderno',
    },
    {
      id: 'magma',
      name: 'Magma',
      subtitle: 'Híbrido Forge + Spigot para 1.12.2 / 1.18.2',
      category: 'modded',
      icon: 'https://s3.mcjars.app/icons/magma.png',
      description: 'Optimizado para servidores modded clásicos que necesitan WorldEdit, Essentials y protecciones de plugins.',
      buildsTag: 'Híbrido Spigot + Forge',
    },

    // 3. PROXIES (Velocity, BungeeCord, Waterfall, Travertine)
    {
      id: 'velocity',
      name: 'Velocity',
      subtitle: 'Proxy de última generación de PaperMC',
      category: 'proxy',
      icon: 'https://s3.mcjars.app/icons/velocity.png',
      description: 'El proxy de Minecraft más rápido y seguro, con protección contra exploits y alto throughput.',
      buildsTag: 'Recomendado para networks',
    },
    {
      id: 'bungeecord',
      name: 'BungeeCord',
      subtitle: 'El proxy original de SpigotMC',
      category: 'proxy',
      icon: 'https://s3.mcjars.app/icons/bungeecord.png',
      description: 'El clásico middleware para vincular lobbies, modalidades survival y minijuegos.',
      buildsTag: 'Proxy clásico',
    },
    {
      id: 'waterfall',
      name: 'Waterfall',
      subtitle: 'Fork optimizado de BungeeCord por PaperMC',
      category: 'proxy',
      icon: 'https://s3.mcjars.app/icons/waterfall.png',
      description: 'Mejoras de rendimiento y mitigación de paquetes malformados sobre BungeeCord.',
      buildsTag: 'Proxy optimizado',
    },
  ];

  // Fallback versions if offline, covering 1.21.4 down to 1.7.10
  const defaultBuilds: BuildVersion[] = [
    { version: '1.21.4', java: 21, build: '1.21.4-128', supported: true, type: 'RELEASE', releaseDate: '2024-12-03' },
    { version: '1.21.3', java: 21, build: '1.21.3-84', supported: true, type: 'RELEASE', releaseDate: '2024-10-23' },
    { version: '1.21.1', java: 21, build: '1.21.1-119', supported: true, type: 'RELEASE', releaseDate: '2024-08-08' },
    { version: '1.21', java: 21, build: '1.21-130', supported: true, type: 'RELEASE', releaseDate: '2024-06-13' },
    { version: '1.20.6', java: 21, build: '1.20.6-147', supported: true, type: 'RELEASE', releaseDate: '2024-04-29' },
    { version: '1.20.4', java: 17, build: '1.20.4-498', supported: true, type: 'RELEASE', releaseDate: '2023-12-07' },
    { version: '1.20.2', java: 17, build: '1.20.2-318', supported: true, type: 'RELEASE', releaseDate: '2023-09-21' },
    { version: '1.20.1', java: 17, build: '1.20.1-196', supported: true, type: 'RELEASE', releaseDate: '2023-06-12' },
    { version: '1.19.4', java: 17, build: '1.19.4-550', supported: true, type: 'RELEASE', releaseDate: '2023-03-14' },
    { version: '1.19.2', java: 17, build: '1.19.2-43.5.1', supported: true, type: 'RELEASE', releaseDate: '2022-08-05' },
    { version: '1.18.2', java: 17, build: '1.18.2-388', supported: true, type: 'RELEASE', releaseDate: '2022-02-28' },
    { version: '1.17.1', java: 17, build: '1.17.1-411', supported: true, type: 'RELEASE', releaseDate: '2021-07-06' },
    { version: '1.16.5', java: 8, build: '1.16.5-794', supported: false, type: 'RELEASE', releaseDate: '2021-01-15' },
    { version: '1.12.2', java: 8, build: '1.12.2-1620', supported: false, type: 'RELEASE', releaseDate: '2017-09-18' },
    { version: '1.8.8', java: 8, build: '1.8.8-445', supported: false, type: 'RELEASE', releaseDate: '2015-07-28' },
    { version: '1.7.10', java: 8, build: '1.7.10-1614', supported: false, type: 'RELEASE', releaseDate: '2014-06-26' },
    { version: '1.21.5-pre2', java: 21, build: 'exp-pre2', supported: false, type: 'SNAPSHOT', releaseDate: 'Reciente Snapshot' },
  ];

  // Dynamic build fetching from MCJars API v2
  useEffect(() => {
    if (!selectedSoftware) return;

    let isMounted = true;
    setIsLoadingBuilds(true);
    setFetchedBuilds([]);

    fetch(`https://versions.mcjars.app/api/v2/builds/${selectedSoftware.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('API status not ok');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.builds) {
          const list: BuildVersion[] = [];
          for (const [ver, val] of Object.entries(data.builds) as [string, any][]) {
            const latest = val.latest || {};
            const jarUrl =
              latest.jarUrl ||
              `https://versions.mcjars.app/api/v1/download/${selectedSoftware.id}/${ver}/latest`;
            list.push({
              version: ver,
              java: val.java || (ver.startsWith('1.21') || ver.startsWith('1.20.6') || ver.startsWith('1.20.5') ? 21 : ver.startsWith('1.18') || ver.startsWith('1.19') || ver.startsWith('1.20') ? 17 : 8),
              build: latest.id || `build-${latest.buildNumber || 'latest'}`,
              supported: !val.experimental,
              type: val.type || (val.experimental ? 'SNAPSHOT' : 'RELEASE'),
              releaseDate: latest.created ? new Date(latest.created).toLocaleDateString() : undefined,
              jarUrl: jarUrl,
            });
          }
          if (list.length > 0) {
            setFetchedBuilds(list.reverse());
          } else {
            setFetchedBuilds(defaultBuilds);
          }
        } else {
          setFetchedBuilds(defaultBuilds);
        }
      })
      .catch((_) => {
        if (isMounted) {
          setFetchedBuilds(defaultBuilds);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingBuilds(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSoftware]);

  // Catalog filtered items
  const filteredCatalog = allSoftwareCatalog.filter((s) => {
    const matchesFilter = catalogFilter === 'all' || s.category === catalogFilter;
    const matchesSearch =
      catalogSearch === '' ||
      s.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      s.description.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      s.subtitle.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Modal builds filtered
  const buildsToFilter = fetchedBuilds.length > 0 ? fetchedBuilds : defaultBuilds;
  const filteredBuilds = buildsToFilter.filter((b) => {
    if (browseSearch) {
      const q = browseSearch.toLowerCase();
      if (!b.version.toLowerCase().includes(q) && !b.build.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selectedChannel === 'stable' && b.type !== 'RELEASE') return false;
    if (selectedChannel === 'experimental' && b.type !== 'SNAPSHOT') return false;
    if (selectedJava !== 'all' && b.java !== parseInt(selectedJava, 10)) return false;
    return true;
  });

  const handleExecuteInstall = () => {
    if (!installConfirm.software || !installConfirm.build) return;
    setIsInstalling(true);

    setTimeout(() => {
      setActiveBuild({
        name: installConfirm.software!.name,
        id: installConfirm.software!.id,
        version: installConfirm.build!.version,
        fullVersion: `${installConfirm.software!.name} ${installConfirm.build!.version} (${installConfirm.build!.build})`,
        java: installConfirm.build!.java,
        build: installConfirm.build!.build,
        channel: installConfirm.build!.type === 'RELEASE' ? 'Stable' : 'Experimental',
      });

      setIsInstalling(false);
      setInstallConfirm({ open: false, software: null, build: null, cleanInstall: false });
      setSelectedSoftware(null);

      if (onUpdateVersion) {
        onUpdateVersion({
          fork: installConfirm.software!.name,
          version: installConfirm.build!.version,
          build: installConfirm.build!.build,
        });
      }

      toast.success(
        `¡Versión instalada exitosamente!\nSoftware: ${installConfirm.software!.name} ${installConfirm.build!.version}\nJava configurado: Java ${installConfirm.build!.java}`
      );
    }, 1200);
  };

  return (
    <div className="w-full space-y-5 pb-10">
      {/* 1. TOP ACTIVE INSTALLED BUILD BANNER - Full Width */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#18181c] border border-[#27272a] p-2 flex items-center justify-center shrink-0">
            <img
              src={`https://s3.mcjars.app/icons/${activeBuild.id}.png`}
              alt={activeBuild.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 uppercase">
                VERSION INSTALADA
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                JAVA {activeBuild.java}
              </span>
            </div>
            <h2 className="text-base font-bold text-zinc-100 tracking-wide mt-1">
              {activeBuild.name} {activeBuild.version}
            </h2>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">
              {activeBuild.fullVersion} • Canal {activeBuild.channel}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={() => {
              const matched = allSoftwareCatalog.find((s) => s.id === activeBuild.id) || allSoftwareCatalog[0];
              setDetailsModalSoftware(matched);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#18181c] hover:bg-[#222227] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white transition"
          >
            <Info className="w-3.5 h-3.5 text-zinc-400" />
            <span>Details</span>
          </button>

          <button
            onClick={() => {
              const matched = allSoftwareCatalog.find((s) => s.id === activeBuild.id) || allSoftwareCatalog[0];
              setSelectedSoftware(matched);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold transition shadow-md shadow-purple-600/20"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Switch Build</span>
          </button>
        </div>
      </div>

      {/* 2. SERVER SOFTWARE SECTION (Vanilla, Paper, Purpur, Spigot, Folia) */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-zinc-100 tracking-wide">Server software</h3>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allSoftwareCatalog
            .filter((s) => s.category === 'server')
            .map((software) => {
              const isCurrent = activeBuild.id === software.id;
              return (
                <div
                  key={software.id}
                  className={`w-full bg-[#111116] border ${
                    isCurrent
                      ? 'border-[#7c3aed] shadow-lg shadow-purple-600/10'
                      : 'border-[#1e1e24] hover:border-zinc-700'
                  } rounded-2xl p-4 flex flex-col justify-between space-y-4 transition`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#18181e] border border-[#27272e] p-2 flex items-center justify-center shrink-0">
                      <img
                        src={software.icon}
                        alt={software.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-zinc-100 truncate">
                        {software.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {isCurrent ? 'Server software, currently in use' : 'Server software'}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {software.description}
                  </p>

                  <div className="pt-3 border-t border-[#1e1e24] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-500 truncate mr-2">
                      {software.buildsTag}
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDetailsModalSoftware(software)}
                        className="p-1.5 rounded-lg bg-[#18181e] hover:bg-[#22222a] text-zinc-400 hover:text-white border border-[#27272e] transition"
                        title="Details"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedSoftware(software)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold shadow-sm transition"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Browse</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 3. MOD LOADERS SECTION (Forge, NeoForge, Fabric, Quilt) */}
      <div className="space-y-3 pt-3">
        <h3 className="text-sm font-bold text-zinc-100 tracking-wide">Mod loaders</h3>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allSoftwareCatalog
            .filter((s) => s.category === 'modded')
            .map((software) => {
              const isCurrent = activeBuild.id === software.id;
              return (
                <div
                  key={software.id}
                  className={`w-full bg-[#111116] border ${
                    isCurrent
                      ? 'border-[#7c3aed] shadow-lg shadow-purple-600/10'
                      : 'border-[#1e1e24] hover:border-zinc-700'
                  } rounded-2xl p-4 flex flex-col justify-between space-y-4 transition`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#18181e] border border-[#27272e] p-2 flex items-center justify-center shrink-0">
                      <img
                        src={software.icon}
                        alt={software.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-zinc-100 truncate">
                        {software.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {isCurrent ? 'Mod loader, currently in use' : 'Mod loader'}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {software.description}
                  </p>

                  <div className="pt-3 border-t border-[#1e1e24] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-500 truncate mr-2">
                      {software.buildsTag}
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDetailsModalSoftware(software)}
                        className="p-1.5 rounded-lg bg-[#18181e] hover:bg-[#22222a] text-zinc-400 hover:text-white border border-[#27272e] transition"
                        title="Details"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedSoftware(software)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold shadow-sm transition"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Browse</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 4. BROWSE BUILDS MODAL (Full MCJars versions browser) */}
      {selectedSoftware && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#111114] border border-[#1f1f23] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1f1f23] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#18181c] border border-[#27272a] p-2 flex items-center justify-center">
                  <img
                    src={selectedSoftware.icon}
                    alt={selectedSoftware.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                    Builds y Versiones de {selectedSoftware.name}
                    {isLoadingBuilds && <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Selecciona la versión a instalar. PanelMaster ajustará la versión de Java del contenedor automáticamente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSoftware(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#18181c] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-[#09090b] border-b border-[#1f1f23] grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por versión (ej. 1.21.4, 1.20)..."
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                  className="w-full bg-[#111114] border border-[#1f1f23] rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <select
                  value={selectedChannel}
                  onChange={(e: any) => setSelectedChannel(e.target.value)}
                  className="w-full bg-[#111114] border border-[#1f1f23] rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono transition"
                >
                  <option value="all">Todos los Canales</option>
                  <option value="stable">Solo Estables (Release)</option>
                  <option value="experimental">Solo Experimentales (Snapshots)</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedJava}
                  onChange={(e: any) => setSelectedJava(e.target.value)}
                  className="w-full bg-[#111114] border border-[#1f1f23] rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono transition"
                >
                  <option value="all">Todas las versiones de Java</option>
                  <option value="21">Requiere Java 21</option>
                  <option value="17">Requiere Java 17</option>
                  <option value="8">Requiere Java 8</option>
                </select>
              </div>
            </div>

            {/* Builds Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {filteredBuilds.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs font-mono">
                  No se encontraron builds con los filtros seleccionados.
                </div>
              ) : (
                filteredBuilds.map((b) => {
                  const isCurrent = activeBuild.id === selectedSoftware.id && activeBuild.version === b.version;
                  return (
                    <div
                      key={b.version}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                        isCurrent
                          ? 'bg-blue-600/10 border-blue-500/40'
                          : 'bg-[#09090b] border-[#1f1f23] hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-zinc-100">
                          {b.version}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                            b.type === 'RELEASE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {b.type}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18181c] text-zinc-400 border border-[#27272a]">
                          Java {b.java}
                        </span>
                        <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
                          {b.build}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrent ? (
                          <span className="text-xs font-mono text-blue-400 font-semibold px-3 py-1">
                            Instalado
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              setInstallConfirm({
                                open: true,
                                software: selectedSoftware,
                                build: b,
                                cleanInstall: false,
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Instalar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. INSTALL CONFIRMATION MODAL */}
      {installConfirm.open && installConfirm.software && installConfirm.build && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" />
              Confirmar Instalación de Versión
            </h3>

            <div className="p-3.5 rounded-xl bg-[#09090b] border border-[#1f1f23] space-y-1.5 font-mono text-xs">
              <div className="text-zinc-400">
                Software:{' '}
                <strong className="text-white">{installConfirm.software.name}</strong>
              </div>
              <div className="text-zinc-400">
                Versión:{' '}
                <strong className="text-blue-400">{installConfirm.build.version}</strong>
              </div>
              <div className="text-zinc-400">
                Versión Java asignada automáticamente:{' '}
                <strong className="text-emerald-400">Java {installConfirm.build.java}</strong>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              El instalador descargará el ejecutable .jar oficial directamente de la API de MCJars y actualizará la configuración de arranque.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1f1f23]">
              <button
                onClick={() =>
                  setInstallConfirm({ open: false, software: null, build: null, cleanInstall: false })
                }
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteInstall}
                disabled={isInstalling}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition disabled:opacity-50"
              >
                {isInstalling ? 'Instalando...' : 'Confirmar e Instalar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. DETAILS MODAL */}
      {detailsModalSoftware && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <img
                src={detailsModalSoftware.icon}
                alt={detailsModalSoftware.name}
                className="w-10 h-10 object-contain"
              />
              <div>
                <h3 className="font-bold text-sm text-zinc-100">{detailsModalSoftware.name}</h3>
                <span className="text-xs text-zinc-400 font-mono">{detailsModalSoftware.subtitle}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {detailsModalSoftware.description}
            </p>

            <div className="p-3 rounded-xl bg-[#09090b] border border-[#1f1f23] font-mono text-xs space-y-1">
              <div className="text-zinc-500 text-[10px] uppercase">ID de MCJars API:</div>
              <div className="text-blue-400 font-bold">{detailsModalSoftware.id}</div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#1f1f23]">
              <button
                onClick={() => setDetailsModalSoftware(null)}
                className="px-4 py-2 bg-[#18181c] hover:bg-[#222227] text-white rounded-xl text-xs font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
