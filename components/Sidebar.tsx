import React from 'react';
import { Shield, Activity, FileText, Settings, Terminal, Radar, History } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity size={20} /> },
    { id: 'scan', label: 'New Scan', icon: <Radar size={20} /> },
    { id: 'results', label: 'Results', icon: <FileText size={20} /> },
    { id: 'history', label: 'History', icon: <History size={20} /> },
    { id: 'console', label: 'Live Console', icon: <Terminal size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col fixed left-0 top-0 z-10">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-green-500/10 p-2 rounded-lg">
           <Shield className="text-green-500" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">LWSCAN</h1>
          <p className="text-xs text-slate-500">v2.4.0-web</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {item.icon}
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-4">
          <p className="text-xs text-slate-500 mb-2">System Status</p>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-xs text-green-400 font-mono">ONLINE</span>
          </div>
          <p className="text-[10px] text-slate-600 font-mono break-all">
            API_KEY: {process.env.API_KEY ? 'CONFIGURED' : 'MISSING'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;