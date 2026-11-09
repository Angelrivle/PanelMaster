import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Play, Square, RotateCw, Terminal as TermIcon, Wifi, WifiOff } from 'lucide-react';

interface ConsoleTerminalProps {
  serviceId: string;
  serviceStatus: string;
  onAction: (action: 'START' | 'STOP' | 'RESTART') => void;
}

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({
  serviceId,
  serviceStatus,
  onAction,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [commandInput, setCommandInput] = useState<string>('');

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

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/services/${serviceId}/console`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      term.writeln('\r\n\x1b[1;31m✗ Conexión de consola cerrada por el host.\x1b[0m');
    };

    ws.onerror = () => {
      setIsConnected(false);
      term.writeln('\r\n\x1b[1;31m✗ Error de comunicación en websocket de consola.\x1b[0m');
    };

    // Forward terminal keystrokes to WS
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [serviceId]);

  const handlePowerAction = (act: 'START' | 'STOP' | 'RESTART') => {
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
    setCommandInput('');
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

        {/* Quick Power Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePowerAction('START')}
            disabled={serviceStatus === 'RUNNING'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Iniciar
          </button>
          <button
            onClick={() => handlePowerAction('RESTART')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-medium transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
          <button
            onClick={() => handlePowerAction('STOP')}
            disabled={serviceStatus !== 'RUNNING'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition disabled:opacity-40"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Detener
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div ref={terminalRef} className="flex-1 p-2 overflow-hidden" />

      {/* Interactive Command Input Box */}
      <form onSubmit={sendCommand} className="flex items-center border-t border-slate-800 bg-[#0d1322] px-3 py-2">
        <span className="text-sky-400 font-mono text-sm mr-2 font-bold">&gt;</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Enviar comando a la consola de la aplicación (ej. 'say ¡Hola servidor!', 'op username', 'reload')..."
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
