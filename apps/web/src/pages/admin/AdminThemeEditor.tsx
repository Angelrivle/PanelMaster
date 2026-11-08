import React, { useState, useEffect } from 'react';
import {
  Palette,
  RotateCcw,
  RotateCw,
  Download,
  Upload,
  Check,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
  ChevronRight,
  Terminal,
  FolderTree,
  Server,
  Layers,
  Power,
  Play,
  Square,
  Search,
  Sliders,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { toast } from '../../components/Toast';
import {
  PanelMasterTheme,
  DEFAULT_THEME,
  loadSavedTheme,
  applyThemeToDocument,
} from '../../utils/themeManager';

interface ThemePreset {
  id: string;
  name: string;
  desc: string;
  accent: string;
  secondary: string;
  bg: string;
  surface: string;
}

const PRESETS: ThemePreset[] = [
  {
    id: 'forge-steel',
    name: 'Forge Steel',
    desc: 'Cold deep blue slate, high tech industrial focus.',
    accent: '#3b82f6',
    secondary: '#94a3b8',
    bg: '#09090b',
    surface: '#111116',
  },
  {
    id: 'ember',
    name: 'Ember',
    desc: 'Warm terracotta and amber accents. Solar and volcanic feel.',
    accent: '#e0913c',
    secondary: '#d97706',
    bg: '#0d0b09',
    surface: '#171410',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    desc: 'Monochrome subtle slate with pure minimalist neutrals.',
    accent: '#cbd5e1',
    secondary: '#64748b',
    bg: '#0b0c0e',
    surface: '#14161a',
  },
  {
    id: 'nordic',
    name: 'Nordic',
    desc: 'Icy cyan accents, crisp contrast, softly frosted surfaces.',
    accent: '#38bdf8',
    secondary: '#7dd3fc',
    bg: '#080e14',
    surface: '#0f1722',
  },
  {
    id: 'verdant',
    name: 'Verdant',
    desc: 'Forest and emerald greens with soothing natural depth.',
    accent: '#10b981',
    secondary: '#34d399',
    bg: '#07120c',
    surface: '#0d1d14',
  },
  {
    id: 'neon-grid',
    name: 'Neon Grid',
    desc: 'Vibrant cyber neon violet with energetic electro glow.',
    accent: '#a855f7',
    secondary: '#c084fc',
    bg: '#0a0714',
    surface: '#150f24',
  },
  {
    id: 'daybreak',
    name: 'Daybreak',
    desc: 'High-contrast solar teal with modern executive clarity.',
    accent: '#14b8a6',
    secondary: '#2dd4bf',
    bg: '#081010',
    surface: '#0f1c1b',
  },
];

interface AdminThemeEditorProps {
  language?: string;
}

export const AdminThemeEditor: React.FC<AdminThemeEditorProps> = ({ language = 'en' }) => {
  const isEs = language === 'es';

  // Current Theme State
  const [themeState, setThemeState] = useState<PanelMasterTheme>(() => loadSavedTheme());

  // In-App Import Modal State (No native browser prompt!)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Live Preview Settings
  const [previewTab, setPreviewTab] = useState<'dashboard' | 'console' | 'files'>('dashboard');
  const [selectedPreviewServer, setSelectedPreviewServer] = useState('network-proxy');
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Load saved theme on mount
  useEffect(() => {
    const saved = loadSavedTheme();
    setThemeState(saved);
  }, []);

  // Update specific theme key
  const updateTheme = <K extends keyof PanelMasterTheme>(key: K, value: PanelMasterTheme[K]) => {
    setThemeState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: ThemePreset) => {
    setThemeState((prev) => ({
      ...prev,
      preset: preset.id,
      accentColor: preset.accent,
      secondaryColor: preset.secondary,
      bgColor: preset.bg,
      surfaceColor: preset.surface,
    }));
    toast.info(isEs ? `Preset "${preset.name}" cargado en vista previa.` : `Preset "${preset.name}" loaded in preview.`);
  };

  // Derive Rest from Accent
  const handleDeriveColors = () => {
    updateTheme('secondaryColor', themeState.accentColor);
    updateTheme('surfaceColor', '#111319');
    updateTheme('bgColor', '#08090d');
    toast.success(isEs ? 'Paleta armónica generada a partir del acento.' : 'Harmonic palette derived from accent.');
  };

  // Discard Changes
  const handleDiscard = () => {
    const saved = loadSavedTheme();
    setThemeState(saved);
    toast.info(isEs ? 'Cambios no guardados descartados.' : 'Unsaved changes discarded.');
  };

  // Reset to Factory Default
  const handleResetToDefault = () => {
    setThemeState(DEFAULT_THEME);
    applyThemeToDocument(DEFAULT_THEME);
    toast.success(isEs ? 'Valores predeterminados restablecidos.' : 'Default values restored.');
  };

  // Export Theme JSON
  const handleExportTheme = () => {
    navigator.clipboard.writeText(JSON.stringify(themeState, null, 2));
    toast.success(isEs ? 'Configuración JSON del tema copiada al portapapeles.' : 'Theme JSON copied to clipboard.');
  };

  // Process Import
  const handleProcessImport = () => {
    if (!importJsonText.trim()) return;
    try {
      const parsed = JSON.parse(importJsonText);
      const merged: PanelMasterTheme = {
        ...DEFAULT_THEME,
        ...parsed,
      };
      setThemeState(merged);
      setIsImportModalOpen(false);
      setImportJsonText('');
      toast.success(isEs ? 'Tema importado correctamente en el editor.' : 'Theme successfully imported into editor.');
    } catch (_) {
      toast.error(isEs ? 'El formato JSON introducido no es válido.' : 'Invalid JSON format provided.');
    }
  };

  // Apply Theme Globally
  const handleApplyTheme = () => {
    applyThemeToDocument(themeState);
    toast.success(
      isEs
        ? '¡Tema aplicado con éxito en todo PanelMaster!'
        : 'Theme successfully applied across entire PanelMaster!'
    );
  };

  return (
    <div className="w-full space-y-5 pb-10 font-sans">
      {/* Top Banner / Header matching Image 2 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1f1f23] pb-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase font-mono block">
            PANELMASTER
          </span>
          <div className="flex items-center gap-2.5 mt-0.5">
            <Palette className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              {isEs ? 'Estudio de Temas' : 'Theme Studio'}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            {isEs
              ? 'Cada cambio se refleja inmediatamente en la vista previa a la derecha. Aplícalo para guardarlo y activarlo en todo el panel.'
              : 'Every change shows at once on your real panel, live on the right. Discard or apply it; Apply makes it the active panel theme.'}
          </p>
        </div>

        {/* Action Buttons Top Bar */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111114] border border-[#27272a] text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isEs ? 'DESCARTAR' : 'DISCARD'}</span>
          </button>

          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111114] border border-[#27272a] text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isEs ? 'REINICIAR' : 'RESET TO DEFAULT'}</span>
          </button>

          <button
            onClick={handleExportTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111114] border border-[#27272a] text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isEs ? 'EXPORTAR' : 'EXPORT'}</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111114] border border-[#27272a] text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isEs ? 'IMPORTAR' : 'IMPORT'}</span>
          </button>

          <button
            onClick={handleApplyTheme}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/20"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isEs ? 'APLICAR TEMA' : 'APPLY THEME'}</span>
          </button>
        </div>
      </div>

      {/* Demo Notice Banner matching Image 2 */}
      <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl flex items-center gap-2.5 text-xs text-blue-300">
        <Info className="w-4 h-4 text-blue-400 shrink-0" />
        <span>
          <strong className="text-white">{isEs ? 'Modo Interactivo:' : 'Live Studio:'}</strong>{' '}
          {isEs
            ? 'Los cambios se previsualizan al instante. Al pulsar "APLICAR TEMA", se activarán en tu sesión del navegador y se persistirán.'
            : 'Changes update live in the preview. Click "APPLY THEME" to persist and apply across the entire panel.'}
        </span>
      </div>

      {/* Main Grid: Controls (Left) vs Interactive Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================== */}
        {/* LEFT COLUMN: THEME CONTROLS (5 cols)                           */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 space-y-6 max-h-[82vh] overflow-y-auto no-scrollbar pr-1">
          {/* 1. PRESETS */}
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              {isEs ? 'PRESETS DE COLOR' : 'COLOR PRESETS'}
            </span>

            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map((preset) => {
                const isSelected = themeState.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-left p-3 rounded-xl border transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#18181f] border-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-[#09090b] border-[#27272a] hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      {/* Swatch Bar */}
                      <div className="flex items-center h-4 rounded-lg overflow-hidden mb-2 border border-[#27272a]">
                        <div style={{ backgroundColor: preset.bg }} className="flex-1 h-full" />
                        <div style={{ backgroundColor: preset.surface }} className="flex-1 h-full" />
                        <div style={{ backgroundColor: preset.accent }} className="flex-1 h-full" />
                        <div style={{ backgroundColor: preset.secondary }} className="flex-1 h-full" />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{preset.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>

                      <p className="text-[10px] text-zinc-500 line-clamp-2 mt-1 leading-snug">
                        {preset.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. COLOURS */}
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              {isEs ? 'PALETA DE COLORES' : 'COLOURS'}
            </span>

            <div className="space-y-3 text-xs">
              {/* Accent */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                <div>
                  <div className="font-semibold text-zinc-200">{isEs ? 'Color de Acento' : 'Accent'}</div>
                  <div className="text-[10px] text-zinc-500">{isEs ? 'Botones, links, elementos activos' : 'Buttons, links, focused elements'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeState.accentColor}
                    onChange={(e) => updateTheme('accentColor', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-none p-0"
                  />
                  <span className="font-mono text-zinc-300 text-xs uppercase">{themeState.accentColor}</span>
                </div>
              </div>

              {/* Secondary */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                <div>
                  <div className="font-semibold text-zinc-200">{isEs ? 'Color Secundario' : 'Secondary'}</div>
                  <div className="text-[10px] text-zinc-500">{isEs ? 'Iconos y subtítulos secundarios' : 'Secondary icons & subheaders'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeState.secondaryColor}
                    onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-none p-0"
                  />
                  <span className="font-mono text-zinc-300 text-xs uppercase">{themeState.secondaryColor}</span>
                </div>
              </div>

              {/* Background */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                <div>
                  <div className="font-semibold text-zinc-200">{isEs ? 'Fondo Principal' : 'Background'}</div>
                  <div className="text-[10px] text-zinc-500">{isEs ? 'Fondo exterior de la página' : 'Page background, main outer canvas'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeState.bgColor}
                    onChange={(e) => updateTheme('bgColor', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-none p-0"
                  />
                  <span className="font-mono text-zinc-300 text-xs uppercase">{themeState.bgColor}</span>
                </div>
              </div>

              {/* Surface */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                <div>
                  <div className="font-semibold text-zinc-200">{isEs ? 'Superficie / Tarjetas' : 'Surface'}</div>
                  <div className="text-[10px] text-zinc-500">{isEs ? 'Tarjetas, menús y modales' : 'Cards, menus, modals & headers'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeState.surfaceColor}
                    onChange={(e) => updateTheme('surfaceColor', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-none p-0"
                  />
                  <span className="font-mono text-zinc-300 text-xs uppercase">{themeState.surfaceColor}</span>
                </div>
              </div>

              <button
                onClick={handleDeriveColors}
                className="w-full py-2 bg-[#18181f] hover:bg-[#22222a] border border-[#27272a] text-zinc-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 uppercase font-mono tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>{isEs ? 'GENERAR PALETA ARMÓNICA' : 'DERIVE THE REST FROM THE ACCENT'}</span>
              </button>
            </div>
          </div>

          {/* 3. SHAPE (Corner Radius) matching Image 3 */}
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              {isEs ? 'BORDES Y FORMA' : 'SHAPE'}
            </span>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-semibold">{isEs ? 'Radio de esquina' : 'Corner radius'}</span>
                <span className="font-mono text-blue-400 font-bold">{themeState.cornerRadius}px</span>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={themeState.cornerRadius}
                  onChange={(e) => updateTheme('cornerRadius', Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />

                {/* Corner shape visual indicator matching Image 3 */}
                <div
                  style={{ borderRadius: `${themeState.cornerRadius}px` }}
                  className="w-8 h-8 border-2 border-blue-400 shrink-0 bg-blue-500/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 4. STYLE (Finish, Shadows, Motion) matching Image 3 */}
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4 text-xs">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              {isEs ? 'ESTILO Y ACABADOS' : 'STYLE'}
            </span>

            {/* Finish */}
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-semibold">{isEs ? 'Acabado' : 'Finish'}</label>
              <div className="grid grid-cols-5 gap-1.5 bg-[#09090b] p-1 rounded-xl border border-[#27272a]">
                {(['solid', 'glass', 'soft', 'outlines', 'flat'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => updateTheme('finish', f)}
                    className={`py-1 rounded-lg font-medium text-[11px] capitalize transition ${
                      themeState.finish === f ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Surface Opacity Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-semibold">{isEs ? 'Opacidad de superficie' : 'Surface opacity'}</span>
                <span className="font-mono text-zinc-300">{themeState.surfaceOpacity}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                value={themeState.surfaceOpacity}
                onChange={(e) => updateTheme('surfaceOpacity', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Shadow */}
            <div className="space-y-1.5 pt-1">
              <label className="text-zinc-400 font-semibold">{isEs ? 'Sombras' : 'Shadow'}</label>
              <div className="grid grid-cols-4 gap-1.5 bg-[#09090b] p-1 rounded-xl border border-[#27272a]">
                {(['none', 'low', 'medium', 'high'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateTheme('shadowLevel', s)}
                    className={`py-1 rounded-lg font-medium text-[11px] capitalize transition ${
                      themeState.shadowLevel === s ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Motion */}
            <div className="space-y-1.5 pt-1">
              <label className="text-zinc-400 font-semibold">{isEs ? 'Animaciones' : 'Motion'}</label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#09090b] p-1 rounded-xl border border-[#27272a]">
                {(['subtle', 'lively', 'off'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => updateTheme('motion', m)}
                    className={`py-1 rounded-lg font-medium text-[11px] capitalize transition ${
                      themeState.motion === m ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Lift cards on hover & Accent Glow */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <span className="text-zinc-400 font-semibold text-[11px]">{isEs ? 'Elevar al pasar el ratón' : 'Lift cards on hover'}</span>
                <div className="flex bg-[#09090b] p-1 rounded-xl border border-[#27272a] gap-1">
                  <button
                    onClick={() => updateTheme('liftCards', true)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold ${
                      themeState.liftCards ? 'bg-blue-600 text-white' : 'text-zinc-500'
                    }`}
                  >
                    On
                  </button>
                  <button
                    onClick={() => updateTheme('liftCards', false)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold ${
                      !themeState.liftCards ? 'bg-[#18181c] text-white' : 'text-zinc-500'
                    }`}
                  >
                    Off
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400 font-semibold text-[11px]">{isEs ? 'Brillo de acento' : 'Accent glow'}</span>
                <div className="flex bg-[#09090b] p-1 rounded-xl border border-[#27272a] gap-1">
                  <button
                    onClick={() => updateTheme('accentGlow', true)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold ${
                      themeState.accentGlow ? 'bg-blue-600 text-white' : 'text-zinc-500'
                    }`}
                  >
                    On
                  </button>
                  <button
                    onClick={() => updateTheme('accentGlow', false)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold ${
                      !themeState.accentGlow ? 'bg-[#18181c] text-white' : 'text-zinc-500'
                    }`}
                  >
                    Off
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 5. TYPOGRAPHY matching Image 3 */}
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4 text-xs">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              {isEs ? 'TIPOGRAFÍA' : 'TYPOGRAPHY'}
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'inter', name: 'Inter / Plus Jakarta Sans', sample: 'Aa' },
                { id: 'system', name: 'System Default', sample: 'Aa' },
                { id: 'geometric', name: 'Geometric Modern', sample: 'Aa' },
                { id: 'mono', name: 'Monospace Code', sample: 'Aa' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => updateTheme('fontFamily', f.id as any)}
                  className={`p-3 rounded-xl border text-left transition ${
                    themeState.fontFamily === f.id
                      ? 'bg-[#18181f] border-blue-500 text-white'
                      : 'bg-[#09090b] border-[#27272a] text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-lg font-bold mb-1">{f.sample}</div>
                  <div className="text-[10px] font-semibold truncate">{f.name}</div>
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-semibold">{isEs ? 'Escala de texto' : 'Text size'}</span>
                <span className="font-mono text-zinc-300">{themeState.textSize}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="120"
                value={themeState.textSize}
                onChange={(e) => updateTheme('textSize', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 6. BRAND & HEADERS */}
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4 text-xs">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block">
              {isEs ? 'TEXTOS DE MARCA' : 'BRAND TEXTS'}
            </span>

            <div className="space-y-1">
              <label className="text-zinc-400 font-semibold">{isEs ? 'Título de pestaña del navegador' : 'Tab title'}</label>
              <input
                type="text"
                value={themeState.tabTitle}
                onChange={(e) => updateTheme('tabTitle', e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 font-semibold">{isEs ? 'Texto de pie de página' : 'Footer text'}</label>
              <input
                type="text"
                value={themeState.footerText}
                onChange={(e) => updateTheme('footerText', e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: INTERACTIVE LIVE PREVIEW (7 cols)                */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl p-5 space-y-4">
            {/* Top Preview Controls Bar matching Image 2 */}
            <div className="flex items-center justify-between border-b border-[#1c1c20] pb-3 flex-wrap gap-2">
              {/* View Tabs */}
              <div className="flex items-center bg-[#09090b] border border-[#27272a] rounded-xl p-1 gap-1 text-xs">
                <button
                  onClick={() => setPreviewTab('dashboard')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    previewTab === 'dashboard'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => setPreviewTab('console')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    previewTab === 'console'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Console</span>
                </button>

                <button
                  onClick={() => setPreviewTab('files')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    previewTab === 'files'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>Files</span>
                </button>
              </div>

              {/* Server Dropdown & Device Icons */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedPreviewServer}
                  onChange={(e) => setSelectedPreviewServer(e.target.value)}
                  className="bg-[#09090b] border border-[#27272a] rounded-xl px-2.5 py-1 text-xs text-zinc-300 font-mono"
                >
                  <option value="network-proxy">network-proxy</option>
                  <option value="survival-main">survival-main</option>
                </select>

                <div className="flex items-center bg-[#09090b] border border-[#27272a] rounded-xl p-1 gap-1 text-zinc-400">
                  <button
                    onClick={() => setDeviceView('desktop')}
                    className={`p-1 rounded ${deviceView === 'desktop' ? 'bg-[#18181f] text-blue-400' : 'hover:text-white'}`}
                    title="Desktop"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceView('tablet')}
                    className={`p-1 rounded ${deviceView === 'tablet' ? 'bg-[#18181f] text-blue-400' : 'hover:text-white'}`}
                    title="Tablet"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceView('mobile')}
                    className={`p-1 rounded ${deviceView === 'mobile' ? 'bg-[#18181f] text-blue-400' : 'hover:text-white'}`}
                    title="Mobile"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* DYNAMIC LIVE PREVIEW FRAMEWORK */}
            <div
              style={{
                backgroundColor: themeState.bgColor,
                fontFamily:
                  themeState.fontFamily === 'mono'
                    ? 'monospace'
                    : themeState.fontFamily === 'geometric'
                    ? 'Century Gothic, Futura, sans-serif'
                    : 'sans-serif',
                fontSize: `${(13 * themeState.textSize) / 100}px`,
              }}
              className={`w-full rounded-2xl border border-[#1f2638] p-4 transition-all overflow-hidden shadow-2xl min-h-[480px] select-none ${
                deviceView === 'mobile'
                  ? 'max-w-sm mx-auto'
                  : deviceView === 'tablet'
                  ? 'max-w-lg mx-auto'
                  : 'w-full'
              }`}
            >
              {/* Mockup Header Navigation */}
              <div
                style={{
                  backgroundColor: themeState.surfaceColor,
                  borderRadius: `${themeState.cornerRadius}px`,
                }}
                className="p-3 mb-4 flex items-center justify-between border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <div
                    style={{ backgroundColor: themeState.accentColor }}
                    className="w-2.5 h-2.5 rounded-full"
                  />
                  <span className="font-bold text-white tracking-wide text-xs">
                    {themeState.tabTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    style={{ borderRadius: `${Math.max(4, themeState.cornerRadius - 4)}px` }}
                    className="px-2 py-0.5 text-[10px] bg-white/10 text-zinc-300 font-mono"
                  >
                    pe-1 • 51.38.125.71
                  </span>
                  <div
                    style={{ backgroundColor: themeState.accentColor }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  >
                    A
                  </div>
                </div>
              </div>

              {/* 1. DASHBOARD PREVIEW */}
              {previewTab === 'dashboard' && (
                <div className="space-y-4">
                  {/* Stats Counter Bar */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: isEs ? 'SERVIDORES' : 'SERVERS', val: '2 / 5' },
                      { label: isEs ? 'MEMORIA' : 'MEMORY', val: '3.0 / 8.0 GB' },
                      { label: isEs ? 'ESTADO' : 'CLUSTER', val: 'ONLINE' },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor: themeState.surfaceColor,
                          borderRadius: `${themeState.cornerRadius}px`,
                        }}
                        className="p-3 border border-white/5"
                      >
                        <div className="text-[10px] text-zinc-400 font-mono">{stat.label}</div>
                        <div
                          style={{ color: i === 2 ? '#34d399' : '#ffffff' }}
                          className="font-bold text-xs mt-0.5"
                        >
                          {stat.val}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Server Cards Grid matching Image 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Server 1: network-proxy */}
                    <div
                      style={{
                        backgroundColor: themeState.surfaceColor,
                        borderRadius: `${themeState.cornerRadius}px`,
                        boxShadow:
                          themeState.accentGlow && selectedPreviewServer === 'network-proxy'
                            ? `0 0 18px ${themeState.accentColor}33`
                            : undefined,
                      }}
                      className={`p-4 border transition-all ${
                        themeState.liftCards ? 'hover:-translate-y-0.5' : ''
                      } ${
                        selectedPreviewServer === 'network-proxy'
                          ? 'border-blue-500/60'
                          : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-xs">network-proxy</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            Bungeecord • 51.38.125.71:25565
                          </div>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>

                      <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-400">RAM: 512 MB</span>
                        <button
                          style={{
                            backgroundColor: themeState.accentColor,
                            borderRadius: `${Math.max(4, themeState.cornerRadius - 4)}px`,
                          }}
                          className="px-2.5 py-1 text-white font-bold"
                        >
                          Manage
                        </button>
                      </div>
                    </div>

                    {/* Server 2: survival-main */}
                    <div
                      style={{
                        backgroundColor: themeState.surfaceColor,
                        borderRadius: `${themeState.cornerRadius}px`,
                      }}
                      className={`p-4 border border-white/5 transition-all ${
                        themeState.liftCards ? 'hover:-translate-y-0.5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-xs">survival-main</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            Paper Minecraft 1.20.4 • :25566
                          </div>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>

                      <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-400">RAM: 2048 MB</span>
                        <button
                          style={{
                            backgroundColor: themeState.accentColor,
                            borderRadius: `${Math.max(4, themeState.cornerRadius - 4)}px`,
                          }}
                          className="px-2.5 py-1 text-white font-bold"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CONSOLE PREVIEW */}
              {previewTab === 'console' && (
                <div className="space-y-3">
                  {/* Actions Header */}
                  <div
                    style={{
                      backgroundColor: themeState.surfaceColor,
                      borderRadius: `${themeState.cornerRadius}px`,
                    }}
                    className="p-3 border border-white/5 flex items-center justify-between"
                  >
                    <span className="text-xs font-bold text-white">
                      Terminal: {selectedPreviewServer}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        style={{ borderRadius: `${Math.max(4, themeState.cornerRadius - 4)}px` }}
                        className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold"
                      >
                        Start
                      </button>
                      <button
                        style={{ borderRadius: `${Math.max(4, themeState.cornerRadius - 4)}px` }}
                        className="px-2.5 py-1 bg-rose-600 text-white text-[10px] font-bold"
                      >
                        Stop
                      </button>
                    </div>
                  </div>

                  {/* Terminal Black Screen */}
                  <div
                    style={{
                      borderRadius: `${themeState.cornerRadius}px`,
                    }}
                    className="p-3 bg-black/80 border border-white/10 font-mono text-[11px] space-y-1 text-zinc-300 min-h-[160px]"
                  >
                    <div style={{ color: themeState.accentColor }}>[PanelMaster Daemon] Container startup initialized...</div>
                    <div className="text-zinc-400">[Server thread/INFO]: Loading properties...</div>
                    <div className="text-emerald-400">[Server thread/INFO]: Done (2.418s)! For help, type "help"</div>
                    <div
                      style={{ color: themeState.accentColor }}
                      className="animate-pulse pt-2"
                    >
                      &gt; _
                    </div>
                  </div>
                </div>
              )}

              {/* 3. FILES PREVIEW */}
              {previewTab === 'files' && (
                <div
                  style={{
                    backgroundColor: themeState.surfaceColor,
                    borderRadius: `${themeState.cornerRadius}px`,
                  }}
                  className="p-4 border border-white/5 space-y-2 text-xs font-mono"
                >
                  <div className="text-[10px] text-zinc-400 font-bold uppercase pb-1 border-b border-white/5">
                    File Tree Mockup
                  </div>
                  <div className="flex items-center gap-2 text-amber-400">
                    <FolderTree className="w-3.5 h-3.5" />
                    <span>config/</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4 text-cyan-400">
                    <span>paper-global.yml</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4 text-emerald-400">
                    <span>server.properties</span>
                  </div>
                  <div
                    style={{
                      backgroundColor: `${themeState.accentColor}22`,
                      borderRadius: `${Math.max(4, themeState.cornerRadius - 4)}px`,
                      color: themeState.accentColor,
                    }}
                    className="flex items-center gap-2 p-1 font-bold"
                  >
                    <span>plugins/</span>
                  </div>
                </div>
              )}

              {/* Footer Preview */}
              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-center text-zinc-500 font-mono">
                {themeState.footerText}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IN-APP IMPORT MODAL (Zero browser prompt!) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111114] border border-[#27272a] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23]">
              <h3 className="text-sm font-bold text-white">
                {isEs ? 'Importar Tema en JSON' : 'Import Theme JSON'}
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-zinc-400">
                {isEs ? 'Pega el código JSON del tema:' : 'Paste the theme JSON code:'}
              </label>
              <textarea
                rows={8}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{\n  "accentColor": "#3b82f6",\n  "cornerRadius": 12\n}'
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleProcessImport}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20"
              >
                {isEs ? 'Cargar Tema' : 'Load Theme'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
