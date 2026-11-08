import React, { useState } from 'react';
import { Sliders, Save, Cpu, Info, Check, RefreshCw } from 'lucide-react';
import { toast } from '../../components/Toast';

interface ServerStartupProps {
  server: any;
}

export const ServerStartup: React.FC<ServerStartupProps> = ({ server }) => {
  const isMinecraft = server?.type === 'GAME_SERVER' || server?.template?.toLowerCase().includes('minecraft');

  const [jarName, setJarName] = useState('server.jar');
  const [dockerImage, setDockerImage] = useState(isMinecraft ? 'ghcr.io/panelmaster/images:java-21' : 'node:20-alpine');
  const [buildType, setBuildType] = useState('recommended');
  const [mcVersion, setMcVersion] = useState('1.20.4');
  const [forkVersion, setForkVersion] = useState('paper-1.20.4-493');
  const [customArgs, setCustomArgs] = useState('-Xms2G -Xmx4G -XX:+UseG1GC');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    toast.success('Parámetros de arranque guardados. Se aplicarán al iniciar o reiniciar el contenedor.');
  };

  return (
    <div className="w-full space-y-5">
      {/* Header Info Banner - Full Width */}
      <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            Parámetros de Inicio y Entorno de Ejecución
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Configura el binario ejecutable, la versión de Java/Node/Python del contenedor Docker y las banderas de optimización.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition shrink-0"
        >
          {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          {isSaved ? '¡Guardado!' : 'Guardar Parámetros'}
        </button>
      </div>

      <form onSubmit={handleSave} className="w-full space-y-4">
        {/* Main Binary / JAR Name */}
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-2">
          <label className="block text-xs font-bold text-zinc-100">
            Server JAR File (Nombre del archivo ejecutable)
          </label>
          <p className="text-[11px] text-zinc-400">
            El archivo principal .jar o punto de entrada a ejecutar dentro del contenedor Docker.
          </p>
          <input
            type="text"
            value={jarName}
            onChange={(e) => setJarName(e.target.value)}
            className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 font-mono text-xs text-blue-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Docker Image / Java Runtime Version */}
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-2">
          <label className="block text-xs font-bold text-zinc-100">
            {isMinecraft ? 'Versión de Java (Docker Runtime)' : 'Imagen Docker del Entorno'}
          </label>
          <p className="text-[11px] text-zinc-400">
            {isMinecraft
              ? 'Selecciona la versión de Java requerida según tu versión de Minecraft (Java 21 para 1.20.5+, Java 17 para 1.18 - 1.20.4, Java 8 para 1.12.2 e inferiores).'
              : 'Versión del entorno del contenedor para ejecutar la aplicación.'}
          </p>
          <select
            value={dockerImage}
            onChange={(e) => setDockerImage(e.target.value)}
            className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 font-mono text-xs text-zinc-200 focus:outline-none focus:border-blue-500 transition"
          >
            {isMinecraft ? (
              <>
                <option value="ghcr.io/panelmaster/images:java-21">Java 21 LTS (Minecraft 1.20.5 - 1.21.4+ / Moderno)</option>
                <option value="ghcr.io/panelmaster/images:java-17">Java 17 LTS (Minecraft 1.18.2 - 1.20.4)</option>
                <option value="ghcr.io/panelmaster/images:java-11">Java 11 LTS (Minecraft 1.16.5 - 1.17.1)</option>
                <option value="ghcr.io/panelmaster/images:java-8">Java 8 (Minecraft 1.8.8 - 1.12.2 / Modpacks Clásicos)</option>
              </>
            ) : (
              <>
                <option value="node:20-alpine">Node.js 20 LTS (Alpine Linux)</option>
                <option value="node:18-alpine">Node.js 18 LTS</option>
                <option value="python:3.12-slim">Python 3.12 (Debian Slim)</option>
                <option value="python:3.11-slim">Python 3.11</option>
                <option value="golang:1.22-alpine">Go 1.22 (Alpine Linux)</option>
              </>
            )}
          </select>
        </div>

        {/* Minecraft Specific: Build Type and Versions */}
        {isMinecraft && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-2">
              <label className="block text-xs font-bold text-zinc-100">Canal de Actualización</label>
              <select
                value={buildType}
                onChange={(e) => setBuildType(e.target.value)}
                className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 transition"
              >
                <option value="recommended">Recomendado / Estable (Producción)</option>
                <option value="latest">Último Build publicado</option>
                <option value="experimental">Experimental / Snapshot</option>
              </select>
            </div>

            <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-2">
              <label className="block text-xs font-bold text-zinc-100">Versión de Minecraft</label>
              <input
                type="text"
                value={mcVersion}
                onChange={(e) => setMcVersion(e.target.value)}
                className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>
        )}

        {/* Custom Arguments (JVM Flags / Process Args) */}
        <div className="w-full bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-2">
          <label className="block text-xs font-bold text-zinc-100">
            {isMinecraft ? 'Argumentos de la Máquina Virtual Java (JVM Flags Aikar / G1GC)' : 'Argumentos de Lanzamiento'}
          </label>
          <p className="text-[11px] text-zinc-400">
            Banderas adicionales de recolector de basura (Garbage Collector), heap sizes o variables de entorno.
          </p>
          <input
            type="text"
            value={customArgs}
            onChange={(e) => setCustomArgs(e.target.value)}
            className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 font-mono text-xs text-zinc-300 focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </form>
    </div>
  );
};
