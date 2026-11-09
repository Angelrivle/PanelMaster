import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Play, Square, RotateCw, Terminal as TermIcon, Wifi, WifiOff, ZapOff } from 'lucide-react';

interface ConsoleTerminalProps {
  serviceId: string;
  serviceStatus: string;
  onAction: (action: 'START' | 'STOP' | 'RESTART' | 'KILL') => void;
  onStatusChange?: (status: string) => void;
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

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

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
        // Normalize line endings for xterm so lines don't stair-step horizontally
        const formatted = text.replace(/\r?\n/g, '\r\n');
        term.write(formatted);
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

    // Forward terminal keystrokes to WS
    term.onData((data) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(data);
      }
    });

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

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(`__ACTION__:${act}`);
    }
    onAction(act);
  };

  const sendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = commandInput.trim();
    if (!clean || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    if (xtermInstance.current) {
      xtermInstance.current.writeln(`\x1b[1;36m>\x1b[0m ${clean}`);
    }

    socketRef.current.send(clean);
    setCommandHistory((prev) => [clean, ...prev.filter((c) => c !== clean)]);
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

        {/* Quick Power Controls (Start, Restart, Stop, Kill like Pterodactyl) */}
        <div className="flex items-center gap-2">
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

      {/* Interactive Command Input Box with History */}
      <form onSubmit={sendCommand} className="flex items-center border-t border-slate-800 bg-[#0d1322] px-3 py-2">
        <span className="text-sky-400 font-mono text-sm mr-2 font-bold">&gt;</span>
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
          className="ml-2 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition"
        >
          Enviar
        </button>
      </form>
    </div>
  );
};
