import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import DashboardStats from './components/DashboardStats';
import TerminalOutput from './components/TerminalOutput';
import ScanHistory from './components/ScanHistory';
import { ScanConfig, ScanStatus, ScanResult, Severity } from './types';
import { analyzeScanLogs } from './services/geminiService';
import { ScanSimulation } from './services/simulationService';
import { Play, Loader2, AlertTriangle, CheckCircle, Zap, Terminal, Shield, StopCircle, Infinity as InfinityIcon, GitBranch } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logs, setLogs] = useState<string[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanStatus>(ScanStatus.IDLE);
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    target: '',
    ports: '80,443',
    modules: { portScan: true, whois: false, bannerGrab: true, vulnCheck: true, gitLeak: false },
    threads: 4,
    continuous: false
  });
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  
  // Load history from localStorage on mount
  const [scanHistory, setScanHistory] = useState<ScanResult[]>(() => {
    const saved = localStorage.getItem('lwscan_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Refs for scan loop control to avoid stale closures
  const scanQueueRef = useRef<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simulationRef = useRef<ScanSimulation | null>(null);
  
  // Critical: Keep refs synchronized with state for the async loop
  const statusRef = useRef(scanStatus);
  const configRef = useRef(scanConfig);

  useEffect(() => {
    statusRef.current = scanStatus;
  }, [scanStatus]);

  useEffect(() => {
    configRef.current = scanConfig;
  }, [scanConfig]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('lwscan_history', JSON.stringify(scanHistory));
  }, [scanHistory]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const processLogQueue = () => {
    // Check if user stopped the scan via state ref
    if (statusRef.current !== ScanStatus.RUNNING) {
        return; 
    }

    if (scanQueueRef.current.length === 0) {
      // Logic for Continuous Mode
      if (configRef.current.continuous) {
          if (simulationRef.current) {
              const monitoringLogs = simulationRef.current.generateMonitoringLogs();
              scanQueueRef.current.push(...monitoringLogs);
              // Pause between monitoring batches
              timeoutRef.current = setTimeout(processLogQueue, 2500); 
              return;
          }
      }

      setScanStatus(ScanStatus.COMPLETED);
      return;
    }

    const nextLog = scanQueueRef.current.shift();
    if (nextLog) {
      setLogs(prev => {
        // Keep logs from growing infinitely in continuous mode (max 200 lines for performance)
        const newLogs = [...prev, nextLog];
        return newLogs.length > 200 ? newLogs.slice(newLogs.length - 200) : newLogs;
      });
    }

    // Variable speed based on log type to mimic real scanner latency
    let delay = 50; // default fast
    if (nextLog?.includes('[SCAN]')) delay = 600;
    if (nextLog?.includes('[VULN]')) delay = 400;
    if (nextLog?.includes('[DATA]')) delay = 200;
    if (nextLog?.includes('[WARN]')) delay = 300;
    if (nextLog?.includes('[GIT]')) delay = 350;
    if (nextLog?.includes('[MONITOR]')) delay = 800; 

    timeoutRef.current = setTimeout(processLogQueue, delay);
  };

  const startScan = () => {
    if (!scanConfig.target) return alert("Please enter a target IP or domain.");
    
    // Reset state
    setScanStatus(ScanStatus.RUNNING);
    setLogs([]);
    setLastResult(null);
    setActiveTab('console');

    // Generate full scan path
    const simulation = new ScanSimulation(scanConfig);
    simulationRef.current = simulation; 
    const fullLogs = simulation.generateLogs();
    
    // Queue logs for "streaming" effect
    scanQueueRef.current = fullLogs;
    
    // Start processing (give state a moment to update refs via useEffect)
    setTimeout(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        processLogQueue();
    }, 100);
  };

  const stopScan = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    scanQueueRef.current = [];
    setLogs(prev => [...prev, "[!] Scan/Monitoring aborted by user."]);
    setScanStatus(ScanStatus.FAILED);
  };

  // Watch for completion to save result (only if not continuous, or manually analyzed)
  useEffect(() => {
    if (scanStatus === ScanStatus.COMPLETED && logs.length > 0) {
      setLastResult({
        target: scanConfig.target,
        timestamp: new Date().toISOString(),
        logs: logs,
      });
    }
  }, [scanStatus, logs, scanConfig.target]);

  const handleAnalyze = async () => {
    if (!lastResult && logs.length === 0) return;
    
    const targetLogs = lastResult ? lastResult.logs : logs;
    const targetName = lastResult ? lastResult.target : scanConfig.target;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeScanLogs(targetLogs, targetName);
      
      const fullResult: ScanResult = { 
        target: targetName,
        timestamp: new Date().toISOString(),
        logs: targetLogs,
        analysis 
      };

      setLastResult(fullResult);
      setScanHistory(prev => [fullResult, ...prev]);
      setActiveTab('results');
    } catch (e) {
      console.error(e);
      setLogs(prev => [...prev, `[ERROR] Analysis failed: ${(e as Error).message}`]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadHistoryItem = (result: ScanResult) => {
    setLastResult(result);
    setActiveTab('results');
  };

  const clearHistory = () => {
    if(confirm('Are you sure you want to clear all scan history?')) {
        setScanHistory([]);
        localStorage.removeItem('lwscan_history');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardStats history={scanHistory} />;
      case 'history':
        return (
            <div>
                <div className="flex justify-end mb-4 pr-8 max-w-5xl mx-auto">
                    {scanHistory.length > 0 && (
                        <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 underline">Clear History</button>
                    )}
                </div>
                <ScanHistory history={scanHistory} onViewResult={loadHistoryItem} />
            </div>
        );
      case 'scan':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 bg-green-500/20 rounded-lg text-green-400">
                    <Zap size={28} />
                 </div>
                 <div>
                   <h2 className="text-2xl font-bold text-white">New Vulnerability Scan</h2>
                   <p className="text-slate-400">Configure target parameters and modules</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Target IP / Domain</label>
                    <input 
                      type="text" 
                      value={scanConfig.target}
                      onChange={(e) => setScanConfig({...scanConfig, target: e.target.value})}
                      placeholder="e.g. 192.168.1.1 or example.com"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Ports Range</label>
                    <input 
                      type="text" 
                      value={scanConfig.ports}
                      onChange={(e) => setScanConfig({...scanConfig, ports: e.target.value})}
                      placeholder="80,443,8080 or 1-1000"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-mono"
                    />
                  </div>
                  
                  <div className={`p-4 rounded-lg border transition-all ${scanConfig.continuous ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-900/30 border-slate-700/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <InfinityIcon size={16} className={scanConfig.continuous ? "text-blue-400" : "text-slate-500"} />
                            Continuous Mode
                        </label>
                        <div 
                          onClick={() => setScanConfig(prev => ({...prev, continuous: !prev.continuous}))}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 relative cursor-pointer ${scanConfig.continuous ? 'bg-blue-600' : 'bg-slate-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 absolute top-0.5 ${scanConfig.continuous ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">
                        Keeps scanning for changes. Ideal for monitoring live deployments.
                    </p>
                  </div>

                   <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Threads</label>
                    <input 
                      type="range" 
                      min="1" max="16"
                      value={scanConfig.threads}
                      onChange={(e) => setScanConfig({...scanConfig, threads: parseInt(e.target.value)})}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>1 Thread (Stealth)</span>
                      <span className="text-green-400 font-mono">{scanConfig.threads}</span>
                      <span>16 Threads (Aggressive)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
                  <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Active Modules</h3>
                  <div className="space-y-3">
                    {Object.entries(scanConfig.modules).map(([key, value]) => (
                      <label key={key} className="flex items-center justify-between cursor-pointer group hover:bg-slate-800/50 p-2 rounded transition-all">
                        <span className="text-slate-400 capitalize group-hover:text-white transition-colors font-mono text-sm flex items-center gap-2">
                          {key === 'gitLeak' && <GitBranch size={14} className={value ? "text-orange-500" : "text-slate-500"} />}
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div 
                          onClick={() => setScanConfig(prev => ({...prev, modules: {...prev.modules, [key]: !value}}))}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 relative ${value ? 'bg-green-600' : 'bg-slate-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 absolute top-0.5 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-6 border-t border-slate-700">
                <button
                  onClick={startScan}
                  disabled={scanStatus === ScanStatus.RUNNING}
                  className={`text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 ${scanConfig.continuous ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-green-600 hover:bg-green-500'}`}
                >
                  {scanStatus === ScanStatus.RUNNING ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                  {scanConfig.continuous ? 'Start Monitoring' : 'Execute Scan'}
                </button>
              </div>
            </div>
          </div>
        );
      case 'console':
        return (
           <div className="h-[calc(100vh-8rem)] flex flex-col">
              <div className="flex justify-between items-center mb-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                 <div className="flex items-center gap-3">
                   <h2 className="text-lg font-bold text-white flex items-center gap-2">
                     <Terminal className="text-green-500" size={18} /> 
                     Live Console
                   </h2>
                   {scanStatus === ScanStatus.RUNNING && (
                     <span className={`px-2 py-0.5 rounded text-xs animate-pulse border ${scanConfig.continuous ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                       {scanConfig.continuous ? 'MONITORING' : 'SCANNING'}
                     </span>
                   )}
                   {scanStatus === ScanStatus.FAILED && (
                     <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                       STOPPED
                     </span>
                   )}
                 </div>
                 
                 <div className="flex gap-2">
                   {scanStatus === ScanStatus.RUNNING ? (
                      <button 
                        onClick={stopScan}
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-all border border-red-500/30"
                      >
                        <StopCircle size={16} /> Stop
                      </button>
                   ) : (
                      (scanStatus === ScanStatus.COMPLETED || scanStatus === ScanStatus.FAILED) && logs.length > 0 && (
                        <button 
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                        >
                          {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                          AI Report
                        </button>
                      )
                   )}
                 </div>
              </div>
              <TerminalOutput logs={logs} />
           </div>
        );
      case 'results':
        if (!lastResult?.analysis) {
           return (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed m-4">
               <AlertTriangle size={48} className="mb-4 opacity-50 text-yellow-500" />
               <p className="text-lg font-medium text-slate-300">Analysis Pending</p>
               <p className="text-sm max-w-xs text-center mt-2">Complete a scan in the console tab, then click "AI Report" to generate insights.</p>
             </div>
           );
        }
        return (
          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
             {/* Score Card */}
             <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <Shield className="text-green-500" /> Security Analysis Report
                  </h2>
                  <p className="text-slate-400 mb-4">Target: <span className="text-green-400 font-mono bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">{lastResult.target}</span></p>
                  <p className="text-slate-300 text-sm leading-relaxed max-w-2xl bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    {lastResult.analysis.summary}
                  </p>
                </div>
                
                <div className="flex flex-col items-center gap-2 bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-inner min-w-[180px]">
                   <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Overall Score</span>
                   <div className={`relative flex items-center justify-center w-24 h-24 rounded-full border-8 ${
                        lastResult.analysis.securityScore > 80 ? 'border-green-500 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' :
                        lastResult.analysis.securityScore > 50 ? 'border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                   }`}>
                      <span className="text-3xl font-bold">{lastResult.analysis.securityScore}</span>
                   </div>
                </div>
             </div>

             {/* Vulnerabilities List */}
             <div className="space-y-4">
               <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                 <AlertTriangle size={20} className="text-red-500" /> Findings & Remediation
               </h3>
               {lastResult.analysis.vulnerabilities.map((vuln) => (
                 <div key={vuln.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden group hover:border-slate-500 transition-all shadow-md">
                    <div className="p-5 flex flex-col md:flex-row items-start gap-5">
                       <div className={`mt-1 p-2 rounded-lg shrink-0 ${
                          vuln.severity === Severity.CRITICAL ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          vuln.severity === Severity.HIGH ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                          vuln.severity === Severity.MEDIUM ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                          'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                       }`}>
                          <AlertTriangle size={24} />
                       </div>
                       <div className="flex-1 w-full">
                          <div className="flex justify-between items-start mb-2">
                             <h4 className="text-lg font-bold text-white">{vuln.name}</h4>
                             <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                vuln.severity === Severity.CRITICAL ? 'bg-red-500/20 text-red-400' :
                                vuln.severity === Severity.HIGH ? 'bg-orange-500/20 text-orange-400' :
                                vuln.severity === Severity.MEDIUM ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                             }`}>
                                {vuln.severity}
                             </span>
                          </div>
                          <p className="text-slate-400 text-sm mb-4 leading-relaxed font-light">{vuln.description}</p>
                          
                          <div className="bg-slate-900/80 rounded-lg p-4 border-l-4 border-green-500">
                             <h5 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                                <CheckCircle size={12} /> Fix Recommendation
                             </h5>
                             <p className="text-slate-300 text-sm font-mono">{vuln.remediation}</p>
                          </div>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        );
      default:
        return <div className="text-slate-500">Module under construction</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-64 overflow-y-auto">
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 px-8 flex items-center justify-between shadow-sm">
           <h1 className="text-xl font-bold capitalize text-white tracking-tight">{activeTab.replace('-', ' ')}</h1>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                <div className={`w-2 h-2 rounded-full ${
                  scanStatus === ScanStatus.RUNNING 
                    ? (scanConfig.continuous ? 'bg-blue-500' : 'bg-emerald-500') 
                    : (scanStatus === ScanStatus.FAILED ? 'bg-red-500' : 'bg-green-500')
                } ${scanStatus === ScanStatus.RUNNING ? 'animate-pulse' : ''}`}></div>
                <span className="text-xs text-slate-300 font-mono">
                  {scanStatus === ScanStatus.RUNNING 
                    ? (scanConfig.continuous ? 'Continuous Mode' : 'Scanning...')
                    : (scanStatus === ScanStatus.FAILED ? 'Scan Stopped' : 'System Ready')
                  }
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-emerald-700 border-2 border-slate-800 shadow-lg flex items-center justify-center text-xs font-bold text-white">
                LW
              </div>
           </div>
        </header>
        
        <div className="p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;