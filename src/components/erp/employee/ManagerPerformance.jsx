import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ManagerPerformance = ({ employees = [], ledger = [] }) => {
    const [filter, setFilter] = useState('ALL');

    // --- 1. SECTOR BENCHMARK RECOGNITION ENGINE ---
    const getBenchmark = (domain) => {
        const d = domain?.toUpperCase() || 'GENERAL';
        if (d.includes('AI') || d.includes('DEEPTECH') || d.includes('SPACE')) return 1600000000; // ₹160Cr High Alpha
        if (d.includes('MANUFACTURING') || d.includes('LOGISTICS')) return 1200000000; // ₹120Cr Heavy Cap
        if (d.includes('SAAS') || d.includes('EDTECH')) return 800000000; // ₹80Cr Standard
        return 500000000; // ₹50Cr Floor
    };

    // --- 2. DYNAMIC PORTFOLIO FORENSICS ---
    const activeBurns = useMemo(() => {
        const uniqueAssets = [...new Set(ledger.map(l => l.asset_name || l.domain))].filter(Boolean);
        
        return uniqueAssets.map(asset => {
            const domain = ledger.find(l => (l.asset_name || l.domain) === asset)?.domain || 'General';
            const spend = ledger.filter(l => (l.asset_name || l.domain) === asset).reduce((s, t) => s + Number(t.amount || 0), 0);
            
            const benchmark = getBenchmark(domain);
            const intensity = Math.min(100, (spend / benchmark) * 100);
            
            // Hardwired Forensic Grading
            const alertText = intensity > 80 ? 'CRITICAL EXHAUSTION' : intensity > 40 ? 'ELEVATED BURN' : 'NOMINAL VELOCITY';
            const statusColor = intensity > 80 ? 'text-rose-500' : intensity > 40 ? 'text-amber-500' : 'text-emerald-500';
            
            return { asset, amount: spend, intensity, alertText, statusColor, domain };
        }).filter(b => b.amount > 0).sort((a, b) => b.intensity - a.intensity);
    }, [ledger]);

    const performanceMetrics = useMemo(() => {
        return (employees || []).filter(e => e.status === 'ACTIVE' || !e.status).map(manager => {
            const transactions = ledger.filter(t => t.manager_id === manager.id || t.manager_name === manager.full_name);
            const totalSpend = transactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + Number(t.amount || 0), 0);
            const efficiency = totalSpend > 0 ? Math.max(0, Math.min(98.5, 100 - (totalSpend / 80000000))) : 0; 
            const status = efficiency > 85 ? 'HIGH ROI' : efficiency > 65 ? 'OPTIMAL' : 'CRITICAL BURN';
            return { ...manager, totalSpend, efficiency, status, dealCount: transactions.length };
        }).sort((a, b) => b.efficiency - a.efficiency);
    }, [employees, ledger]);

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(v || 0);

    return (
        <div className="bg-[#F1F5F9] min-h-screen font-sans p-6 antialiased text-slate-900">
            
            {/* 3. PROFESSIONAL METRIC BAR (Reduced Scaling) */}
            <div className="bg-white border border-slate-200 shadow-sm flex items-center mb-6 divide-x divide-slate-100 rounded-sm">
                <MetricTile label="Portfolio Alpha" value="84.2%" sub="Global Efficiency Index" color="text-slate-900" />
                <MetricTile label="Active Burn" value={activeBurns[0] ? fmt(activeBurns[0].amount) : "₹0.0"} sub={`${activeBurns[0]?.asset || 'Holdings'} Leakage`} color="text-rose-600" />
                <MetricTile label="Credit Velocity" value="1.4x" sub="Growth Cap Utilization" color="text-indigo-600" />
                
                <div className="px-8 py-4 flex-1 flex justify-end items-center gap-2">
                    {['ALL', 'HIGH ROI', 'CRITICAL BURN'].map(t => (
                        <button key={t} onClick={() => setFilter(t)} className={`px-4 py-1.5 text-[9px] font-black border transition-all ${filter === t ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>{t}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                <div className="lg:col-span-8 bg-white p-6 border border-slate-200 shadow-sm rounded-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deployment Velocity vs ROI Intensity</h3>
                            <p className="text-[13px] font-black uppercase mt-1">Sovereign Alpha Cycle</p>
                        </div>
                        <div className="flex gap-4">
                            <LegendItem color="bg-indigo-500" label="Deployed" />
                            <LegendItem color="bg-emerald-500" label="Alpha" />
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[{m:'Nov',d:4.2,a:3.1},{m:'Dec',d:8.4,a:7.2},{m:'Jan',d:11.2,a:9.4}]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                <Area type="monotone" dataKey="d" stroke="#6366f1" strokeWidth={3} fill="#6366f1" fillOpacity={0.05} />
                                <Area type="monotone" dataKey="a" stroke="#10b981" strokeWidth={3} fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. HARDWIRED FORENSICS PANEL */}
                <div className="lg:col-span-4 bg-slate-900 p-6 text-white shadow-xl rounded-sm">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AUM_Burn_Forensics</h3>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Sector Benchmarks Active</span>
                    </div>
                    <div className="space-y-6">
                        {activeBurns.length > 0 ? activeBurns.map((b, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-[11px] font-black uppercase mb-1.5">
                                    <span className="truncate w-32">{b.asset}</span>
                                    <span className="text-rose-400 tabular-nums">{fmt(b.amount)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${b.intensity > 80 ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : b.intensity > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                        style={{width: `${b.intensity}%`}}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${b.statusColor}`}>{b.alertText}</span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase">{b.intensity.toFixed(0)}% Budget Exhausted</span>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center opacity-20 border border-dashed border-white/20">
                                <p className="text-[10px] font-black uppercase">No Active Leakage</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 5. MANAGER PERFORMANCE LEDGER */}
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Strategist</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">Deployment</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">Efficiency</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">Mandate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {performanceMetrics.filter(m => filter === 'ALL' || m.status === filter).map(manager => (
                            <tr key={manager.id || manager.full_name} className="hover:bg-slate-50 transition-all cursor-pointer group">
                                <td className="p-4">
                                    <div className="text-[13px] font-black uppercase tracking-tight text-slate-800 group-hover:text-indigo-600 transition-colors">{manager.full_name || manager.name}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{manager.role || 'Custodian Lead'}</div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="text-[13px] font-black tabular-nums">{fmt(manager.totalSpend)}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">{manager.dealCount} Active Mandates</div>
                                </td>
                                <td className="p-4 flex flex-col items-center">
                                    <div className="text-[11px] font-black mb-1.5 tabular-nums">{manager.efficiency.toFixed(1)}%</div>
                                    <div className="w-24 h-1 bg-slate-100 overflow-hidden"><div className={`h-full transition-all duration-700 ${manager.efficiency > 80 ? 'bg-indigo-600 shadow-[0_0_6px_#6366f1]' : 'bg-rose-500'}`} style={{width: `${manager.efficiency}%`}}></div></div>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="text-[10px] font-black text-indigo-600 uppercase border-b-2 border-indigo-50 hover:border-indigo-600 transition-all">Audit Ledger</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const MetricTile = ({ label, value, sub, color }) => (
    <div className="px-10 py-5">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        <p className={`text-xl font-black tabular-nums leading-none tracking-tighter ${color}`}>{value}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 tracking-tighter opacity-60 italic">{sub}</p>
    </div>
);

const LegendItem = ({ color, label }) => (
    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <div className={`w-1.5 h-1.5 rounded-full ${color}`}></div>
        {label}
    </div>
);

export default ManagerPerformance;