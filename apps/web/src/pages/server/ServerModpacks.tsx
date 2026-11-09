import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Download,
  Package,
  CheckCircle2,
  RotateCw,
  X,
  AlertTriangle,
  Layers,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { toast } from '../../components/Toast';

interface ServerModpacksProps {
  server: any;
}

interface ModrinthModpackHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  icon_url: string;
  downloads: number;
  follows: number;
  categories?: string[];
  display_categories?: string[];
  versions?: string[];
  loader?: string;
  mcVersion?: string;
}

function formatDownloads(num: number): string {
  if (!num) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

export const ServerModpacks: React.FC<ServerModpacksProps> = ({ server }) => {
  const [activeModpack, setActiveModpack] = useState<{
    title: string;
    slug: string;
    version: string;
    loader: string;
    mcVersion: string;
    source: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoader, setSelectedLoader] = useState('all');
  const [selectedMcVersion, setSelectedMcVersion] = useState('all');

  const [modpacks, setModpacks] = useState<ModrinthModpackHit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Install modal state
  const [installingModpack, setInstallingModpack] = useState<ModrinthModpackHit | null>(null);
  const [modpackVersions, setModpackVersions] = useState<any[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [selectedModpackVersion, setSelectedModpackVersion] = useState('latest');
  const [wipeWorld, setWipeWorld] = useState(false);
  const [cleanModsFolder, setCleanModsFolder] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  const searchDebounceRef = useRef<any>(null);

  // 1. Load active configuration from backend
  useEffect(() => {
    if (!server?.id) return;
    const token = localStorage.getItem('nexus_token');
    fetch(`/api/v1/services/${server.id}/config`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (cfg && cfg.modPlatform === 'MODRINTH' && cfg.modpack) {
          setActiveModpack({
            title: cfg.modpackTitle || cfg.modpack,
            slug: cfg.modpack,
            version: cfg.modpackVersion || 'Latest',
            loader: cfg.loader || cfg.type || 'Fabric',
            mcVersion: cfg.version || cfg.mcVersion || '1.20.1',
            source: 'Modrinth',
          });
        } else {
          setActiveModpack(null);
        }
      })
      .catch(() => {});
  }, [server?.id]);

  // 2. Fetch modpacks from Modrinth via backend search endpoint
  const fetchModpacks = (query: string, loader: string, version: string) => {
    setIsLoading(true);
    const token = localStorage.getItem('nexus_token');
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    if (loader && loader !== 'all') params.set('loader', loader);
    if (version && version !== 'all') params.set('version', version);
    params.set('limit', '24');

    fetch(`/api/v1/services/modpacks/search?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al conectar con la API de Modrinth');
        return res.json();
      })
      .then((data) => {
        const hits = data.hits || [];
        const parsed: ModrinthModpackHit[] = hits.map((h: any) => {
          const cats: string[] = Array.isArray(h.categories)
            ? h.categories
            : typeof h.categories === 'string'
            ? h.categories.split(' ')
            : [];
          const vers: string[] = Array.isArray(h.versions)
            ? h.versions
            : typeof h.versions === 'string'
            ? h.versions.split(' ')
            : [];

          let mainLoader = 'Fabric';
          if (cats.includes('forge')) mainLoader = 'Forge';
          else if (cats.includes('neoforge')) mainLoader = 'NeoForge';
          else if (cats.includes('quilt')) mainLoader = 'Quilt';
          else if (cats.includes('fabric')) mainLoader = 'Fabric';

          return {
            project_id: h.project_id,
            slug: h.slug,
            title: h.title,
            description: h.description,
            author: h.author,
            icon_url: h.icon_url,
            downloads: h.downloads || 0,
            follows: h.follows || 0,
            categories: cats,
            versions: vers,
            loader: mainLoader,
            mcVersion: vers[vers.length - 1] || '1.20.1',
          };
        });
        setModpacks(parsed);
      })
      .catch(() => {
        setModpacks([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchModpacks(searchQuery, selectedLoader, selectedMcVersion);
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, selectedLoader, selectedMcVersion]);

  // 3. Open install modal & fetch modpack versions from Modrinth
  const handleStartInstall = (modpack: ModrinthModpackHit) => {
    setInstallingModpack(modpack);
    setIsLoadingVersions(true);
    setModpackVersions([]);
    setSelectedModpackVersion('latest');
    setWipeWorld(false);
    setCleanModsFolder(true);

    const token = localStorage.getItem('nexus_token');
    fetch(`/api/v1/services/modpacks/${encodeURIComponent(modpack.slug)}/versions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((versions) => {
        if (Array.isArray(versions) && versions.length > 0) {
          setModpackVersions(versions);
          setSelectedModpackVersion(versions[0].version_number || versions[0].name || 'latest');
        } else {
          setModpackVersions([{ id: 'latest', version_number: 'latest', name: 'Última Versión Recomendada' }]);
          setSelectedModpackVersion('latest');
        }
      })
      .catch(() => {
        setModpackVersions([{ id: 'latest', version_number: 'latest', name: 'Última Versión' }]);
        setSelectedModpackVersion('latest');
      })
      .finally(() => {
        setIsLoadingVersions(false);
      });
  };

  // 4. Confirm install and recreate Docker container with Modrinth configuration
  const handleConfirmInstall = async () => {
    if (!installingModpack || !server?.id) return;
    setIsInstalling(true);

    try {
      const token = localStorage.getItem('nexus_token');
      const chosenVer = modpackVersions.find((v) => v.version_number === selectedModpackVersion || v.name === selectedModpackVersion);
      const mcVer = (chosenVer?.game_versions && chosenVer.game_versions[0]) || installingModpack.mcVersion || '1.20.1';
      const loader = (chosenVer?.loaders && chosenVer.loaders[0]) || installingModpack.loader || 'Fabric';

      const res = await fetch(`/api/v1/services/${server.id}/modpack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          modpackSlug: installingModpack.slug,
          modpackTitle: installingModpack.title,
          versionNumber: selectedModpackVersion,
          loader: loader,
          mcVersion: mcVer,
          wipeWorld,
          cleanModsFolder,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al instalar modpack');
      }

      setActiveModpack({
        title: installingModpack.title,
        slug: installingModpack.slug,
        version: selectedModpackVersion,
        loader: loader,
        mcVersion: mcVer,
        source: 'Modrinth',
      });

      setInstallingModpack(null);
      toast.success(
        `¡Modpack "${installingModpack.title}" instalado exitosamente!\n` +
        `Loader: ${loader} • Minecraft: ${mcVer}\n` +
        `El contenedor Docker ha sido re-creado y comenzará a descargar los archivos.`
      );
    } catch (err: any) {
      toast.error(err.message || 'Error al instalar el modpack en el servidor');
    } finally {
      setIsInstalling(false);
    }
  };

  // 5. Unlink / revert to clean server fork
  const handleUnlinkModpack = async () => {
    if (!server?.id) return;
    try {
      const token = localStorage.getItem('nexus_token');
      await fetch(`/api/v1/services/${server.id}/version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fork: 'paper',
          version: '1.20.4',
          cleanInstall: true,
        }),
      });
      setActiveModpack(null);
      toast.success('Modpack desvinculado. El servidor se ha restablecido a Paper 1.20.4 estándar.');
    } catch {
      toast.error('Error al desvincular el modpack');
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Active Installed Modpack Banner */}
      {activeModpack ? (
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">
                  MODPACK ACTIVO EN ESTE SERVIDOR
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  INSTALADO
                </span>
              </div>
              <h3 className="text-base font-bold text-zinc-100">{activeModpack.title}</h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Versión: <span className="text-zinc-200">{activeModpack.version}</span> • Loader: <span className="text-blue-400">{activeModpack.loader}</span> • Minecraft: <span className="text-zinc-200">{activeModpack.mcVersion}</span> • Fuente: <span className="text-zinc-300">{activeModpack.source}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const mp = modpacks.find((m) => m.slug === activeModpack.slug) || {
                  project_id: activeModpack.slug,
                  slug: activeModpack.slug,
                  title: activeModpack.title,
                  description: 'Modpack actualmente activo en el servidor',
                  author: 'Modrinth Author',
                  icon_url: '',
                  downloads: 0,
                  follows: 0,
                  loader: activeModpack.loader,
                  mcVersion: activeModpack.mcVersion,
                };
                handleStartInstall(mp);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Actualizar Modpack
            </button>
            <button
              onClick={handleUnlinkModpack}
              className="px-3 py-2 rounded-xl bg-[#18181c] hover:bg-[#222227] text-zinc-400 hover:text-rose-400 text-xs font-semibold border border-[#27272a] transition"
            >
              Desvincular
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-zinc-500" />
            <span className="text-xs text-zinc-400">
              No hay ningún modpack instalado. Busca cualquier modpack oficial en Modrinth abajo para instalarlo directamente.
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar en Modrinth (ej. Cobblemon, All the Mods, Better MC)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Loader Filter */}
          <div>
            <select
              value={selectedLoader}
              onChange={(e) => setSelectedLoader(e.target.value)}
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono transition"
            >
              <option value="all">Todos los Mod Loaders</option>
              <option value="fabric">Fabric</option>
              <option value="forge">Forge</option>
              <option value="neoforge">NeoForge</option>
              <option value="quilt">Quilt</option>
            </select>
          </div>

          {/* MC Version Filter */}
          <div>
            <select
              value={selectedMcVersion}
              onChange={(e) => setSelectedMcVersion(e.target.value)}
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono transition"
            >
              <option value="all">Cualquier Versión de Minecraft</option>
              <option value="1.21.1">Minecraft 1.21.1</option>
              <option value="1.20.4">Minecraft 1.20.4</option>
              <option value="1.20.1">Minecraft 1.20.1</option>
              <option value="1.19.2">Minecraft 1.19.2</option>
              <option value="1.18.2">Minecraft 1.18.2</option>
              <option value="1.16.5">Minecraft 1.16.5</option>
              <option value="1.12.2">Minecraft 1.12.2</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 font-mono">
          <span>
            {isLoading ? 'Consultando Modrinth API...' : `Catálogo Modrinth: ${modpacks.length} modpacks encontrados`}
          </span>
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            API Oficial de Modrinth
          </span>
        </div>
      </div>

      {/* Modpacks Grid */}
      {isLoading ? (
        <div className="w-full py-16 flex flex-col items-center justify-center space-y-3">
          <RotateCw className="w-7 h-7 text-blue-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-400">Buscando modpacks oficiales en Modrinth...</span>
        </div>
      ) : modpacks.length === 0 ? (
        <div className="w-full py-16 bg-[#111114] border border-[#1f1f23] rounded-2xl flex flex-col items-center justify-center space-y-2">
          <Package className="w-8 h-8 text-zinc-600" />
          <span className="text-sm font-semibold text-zinc-300">No se encontraron modpacks</span>
          <span className="text-xs text-zinc-500">Prueba con otro término de búsqueda o cambia los filtros de loader/versión.</span>
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {modpacks.map((mp) => {
            const isCurrent = activeModpack?.slug === mp.slug;
            return (
              <div
                key={mp.project_id || mp.slug}
                className={`w-full bg-[#111114] border ${
                  isCurrent ? 'border-blue-500/50 shadow-md shadow-blue-500/10' : 'border-[#1f1f23] hover:border-zinc-700'
                } rounded-2xl p-4 flex flex-col justify-between transition group`}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    {mp.icon_url ? (
                      <img
                        src={mp.icon_url}
                        alt={mp.title}
                        className="w-12 h-12 rounded-xl object-cover bg-[#18181c] border border-[#27272a] shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                          {mp.loader}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f1f23] text-zinc-300">
                          MC {mp.mcVersion}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                            ACTIVO
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-zinc-100 mt-1 truncate group-hover:text-blue-400 transition" title={mp.title}>
                        {mp.title}
                      </h4>
                      <span className="text-[11px] text-zinc-500 font-mono">por {mp.author}</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {mp.description}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-[#1f1f23] flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                    <Download className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{formatDownloads(mp.downloads)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://modrinth.com/modpack/${mp.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#18181c] transition"
                      title="Ver en Modrinth"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => handleStartInstall(mp)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        isCurrent
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isCurrent ? 'Reinstalar' : 'Instalar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Install Modpack Modal with Wipe World Option */}
      {installingModpack && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-[#1f1f23]">
              <div className="flex items-center gap-3">
                {installingModpack.icon_url && (
                  <img
                    src={installingModpack.icon_url}
                    alt={installingModpack.title}
                    className="w-10 h-10 rounded-xl object-cover bg-[#18181c]"
                  />
                )}
                <div>
                  <h3 className="font-bold text-base text-zinc-100">{installingModpack.title}</h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    {installingModpack.loader} • Minecraft {installingModpack.mcVersion}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInstallingModpack(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Version Selector */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Versión del Modpack a Instalar (Desde Modrinth)
                </label>
                {isLoadingVersions ? (
                  <div className="flex items-center gap-2 py-2 text-xs font-mono text-zinc-400">
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>Cargando versiones oficiales...</span>
                  </div>
                ) : (
                  <select
                    value={selectedModpackVersion}
                    onChange={(e) => setSelectedModpackVersion(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
                  >
                    {modpackVersions.map((v: any) => (
                      <option key={v.id || v.version_number} value={v.version_number || v.name}>
                        {v.name || v.version_number} ({v.game_versions?.join(', ') || 'MC'}) [{v.version_type || 'release'}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Wipe World & Clean Mods Checkboxes */}
              <div className="p-3.5 rounded-xl bg-[#09090b] border border-[#1f1f23] space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wipeWorld}
                    onChange={(e) => setWipeWorld(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">
                      Borrar mundo actual (Recomendado para nuevos modpacks)
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5 leading-relaxed">
                      Elimina carpetas <code className="text-blue-400">world</code>, <code className="text-blue-400">world_nether</code> y <code className="text-blue-400">world_the_end</code> para generar el terreno con las nuevas dimensiones y biomas del modpack. Desmárcalo si deseas conservar tu mundo actual.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-[#1f1f23]">
                  <input
                    type="checkbox"
                    checked={cleanModsFolder}
                    onChange={(e) => setCleanModsFolder(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">
                      Limpiar carpeta /mods anterior
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Elimina mods antiguos para prevenir incompatibilidades o crasheos de librerías cruzadas.
                    </span>
                  </div>
                </label>
              </div>

              {wipeWorld && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Atención: Al confirmar se reseteará el mundo para generar las estructuras del modpack.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-[#1f1f23]">
              <button
                type="button"
                onClick={() => setInstallingModpack(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmInstall}
                disabled={isInstalling}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 transition disabled:opacity-50"
              >
                {isInstalling ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Iniciando instalación en servidor...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Confirmar e Instalar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
