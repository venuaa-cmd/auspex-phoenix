import React, { useState, useEffect, useMemo } from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler, BarElement } from 'chart.js';
import { runAIAnalysis } from '../../lib/aiService'; 

// --- MODULAR COMPONENT IMPORTS ---
import CompanyDocumentVault from './company/CompanyDocumentVault';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler, BarElement);

// --- CONFIG ---
const PROXY_BASE_URL = "https://auspex-phoenix.vercel.app";

// --- HELPERS ---
const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

const formatCompact = (num) => {
    if (isNaN(num)) return "N/A";
    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(num);
};

// --- STOCK DATA HOOK (FIXED FOR NESTED JSON) ---
const useStockData = (ticker, companyName) => {
    const [data, setData] = useState({ price: 0, change: 0, changePct: 0, high52: 0, low52: 0, pe: 0, mktCap: 0, prevClose: 0, isOpen: false });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const query = ticker ? ticker.toUpperCase().trim() : (companyName ? companyName.toUpperCase().trim() : '');
                if (!query) return;

                const res = await fetch(`${PROXY_BASE_URL}/api/stock?name=${encodeURIComponent(query)}`);
                const json = await res.json();

                if (json && !json.error) {
                    // THE FRONT-END EXTRACTION FIX: Handle nested BSE/NSE objects correctly
                    let livePrice = 0;
                    if (json.price && typeof json.price === 'object') {
                        livePrice = parseFloat(json.price.NSE) || parseFloat(json.price.BSE) || 0;
                    } else {
                        livePrice = parseFloat(json.price) || 0;
                    }

                    setData({
                        price: livePrice,
                        prevClose: parseFloat(json.previousClose?.NSE || json.previousClose || livePrice),
                        change: parseFloat(json.change) || 0,
                        changePct: parseFloat(json.percentChange) || 0,
                        high52: parseFloat(json.fiftyTwoWeekHigh) || 0,
                        low52: parseFloat(json.fiftyTwoWeekLow) || 0,
                        pe: parseFloat(json.peRatio) || 0,
                        mktCap: json.marketCap || 0,
                        isOpen: livePrice > 0
                    });

                    // Historical mock for UI context
                    const mockHistory = [];
                    const base = livePrice > 0 ? livePrice * 0.96 : 100;
                    for(let i=0; i<30; i++) {
                        mockHistory.push(base + (i * (livePrice * 0.0015)) + (Math.random() * 5));
                    }
                    mockHistory[29] = livePrice; 
                    setHistory(mockHistory);
                }
            } catch (e) { console.error("Stock Sync Error:", e); }
            finally { setLoading(false); }
        };
        fetchData();
        const interval = setInterval(fetchData, 60000); 
        return () => clearInterval(interval);
    }, [ticker, companyName]);

    return { ...data, history, loading };
};

// --- MAIN COMPONENT ---
const StockDetail = ({ 
    company, investments, setModalState, onUpdate, isEditing, 
    activeTab, fileLinks, handleFileUpload, handleDeleteFile, uploading, handleDeleteRound,
    currentUserEmail
}) => {
    const isSuperAdmin = currentUserEmail?.toLowerCase().trim() === 'venu.ananda@auspexinvestments.com';
    const [expandedRoundId, setExpandedRoundId] = useState(null); 
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const { price: livePrice, change, changePct, mktCap, pe, high52, low52, isOpen, loading, history, prevClose } = useStockData(company.ticker, company.companyName);

    // --- AGGREGATE STATS ---
    const { totalShares, avgCost, totalCost } = useMemo(() => {
        let shares = 0; let cost = 0;
        investments.forEach(inv => {
            if (inv.status === 'Active') {
                const q = Number(inv.quantity || inv.units || 0);
                const amt = Number(inv.amount_invested || inv.amount || 0);
                shares += q; cost += amt;
            }
        });
        return { totalShares: shares, totalCost: cost, avgCost: shares > 0 ? cost / shares : 0 };
    }, [investments]);

    // --- PERFORMANCE MATH ---
    const effectivePrice = livePrice > 0 ? livePrice : avgCost;
    const currentValue = totalShares * effectivePrice;
    const profit = currentValue - totalCost;
    const returnPct = totalCost > 0 ? (profit / totalCost) * 100 : 0; 
    const dayChangeValue = (livePrice - prevClose) * totalShares;

    // --- AI ANALYSIS (FORMATTED & SAVABLE) ---
    const handleRunAnalysis = async () => {
        if (!isSuperAdmin) return;
        setIsAnalyzing(true);
        const prompt = `Act as Lead Equity Strategist. Analyze ${company.companyName}: Price ₹${effectivePrice}, P&L ${returnPct.toFixed(2)}%. Return ONLY HTML body using <b> and <ul> tags. No markdown bolding (**).`;
        try {
            const res = await runAIAnalysis(prompt);
            const clean = res.replace(/```html/g, '').replace(/```/g, '').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').trim();
            onUpdate('ai_market_analysis', clean); 
        } catch (e) { alert("AI Oracle Offline"); } 
        finally { setIsAnalyzing(false); }
    };

    // --- CHART DATA GENERATORS ---
    const performancePieData = useMemo(() => ({
        labels: ['Entry Basis', profit >= 0 ? 'Net Alpha' : 'Net Loss'],
        datasets: [{ data: [totalCost, Math.abs(profit)], backgroundColor: ['#3b82f6', profit >= 0 ? '#10b981' : '#ef4444'], borderWidth: 0 }]
    }), [totalCost, profit]);

    const lineChartData = useMemo(() => {
        const displayName = company.companyName || company.name || 'Current Asset';
        if (!history.length) return null;
        return {
            labels: history.map((_, i) => `D-${30-i}`),
            datasets: [{
                label: displayName,
                data: history,
                borderColor: '#8b5cf6',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4,
                fill: true,
                backgroundColor: (ctx) => {
                    const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                    g.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
                    g.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
                    return g;
                }
            }]
        };
    }, [history, company.companyName]);

    return (
        <div className="animate-[fadeIn_0.3s_ease] space-y-8 font-manrope">
            
            {/* HERO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0f172a] border border-violet-500/30 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-transparent blur-[80px] opacity-40"></div>
                    <div className="relative z-10 flex justify-between items-start mb-4">
                        <h2 className="text-xl font-black text-white uppercase">{company.companyName}</h2>
                        <div className={`px-2 py-1 rounded text-[10px] font-black ${changePct >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                        </div>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter relative z-10">{loading ? '...' : formatCurrency(livePrice)}</h2>
                    <div className="mt-4 text-[10px] text-violet-400 font-black tracking-widest uppercase opacity-70">
                        {company.ticker || 'NSE'} • {livePrice > 0 ? 'LIVE ORACLE' : 'VALUATION'}
                    </div>
                </div>

                <div className="bg-[#0f172a] border border-white/5 p-8 rounded-[2.5rem] relative shadow-2xl overflow-hidden">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em] mb-4 opacity-40">Consolidated Position</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter">{totalShares} <span className="text-[10px] text-slate-500 font-black">UNITS</span></h2>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-60 mt-2">Avg Basis: {formatCurrency(avgCost)}</div>
                </div>

                <div className={`bg-[#0f172a] border p-8 rounded-[2.5rem] relative shadow-2xl overflow-hidden ${profit >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em] mb-4 opacity-40">Unrealized Performance</p>
                    <h2 className={`text-4xl font-black tracking-tighter ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</h2>
                    <div className={`text-[10px] font-black uppercase mt-2 tracking-widest ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{returnPct.toFixed(2)}% Alpha Return</div>
                </div>
            </div>

            {/* --- TAB: OVERVIEW --- */}
            {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.3s_ease]">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                            <h3 className="text-white font-black mb-10 text-[10px] uppercase tracking-[0.3em] opacity-40 flex items-center gap-3">
                                <i className="fa-solid fa-chart-line text-violet-500"></i> Performance Trajectory
                            </h3>
                            <div className="h-80">
                                {history.length > 0 ? (
                                    <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } } } }} />
                                ) : <div className="h-full flex items-center justify-center text-slate-700 font-black uppercase text-[10px] tracking-widest border border-dashed border-white/5 rounded-2xl">Forensic Engine Syncing...</div>}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#0f172a] border border-violet-500/20 rounded-[2.5rem] p-8 shadow-2xl relative">
                             <div className="flex justify-between items-center mb-8">
                                 <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] opacity-80"><i className="fa-solid fa-robot text-violet-400"></i> AI Analyst</h3>
                                 {isSuperAdmin && <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="px-4 py-2 bg-violet-600 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all">{isAnalyzing ? '...' : 'Run Scan'}</button>}
                             </div>
                             <div className="ai-report-container" dangerouslySetInnerHTML={{ __html: company.ai_market_analysis || "Activate Oracle Analysis trigger." }} />
                        </div>
                        <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                             <h3 className="text-white font-black mb-6 text-[10px] uppercase tracking-[0.3em] opacity-40">Portfolio Ledger Notes</h3>
                             <textarea className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-slate-300 text-xs font-bold focus:border-violet-500 outline-none h-32 resize-none transition-all" value={company.notes || ''} onChange={(e) => onUpdate('notes', e.target.value)} placeholder="Targets, analysis..."/>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: PERFORMANCE (RESTORED) --- */}
            {activeTab === 'Performance' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.3s_ease]">
                    <div className="lg:col-span-1 bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
                         <h3 className="text-white font-black mb-10 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.3em] opacity-40"><i className="fa-solid fa-chart-pie text-violet-500"></i> Value Composition</h3>
                         <div className="h-64 flex items-center justify-center">
                             <Pie data={performancePieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#64748b', font: { weight: 'bold', size: 10 } } } } }} />
                         </div>
                    </div>
                    <div className="lg:col-span-2 bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-center">
                        <div className="space-y-6">
                            <div className="flex justify-between border-b border-white/5 pb-4"><span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Entry Basis</span><span className="text-white font-black">{formatCurrency(avgCost)}</span></div>
                            <div className="flex justify-between border-b border-white/5 pb-4"><span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Profit Delta</span><span className={`font-black ${livePrice > avgCost ? 'text-green-400' : 'text-red-400'}`}>{livePrice > avgCost ? '+' : ''}{formatCurrency(livePrice - avgCost)} /unit</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Session Performance (Est)</span><span className={`font-black ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{change >= 0 ? '+' : ''}{formatCurrency(dayChangeValue)}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: TRANSACTIONS (RESTORED) --- */}
            {activeTab === 'Transactions' && (
                <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <h3 className="text-white font-black text-xs uppercase tracking-widest opacity-80">Transaction Ledger</h3>
                        {isSuperAdmin && <button onClick={() => setModalState({ type: 'add', mode: 'buy' })} className="text-[9px] bg-violet-600 text-black px-6 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all">+ Log Trade</button>}
                    </div>
                    <div className="divide-y divide-white/5">
                        {investments.map((inv, i) => {
                            const isExpanded = expandedRoundId === inv.id;
                            const isSell = inv.round_name === 'Sell';
                            return (
                                <div key={inv.id || i} className={`transition-all duration-300 ${isExpanded ? 'bg-black/40 border-l-2 border-violet-500' : 'hover:bg-white/5 group border-l-2 border-transparent'}`}>
                                    <div className="p-6 flex justify-between items-center cursor-pointer" onClick={() => setExpandedRoundId(prev => prev === inv.id ? null : inv.id)}>
                                        <div className="flex items-center gap-8">
                                            <div className={`text-[9px] font-black px-3 py-1 rounded-lg border tracking-widest ${isSell ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-green-500/30 text-green-400 bg-green-500/10'}`}>{isSell ? 'SOLD' : 'BOUGHT'}</div>
                                            <div>
                                                <div className="text-white text-sm font-black tracking-tight">{new Date(inv.investmentDate || inv.investment_date).toLocaleDateString()}</div>
                                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Rate: {formatCurrency(inv.share_price || inv.buyPrice)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-12">
                                            <div className="min-w-[140px]">
                                                <div className="text-white font-mono font-black text-lg tracking-tighter">{inv.quantity} <span className="text-[10px] text-slate-600 uppercase">Units</span></div>
                                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{formatCurrency(inv.amount_invested || inv.amount)}</div>
                                            </div>
                                            <i className={`fa-solid fa-chevron-down text-slate-500 transition-transform ${isExpanded ? 'rotate-180 text-violet-500' : ''}`}></i>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="p-6 border-t border-white/5 bg-[#020617]/50 animate-[fadeIn_0.3s_ease]">
                                            <div className="mb-4 bg-slate-900/80 border border-violet-500/20 p-5 rounded-2xl">
                                                <h4 className="text-violet-500 text-[10px] font-black uppercase mb-2 flex items-center gap-2 tracking-widest"><i className="fa-solid fa-wand-magic-sparkles"></i> Forensic Audit Notes</h4>
                                                <div className="text-slate-300 text-xs leading-relaxed font-bold border-l-2 border-violet-500/50 pl-3">{inv.ai_analysis || "No notes recorded."}</div>
                                            </div>
                                            {isSuperAdmin && (
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => setModalState({ type: 'edit', data: inv })} className="px-3 py-1.5 bg-white/5 text-slate-300 border border-white/10 rounded-lg text-xs font-bold transition-all"><i className="fa-solid fa-pen"></i> Edit</button>
                                                    <button onClick={() => handleDeleteRound(inv.id)} className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash"></i> Delete</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* --- TAB: VAULT (RESTORED) --- */}
            {activeTab === 'Vault' && (
                <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-10 animate-[fadeIn_0.3s_ease] shadow-2xl">
                    <CompanyDocumentVault fileLinks={fileLinks} isSuperAdmin={isSuperAdmin} uploading={uploading} onUpload={handleFileUpload} onDelete={handleDeleteFile} />
                </div>
            )}
        </div>
    );
};

export default StockDetail;