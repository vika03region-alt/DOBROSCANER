import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, TooltipProps } from 'recharts';
import { ShieldAlert, Scan, History, Globe } from 'lucide-react';
import { ScanResult, Severity } from '../types';

interface DashboardStatsProps {
  history: ScanResult[];
}

interface DataItem {
  name: string;
  count: number;
}

interface SeverityItem {
  name: string;
  value: number;
  color: string;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      </div>
      <div className="p-2 bg-slate-700/50 rounded-lg text-slate-300">
        {icon}
      </div>
    </div>
  </div>
);

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl z-50">
        <p className="text-slate-200 text-sm font-bold">{label}</p>
        <p className="text-slate-400 text-sm">
          Findings: <span className="text-green-400">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ history }) => {
  // Calculate statistics using real history data
  const stats = useMemo(() => {
    const totalScans = history.length;
    
    // Extract all vulnerabilities from all scans
    const allVulns = history.flatMap(scan => scan.analysis?.vulnerabilities || []);
    const totalVulns = allVulns.length;
    
    // Unique targets
    const uniqueTargets = new Set(history.map(s => s.target)).size;

    // Severity Breakdown
    const severityCounts = {
      [Severity.CRITICAL]: 0,
      [Severity.HIGH]: 0,
      [Severity.MEDIUM]: 0,
      [Severity.LOW]: 0,
      [Severity.INFO]: 0,
    };

    allVulns.forEach(v => {
      if (v.severity in severityCounts) {
        severityCounts[v.severity as Severity]++;
      }
    });

    const severityData: SeverityItem[] = [
      { name: 'Critical', value: severityCounts[Severity.CRITICAL], color: '#ef4444' }, // Red
      { name: 'High', value: severityCounts[Severity.HIGH], color: '#f97316' },     // Orange
      { name: 'Medium', value: severityCounts[Severity.MEDIUM], color: '#eab308' },   // Yellow
      { name: 'Low', value: severityCounts[Severity.LOW], color: '#3b82f6' },      // Blue
    ];

    // Vulnerability Types Distribution (Naive keyword matching)
    const typeCounts: Record<string, number> = {
      'SQLi': 0,
      'XSS': 0,
      'RCE': 0,
      'SSL/TLS': 0,
      'Config': 0,
    };

    allVulns.forEach(v => {
      const name = v.name.toLowerCase();
      if (name.includes('sql')) typeCounts['SQLi']++;
      else if (name.includes('xss') || name.includes('script')) typeCounts['XSS']++;
      else if (name.includes('rce') || name.includes('execution')) typeCounts['RCE']++;
      else if (name.includes('ssl') || name.includes('tls') || name.includes('cipher')) typeCounts['SSL/TLS']++;
      else typeCounts['Config']++;
    });

    const typeData: DataItem[] = Object.entries(typeCounts)
      .map(([name, count]) => ({ name, count }))
      .filter(item => item.count > 0); // Only show active categories

    return {
      totalScans,
      totalVulns,
      uniqueTargets,
      severityData,
      typeData
    };
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Scans" value="0" icon={<Scan size={20} />} />
          <StatCard title="Vulnerabilities" value="0" icon={<ShieldAlert size={20} />} />
          <StatCard title="Active Targets" value="0" icon={<Globe size={20} />} />
          <StatCard title="Avg Scan Time" value="--:--" icon={<History size={20} />} />
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 border-dashed p-12 flex flex-col items-center justify-center text-slate-500">
           <Scan size={48} className="mb-4 opacity-50" />
           <p className="text-lg font-medium">No Data Available</p>
           <p className="text-sm">Run your first scan to generate security metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Scans" value={stats.totalScans.toString()} icon={<Scan size={20} />} />
        <StatCard title="Vulnerabilities" value={stats.totalVulns.toString()} icon={<ShieldAlert size={20} />} />
        <StatCard title="Active Targets" value={stats.uniqueTargets.toString()} icon={<Globe size={20} />} />
        <StatCard title="Last Scan" value="Just now" icon={<History size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-6">Vulnerability Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.4 }} />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-6">Severity Breakdown</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
             {stats.severityData.map((item) => (
               <div key={item.name} className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                 <span className="text-xs text-slate-400">{item.name} ({item.value})</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;