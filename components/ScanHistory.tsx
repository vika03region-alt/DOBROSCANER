import React from 'react';
import { ScanResult } from '../types';
import { Shield, ChevronRight, Calendar, AlertTriangle, CheckCircle, Search } from 'lucide-react';

interface ScanHistoryProps {
  history: ScanResult[];
  onViewResult: (result: ScanResult) => void;
}

const ScanHistory: React.FC<ScanHistoryProps> = ({ history, onViewResult }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
        <Shield size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-medium text-slate-300">No Scan History</p>
        <p className="text-sm">Completed scans with AI analysis will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Scan History</h2>
          <p className="text-slate-400">Archive of previous security assessments</p>
        </div>
        <div className="relative">
            <input 
                type="text" 
                placeholder="Search targets..." 
                className="bg-slate-800 border border-slate-700 text-sm text-white px-4 py-2 pl-10 rounded-lg focus:outline-none focus:border-green-500 w-64"
            />
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
        </div>
      </div>

      <div className="space-y-3">
        {history.map((scan, index) => {
          const score = scan.analysis?.securityScore || 0;
          const isGood = score > 70;
          const isBad = score < 40;
          
          return (
            <div 
              key={index} 
              onClick={() => onViewResult(scan)}
              className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg border ${
                  isGood ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                  isBad ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                  'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                }`}>
                  {score}
                </div>
                
                <div>
                  <h3 className="font-bold text-white text-lg">{scan.target}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(scan.timestamp).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {scan.analysis?.vulnerabilities.length || 0} Findings
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                 <div className="text-right hidden md:block">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Status</div>
                    {isGood ? (
                        <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                            <CheckCircle size={14} /> Passed
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-red-400 text-sm font-medium">
                            <AlertTriangle size={14} /> Critical
                        </div>
                    )}
                 </div>
                 <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <ChevronRight size={16} />
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScanHistory;