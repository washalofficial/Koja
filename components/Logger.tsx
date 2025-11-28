import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LoggerProps {
  logs: LogEntry[];
}

export const Logger: React.FC<LoggerProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-48 sm:h-64 shadow-inner">
      <div className="bg-slate-800 px-3 py-1 text-xs font-mono text-slate-400 border-b border-slate-700 flex justify-between items-center">
        <span>TERMINAL OUTPUT</span>
        <span className="text-[10px] bg-slate-700 px-1.5 rounded">{logs.length} events</span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1"
      >
        {logs.length === 0 && (
          <div className="text-slate-600 italic">Ready to sync...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="break-all">
            <span className="text-slate-500 mr-2">
              [{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]
            </span>
            <span className={`
              ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
              ${log.type === 'success' ? 'text-green-500 font-bold' : ''}
              ${log.type === 'warning' ? 'text-yellow-400 font-bold' : ''}
              ${log.type === 'info' ? 'text-slate-300' : ''}
            `}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};