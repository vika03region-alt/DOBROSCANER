import React, { useEffect, useRef } from 'react';

interface TerminalOutputProps {
  logs: string[];
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-black rounded-lg border border-slate-800 p-4 font-mono text-xs md:text-sm h-full flex flex-col shadow-inner">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
        <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
        <span className="ml-2 text-slate-600">bash -- lwscan</span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 scrollbar-hide text-slate-300"
      >
        {logs.length === 0 && (
          <div className="text-slate-600 italic">Waiting for command...</div>
        )}
        {logs.map((log, index) => (
          <div key={index} className="break-all">
            <span className="text-green-500 mr-2">$</span>
            <span className={log.includes('[CRITICAL]') ? 'text-red-400 font-bold' : log.includes('[WARN]') ? 'text-yellow-400' : 'text-slate-300'}>
              {log}
            </span>
          </div>
        ))}
        <div className="animate-pulse-green w-2 h-4 bg-green-500 inline-block mt-1"></div>
      </div>
    </div>
  );
};

export default TerminalOutput;
