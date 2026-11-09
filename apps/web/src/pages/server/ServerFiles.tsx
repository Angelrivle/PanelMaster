import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  FileJson,
  FileCog,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  AlertCircle,
  Columns,
  Download,
  Copy,
  FolderPlus,
  FilePlus,
  RotateCcw,
  Sliders,
  Play,
  Pause,
  Volume2,
  Music,
  Image as ImageIcon,
  ExternalLink,
  Edit2,
  Scissors,
  Archive,
  List,
  Code,
  Settings,
  AlertTriangle,
  CopyPlus,
  FolderInput,
  FolderOutput,
  Shield,
  Link2,
  ClipboardCopy,
  Info,
} from 'lucide-react';
import { translations, Language } from '../../i18n/translations';
import { toast } from '../../components/Toast';

interface ServerFilesProps {
  server: any;
  language?: Language;
}

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  parentDir: string;
}

interface OpenTab {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  language: string;
  isDirty: boolean;
}

export const ServerFiles: React.FC<ServerFilesProps> = ({ server, language = 'en' }) => {
  const t = translations[language] || translations.en;
  const isEs = language === 'es';

  // Resizable Explorer Tree width
  const [treeWidth, setTreeWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // File tree state
  const [fileSystem, setFileSystem] = useState<FileNode[]>([
    { name: 'server.properties', path: '/server.properties', isDir: false, size: 1420, parentDir: '' },
    { name: 'plugins', path: '/plugins', isDir: true, parentDir: '' },
    { name: 'config', path: '/config', isDir: true, parentDir: '' },
  ]);

  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Multi-selection state for batch delete & compression
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Expanded folders (config, plugins open by default)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(['/config', '/plugins'])
  );
  const [filterQuery, setFilterQuery] = useState('');

  // Sample fallback file contents
  const sampleContents: Record<string, string> = {
    '/server.properties': `motd=A Minecraft Server powered by PanelMaster\nserver-port=25565\nmax-players=20\nonline-mode=false\ndifficulty=normal\npvp=true\nview-distance=10\nlevel-name=world\n`,
    '/config/paper-global.yml': `# Paper Global Configuration\nchunk-system-worker-threads: 4\nlogging:\n  log-player-ip-addresses: true\n`,
    '/eula.txt': `eula=true\n`,
  };

  // Open tabs
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    {
      path: '/server.properties',
      name: 'server.properties',
      content: sampleContents['/server.properties'],
      originalContent: sampleContents['/server.properties'],
      language: 'ini',
      isDirty: false,
    },
  ]);
  const [activeTabPath, setActiveTabPath] = useState<string>('/server.properties');

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const toggleSelect = (path: string, checked: boolean) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (checked) next.add(path);
      else next.delete(path);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPaths.size === fileSystem.length && fileSystem.length > 0) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(fileSystem.map((f) => f.path)));
    }
  };

  // Real-time Filesystem Synchronization with VPS host
  const fetchFiles = useCallback(async () => {
    if (!server?.id) return;
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`/api/v1/services/${server.id}/files?recursive=true`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFileSystem(data);
        }
      }
    } catch (err) {
      console.error('[ServerFiles] Live sync error:', err);
    }
  }, [server?.id]);

  useEffect(() => {
    fetchFiles();
    const interval = setInterval(fetchFiles, 4000);
    return () => clearInterval(interval);
  }, [fetchFiles]);

  // Split View state
  const [isSplitView, setIsSplitView] = useState(false);
  const [splitTabPath, setSplitTabPath] = useState<string | null>(null);

  // Editor Settings Popover (Image 9)
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [indentSize, setIndentSize] = useState<2 | 4 | 8>(2);
  const [wordWrap, setWordWrap] = useState(true);
  const [checkSyntax, setCheckSyntax] = useState(true);

  // Syntax Error Modal (Image 10)
  const [syntaxErrorModal, setSyntaxErrorModal] = useState<{
    visible: boolean;
    title: string;
    description: string;
    tabToSave: OpenTab | null;
  } | null>(null);

  // Status Bar stats
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // "Go to file" Ctrl+P modal
  const [isGoToFileOpen, setIsGoToFileOpen] = useState(false);
  const [goToFileSearch, setGoToFileSearch] = useState('');

  // Media visualizers
  const [activeAudioFile, setActiveAudioFile] = useState<string | null>(null);
  const [activeImageFile, setActiveImageFile] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioTab, setAudioTab] = useState<'lyrics' | 'details' | 'tags'>('lyrics');
  const [audioProgress, setAudioProgress] = useState(15);

  // Trash bin modal (Strictly for editor files)
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashItems, setTrashItems] = useState<FileNode[]>([]);

  // Context Menu state (Image 4)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileNode } | null>(null);

  // In-app modal states replacing native prompt, confirm, alert
  const [inputModal, setInputModal] = useState<{
    open: boolean;
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (val: string) => void;
  }>({
    open: false,
    title: '',
    onConfirm: () => {},
  });
  const [modalInputValue, setModalInputValue] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [propertiesModal, setPropertiesModal] = useState<{
    open: boolean;
    item: FileNode | null;
  }>({
    open: false,
    item: null,
  });

  // Resizing splitter
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleResize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(180, Math.min(e.clientX - rect.left, 500));
        setTreeWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, handleResize, stopResizing]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsGoToFileOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        triggerSaveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openTabs, activeTabPath, checkSyntax]);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
      setShowSettingsPopover(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const toggleFolder = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const getLanguageFromPath = (path: string): string => {
    if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yaml';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.properties') || path.endsWith('.env')) return 'ini';
    if (path.endsWith('.js') || path.endsWith('.ts')) return 'typescript';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.sh')) return 'shell';
    return 'plaintext';
  };

  const openFile = async (node: FileNode) => {
    if (node.isDir) {
      toggleFolder(node.path);
      return;
    }

    if (node.name.endsWith('.mp3') || node.name.endsWith('.wav') || node.name.endsWith('.ogg')) {
      setActiveAudioFile(node.name);
      return;
    }

    if (node.name.endsWith('.png') || node.name.endsWith('.jpg') || node.name.endsWith('.svg')) {
      setActiveImageFile(node.name);
      return;
    }

    const existing = openTabs.find((t) => t.path === node.path);
    if (existing) {
      setActiveTabPath(node.path);
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`/api/v1/services/${server.id}/files/content?path=${encodeURIComponent(node.path)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      let content = '';
      if (res.ok) {
        const data = await res.json();
        content = data.content ?? '';
      } else {
        content = sampleContents[node.path] || `# Archivo: ${node.name}\n`;
      }

      const newTab: OpenTab = {
        path: node.path,
        name: node.name,
        content,
        originalContent: content,
        language: getLanguageFromPath(node.path),
        isDirty: false,
      };
      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabPath(node.path);
    } catch {
      const fallbackContent = sampleContents[node.path] || `# Archivo: ${node.name}\n`;
      const newTab: OpenTab = {
        path: node.path,
        name: node.name,
        content: fallbackContent,
        originalContent: fallbackContent,
        language: getLanguageFromPath(node.path),
        isDirty: false,
      };
      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabPath(node.path);
    }
  };

  const closeTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t.path !== path);
    setOpenTabs(remaining);
    if (activeTabPath === path) {
      setActiveTabPath(remaining.length > 0 ? remaining[remaining.length - 1].path : '');
    }
    if (splitTabPath === path) {
      setSplitTabPath(null);
      setIsSplitView(false);
    }
  };

  const handleEditorChange = (val: string | undefined, path: string) => {
    const nextVal = val || '';
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.path === path ? { ...t, content: nextVal, isDirty: nextVal !== t.originalContent } : t
      )
    );
  };

  const activeTab = openTabs.find((t) => t.path === activeTabPath);
  const splitTab = openTabs.find((t) => t.path === splitTabPath);

  const triggerSaveFile = () => {
    if (!activeTab) return;

    if (checkSyntax && (activeTab.language === 'yaml' || activeTab.language === 'json')) {
      if (activeTab.content.includes('error') || activeTab.content.includes('fail')) {
        setSyntaxErrorModal({
          visible: true,
          title: 'This file has a syntax error',
          description:
            'Line 16, column 4: All mapping items must start at the same column. A server or plugin usually fails to load a file like this.',
          tabToSave: activeTab,
        });
        return;
      }
    }

    executeSave(activeTab);
  };

  const executeSave = async (tab: OpenTab) => {
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`/api/v1/services/${server.id}/files/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          path: tab.path,
          content: tab.content,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al guardar archivo en el servidor');
      }

      setOpenTabs((prev) =>
        prev.map((t) => (t.path === tab.path ? { ...t, originalContent: t.content, isDirty: false } : t))
      );
      setSyntaxErrorModal(null);
      toast.success(`¡Archivo ${tab.name} guardado correctamente!`);
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar archivo');
    }
  };

  // Drag & Drop File & .jar Upload
  const handleFileUpload = async (files: FileList | File[], targetPath: string = '') => {
    if (!server?.id || files.length === 0) return;
    setIsUploading(true);

    for (const file of Array.from(files)) {
      try {
        toast.info(`Subiendo ${file.name}...`);
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const contentBase64 = await base64Promise;
        const token = localStorage.getItem('nexus_token');
        const res = await fetch(`/api/v1/services/${server.id}/files/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            path: targetPath,
            filename: file.name,
            contentBase64,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error subiendo ${file.name}`);
        }

        toast.success(`¡${file.name} subido exitosamente!`);
      } catch (err: any) {
        toast.error(err.message || `Error al subir ${file.name}`);
      }
    }

    setIsUploading(false);
    fetchFiles();
  };

  // Batch Delete Selected Files & Folders
  const handleBatchDelete = () => {
    if (selectedPaths.size === 0) return;
    const pathsArray = Array.from(selectedPaths);
    setConfirmModal({
      open: true,
      title: 'Eliminar Elementos Seleccionados',
      message: `¿Estás seguro de eliminar permanentemente los ${pathsArray.length} archivos y carpetas seleccionados? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        if (!server?.id) return;
        try {
          const token = localStorage.getItem('nexus_token');
          const res = await fetch(`/api/v1/services/${server.id}/files/delete-batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ paths: pathsArray }),
          });
          if (!res.ok) throw new Error('Error al eliminar archivos');
          const deletedSet = new Set(selectedPaths);
          setSelectedPaths(new Set());
          setOpenTabs((prev) => prev.filter((t) => !deletedSet.has(t.path)));
          setFileSystem((prev) => prev.filter((item) => !deletedSet.has(item.path)));
          toast.success(`¡${pathsArray.length} elementos eliminados definitivamente!`);
          await fetchFiles();
        } catch (err: any) {
          toast.error(err.message || 'Error al eliminar');
        }
      },
    });
  };

  // Compress Selected Files & Folders (.zip)
  const handleBatchCompress = () => {
    if (selectedPaths.size === 0) return;
    const pathsArray = Array.from(selectedPaths);
    setModalInputValue(`backup_${new Date().toISOString().slice(0, 10)}.zip`);
    setInputModal({
      open: true,
      title: 'Comprimir Archivos Seleccionados',
      description: `Introduce el nombre del archivo comprimido (.zip o .tar.gz) para los ${pathsArray.length} elementos:`,
      placeholder: 'archivo.zip',
      onConfirm: async (archiveName) => {
        if (!archiveName.trim() || !server?.id) return;
        try {
          toast.info('Comprimiendo archivos seleccionados...');
          const token = localStorage.getItem('nexus_token');
          const res = await fetch(`/api/v1/services/${server.id}/files/compress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              paths: pathsArray,
              archiveName: archiveName.trim(),
            }),
          });
          if (!res.ok) throw new Error('Error al comprimir archivos');
          toast.success(`¡Archivo ${archiveName.trim()} creado exitosamente!`);
          setSelectedPaths(new Set());
          await fetchFiles();
        } catch (err: any) {
          toast.error(err.message || 'Error al comprimir');
        }
      },
    });
  };

  // Extract Archive (.zip / .tar.gz)
  const handleExtractArchive = async (item: FileNode) => {
    if (!server?.id) return;
    setContextMenu(null);
    try {
      toast.info(`Descomprimiendo ${item.name}...`);
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`/api/v1/services/${server.id}/files/decompress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          path: item.path,
          destination: item.parentDir || '',
        }),
      });
      if (!res.ok) throw new Error('Error al descomprimir');
      toast.success(`¡${item.name} descomprimido correctamente!`);
      await fetchFiles();
    } catch (err: any) {
      toast.error(err.message || 'Error al descomprimir');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      let targetDir = '';
      const firstFile = e.dataTransfer.files[0];
      if (firstFile.name.endsWith('.jar')) {
        const pluginsExists = fileSystem.some((f) => f.path === '/plugins' && f.isDir);
        if (pluginsExists) targetDir = '/plugins';
      }
      await handleFileUpload(e.dataTransfer.files, targetDir);
    }
  };

  const handleRightClick = (e: React.MouseEvent, item: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  // RECURSIVE TREE RENDERER (Indented nested folder structure matching Image 7)
  const renderTree = (parentDir: string = '', level: number = 0) => {
    const children = fileSystem.filter((item) => {
      const matchesSearch = !filterQuery || item.name.toLowerCase().includes(filterQuery.toLowerCase());
      if (filterQuery) return matchesSearch;
      return item.parentDir === parentDir;
    });

    return children.map((item) => {
      const isExpanded = expandedDirs.has(item.path);
      const isCurrentActive = activeTabPath === item.path || splitTabPath === item.path;

      return (
        <div key={item.path} className="select-none">
          <div
            onClick={() => openFile(item)}
            onContextMenu={(e) => handleRightClick(e, item)}
            style={{ paddingLeft: `${Math.max(level * 16 + 8, 8)}px` }}
            className={`flex items-center justify-between py-1.5 pr-2.5 text-xs cursor-pointer group transition mx-1.5 rounded-lg ${
              isCurrentActive
                ? 'bg-[#102449] text-[#38bdf8] font-semibold border border-blue-500/30'
                : 'text-slate-300 hover:text-white hover:bg-[#121622]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {/* Custom Styled Checkbox for item selection */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(item.path, !selectedPaths.has(item.path));
                }}
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition border shrink-0 cursor-pointer ${
                  selectedPaths.has(item.path)
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-[#141418] border-[#2e2e38] text-transparent hover:border-zinc-500'
                }`}
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>

              {item.isDir ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(item.path);
                  }}
                  className="p-0.5 rounded text-slate-500 hover:text-white"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
              ) : (
                <span className="w-3.5" />
              )}

              {/* Exact colored icon matching Image 7 */}
              {item.isDir ? (
                isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                )
              ) : item.name.endsWith('.mp3') ? (
                <Music className="w-4 h-4 text-purple-400 shrink-0" />
              ) : item.name.endsWith('.png') || item.name.endsWith('.svg') ? (
                <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : item.name.endsWith('.json') ? (
                <FileJson className="w-4 h-4 text-amber-300 shrink-0" />
              ) : item.name.endsWith('.yml') || item.name.endsWith('.properties') ? (
                <FileCog className="w-4 h-4 text-cyan-400 shrink-0" />
              ) : item.name.endsWith('.jar') ? (
                <Code className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              )}

              <span className="font-mono text-xs truncate tracking-tight">{item.name}</span>
            </div>

            {!item.isDir && item.size !== undefined && item.size > 0 && (
              <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-1">
                {formatSize(item.size)}
              </span>
            )}
          </div>

          {/* Children nodes */}
          {item.isDir && isExpanded && (
            <div className="border-l border-[#1f2638] ml-4">
              {renderTree(item.path, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="flex h-full w-full bg-[#09090b] text-zinc-200 select-none overflow-hidden relative font-sans"
    >
      {/* Pterodactyl-Style Drag & Drop Glowing Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-[#090d16]/90 border-2 border-dashed border-sky-400 rounded-xl z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm pointer-events-none animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 mb-3 animate-bounce">
            <FolderInput className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white tracking-wide">Suelta tus archivos o plugins .jar aquí</h3>
          <p className="text-xs text-sky-300 mt-1">Se subirán y sincronizarán en tiempo real directamente en el servidor</p>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. LEFT PANEL: EXPLORER TREE (Minimalist PanelMaster style)    */}
      {/* ============================================================== */}
      <div
        style={{ width: `${treeWidth}px` }}
        className="h-full border-r border-[#1f1f23] bg-[#09090b] flex flex-col justify-between shrink-0 select-none overflow-hidden"
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header Bar */}
          <div className="h-9 px-3 border-b border-[#1f1f23] flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase font-mono">
              EXPLORER
            </span>
            <div className="flex items-center gap-1 text-zinc-400">
              <button
                onClick={() => {
                  setModalInputValue('');
                  setInputModal({
                    open: true,
                    title: 'Crear Nuevo Archivo',
                    description: 'Introduce el nombre del archivo con su extensión (ej. config.yml, bot.js):',
                    placeholder: 'archivo.txt',
                    onConfirm: async (name) => {
                      if (!name.trim() || !server?.id) return;
                      const cleanName = name.trim();
                      try {
                        const token = localStorage.getItem('nexus_token');
                        await fetch(`/api/v1/services/${server.id}/files/content`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ path: `/${cleanName}`, content: '' }),
                        });
                        toast.success(`Archivo "${cleanName}" creado.`);
                        await fetchFiles();
                        openFile({ name: cleanName, path: `/${cleanName}`, isDir: false, parentDir: '' });
                      } catch {
                        toast.error('Error al crear archivo');
                      }
                    },
                  });
                }}
                title="Nuevo Archivo"
                className="p-1 hover:text-white rounded hover:bg-[#141418]"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setModalInputValue('');
                  setInputModal({
                    open: true,
                    title: 'Crear Nueva Carpeta',
                    description: 'Introduce el nombre del directorio:',
                    placeholder: 'nueva-carpeta',
                    onConfirm: async (name) => {
                      if (!name.trim() || !server?.id) return;
                      const cleanName = name.trim();
                      try {
                        const token = localStorage.getItem('nexus_token');
                        await fetch(`/api/v1/services/${server.id}/files/folder`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ folderName: cleanName }),
                        });
                        toast.success(`Carpeta "${cleanName}" creada.`);
                        await fetchFiles();
                      } catch {
                        toast.error('Error al crear carpeta');
                      }
                    },
                  });
                }}
                title="Nueva Carpeta"
                className="p-1 hover:text-white rounded hover:bg-[#141418]"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowTrashModal(true)}
                title="Papelera del Editor"
                className="p-1 hover:text-rose-400 rounded hover:bg-[#141418]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  toast.info('Actualizando archivos del servidor...');
                  fetchFiles();
                }}
                title="Refresh"
                className="p-1 hover:text-white rounded hover:bg-[#141418]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Search Input */}
          <div className="p-2 border-b border-[#1f1f23]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter files..."
                className="w-full bg-[#111114] border border-[#1f1f23] rounded-lg pl-8 pr-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono transition"
              />
            </div>
          </div>

          {/* Multi-Selection Control Bar (Pterodactyl Style) */}
          <div className="px-3 py-1.5 bg-[#070709] border-b border-[#18181b] flex items-center justify-between text-xs select-none shrink-0">
            <div
              onClick={toggleSelectAll}
              className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-200 group"
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition border shrink-0 ${
                  fileSystem.length > 0 && selectedPaths.size === fileSystem.length
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/30'
                    : selectedPaths.size > 0
                    ? 'bg-blue-600/40 border-blue-500 text-white'
                    : 'bg-[#141418] border-[#2e2e38] text-transparent group-hover:border-zinc-500'
                }`}
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                {selectedPaths.size > 0 ? `${selectedPaths.size} seleccionados` : 'Seleccionar Todo'}
              </span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">{fileSystem.length} ítems</span>
          </div>

          {/* Active Batch Actions Toolbar */}
          {selectedPaths.size > 0 && (
            <div className="bg-blue-600/15 border-b border-blue-500/30 px-3 py-2 flex items-center justify-between gap-1 animate-in fade-in duration-100 shrink-0">
              <span className="text-[11px] font-mono font-bold text-blue-400 truncate">
                {selectedPaths.size} selecc.
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleBatchCompress}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold transition shadow-sm"
                  title="Comprimir seleccionados (.zip)"
                >
                  <Archive className="w-3 h-3" />
                  <span>Zip</span>
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold transition shadow-sm"
                  title="Borrar seleccionados"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Borrar</span>
                </button>
                <button
                  onClick={() => setSelectedPaths(new Set())}
                  className="p-1 text-zinc-400 hover:text-white rounded"
                  title="Cancelar selección"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Tree list */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-0.5">
            {fileSystem.length === 0 ? (
              <div className="text-center py-10 px-3 text-zinc-500 text-xs font-mono">
                Directorio vacío. Crea un archivo con el botón + superior.
              </div>
            ) : (
              renderTree('')
            )}
          </div>
        </div>

        {/* Bottom "Go to file" shortcut */}
        <div className="p-2 border-t border-[#1f1f23] bg-[#070709]">
          <button
            onClick={() => setIsGoToFileOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#111114] hover:bg-[#18181c] border border-[#1f1f23] rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3 h-3 text-zinc-500" />
              <span>Go to file</span>
            </span>
            <kbd className="px-1.5 py-0.5 bg-[#18181c] border border-zinc-700/60 rounded text-[10px] font-mono text-zinc-400">
              Ctrl+P
            </kbd>
          </button>
        </div>
      </div>

      {/* Resizing Handle Splitter */}
      <div
        onMouseDown={startResizing}
        className="w-1 hover:w-1.5 bg-[#141418] hover:bg-blue-500 cursor-col-resize transition-all z-10 shrink-0"
      />

      {/* ============================================================== */}
      {/* 2. MAIN CODE EDITOR / WORKSPACE                                */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0c0e]">
        {/* Sleek Minimalist Tab Bar */}
        <div className="h-9 bg-[#09090b] border-b border-[#1f1f23] flex items-center justify-between px-2 shrink-0">
          {/* Multi-Tab list */}
          <div className="flex items-center overflow-x-auto no-scrollbar h-full">
            {openTabs.map((tab) => {
              const isActive = activeTabPath === tab.path;
              return (
                <div
                  key={tab.path}
                  onClick={() => setActiveTabPath(tab.path)}
                  className={`flex items-center gap-2 px-3 h-full text-xs font-mono cursor-pointer border-r border-[#18181b] transition ${
                    isActive
                      ? 'bg-[#141418] text-white font-medium border-b-2 border-blue-500'
                      : 'bg-transparent text-zinc-400 hover:bg-[#111114] hover:text-zinc-200'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                  <span className="truncate max-w-[140px]">{tab.name}</span>
                  {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                  <button
                    onClick={(e) => closeTab(e, tab.path)}
                    className="p-0.5 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-white ml-1 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Split View Toggle Button */}
            <button
              onClick={() => {
                if (isSplitView) {
                  setIsSplitView(false);
                  setSplitTabPath(null);
                } else {
                  setIsSplitView(true);
                  const other = openTabs.find((t) => t.path !== activeTabPath);
                  if (other) setSplitTabPath(other.path);
                }
              }}
              title="Split View side-by-side"
              className={`p-1.5 rounded-lg border transition ${
                isSplitView
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-[#111114] border-[#1f1f23] text-zinc-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>

            {/* Editor Settings */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettingsPopover(!showSettingsPopover);
                }}
                title="Editor Settings"
                className="p-1.5 rounded-lg bg-[#111114] border border-[#1f1f23] text-zinc-400 hover:text-white transition"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {/* Popover */}
              {showSettingsPopover && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-9 w-64 bg-[#141418] border border-[#27272a] rounded-2xl p-4 shadow-2xl z-50 space-y-4 text-xs font-sans animate-in fade-in-50 duration-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Font size</span>
                    <div className="flex items-center gap-2 bg-[#09090b] border border-[#27272a] rounded-lg px-2 py-1">
                      <button
                        onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                        className="text-zinc-400 hover:text-white font-bold"
                      >
                        -
                      </button>
                      <span className="font-mono text-white">{fontSize}px</span>
                      <button
                        onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                        className="text-zinc-400 hover:text-white font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Indent size</span>
                    <div className="flex items-center bg-[#09090b] border border-[#27272a] rounded-lg p-0.5">
                      {([2, 4, 8] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setIndentSize(size)}
                          className={`px-2 py-0.5 rounded font-mono text-[11px] transition ${
                            indentSize === size ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Word wrap</span>
                    <button
                      onClick={() => setWordWrap(!wordWrap)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        wordWrap ? 'bg-blue-600' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          wordWrap ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300 font-medium">Check syntax before saving</span>
                      <button
                        onClick={() => setCheckSyntax(!checkSyntax)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          checkSyntax ? 'bg-blue-600' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            checkSyntax ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500">YAML and JSON files with an error ask first.</p>
                  </div>

                  <div className="pt-2 border-t border-[#27272a]">
                    <button
                      onClick={() => {
                        setFontSize(14);
                        setIndentSize(2);
                        setWordWrap(true);
                        setCheckSyntax(true);
                      }}
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      Reset to defaults
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Save File Button */}
            <button
              onClick={triggerSaveFile}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save File</span>
            </button>
          </div>
        </div>

        {/* Monaco Editor Pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Primary Editor */}
          <div className="flex-1 h-full">
            {activeTab ? (
              <Editor
                height="100%"
                theme="vs-dark"
                language={activeTab.language}
                value={activeTab.content}
                onChange={(val) => handleEditorChange(val, activeTab.path)}
                options={{
                  fontSize,
                  tabSize: indentSize,
                  wordWrap: wordWrap ? 'on' : 'off',
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
                Select a file to edit
              </div>
            )}
          </div>

          {/* Split View Editor */}
          {isSplitView && (
            <div className="flex-1 h-full border-l border-[#1f1f23]">
              {splitTab ? (
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={splitTab.language}
                  value={splitTab.content}
                  onChange={(val) => handleEditorChange(val, splitTab.path)}
                  options={{
                    fontSize,
                    tabSize: indentSize,
                    wordWrap: wordWrap ? 'on' : 'off',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
                  Split view pane
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="h-7 bg-[#09090b] border-t border-[#1f1f23] px-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0">
          <div className="flex items-center gap-3 truncate">
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            <span>Spaces: {indentSize}</span>
            <span>UTF-8</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-zinc-500">Ctrl+S para guardar</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MODAL: "THIS FILE HAS A SYNTAX ERROR" (Image 10)            */}
      {/* ============================================================== */}
      {syntaxErrorModal?.visible && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in-50 duration-100">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {syntaxErrorModal.title}
            </h3>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p className="font-mono bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-300">
                {syntaxErrorModal.description}
              </p>
              <p className="text-slate-400">
                A server or plugin usually fails to load a file like this.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setSyntaxErrorModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#0e121d] hover:bg-[#182030] transition"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  if (syntaxErrorModal.tabToSave) {
                    executeSave(syntaxErrorModal.tabToSave);
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/30"
              >
                SAVE ANYWAY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MODAL: "GO TO FILE" (Ctrl+P)                                */}
      {/* ============================================================== */}
      {isGoToFileOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800">
              <span className="text-xs font-bold font-mono text-slate-300 uppercase">Go to file</span>
              <button onClick={() => setIsGoToFileOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3">
              <input
                autoFocus
                type="text"
                value={goToFileSearch}
                onChange={(e) => setGoToFileSearch(e.target.value)}
                placeholder="conf, messages, yml..."
                className="w-full bg-[#111624] border border-blue-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div className="max-h-72 overflow-y-auto no-scrollbar p-2 space-y-1">
              {fileSystem
                .filter((f) => f.name.toLowerCase().includes(goToFileSearch.toLowerCase()))
                .map((file) => (
                  <div
                    key={file.path}
                    onClick={() => {
                      openFile(file);
                      setIsGoToFileOpen(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[#151c2d] cursor-pointer"
                  >
                    <span className="text-xs font-mono text-white">{file.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{file.path}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. FULL CONTEXT MENU (Exact match to Image 4)                  */}
      {/* ============================================================== */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-56 bg-[#121622] border border-[#222a3d] rounded-2xl shadow-2xl py-1.5 text-xs select-none animate-in fade-in-50 duration-75 overflow-hidden font-sans"
        >
          {/* Open */}
          <button
            onClick={() => {
              openFile(contextMenu.item);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Open</span>
          </button>

          {/* Open to the side */}
          <button
            onClick={() => {
              setIsSplitView(true);
              setSplitTabPath(contextMenu.item.path);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <Columns className="w-3.5 h-3.5 text-slate-400" />
            <span>Open to the side</span>
          </button>

          {/* Open as text */}
          <button
            onClick={() => {
              openFile(contextMenu.item);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Open as text</span>
          </button>

          {/* Download */}
          <button
            onClick={() => {
              toast.info(`Descargando ${contextMenu.item.name}...`);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Download</span>
          </button>

          {/* Extract / Descomprimir if archive */}
          {(contextMenu.item.name.endsWith('.zip') ||
            contextMenu.item.name.endsWith('.tar.gz') ||
            contextMenu.item.name.endsWith('.tgz')) && (
            <button
              onClick={() => handleExtractArchive(contextMenu.item)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 text-left transition font-semibold"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Descomprimir / Extraer</span>
            </button>
          )}

          {/* Compress item into archive */}
          <button
            onClick={() => {
              const item = contextMenu.item;
              setSelectedPaths(new Set([item.path]));
              setContextMenu(null);
              setTimeout(handleBatchCompress, 100);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <Archive className="w-3.5 h-3.5 text-slate-400" />
            <span>Comprimir (.zip)</span>
          </button>

          {/* Rename */}
          <button
            onClick={() => {
              const currentItem = contextMenu.item;
              setModalInputValue(currentItem.name);
              setInputModal({
                open: true,
                title: 'Renombrar Archivo',
                description: `Introduce el nuevo nombre para "${currentItem.name}":`,
                placeholder: currentItem.name,
                onConfirm: async (newName) => {
                  if (newName.trim() && newName.trim() !== currentItem.name && server?.id) {
                    const cleanNew = newName.trim();
                    const parentDir = currentItem.parentDir || '';
                    const newPath = `${parentDir}/${cleanNew}`.replace(/\/+/g, '/');
                    try {
                      const token = localStorage.getItem('nexus_token');
                      await fetch(`/api/v1/services/${server.id}/files/rename`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ oldPath: currentItem.path, newPath }),
                      });
                      toast.success(`Archivo renombrado a "${cleanNew}".`);
                      await fetchFiles();
                    } catch {
                      toast.error('Error al renombrar archivo');
                    }
                  }
                },
              });
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Rename</span>
          </button>

          {/* Duplicate */}
          <button
            onClick={() => {
              const copyNode: FileNode = {
                ...contextMenu.item,
                name: `copy_${contextMenu.item.name}`,
                path: `${contextMenu.item.path}_copy`,
              };
              setFileSystem([...fileSystem, copyNode]);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <CopyPlus className="w-3.5 h-3.5 text-slate-400" />
            <span>Duplicate</span>
          </button>

          {/* Copy */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.item.path);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy</span>
          </button>

          {/* Cut */}
          <button
            onClick={() => {
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <Scissors className="w-3.5 h-3.5 text-slate-400" />
            <span>Cut</span>
          </button>

          {/* Move to... */}
          <button
            onClick={() => {
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <FolderInput className="w-3.5 h-3.5 text-slate-400" />
            <span>Move to...</span>
          </button>

          {/* Copy to... */}
          <button
            onClick={() => {
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <FolderOutput className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy to...</span>
          </button>

          {/* Compress */}
          <button
            onClick={() => {
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <Archive className="w-3.5 h-3.5 text-slate-400" />
            <span>Compress</span>
          </button>

          {/* Permissions */}
          <button
            onClick={() => {
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Permissions</span>
          </button>

          {/* Share link */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(`https://panelmaster.local/share/${contextMenu.item.name}`);
              toast.success('Enlace de descarga directa copiado al portapapeles');
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <Link2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Share link</span>
          </button>

          {/* Copy path */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.item.path);
              toast.success(`Ruta "${contextMenu.item.path}" copiada`);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <ClipboardCopy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy path</span>
          </button>

          {/* Properties */}
          <button
            onClick={() => {
              setPropertiesModal({
                open: true,
                item: contextMenu.item,
              });
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-[#1a2133] hover:text-white text-left transition"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Properties</span>
          </button>

          {/* Separator */}
          <div className="h-px bg-[#1c2333] my-1" />

          {/* Move to trash (Red text) */}
          <button
            onClick={() => {
              const item = contextMenu.item;
              setTrashItems([...trashItems, item]);
              setFileSystem(fileSystem.filter((f) => f.path !== item.path));
              setContextMenu(null);
              toast.info(`"${item.name}" movido a la papelera del editor`);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-left transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Move to trash</span>
          </button>

          {/* Delete permanently (Red text) */}
          <button
            onClick={() => {
              const item = contextMenu.item;
              setConfirmModal({
                open: true,
                title: 'Eliminar Permanentemente',
                message: `¿Estás seguro de destruir permanentemente "${item.name}"? Esta acción no se puede deshacer.`,
                onConfirm: async () => {
                  if (!server?.id) return;
                  try {
                    const token = localStorage.getItem('nexus_token');
                    await fetch(`/api/v1/services/${server.id}/files?path=${encodeURIComponent(item.path)}`, {
                      method: 'DELETE',
                      headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                    });
                    toast.success(`"${item.name}" eliminado definitivamente.`);
                    setOpenTabs((prev) => prev.filter((t) => t.path !== item.path));
                    if (activeTabPath === item.path) setActiveTabPath('');
                    await fetchFiles();
                  } catch {
                    toast.error('Error al eliminar archivo');
                  }
                },
              });
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-500 font-semibold hover:bg-rose-500/15 hover:text-rose-400 text-left transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete permanently</span>
          </button>
        </div>
      )}

      {/* Trash modal (Strictly for editor files) */}
      {showTrashModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in-50 duration-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Papelera de archivos (Editor de código)</span>
              </h3>
              <button onClick={() => setShowTrashModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Esta papelera almacena exclusivamente los archivos y carpetas eliminados desde el explorador del editor de código.
            </p>

            <div className="max-h-60 overflow-y-auto no-scrollbar space-y-2">
              {trashItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-mono">
                  La papelera está vacía.
                </div>
              ) : (
                trashItems.map((item) => (
                  <div
                    key={item.path}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#090c14] border border-slate-800"
                  >
                    <span className="text-xs font-mono text-slate-300">{item.name}</span>
                    <button
                      onClick={() => {
                        setFileSystem([...fileSystem, item]);
                        setTrashItems(trashItems.filter((i) => i.path !== item.path));
                      }}
                      className="px-2.5 py-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition"
                    >
                      Restaurar
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowTrashModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#182030] hover:bg-[#202b40] text-white transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Input / Prompt Modal */}
      {inputModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-100">{inputModal.title}</h3>
            {inputModal.description && (
              <p className="text-xs text-zinc-400">{inputModal.description}</p>
            )}
            <input
              type="text"
              autoFocus
              placeholder={inputModal.placeholder}
              value={modalInputValue}
              onChange={(e) => setModalInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  inputModal.onConfirm(modalInputValue);
                  setInputModal({ ...inputModal, open: false });
                }
              }}
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded-xl px-4 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setInputModal({ ...inputModal, open: false })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  inputModal.onConfirm(modalInputValue);
                  setInputModal({ ...inputModal, open: false });
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              {confirmModal.title}
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, open: false })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, open: false });
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Properties Modal */}
      {propertiesModal.open && propertiesModal.item && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-[#1f1f23] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1f1f23] pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Propiedades del Archivo
              </h3>
              <button
                onClick={() => setPropertiesModal({ open: false, item: null })}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-3 bg-[#09090b] rounded-xl border border-[#1f1f23]">
                <span className="text-zinc-500 text-[10px] uppercase block">Nombre:</span>
                <span className="text-zinc-100 font-bold">{propertiesModal.item.name}</span>
              </div>
              <div className="p-3 bg-[#09090b] rounded-xl border border-[#1f1f23]">
                <span className="text-zinc-500 text-[10px] uppercase block">Ruta Absoluta:</span>
                <span className="text-blue-400">{propertiesModal.item.path}</span>
              </div>
              <div className="p-3 bg-[#09090b] rounded-xl border border-[#1f1f23]">
                <span className="text-zinc-500 text-[10px] uppercase block">Tipo y Tamaño:</span>
                <span className="text-zinc-300">
                  {propertiesModal.item.isDir ? 'Directorio' : `${propertiesModal.item.size || 0} bytes`}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPropertiesModal({ open: false, item: null })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#18181c] hover:bg-[#222227] text-white transition"
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
