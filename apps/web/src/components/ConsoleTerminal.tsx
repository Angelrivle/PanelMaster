import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Play, Square, RotateCw, Terminal as TermIcon, Wifi, WifiOff, ZapOff, Trash2, Copy, Check } from 'lucide-react';
import { toast } from './Toast';

interface ConsoleTerminalProps {
  serviceId: string;
  serviceStatus: string;
  onAction: (action: 'START' | 'STOP' | 'RESTART' | 'KILL', skipHttp?: boolean) => void;
  onStatusChange?: (status: string) => void;
}

const MINECRAFT_COLOR_MAP: Record<string, string> = {
  '0': '\x1b[30m',
  '1': '\x1b[34m',
  '2': '\x1b[32m',
  '3': '\x1b[36m',
  '4': '\x1b[31m',
  '5': '\x1b[35m',
  '6': '\x1b[33m',
  '7': '\x1b[37m',
  '8': '\x1b[90m',
  '9': '\x1b[94m',
  'a': '\x1b[92m',
  'b': '\x1b[96m',
  'c': '\x1b[91m',
  'd': '\x1b[95m',
  'e': '\x1b[93m',
  'f': '\x1b[97m',
  'l': '\x1b[1m',
  'm': '\x1b[9m',
  'n': '\x1b[4m',
  'o': '\x1b[3m',
  'r': '\x1b[0m',
};

function colorizeLogLine(line: string): string {
  if (!line || typeof line !== 'string') return line;
  let text = line.replace(/[\r\n]+$/, '');
  if (!text) return '';

  if (text.startsWith('{"message":') && text.includes('No such container')) {
    return '\x1b[33m[PanelMaster Daemon]\x1b[0m Contenedor anterior no encontrado. Creando nuevo entorno aislado...';
  }

  if (text.includes('[PanelMaster Daemon]') && !text.includes('\x1b[')) {
    return `\x1b[36m${text}\x1b[0m`;
  }

  if (text.startsWith('[PanelMaster]') && !text.includes('\x1b[')) {
    return `\x1b[1;36m${text}\x1b[0m`;
  }

  if (text.includes('§')) {
    text = text.replace(/§([0-9a-fk-orA-FK-OR])/g, (_, code) => {
      const lower = code.toLowerCase();
      return MINECRAFT_COLOR_MAP[lower] || '';
    }) + '\x1b[0m';
  }

  if (text.startsWith('> ') || text.startsWith('\x1b[38;5;242m> ') || text.startsWith('\x1b[38;5;75m> ')) {
    const rawCmd = text.replace(/^(\x1b\[[^m]+m> |> )/, '');
    return `\x1b[1;34m❯ \x1b[1;37m${rawCmd}\x1b[0m`;
  }

  text = text.replace(
    /^\[(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(INFO|WARN|WARNING|ERROR|FATAL|SEVERE|DEBUG|TRACE)\]:?\s*/i,
    (_, time, level) => {
      const lvlUpper = level.toUpperCase();
      let lvlColor = '\x1b[32m';
      if (lvlUpper === 'WARN' || lvlUpper === 'WARNING') lvlColor = '\x1b[33m';
      else if (lvlUpper === 'ERROR' || lvlUpper === 'FATAL' || lvlUpper === 'SEVERE') lvlColor = '\x1b[31m';
      else if (lvlUpper === 'DEBUG' || lvlUpper === 'TRACE') lvlColor = '\x1b[36m';
      return `[\x1b[90m${time}\x1b[0m ${lvlColor}${lvlUpper}\x1b[0m]: `;
    }
  );

  text = text.replace(
    /^(\[\d{2}:\d{2}:\d{2}(?:\.\d+)?\]|\d{2}:\d{2}:\d{2})\s*/,
    '\x1b[90m$1\x1b[0m '
  );

  text = text.replace(
    /\[([^\]\/]+)\/(INFO|WARN|WARNING|ERROR|FATAL|SEVERE|DEBUG|TRACE)\]:?/i,
    (_, thread, level) => {
      const lvlUpper = level.toUpperCase();
      let lvlColor = '\x1b[32m';
      if (lvlUpper === 'WARN' || lvlUpper === 'WARNING') lvlColor = '\x1b[33m';
      else if (lvlUpper === 'ERROR' || lvlUpper === 'FATAL' || lvlUpper === 'SEVERE') lvlColor = '\x1b[31m';
      else if (lvlUpper === 'DEBUG' || lvlUpper === 'TRACE') lvlColor = '\x1b[36m';
      return `[${thread}/${lvlColor}${lvlUpper}\x1b[0m]: `;
    }
  );

  return text;
}

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({
  serviceId,
  serviceStatus,
  onAction,
  onStatusChange,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(serviceStatus === 'RUNNING');
  const [commandInput, setCommandInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copiedConsole, setCopiedConsole] = useState<boolean>(false);

  const handleClearConsole = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      toast.success('Consola limpiada.');
    }
  };

  const handleCopyConsole = () => {
    if (xtermInstance.current) {
      xtermInstance.current.selectAll();
      const selection = xtermInstance.current.getSelection();
      xtermInstance.current.clearSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        setCopiedConsole(true);
        setTimeout(() => setCopiedConsole(false), 2000);
        toast.success('Salida de consola copiada al portapapeles.');
      }
    }
  };

  useEffect(() => {
    setIsOnline(serviceStatus === 'RUNNING');
  }, [serviceStatus]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Fira Code, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      theme: {
        background: '#090d16',
        foreground: '#e2e8f0',
        cursor: '#38bdf8',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#1e293b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#f8fafc',
      },
    });

    const safeFit = () => {
      try {
        if (!fitAddonRef.current || !terminalRef.current) return;
        const el = terminalRef.current;
        const width = el.clientWidth || el.offsetWidth;
        const height = el.clientHeight || el.offsetHeight;
        if (width > 60 && height > 40) {
          fitAddonRef.current.fit();
        }
      } catch {}
    };

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    // Smooth initial sizing with timeouts to accommodate tab transition animations
    requestAnimationFrame(safeFit);
    const t1 = setTimeout(safeFit, 60);
    const t2 = setTimeout(safeFit, 180);
    const t3 = setTimeout(safeFit, 400);

    // Enable native CTRL+C to copy selected text to clipboard
    term.attachCustomKeyEventHandler((arg: KeyboardEvent) => {
      if (arg.ctrlKey && (arg.key === 'c' || arg.code === 'KeyC') && term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection());
        return false;
      }
      return true;
    });

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    let isMounted = true;
    let reconnectTimeout: any = null;

    // Resilient Auto-Reconnecting WebSocket
    const connectWs = () => {
      if (!isMounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/services/${serviceId}/console`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        const text = typeof event.data === 'string' ? event.data : '';

        if (
          text.includes('El servidor se encuentra apagado') ||
          text.includes('Servidor detenido') ||
          text.includes('se ha detenido.') ||
          text.includes('No se pudo iniciar')
        ) {
          setIsOnline(false);
          onStatusChange?.('STOPPED');
        } else if (
          text.includes('Iniciando') ||
          text.includes('Arrancando contenedor') ||
          text.includes('Done (') ||
          text.includes('Starting Minecraft') ||
          text.includes('Listening on')
        ) {
          setIsOnline(true);
          onStatusChange?.('RUNNING');
        }

        // Colorize lines and normalize line endings for xterm
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const rawLine = lines[i];
          const colorized = colorizeLogLine(rawLine);
          if (i < lines.length - 1) {
            term.writeln(colorized);
          } else if (colorized) {
            term.write(colorized);
          }
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
        if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            if (isMounted) {
              term.writeln('\r\n\x1b[36m[PanelMaster] Reconectando consola con el host...\x1b[0m\r\n');
              connectWs();
            }
          }, 2500);
        }
      };

      ws.onerror = () => {
        if (!isMounted) return;
        setIsConnected(false);
      };
    };

    connectWs();

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      window.removeEventListener('resize', handleResize);
      if (socketRef.current) socketRef.current.close();
      term.dispose();
    };
  }, [serviceId]);

  const handlePowerAction = (act: 'START' | 'STOP' | 'RESTART' | 'KILL') => {
    if (act === 'START' || act === 'RESTART') {
      setIsOnline(true);
      onStatusChange?.('RUNNING');
    } else if (act === 'STOP' || act === 'KILL') {
      setIsOnline(false);
      onStatusChange?.('STOPPED');
    }

    const wsOpen = socketRef.current && socketRef.current.readyState === WebSocket.OPEN;
    if (wsOpen) {
      socketRef.current!.send(`__ACTION__:${act}`);
    }
    onAction(act, !!wsOpen);
  };

  const sendRawCommand = (cmd: string) => {
    const clean = cmd.trim();
    if (!clean || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    if (xtermInstance.current) {
      xtermInstance.current.writeln(`\x1b[1;34m❯ \x1b[1;37m${clean}\x1b[0m`);
    }

    socketRef.current.send(clean);
    setCommandHistory((prev) => [clean, ...prev.filter((c) => c !== clean)]);
  };

  const sendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = commandInput.trim();
    if (!clean) return;

    sendRawCommand(clean);
    setHistoryIndex(-1);
    setCommandInput('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(nextIdx);
      setCommandInput(commandHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommandInput(commandHistory[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    }
  };

  return (
    <div className="flex flex-col h-[580px] bg-[#090d16] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Console Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d1322] border-b border-slate-800">
        <div className="flex items-center gap-3">
          <TermIcon className="w-5 h-5 text-sky-400" />
          <span className="font-semibold text-sm tracking-wide text-slate-200">Terminal & Consola de Servidor</span>
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border border-slate-700 bg-slate-800/80">
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">En vivo</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 font-medium">Desconectado</span>
              </>
            )}
          </span>
        </div>

        {/* Terminal Utilities & Quick Power Controls (like Pterodactyl) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-1 border-r border-slate-700/80 pr-2">
            <button
              type="button"
              onClick={handleClearConsole}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Limpiar consola (Clear screen)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCopyConsole}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Copiar texto de consola"
            >
              {copiedConsole ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={() => handlePowerAction('START')}
            disabled={isOnline}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Iniciar
          </button>
          <button
            onClick={() => handlePowerAction('RESTART')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
          <button
            onClick={() => handlePowerAction('STOP')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Detener
          </button>
          <button
            onClick={() => handlePowerAction('KILL')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Forzar detención inmediata (SIGKILL)"
          >
            <ZapOff className="w-3.5 h-3.5" />
            Kill
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div ref={terminalRef} className="flex-1 p-2 overflow-hidden" />

      {/* Quick Action Pills (ZenMicroHoster style) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#090d16] border-t border-slate-800/80 overflow-x-auto text-[11px] font-mono">
        <span className="text-slate-500 text-[10px] uppercase font-bold mr-1 shrink-0">Acciones rápidas:</span>
        {['help', 'list', 'tps', 'status', 'save-all', 'plugins'].map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => sendRawCommand(cmd)}
            className="px-2 py-0.5 rounded bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer shrink-0"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Interactive Command Input Box with History */}
      <form onSubmit={sendCommand} className="flex items-center border-t border-slate-800 bg-[#0d1322] px-3 py-2">
        <span className="text-sky-400 font-mono text-sm mr-2 font-bold select-none">❯</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Enviar comando a la consola (Flechas ↑/↓ para historial, ej. 'op user', 'help')..."
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
        />
        <button
          type="submit"
          className="ml-2 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition cursor-pointer"
        >
          Enviar
        </button>
      </form>
    </div>
  );
};
