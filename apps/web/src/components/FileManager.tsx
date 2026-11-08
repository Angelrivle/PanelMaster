import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  Folder,
  File,
  Save,
  Trash2,
  RefreshCw,
  FolderPlus,
  FilePlus,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { toast } from './Toast';

interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modifiedTime: string;
}

interface FileManagerProps {
  serviceId: string;
}

export const FileManager: React.FC<FileManagerProps> = ({ serviceId }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchFiles = async (dir: string = '') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/services/${serviceId}/files?path=${encodeURIComponent(dir)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('nexus_token')}`,
          'x-organization-id': localStorage.getItem('nexus_org_id') || '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data || []);
      }
    } catch (e) {
      console.error('Error fetching file list', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPath);
  }, [serviceId, currentPath]);

  const openFile = async (path: string) => {
    setSelectedFile(path);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/services/${serviceId}/files/content?path=${encodeURIComponent(path)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('nexus_token')}`,
          'x-organization-id': localStorage.getItem('nexus_org_id') || '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
      }
    } catch (e) {
      console.error('Error reading file content', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/services/${serviceId}/files/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('nexus_token')}`,
          'x-organization-id': localStorage.getItem('nexus_org_id') || '',
        },
        body: JSON.stringify({ path: selectedFile, content: fileContent }),
      });
      if (res.ok) {
        toast.success('Archivo guardado correctamente');
      }
    } catch (e) {
      toast.error('Error al guardar archivo');
    } finally {
      setIsSaving(false);
    }
  };

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return 'yaml';
    if (filename.endsWith('.properties') || filename.endsWith('.env')) return 'ini';
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.sh')) return 'shell';
    if (filename.endsWith('.md')) return 'markdown';
    return 'plaintext';
  };

  return (
    <div className="flex h-[620px] bg-[#090d16] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Sidebar: File Explorer */}
      <div className="w-72 bg-[#0c121e] border-r border-slate-800 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 bg-[#0f172a]">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Explorador de Archivos</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchFiles(currentPath)}
              className="p-1 text-slate-400 hover:text-slate-200 transition"
              title="Recargar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="px-3 py-1.5 bg-slate-900/60 text-xs font-mono text-slate-400 border-b border-slate-800/80 truncate">
          /{currentPath}
        </div>

        {/* Tree Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {currentPath !== '' && (
            <div
              onClick={() => {
                const parts = currentPath.split('/');
                parts.pop();
                setCurrentPath(parts.join('/'));
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-sky-400 hover:bg-slate-800 cursor-pointer"
            >
              <Folder className="w-4 h-4 fill-sky-400/20" />
              <span>.. (Subir nivel)</span>
            </div>
          )}

          {files.map((file) => (
            <div
              key={file.path}
              onClick={() => {
                if (file.isDirectory) {
                  setCurrentPath(file.path);
                } else {
                  openFile(file.path);
                }
              }}
              className={`flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition ${
                selectedFile === file.path
                  ? 'bg-sky-600/30 text-sky-300 font-medium'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {file.isDirectory ? (
                  <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                ) : (
                  <File className="w-4 h-4 text-slate-400" />
                )}
                <span className="truncate">{file.name}</span>
              </div>
              {!file.isDirectory && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          ))}

          {files.length === 0 && !isLoading && (
            <div className="text-center py-8 text-xs text-slate-500">Carpeta vacía</div>
          )}
        </div>
      </div>

      {/* Main: Monaco Code Editor */}
      <div className="flex-1 flex flex-col bg-[#0b0f19]">
        {selectedFile ? (
          <>
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0d1322]">
              <span className="font-mono text-xs text-slate-300 truncate">{selectedFile}</span>
              <button
                onClick={saveFile}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            {/* Monaco Component */}
            <div className="flex-1">
              <Editor
                height="100%"
                theme="vs-dark"
                language={getLanguage(selectedFile)}
                value={fileContent}
                onChange={(val) => setFileContent(val || '')}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <File className="w-12 h-12 mb-3 stroke-1 text-slate-600" />
            <p className="text-sm font-medium">Selecciona un archivo del explorador para editarlo con Monaco</p>
            <p className="text-xs text-slate-600 mt-1">Soporta autocompletado, resaltado de sintaxis y guardado instantáneo</p>
          </div>
        )}
      </div>
    </div>
  );
};
