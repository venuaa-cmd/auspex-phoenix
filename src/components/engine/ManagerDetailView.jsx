import React, { useState, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';

// INTEGRATED SUB-COMPONENTS
import { ManagerPortfolioChart } from '../compartment/ManagerPerformanceCharts';
import { ManagerUtilizationBar } from '../compartment/GovernorVisuals'; 

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

// --- HELPERS ---
const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

const formatCompact = (num) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(num);

const RadialProgress = ({ percentage, label, subtitle, color }) => {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center group flex-1 p-6 border-r border-white/5 last:border-r-0">
            <div className="relative w-32 h-32 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                    <circle cx="50" cy="50" r={radius} stroke={color} strokeWidth="6" fill="transparent" strokeDasharray={circumference}
                        style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.5s ease-in-out', strokeLinecap: 'round' }}
                        className="drop-shadow-[0_0_12px_rgba(0,0,0,0.5)]" />
                </svg>
                <div className="flex flex-col items-center justify-center text-center z-10">
                    <span className="text-2xl font-black text-white leading-none tracking-tighter">{percentage}%</span>
                </div>
            </div>
            <div className="mt-5 text-center">
                <h4 className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.4em] mb-1.5">{label}</h4>
                <p className="text-[11px] font-mono font-bold text-slate-400 tracking-tight">{subtitle}</p>
            </div>
        </div>
    );
};

const ManagerDetailView = ({ managerId, onBack, managers = [], investments = [], liquidityEvents = [], companies = [], wallets = [] }) => {
    
    const safeParse = (data) => {
        if (!data) return {};
        if (typeof data === 'object') return data;
        try { return JSON.parse(data); } catch (e) { return {}; }
    };

    const manager = useMemo(() => managers.find(m => String(m.id) === String(managerId)), [managers, managerId]);

    // --- NEURAL JOIN ENGINE (FIXED FOR ALL ASSIGNED DOMAINS + REAL ESTATE MAPPING) ---
    const stats = useMemo(() => {
        if (!manager) return { totalInvested: 0, totalValue: 0, enrichedPortfolio: [], domainAudit: [] };

        const budgetData = safeParse(manager.budget);
        const domainCaps = budgetData.domainCaps || {};

        const mgrDeals = investments.filter(inv => String(inv.fund_manager_id || inv.fundManagerId) === String(managerId));
        let totalInvested = 0;
        let unrealizedValue = 0;

        const enrichedPortfolio = mgrDeals.map(inv => {
            const company = companies.find(c => c.id === inv.company_id);
            const cost = Number(inv.amount_invested || 0);
            const liveVal = Number(inv.current_valuation || company?.current_valuation || cost);
            totalInvested += cost;
            unrealizedValue += liveVal;
            
            // MAP REAL ESTATE TO SPECIFIC ASSET TYPE (COMMERCIAL/RESIDENTIAL/LAND)
            const sectorMapping = company?.industry === "Real Estate" ? company?.asset_type : company?.industry;

            return { ...inv, companyName: company?.name || "Unknown Asset", industry: sectorMapping || "Uncategorized", liveValuation: liveVal, pnl: liveVal - cost };
        });

        const mgrExits = liquidityEvents.filter(evt => mgrDeals.some(inv => inv.id === (evt.investment_id || evt.investmentId)));
        const realizedValue = mgrExits.reduce((sum, evt) => sum + Number(evt.total_payout_amount || 0), 0);
        const totalValue = unrealizedValue + realizedValue;
        
        // --- PERFORMANCE AUDIT FOR ALL ASSIGNED DOMAINS ---
        const domainAudit = (manager.domains || []).map(domainName => {
            const wallet = wallets.find(w => w.manager_id === manager.id && w.domain_name === domainName);
            const allocated = Number(wallet?.allocated_amount || domainCaps[domainName] || 0);
            
            // Bridge the "(India)" suffix mismatch to ensure spent sums correctly
            const actualSpent = enrichedPortfolio.filter(p => 
                p.industry === domainName || 
                p.industry === domainName.replace('(India)', '').trim()
            ).reduce((sum, p) => sum + Number(p.amount_invested), 0);
            
            return { domain: domainName, spent: actualSpent, allocated, utilization: allocated > 0 ? (actualSpent / allocated) * 100 : 0 };
        });

        return { 
            totalInvested, 
            totalValue, 
            realizedValue,
            moic: totalInvested > 0 ? (totalValue / totalInvested).toFixed(2) : "1.00",
            dpi: totalInvested > 0 ? (realizedValue / totalInvested).toFixed(2) : "0.00",
            utilizationPct: Number(budgetData.annual || 0) > 0 ? (totalInvested / Number(budgetData.annual)) * 100 : 0,
            enrichedPortfolio, 
            domainAudit, 
            dealCount: mgrDeals.length 
        };
    }, [manager, managerId, investments, companies, liquidityEvents, wallets]);

    const accruedCarry = (stats.totalValue - stats.totalInvested) > 0 ? (stats.totalValue - stats.totalInvested) * (manager?.carry_percentage ? (Number(manager.carry_percentage) / 100) : 0.20) : 0;

    if (!manager) return <div className="p-20 text-red-500 font-mono text-center uppercase">System_Error: Node_Offline</div>;

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] font-manrope text-white pb-32 p-10 bg-[#0a0f1a] min-h-screen">
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-10">
                <div className="flex items-center gap-10">
                    <button onClick={onBack} className="w-14 h-14 bg-white/5 hover:bg-[#FFD700] hover:text-black flex items-center justify-center border border-white/10 rounded-2xl transition-all shadow-xl">
                        <i className="fa-solid fa-arrow-left text-xl"></i>
                    </button>
                    <div>
                        <h1 className="text-[42px] font-black tracking-tighter uppercase leading-none">{manager.name}</h1>
                        <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.5em] mt-2 italic">{manager.designation} // M.O.R.A.I Tactical_Node</p>
                    </div>
                </div>
            </div>

            {/* 2. HUD METRICS (6-GRID) */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-10">
                {[
                    { label: "Deployed", val: formatCurrency(stats.totalInvested) },
                    { label: "Market Val", val: formatCurrency(stats.totalValue) },
                    { label: "Realized", val: formatCurrency(stats.realizedValue), color: "text-emerald-400" },
                    { label: "Alpha MOIC", val: stats.moic + "x", highlight: true },
                    { label: "DPI Ratio", val: stats.dpi + "x" },
                    { label: "Accrued Carry", val: formatCurrency(accruedCarry), color: "text-[#FFD700]" }
                ].map((m, i) => (
                    <div key={i} className={`bg-black/50 border border-white/5 p-6 rounded-2xl shadow-lg transition-transform hover:scale-[1.02] ${m.highlight ? 'ring-1 ring-[#FFD700]/30 bg-[#FFD700]/5' : ''}`}>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{m.label}</p>
                        <p className={`text-[17px] font-mono font-black ${m.color || 'text-white'}`}>{m.val}</p>
                    </div>
                ))}
            </div>

            {/* 3. RADIAL PROGRESS ROW */}
            <div className="flex bg-black/50 border border-white/5 rounded-[40px] shadow-2xl overflow-hidden backdrop-blur-xl mb-10">
                <RadialProgress percentage={stats.utilizationPct.toFixed(0)} label="Wallet_Usage" subtitle={`${stats.dealCount} Active Deals`} color="#06b6d4" />
                <RadialProgress percentage={Math.min(100, (parseFloat(stats.moic)/3)*100).toFixed(0)} label="MOIC_Benchmark" subtitle="Target 3.0x Velocity" color="#FFD700" />
                <RadialProgress percentage={Math.min(100, parseFloat(stats.dpi)*100).toFixed(0)} label="Liquidity_Flow" subtitle="Capital Return Efficiency" color="#10b981" />
            </div>

            {/* 4. MAIN COMMAND GRID (GRAPH + MORAI) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
                
                <div className="lg:col-span-8">
                    <div className="bg-black/50 border border-white/5 p-10 rounded-[40px] shadow-2xl h-full">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mb-10">Capital_Deployment_Benchmark (Cr)</h3>
                        <div className="h-96 w-full">
                            <ManagerPortfolioChart portfolio={stats.domainAudit.map(d => ({
                                domain: d.domain,
                                current_allocated: d.allocated / 10000000, 
                                current_spent: d.spent / 10000000,
                                utilization: d.utilization
                            }))} />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <div className="bg-[#FFD700]/5 border border-[#FFD700]/20 p-8 rounded-[40px] flex flex-col h-[650px] overflow-hidden">
                        <div className="flex items-center gap-4 mb-8">
                            <i className="fa-solid fa-brain text-[#FFD700] text-xl animate-pulse"></i>
                            <h3 className="text-[12px] font-black text-[#FFD700] uppercase tracking-[0.5em]">M.O.R.A.I_Tactical_Stream</h3>
                        </div>
                        <div className="flex-1 space-y-5 overflow-y-auto custom-scrollbar pr-3">
                            {stats.domainAudit.map((item, i) => (
                                <div key={i} className={`p-6 rounded-3xl border transition-all hover:bg-white/5 ${item.utilization < 60 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full ${item.utilization < 60 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {item.utilization < 60 ? 'CRITICAL_STAGNATION' : 'OPTIMIZED_NODE'}
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-600">ID:{i+1001}</span>
                                    </div>
                                    <p className="text-[13px] font-black text-white uppercase mb-2 tracking-tight">{item.domain.replace('(India)', '')}</p>
                                    <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                                        {item.utilization < 60 
                                            ? `Flow velocity breach. Deployment stagnant at ${item.utilization.toFixed(1)}%. AI recommends manual asset audit.` 
                                            : `Deployment flow healthy at ${item.utilization.toFixed(1)}%. Capital top-up eligibility: HIGH.`
                                        }
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. NEURAL_DOMAIN_UTILIZATION_AUDIT (Restored separate block) */}
            <div className="bg-black/50 border border-white/5 p-12 rounded-[40px] mb-10 shadow-2xl">
                <h3 className="text-[12px] font-black text-[#FFD700] uppercase tracking-[0.5em] mb-10 text-center">Neural_Domain_Utilization_Audit</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-10">
                    {stats.domainAudit.map((item, idx) => (
                        <div key={idx} className="group">
                            <ManagerUtilizationBar domain={item.domain} spent={item.spent} total={item.allocated} />
                            <div className="flex justify-between px-1 mt-1 font-mono text-[8px] font-black uppercase">
                                <span className="text-slate-600 tracking-widest">Allocated: {formatCompact(item.allocated)}</span>
                                <span className="text-slate-400 tracking-widest">Consumed: {formatCompact(item.spent)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 6. ACTIVE_INVESTMENT_LEDGER (Restored High-Detail Version) */}
            <div className="bg-black border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                <div className="bg-white/5 px-10 py-8 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-[12px] font-black text-white uppercase tracking-[0.4em]">Active_Investment_Ledger</h3>
                    <div className="flex gap-6 items-center">
                        <span className="text-[11px] font-mono text-[#FFD700] uppercase font-bold tracking-widest">{stats.dealCount} Sourced Assets</span>
                        <div className="h-5 w-[1px] bg-white/20" />
                        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-tighter">Profile_Node: {managerId.slice(0,8)}</span>
                    </div>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {stats.enrichedPortfolio.map((inv, idx) => (
                        <div key={idx} className="flex justify-between items-center p-6 bg-white/[0.03] border border-white/5 rounded-3xl hover:bg-white/[0.06] transition-all group">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-[#FFD700]/50 transition-colors">
                                    <span className="text-[14px] font-black text-[#FFD700] uppercase">{inv.companyName.charAt(0)}</span>
                                </div>
                                <div>
                                    <p className="text-[14px] font-black text-white uppercase leading-tight tracking-tight">{inv.companyName}</p>
                                    <p className="text-[9px] text-slate-600 uppercase font-black mt-1.5 tracking-widest">{inv.industry}</p>
                                </div>
                            </div>
                            <div className="flex gap-14 text-right items-center">
                                <div>
                                    <p className="text-[9px] text-slate-700 font-black uppercase mb-1">Cost Basis</p>
                                    <p className="text-sm font-mono font-bold text-white">{formatCurrency(inv.amount_invested)}</p>
                                </div>
                                <div className="w-24">
                                    <p className={`text-sm font-black ${inv.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {inv.pnl >= 0 ? '+' : ''}{formatCompact(inv.pnl)}
                                    </p>
                                    <p className="text-[9px] text-slate-700 font-black uppercase tracking-tighter leading-none mt-1">Alpha Gain</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ManagerDetailView;