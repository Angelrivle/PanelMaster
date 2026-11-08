import React, { useState } from 'react';
import { Search, Download, Package, CheckCircle2, RotateCw, X, AlertTriangle, Layers, Filter } from 'lucide-react';
import { toast } from '../../components/Toast';

interface ServerModpacksProps {
  server: any;
}

export const ServerModpacks: React.FC<ServerModpacksProps> = ({ server }) => {
  const [activeModpack, setActiveModpack] = useState<{
    title: string;
    version: string;
    loader: string;
    mcVersion: string;
    source: string;
  } | null>({
    title: 'Cobblemon Official Modpack',
    version: '1.5.2',
    loader: 'Fabric',
    mcVersion: '1.20.1',
    source: 'Modrinth',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoader, setSelectedLoader] = useState('all');
  const [selectedMcVersion, setSelectedMcVersion] = useState('all');

  const [installingModpack, setInstallingModpack] = useState<any | null>(null);
  const [selectedModpackVersion, setSelectedModpackVersion] = useState('latest');
  const [wipeWorld, setWipeWorld] = useState(false);
  const [cleanModsFolder, setCleanModsFolder] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  const modpacksList = [
    {
      id: 'cobblemon-official',
      title: 'Cobblemon Official Modpack',
      author: 'CobbledStudios',
      loader: 'Fabric',
      mcVersion: '1.20.1',
      versions: ['1.5.2 (Última)', '1.5.1', '1.5.0', '1.4.1'],
      desc: 'El modpack oficial de Cobblemon con rendimiento optimizado, minimapa, interfaz moderna y exploración de criaturas.',
      downloads: '11.4M',
      icon: 'https://cdn.modrinth.com/data/cached_images/409a25b182cb051ae4265da4ea92bb8403d980f7_96.webp',
    },
    {
      id: 'all-the-mods-9',
      title: 'All the Mods 9 - ATM9',
      author: 'ATMTeam',
      loader: 'Forge',
      mcVersion: '1.20.1',
      versions: ['0.2.60 (Última)', '0.2.58', '0.2.55', '0.2.50'],
      desc: 'El modpack más completo y jugado con tecnología (Mekanism, AE2), magia, dimensiones y misiones completas.',
      downloads: '18.9M',
      icon: 'https://cdn.modrinth.com/data/cached_images/e8c257b448a65f9733c706d8ebba8e83307525ae_96.webp',
    },
    {
      id: 'better-mc-fabric',
      title: 'Better MC [FABRIC] - BMC2',
      author: 'SHXRKIE',
      loader: 'Fabric',
      mcVersion: '1.20.1',
      versions: ['v24 (Última)', 'v23.5', 'v23', 'v22'],
      desc: 'La experiencia definitiva de Minecraft Vanilla+ con cientos de mazmorras, jefes, biomas y gráficos shaders.',
      downloads: '7.8M',
      icon: 'https://cdn.modrinth.com/data/cached_images/e8c257b448a65f9733c706d8ebba8e83307525ae_96.webp',
    },
    {
      id: 'better-mc-forge',
      title: 'Better MC [FORGE] - BMC4',
      author: 'SHXRKIE',
      loader: 'Forge',
      mcVersion: '1.20.1',
      versions: ['v30 (Última)', 'v29.5', 'v29', 'v28'],
      desc: 'Experiencia RPG inmersiva en Forge con misiones estructuradas, nuevos monstruos, armas y accesorios mágicos.',
      downloads: '6.2M',
      icon: 'https://cdn.modrinth.com/data/cached_images/e8c257b448a65f9733c706d8ebba8e83307525ae_96.webp',
    },
    {
      id: 'fabulously-optimized',
      title: 'Fabulously Optimized',
      author: 'RobotPantoffels',
      loader: 'Fabric',
      mcVersion: '1.20.4',
      versions: ['5.8.0 (Última)', '5.7.2', '5.7.0', '5.6.1'],
      desc: 'Multiplica los FPS x4 y añade soporte para shaders Iris, zoom, texturas conectadas y físicas sin alterar el juego vanilla.',
      downloads: '14.1M',
      icon: 'https://cdn.modrinth.com/data/cached_images/00c2f82ba1c8f1f512ffab5b5fba4fe23be01524_96.webp',
    },
    {
      id: 'prominence-2',
      title: 'Prominence II: RPG',
      author: 'ElocinDev',
      loader: 'Fabric',
      mcVersion: '1.20.1',
      versions: ['v2.7.5 (Última)', 'v2.7.0', 'v2.6.2', 'v2.5.0'],
      desc: 'Árbol de talentos de rol profundo, combates con jefes épicos, artefactos legendarios y música sinfónica.',
      downloads: '4.5M',
      icon: 'https://cdn.modrinth.com/data/cached_images/a50e56037eb9fc9905ae74a5e01f662a56113b29_96.webp',
    },
    {
      id: 'neoforge-all-in-one',
      title: 'NeoForge Horizons Edition',
      author: 'NeoCommunity',
      loader: 'NeoForge',
      mcVersion: '1.20.4',
      versions: ['1.2.0 (Última)', '1.1.0', '1.0.5'],
      desc: 'Paquete de mods optimizado para el nuevo loader NeoForge de alto rendimiento con Create y Farmer\'s Delight.',
      downloads: '1.9M',
      icon: 'https://s3.mcjars.app/icons/neoforge.png',
    },
    {
      id: 'dawncraft',
      title: 'DawnCraft - Echoes of Legends',
      author: 'Bstylia14',
      loader: 'Forge',
      mcVersion: '1.18.2',
      versions: ['v2.0.12 (Última)', 'v2.0.10', 'v2.0.8'],
      desc: 'Inspirado en Dark Souls y Elden Ring: sistema de combate con esquivas y parry, diálogos con NPCs y misiones guiadas.',
      downloads: '5.1M',
      icon: 'https://cdn.modrinth.com/data/cached_images/34d284f1a26569106041695758b29dbf72c05763_96.webp',
    },
    {
      id: 'quilt-standard',
      title: 'Quilt Core Experience',
      author: 'QuiltMC',
      loader: 'Quilt',
      mcVersion: '1.20.1',
      versions: ['1.0.4 (Última)', '1.0.2', '1.0.0'],
      desc: 'Compatibilidad con mods Quilt y Fabric con arranque ultrarrápido y herramientas de diagnóstico avanzadas.',
      downloads: '980K',
      icon: 'https://s3.mcjars.app/icons/quilt.png',
    },
    {
      id: 'pixelmon-pack',
      title: 'The Pixelmon Modpack',
      author: 'Pixelmon Mod',
      loader: 'Forge',
      mcVersion: '1.16.5',
      versions: ['9.1.12 (Última)', '9.1.10', '9.1.8'],
      desc: 'El clásico modpack de Pixelmon Generaciones con torneos, gimnasios Pokémon, Pokédex y supervivencia.',
      downloads: '8.3M',
      icon: 'https://cdn.modrinth.com/data/cached_images/eb6903bf259f9cecb0141b7fcf7c89f5c4ce9fef_96.webp',
    },
    {
      id: 'rlcraft',
      title: 'RLCraft Official',
      author: 'Shivaxi',
      loader: 'Forge',
      mcVersion: '1.12.2',
      versions: ['v2.9.3 (Última)', 'v2.9.2', 'v2.9.1'],
      desc: 'Dificultad extrema, dragones asesinos, temperatura corporal, sed y supervivencia implacable.',
      downloads: '16.2M',
      icon: 'https://cdn.modrinth.com/data/cached_images/34d284f1a26569106041695758b29dbf72c05763_96.webp',
    },
  ];

  const filtered = modpacksList.filter((m) => {
    const matchesSearch =
      searchQuery === '' ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLoader = selectedLoader === 'all' || m.loader.toLowerCase() === selectedLoader.toLowerCase();
    const matchesMc = selectedMcVersion === 'all' || m.mcVersion === selectedMcVersion;
    return matchesSearch && matchesLoader && matchesMc;
  });

  const handleStartInstall = (modpack: any) => {
    setInstallingModpack(modpack);
    setSelectedModpackVersion(modpack.versions[0] || 'latest');
    setWipeWorld(false);
    setCleanModsFolder(true);
  };

  const handleConfirmInstall = () => {
    if (!installingModpack) return;
    setIsInstalling(true);

    setTimeout(() => {
      setActiveModpack({
        title: installingModpack.title,
        version: selectedModpackVersion.split(' ')[0],
        loader: installingModpack.loader,
        mcVersion: installingModpack.mcVersion,
        source: 'Modrinth',
      });
      setIsInstalling(false);
      setInstallingModpack(null);
      toast.success(
        `¡Modpack "${installingModpack.title}" instalado correctamente!\n${
          wipeWorld ? '• El mundo actual ha sido eliminado.' : '• El mundo existente se ha conservado.'
        }\n• Archivos y librerías sincronizados.`
      );
    }, 1400);
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
                const mp = modpacksList.find((m) => m.title === activeModpack.title) || modpacksList[0];
                handleStartInstall(mp);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Actualizar Modpack
            </button>
            <button
              onClick={() => {
                setActiveModpack(null);
                toast.info('Modpack desvinculado del servidor.');
              }}
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
              No hay ningún modpack instalado. Selecciona uno del catálogo oficial de Modrinth abajo para comenzar.
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
              placeholder="Buscar por nombre o descripción de modpack..."
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
              <option value="forge">Forge</option>
              <option value="neoforge">NeoForge</option>
              <option value="fabric">Fabric</option>
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
          <span>Catálogo Modrinth: {filtered.length} modpacks encontrados</span>
          <span>Fuente oficial y verificada</span>
        </div>
      </div>

      {/* Modpacks Grid - Edge to Edge Full Width */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((mp) => {
          const isCurrent = activeModpack?.title === mp.title;
          return (
            <div
              key={mp.id}
              className={`w-full bg-[#111114] border ${
                isCurrent ? 'border-blue-500/50 shadow-md shadow-blue-500/10' : 'border-[#1f1f23] hover:border-zinc-700'
              } rounded-2xl p-4 flex flex-col justify-between transition group`}
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={mp.icon}
                    alt={mp.title}
                    className="w-12 h-12 rounded-xl object-cover bg-[#18181c] border border-[#27272a] shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
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
                          ACTUAL
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-zinc-100 mt-1 truncate group-hover:text-blue-400 transition">
                      {mp.title}
                    </h4>
                    <span className="text-[11px] text-zinc-500 font-mono">por {mp.author}</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {mp.desc}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-[#1f1f23] flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">
                  {mp.downloads} descargas
                </span>

                <button
                  onClick={() => handleStartInstall(mp)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isCurrent
                      ? 'bg-[#1f1f23] text-zinc-300 hover:text-white hover:bg-[#27272a]'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  {isCurrent ? 'Reinstalar' : 'Instalar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Install Modpack Modal with Wipe World Option */}
      {installingModpack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#111114] border border-[#1f1f23] rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={installingModpack.icon}
                  alt={installingModpack.title}
                  className="w-10 h-10 rounded-xl bg-[#18181c] border border-[#27272a] object-cover"
                />
                <div>
                  <h3 className="font-bold text-base text-zinc-100">{installingModpack.title}</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    {installingModpack.loader} • Minecraft {installingModpack.mcVersion}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInstallingModpack(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1f1f23] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Version Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Versión del Modpack a Instalar
                </label>
                <select
                  value={selectedModpackVersion}
                  onChange={(e) => setSelectedModpackVersion(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                >
                  {installingModpack.versions.map((v: string) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Wipe World Checkbox */}
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
                      Elimina carpetas <code className="text-blue-400">world</code>, <code className="text-blue-400">world_nether</code> y <code className="text-blue-400">world_the_end</code> para generar el terreno con las nuevas dimensiones y biomas del modpack. Desmárcalo si deseas conservar tu construcción.
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
                  <span>Atención: Al confirmar se reseteará el mundo. Asegúrate de tener un backup si contiene datos importantes.</span>
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
                    <span>Instalando modpack...</span>
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
