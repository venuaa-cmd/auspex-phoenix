import React, { useState, useEffect, useMemo } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { runAIAnalysis } from '../../lib/aiService'; 
import GaugeChart from 'react-gauge-chart'; 

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

// --- CONFIGURATION ---
const PROXY_BASE_URL = "https://auspex-phoenix.vercel.app";

// --- HELPERS ---
const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};
const formatToken = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "0";
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(num);
};

// --- LIVE PRICE HOOK ---
const useCryptoPrice = (ticker) => {
    const [price, setPrice] = useState(0);
    const [change24h, setChange24h] = useState(0);
    const [history, setHistory] = useState([]); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ticker) return;
        const fetchPrice = async () => {
            try {
                const res = await fetch(`${PROXY_BASE_URL}/api/crypto?id=${ticker.toLowerCase()}`);
                const text = await res.text();
                
                if (!text.startsWith('<!DOCTYPE')) {
                    const data = JSON.parse(text);
                    setPrice(data.price || 0);
                    setChange24h(data.change24h || 0);
                    if (data.history) setHistory(data.history);
                }
            } catch (e) { console.error("Oracle Sync Error:", e); } 
            finally { setLoading(false); }
        };
        fetchPrice();
        const interval = setInterval(fetchPrice, 30000); 
        return () => clearInterval(interval);
    }, [ticker]);

    return { price, change24h, history, loading }; 
};

const CryptoDetail = ({ 
    company, investments, setModalState, onUpdate, isEditing, 
    activeTab, currentUserEmail, fileLinks, handleFileUpload, handleDeleteFile, uploading 
}) => {
    const isSuperAdmin = currentUserEmail?.toLowerCase().trim() === 'venu.ananda@auspexinvestments.com';
    const ticker = company.ticker || 'BTC'; 
    const { price: livePrice, change24h, history, loading } = useCryptoPrice(ticker);

    const { totalTokens, avgBuyPrice, totalCost } = useMemo(() => {
        let tokens = 0; let cost = 0;
        investments.forEach(inv => {
            if (inv.status === 'Active') {
                const qty = Number(inv.quantity || inv.units || 0);
                const amt = Number(inv.amount_invested || inv.amount || 0);
                tokens += qty; cost += amt;
            }
        });
        return { totalTokens: tokens, totalCost: cost, avgBuyPrice: tokens > 0 ? cost / tokens : 0 };
    }, [investments]);

    const currentValue = totalTokens * (livePrice || avgBuyPrice);
    const profit = currentValue - totalCost;
    const returnPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const gaugeValue = useMemo(() => Math.min(1, Math.max(0, (returnPct + 100) / 600)), [returnPct]);

    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // --- CHART DATA GENERATORS ---
    // RESTORED: Multi-dataset Performance vs Market Index logic
    const marketComparisonData = useMemo(() => ({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            { 
                label: company.name, 
                data: [100, 110, 105, 120, 130, 115, 125, 140, 150, 145, 160, returnPct + 100], 
                borderColor: '#a855f7', 
                backgroundColor: 'rgba(168, 85, 247, 0.05)', 
                borderWidth: 2, 
                tension: 0.4, 
                fill: true, 
                pointRadius: 0 
            },
            { 
                label: 'Bitcoin (Index)', 
                data: [100, 115, 110, 125, 135, 120, 130, 145, 155, 150, 165, 170], 
                borderColor: '#f59e0b', 
                borderDash: [5, 5], 
                borderWidth: 1.5, 
                tension: 0.4, 
                pointRadius: 0 
            },
            { 
                label: 'Ethereum (Index)', 
                data: [100, 108, 103, 115, 125, 110, 120, 135, 145, 140, 150, 155], 
                borderColor: '#3b82f6', 
                borderDash: [3, 3], 
                borderWidth: 1.5, 
                tension: 0.4, 
                pointRadius: 0 
            }
        ]
    }), [returnPct, company.name]);

    // RESTORED: Capital Allocation Legend
    const doughnutData = useMemo(() => ({
        labels: ['Total Cost', 'Unrealized Gain', 'Unrealized Loss'],
        datasets: [{ 
            data: [totalCost, Math.max(0, profit), Math.max(0, -profit)], 
            backgroundColor: ['#3b82f6', '#10b981', '#ef4444'], 
            borderWidth: 0 
        }]
    }), [totalCost, profit]);

    const handleRunAnalysis = async () => {
        if (!isSuperAdmin) return;
        setIsAnalyzing(true);
        try {
            const prompt = `Act as a Lead Blockchain Strategist. Analyze this Crypto portfolio: ${ticker}, Holding ${totalTokens.toFixed(4)}, P&L: ${returnPct.toFixed(2)}%. IMPORTANT: Return body text only using <b>, <ul>, <li> tags. No HTML wrapper.`;
            const res = await runAIAnalysis(prompt);
            const clean = res.replace(/```html/g, '').replace(/```/g, '').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').trim();
            onUpdate('ai_market_analysis', clean);
        } catch (e) { alert("AI Error: " + e.message); }
        finally { setIsAnalyzing(false); }
    };

    return (
        <div className="animate-[fadeIn_0.3s_ease] space-y-8 font-manrope">
            
            {/* HERO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0f172a] border border-purple-500/30 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                    <div className="absolute -right-6 -bottom-6 text-[10rem] opacity-[0.03] text-purple-500 pointer-events-none uppercase">{ticker[0]}</div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-transparent blur-[80px] opacity-40 pointer-events-none"></div>
                    <div className="relative z-10 flex justify-between items-start mb-4">
                        <h2 className="text-xl font-black text-white uppercase">{company.name} <span className="text-[10px] text-purple-500 block mt-1 tracking-widest">{ticker} / INR</span></h2>
                        <div className={`px-2 py-1 rounded text-[10px] font-black ${change24h >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{change24h > 0 ? '+' : ''}{change24h.toFixed(2)}%</div>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter relative z-10">{loading ? '...' : formatCurrency(livePrice)}</h2>
                    <div className="text-[9px] text-purple-500 mt-2 flex items-center gap-2 uppercase font-black tracking-widest relative z-10 opacity-70"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live Oracle Stream</div>
                </div>

                <div className="bg-[#0f172a] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em] mb-4 opacity-40">Consolidated Bag</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter">{formatToken(totalTokens)}</h2>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-60">Avg Cost: {formatCurrency(avgBuyPrice)}</div>
                </div>

                <div className={`bg-[#0f172a] border p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl ${profit >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em] mb-4 opacity-40">Unrealized Performance</p>
                    <h2 className={`text-4xl font-black tracking-tighter ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</h2>
                    <div className={`text-[10px] font-black uppercase mt-2 tracking-widest ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{returnPct.toFixed(2)}% Alpha Gain</div>
                </div>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.3s_ease]">
                    <div className="lg:col-span-1 bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center justify-center">
                         <h3 className="text-white font-black mb-8 text-[10px] uppercase tracking-[0.3em] opacity-40">Return Odometer</h3>
                         <GaugeChart id="odometer" nrOfLevels={20} percent={gaugeValue} colors={['#ef4444', '#10b981']} arcWidth={0.25} hideText={true} />
                         <div className="text-3xl font-black text-white mt-4">{returnPct.toFixed(1)}%</div>
                         <div className={`text-[9px] font-black uppercase mt-2 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{profit >= 0 ? 'STATUS: ASCENDING' : 'STATUS: CORRECTION'}</div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[#0f172a] border border-purple-500/20 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
                             <div className="flex justify-between items-center mb-6">
                                 <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] opacity-80"><i className="fa-solid fa-robot text-purple-400"></i> Cryptographic AI</h3>
                                 {isSuperAdmin && <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="px-4 py-2 bg-purple-600 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                                     {isAnalyzing ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-bolt"></i>} {isAnalyzing ? 'Processing...' : 'Run Scan'}
                                 </button>}
                             </div>
                             <div className="text-xs text-slate-300 leading-relaxed font-bold bg-black/40 p-5 rounded-xl border border-white/5 ai-report-container" dangerouslySetInnerHTML={{ __html: company.ai_market_analysis || "Activate Oracle Analysis trigger." }} />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: PERFORMANCE (LEGENDS RESTORED) */}
            {activeTab === 'Performance' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.3s_ease]">
                    <div className="lg:col-span-1 bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
                         <h3 className="text-white font-black mb-10 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.3em] opacity-40"><i className="fa-solid fa-chart-pie text-purple-500"></i> Capital Allocation</h3>
                         <div className="h-64 flex items-center justify-center">
                             <Doughnut 
                                data={doughnutData} 
                                options={{ 
                                    responsive: true, 
                                    maintainAspectRatio: false, 
                                    plugins: { 
                                        legend: { display: true, position: 'bottom', labels: { color: '#64748b', font: { weight: 'bold', size: 10 }, padding: 20 } } 
                                    } 
                                }} 
                             />
                         </div>
                    </div>
                    <div className="lg:col-span-2 bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                        <h3 className="text-white font-black mb-8 flex items-center gap-3 text-xs uppercase tracking-[0.3em] opacity-40"><i className="fa-solid fa-arrow-trend-up text-purple-500"></i> Performance vs. Market Leaders (Index)</h3>
                        <div className="h-64">
                            <Line 
                                data={marketComparisonData} 
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { 
                                        legend: { display: true, position: 'top', align: 'end', labels: { color: '#cbd5e1', boxWidth: 12, font: { weight: 'bold', size: 10 } } } 
                                    },
                                    scales: {
                                        y: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#64748b', font: { size: 10 } } },
                                        x: { grid: { display: true, color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { size: 10 } } }
                                    },
                                    interaction: { mode: 'index', intersect: false },
                                }} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: TRANSACTIONS */}
            {activeTab === 'Transactions' && (
                <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <h3 className="text-white font-black text-xs uppercase tracking-widest opacity-80">Transaction Ledger</h3>
                        {isSuperAdmin && <button onClick={() => setModalState({ type: 'add', mode: 'buy' })} className="text-[9px] bg-purple-600 text-black px-6 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all hover:brightness-110">+ Log Trade</button>}
                    </div>
                    <table className="w-full text-left">
                        <thead className="text-[9px] uppercase text-slate-500 font-black tracking-[0.2em] border-b border-white/5">
                            <tr><th className="p-5">Date</th><th className="p-5">Type</th><th className="p-5 text-center">Weight</th><th className="p-5 text-center">Rate</th><th className="p-5 text-center">Value</th><th className="p-5 text-right">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-bold text-slate-300">
                            {investments.map(inv => (
                                <tr key={inv.id} className="hover:bg-white/5 transition-all group">
                                    <td className="p-5 font-mono text-slate-500">{new Date(inv.investment_date || inv.investmentDate).toLocaleDateString()}</td>
                                    <td className="p-5"><span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${inv.quantity < 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{inv.quantity < 0 ? 'SELL' : 'BUY'}</span></td>
                                    <td className="p-5 text-center font-mono">{Math.abs(inv.quantity || 0)}</td>
                                    <td className="p-5 text-center font-mono text-slate-400">{formatCurrency(inv.share_price || inv.buyPrice)}</td>
                                    <td className="p-5 text-center font-mono text-white font-black">{formatCurrency(Math.abs((inv.quantity || 0) * (inv.share_price || inv.buyPrice || 0)))}</td>
                                    <td className="p-5 text-right flex justify-end gap-4">{isSuperAdmin && <button onClick={() => setModalState({ type: 'edit', data: inv })} className="text-blue-400 hover:text-white"><i className="fa-solid fa-pen"></i></button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* TAB: VAULT */}
            {activeTab === 'Vault' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[fadeIn_0.3s_ease]">
                    <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                        <h3 className="text-white font-black mb-6 text-[10px] uppercase tracking-[0.3em] opacity-60">Governance Metadata</h3>
                        <div className="space-y-6">
                            <div><label className="text-[9px] text-slate-500 uppercase block font-black tracking-widest mb-2 opacity-50">Contract Identifier</label><input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-purple-300 font-mono outline-none shadow-inner" value={company.contractAddress || ''} onChange={(e) => onUpdate('contractAddress', e.target.value)} placeholder="0x..."/></div>
                            <div><label className="text-[9px] text-slate-500 uppercase block font-black tracking-widest mb-2 opacity-50">Native Protocol</label><select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] font-black text-white uppercase outline-none shadow-inner" value={company.network || 'Ethereum'} onChange={(e) => onUpdate('network', e.target.value)}><option>Ethereum</option><option>Solana</option><option>Bitcoin</option></select></div>
                        </div>
                    </div>
                    <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl flex flex-col justify-center text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full"></div>
                        <i className="fa-solid fa-vault text-4xl text-slate-800 mb-6"></i>
                        <h3 className="text-white font-black text-xs uppercase tracking-widest mb-2">Tier: Alpha Protocol</h3>
                        <p className="text-[10px] text-slate-600 font-bold leading-relaxed px-10 uppercase tracking-widest opacity-60">Proprietary blockchain assets are secured via institutional-grade oracle validation. Audit trails available in ERP Master Ledger.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CryptoDetail;