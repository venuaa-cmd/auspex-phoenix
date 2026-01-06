import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CapTable = () => {
    // --- 1. MOCK DATA (Replace with Supabase fetch if you have a 'shareholders' table) ---
    // Ideally, this should come from a table: erp_shareholders
    const [shareholders, setShareholders] = useState([
        { id: 1, name: 'Gourav (Founder)', shares: 800000, type: 'FOUNDER' },
        { id: 2, name: 'Co-Founder', shares: 150000, type: 'FOUNDER' },
        { id: 3, name: 'Angel Investor A', shares: 50000, type: 'INVESTOR' },
        { id: 4, name: 'ESOP Pool', shares: 50000, type: 'ESOP' },
    ]);

    // --- 2. SIMULATION STATE ---
    const [simulation, setSimulation] = useState({
        active: false,
        newInvestment: 10000000, // ₹1 Cr
        preMoneyValuation: 100000000, // ₹10 Cr
    });

    // --- 3. CALCULATIONS ---
    const currentStats = useMemo(() => {
        const totalShares = shareholders.reduce((sum, s) => sum + s.shares, 0);
        return { totalShares, shareholders };
    }, [shareholders]);

    const simulatedStats = useMemo(() => {
        if (!simulation.active) return null;

        const currentTotalShares = currentStats.totalShares;
        const pricePerShare = simulation.preMoneyValuation / currentTotalShares;
        const newSharesIssued = Math.floor(simulation.newInvestment / pricePerShare);
        const postMoneyTotalShares = currentTotalShares + newSharesIssued;
        const dilutionFactor = currentTotalShares / postMoneyTotalShares;

        // Calculate new ownership structure
        const simulatedHolders = currentStats.shareholders.map(s => ({
            ...s,
            postOwnership: (s.shares / postMoneyTotalShares) * 100,
            dilutedBy: (1 - dilutionFactor) * 100
        }));

        // Add the new investor
        simulatedHolders.push({
            id: 'new',
            name: 'New Series Investor',
            shares: newSharesIssued,
            type: 'NEW_INVESTOR',
            postOwnership: (newSharesIssued / postMoneyTotalShares) * 100,
            dilutedBy: 0
        });

        return {
            totalShares: postMoneyTotalShares,
            holders: simulatedHolders,
            valuation: simulation.preMoneyValuation + simulation.newInvestment,
            dilution: (1 - dilutionFactor) * 100
        };
    }, [currentStats, simulation]);

    // --- 4. FORMATTERS ---
    const formatCompact = (val) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    const COLORS = ['#1e3a8a', '#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

    // --- 5. RENDER HELPERS ---
    const getDataForChart = (source) => {
        if (source === 'CURRENT') {
            return currentStats.shareholders.map(s => ({ name: s.name, value: s.shares }));
        }
        return simulatedStats.holders.map(s => ({ name: s.name, value: s.shares }));
    };

    return (
        <div className="grid grid-cols-12 gap-6 animate-[fadeIn_0.3s_ease]">
            
            {/* LEFT: THE TABLE & CONTROLS */}
            <div className="col-span-12 md:col-span-8 space-y-6">
                
                {/* HEADER */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-900 text-white w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-md">
                            <i className="fa-solid fa-chart-pie"></i>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Cap Table</h2>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">
                                Total Shares: {currentStats.totalShares.toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSimulation({ ...simulation, active: !simulation.active })}
                        className={`px-5 py-2 rounded text-[10px] font-bold uppercase tracking-wider shadow-md transition-all flex items-center gap-2 ${simulation.active ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <i className="fa-solid fa-flask"></i> {simulation.active ? 'Close Simulator' : 'Run Dilution Sim'}
                    </button>
                </div>

                {/* THE TABLE */}
                <div className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-blue-50/50 text-[10px] uppercase text-blue-900 border-b border-blue-100">
                                <th className="p-4 font-bold">Shareholder</th>
                                <th className="p-4 font-bold text-right">Shares Held</th>
                                <th className="p-4 font-bold text-right">Ownership</th>
                                {simulation.active && <th className="p-4 font-bold text-right text-purple-600 bg-purple-50">Post-Money Ownership</th>}
                                {simulation.active && <th className="p-4 font-bold text-right text-red-500 bg-purple-50">Impact</th>}
                            </tr>
                        </thead>
                        <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-50">
                            {simulation.active ? (
                                // SIMULATED ROWS
                                simulatedStats.holders.map((h, i) => (
                                    <tr key={i} className={h.type === 'NEW_INVESTOR' ? 'bg-purple-50/30' : ''}>
                                        <td className="p-4">
                                            {h.name}
                                            {h.type === 'NEW_INVESTOR' && <span className="ml-2 text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase">New</span>}
                                        </td>
                                        <td className="p-4 text-right font-mono">{h.shares.toLocaleString()}</td>
                                        <td className="p-4 text-right text-slate-400">
                                            {/* Old ownership for reference */}
                                            {h.type !== 'NEW_INVESTOR' ? ((h.shares / currentStats.totalShares) * 100).toFixed(2) + '%' : '-'}
                                        </td>
                                        <td className="p-4 text-right font-black text-purple-700 bg-purple-50/10 border-l border-purple-100">
                                            {h.postOwnership.toFixed(2)}%
                                        </td>
                                        <td className="p-4 text-right text-red-500 bg-purple-50/10">
                                            {h.dilutedBy > 0 ? `-${h.dilutedBy.toFixed(2)}%` : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                // STANDARD ROWS
                                currentStats.shareholders.map((h, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-4">{h.name}</td>
                                        <td className="p-4 text-right font-mono">{h.shares.toLocaleString()}</td>
                                        <td className="p-4 text-right text-emerald-600">
                                            {((h.shares / currentStats.totalShares) * 100).toFixed(2)}%
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* RIGHT: VISUALS & SIMULATOR CONTROLS */}
            <div className="col-span-12 md:col-span-4 space-y-6">
                
                {/* CHART CARD */}
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm relative">
                    <h3 className="text-xs font-bold text-slate-900 uppercase mb-4 text-center">
                        {simulation.active ? 'Post-Money Structure' : 'Current Structure'}
                    </h3>
                    <div className="h-64 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={getDataForChart(simulation.active ? 'SIM' : 'CURRENT')} 
                                    innerRadius={60} 
                                    outerRadius={80} 
                                    paddingAngle={3} 
                                    dataKey="value"
                                >
                                    {getDataForChart(simulation.active ? 'SIM' : 'CURRENT').map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => val.toLocaleString() + " Shares"} />
                                <Legend wrapperStyle={{fontSize: '10px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Watermark Icon */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                        <i className="fa-solid fa-chart-pie text-9xl"></i>
                    </div>
                </div>

                {/* SIMULATOR CONTROLS (Only visible when toggled) */}
                {simulation.active && (
                    <div className="bg-purple-900 text-white p-6 rounded-xl shadow-lg animate-[fadeIn_0.3s_ease]">
                        <div className="flex items-center gap-2 mb-4 border-b border-purple-700 pb-3">
                            <i className="fa-solid fa-flask text-purple-300"></i>
                            <h3 className="text-sm font-bold uppercase tracking-widest">Dilution Lab</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-purple-300 uppercase mb-1">Pre-Money Valuation</label>
                                <input 
                                    type="range" 
                                    min="10000000" max="1000000000" step="10000000"
                                    value={simulation.preMoneyValuation}
                                    onChange={e => setSimulation({...simulation, preMoneyValuation: Number(e.target.value)})}
                                    className="w-full h-1 bg-purple-700 rounded-lg appearance-none cursor-pointer mb-2"
                                />
                                <div className="flex justify-between items-center">
                                    <div className="text-lg font-black">{formatCompact(simulation.preMoneyValuation)}</div>
                                    <input 
                                        type="number" 
                                        value={simulation.preMoneyValuation}
                                        onChange={e => setSimulation({...simulation, preMoneyValuation: Number(e.target.value)})}
                                        className="w-24 bg-purple-800 border border-purple-600 rounded p-1 text-xs text-right text-white font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-purple-300 uppercase mb-1">New Investment (Cash In)</label>
                                <input 
                                    type="range" 
                                    min="1000000" max="500000000" step="1000000"
                                    value={simulation.newInvestment}
                                    onChange={e => setSimulation({...simulation, newInvestment: Number(e.target.value)})}
                                    className="w-full h-1 bg-purple-700 rounded-lg appearance-none cursor-pointer mb-2"
                                />
                                <div className="flex justify-between items-center">
                                    <div className="text-lg font-black text-emerald-400">+{formatCompact(simulation.newInvestment)}</div>
                                    <input 
                                        type="number" 
                                        value={simulation.newInvestment}
                                        onChange={e => setSimulation({...simulation, newInvestment: Number(e.target.value)})}
                                        className="w-24 bg-purple-800 border border-purple-600 rounded p-1 text-xs text-right text-white font-mono"
                                    />
                                </div>
                            </div>

                            <div className="bg-purple-800 p-3 rounded-lg border border-purple-600 mt-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold uppercase text-purple-300">Founder Dilution</span>
                                    <span className="text-sm font-bold text-red-400">
                                        -{simulatedStats.dilution.toFixed(2)}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase text-purple-300">Post-Money Val</span>
                                    <span className="text-sm font-bold text-white">
                                        {formatCompact(simulatedStats.valuation)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default CapTable;