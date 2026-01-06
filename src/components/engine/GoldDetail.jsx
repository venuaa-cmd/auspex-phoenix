import React, { useState, useEffect, useMemo } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { runAIAnalysis } from '../../lib/aiService';
import GaugeChart from 'react-gauge-chart'; // Ensure installed via npm install react-gauge-chart

// --- MODULAR COMPONENT IMPORTS ---
import CompanyDocumentVault from './company/CompanyDocumentVault';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

const PROXY_BASE_URL = "https://auspex-phoenix.vercel.app";

const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num); 
};

const formatGrams = (num) => (num || 0).toFixed(2) + "g";

// --- ROBUST LIVE GOLD PRICE HOOK ---
const useGoldPrice = () => {
    const [pricePerGram, setPricePerGram] = useState(0);
    const [history, setHistory] = useState([]);
    const [change24h, setChange24h] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${PROXY_BASE_URL}/api/gold`);
                const text = await res.text();
                if (!text.startsWith('<!DOCTYPE')) {
                    const data = JSON.parse(text);
                    setPricePerGram(data.pricePerGram || 0);
                    setChange24h(data.change24h || 0);
                }

                const histRes = await fetch(`${PROXY_BASE_URL}/api/gold-chart`);
                const histText = await histRes.text();
                if (!histText.startsWith('<!DOCTYPE')) {
                    const histData = JSON.parse(histText);
                    if (histData.prices) {
                        const perGramHistory = histData.prices
                            .filter((_, i) => i % 5 === 0)
                            .map(p => [p[0], p[1] / 31.1035]); 
                        setHistory(perGramHistory);
                    }
                }
            } catch (e) { console.error("Sync Error:", e); }
        };
        fetchData();
        const interval = setInterval(fetchData, 300000); 
        return () => clearInterval(interval);
    }, []);

    return { pricePerGram, change24h, history };
};

const GoldDetail = ({ 
    company, isEditing, onUpdate, onDirectUpdate, 
    activeTab, investments, stats, 
    setModalState, handleDeleteRound, fileLinks, handleDeleteFile, handleFileUpload, uploading,
    currentUserEmail 
}) => {
    // FIX: Renamed liveRate to livePrice to resolve prompt ReferenceError
    const { pricePerGram: livePrice, change24h, history } = useGoldPrice();
    const isSuperAdmin = currentUserEmail?.toLowerCase().trim() === 'venu.ananda@auspexinvestments.com';

    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // --- AGGREGATE CALCULATIONS ---
    const { totalGrams, avgCostPerGram, totalCost } = useMemo(() => {
        let grams = 0; let cost = 0;
        investments.forEach(inv => {
            if (inv.status === 'Active') {
                const q = Number(inv.quantity || inv.units || 0);
                const amt = Number(inv.amount_invested || inv.amount || 0);
                grams += q;
                cost += amt;
            }
        });
        return { totalGrams: grams, totalCost: cost, avgCostPerGram: grams > 0 ? cost / grams : 0 };
    }, [investments]);

    const effectivePrice = livePrice || avgCostPerGram; 
    const currentValue = totalGrams * effectivePrice;
    const profit = currentValue - totalCost;
    const returnPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    // --- GAUGE CALCULATION (Amber Theme) ---
    const gaugeValue = useMemo(() => Math.min(1, Math.max(0, (returnPct + 10) / 30)), [returnPct]);

    // --- CHART CONFIGURATIONS ---
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { 
                grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, 
                ticks: { color: '#64748b', font: { size: 10 } } 
            },
            x: { 
                grid: { display: true, color: 'rgba(255,255,255,0.05)' }, 
                ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 12 } 
            }
        },
        interaction: { mode: 'index', intersect: false },
    };

    const overviewChartData = useMemo(() => {
        if (!history.length) return null;
        return {
            labels: history.map(p => new Date(p[0]).toLocaleDateString()),
            datasets: [
                {
                    label: 'Gold Price (1g)',
                    data: history.map(p => p[1]),
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    fill: true,
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
                        gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
                        return gradient;
                    }
                },
                {
                    label: 'Your Avg Cost',
                    data: new Array(history.length).fill(avgCostPerGram),
                    borderColor: '#94a3b8',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        };
    }, [history, avgCostPerGram]);

    const performanceMatrixData = useMemo(() => {
        if (!history.length) return null;
        const labels = history.map(p => new Date(p[0]).toLocaleString('default', { month: 'short' }));
        return {
            labels,
            datasets: [
                {
                    label: 'Your Gold Performance (%)',
                    data: history.map(p => (p[1] / (avgCostPerGram || p[1])) * 100),
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    fill: true,
                    backgroundColor: 'rgba(245, 158, 11, 0.05)'
                },
                {
                    label: 'Inflation Index (CPI)',
                    data: history.map((_, i) => 100 + (i * 0.1)),
                    borderColor: '#475569',
                    borderWidth: 1.5,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false
                }
            ]
        };
    }, [history, avgCostPerGram]);

    const doughnutData = useMemo(() => ({
        labels: ['Total Cost', 'Profit', 'Loss'],
        datasets: [{
            data: [totalCost, Math.max(0, profit), Math.max(0, -profit)],
            backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
            borderWidth: 0,
        }]
    }), [totalCost, profit]);

    // --- AI ANALYSIS (FIXED TYPO, BOLDING, AND PERSISTENCE) ---
    const handleRunAnalysis = async () => {
        setIsAnalyzing(true);
        const prompt = `
            Act as a Senior Commodities Strategist. Analyze this Gold Bullion portfolio:
            - Holdings: ${totalGrams.toFixed(2)} Grams
            - Avg Acquisition: ${formatCurrency(avgCostPerGram)}/g
            - Current Spot: ${formatCurrency(livePrice)}/g
            - Gain/Loss: ${returnPct.toFixed(2)}%

            STRUCTURE RULES:
            1. Start with an <h2> for titles (NOT h1).
            2. Use <table> for metrics.
            3. Wrap every paragraph in <p> tags for spacing.
            4. Use <b>bold</b> ONLY for key numbers or metrics.
            5. Use <h2> for section headers.
            6. Return body HTML content only.
        `;
        
        try {
            const res = await runAIAnalysis(prompt);
            const cleanHtml = res
                .replace(/```html/g, '')
                .replace(/```/g, '')
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') 
                .trim();
                
            onUpdate('ai_analysis', cleanHtml);
        } catch (e) {
            console.error("AI Error:", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="animate-[fadeIn_0.3s_ease] space-y-8 font-manrope">
            
            {/* HERO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0f172a] border border-amber-500/30 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-transparent blur-[80px] opacity-40 pointer-events-none"></div>
                    <div className="relative z-10 flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner"><i className="fa-solid fa-coins text-xl"></i></div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase">Gold Dec</h2>
                                <span className="text-[10px] text-amber-500/60 font-black tracking-widest uppercase mt-1 block">XAU / INR</span>
                            </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-[10px] font-black ${change24h >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{change24h > 0 ? '+' : ''}{change24h.toFixed(2)}%</div>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter relative z-10">{formatCurrency(effectivePrice)} <span className="text-sm font-bold text-slate-500 opacity-60">/ 1g</span></h2>
                    <div className="text-[9px] text-slate-500 mt-3 flex items-center gap-2 uppercase font-black tracking-widest relative z-10 opacity-70"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live 24k Spot Rate</div>
                </div>

                <div className="bg-[#0f172a] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em] mb-4 opacity-40">Total Holdings</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{formatGrams(totalGrams)}</h2>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-60">Avg Cost: {formatCurrency(avgCostPerGram)} /g</div>
                    <div className="absolute bottom-0 left-8 right-8 h-1 bg-amber-500/40 rounded-full overflow-hidden"><div className="h-full bg-amber-500 w-full"></div></div>
                </div>

                <div className={`bg-[#0f172a] border p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl ${profit >= 0 ? 'border-green-500/10' : 'border-red-500/10'}`}>
                    <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] opacity-20 pointer-events-none ${profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em] mb-4 opacity-40">Unrealized P&L</p>
                    <h2 className={`text-4xl font-black tracking-tighter ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</h2>
                    <div className={`text-[10px] font-black uppercase mt-2 tracking-widest ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{returnPct.toFixed(2)}% Return</div>
                </div>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.3s_ease]">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-white font-black flex items-center gap-3 text-xs uppercase tracking-[0.2em] opacity-80"><i className="fa-solid fa-chart-line text-amber-500"></i> Price Trend (1g)</h3>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gold Price (1g)</span></div>
                                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full border border-white/40"></span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Your Avg Cost</span></div>
                                </div>
                            </div>
                            <div className="h-80">{overviewChartData ? <Line data={overviewChartData} options={chartOptions} /> : <div className="h-full flex items-center justify-center text-slate-700 font-black text-[10px] uppercase tracking-widest">Syncing Market Engine...</div>}</div>
                        </div>

                        {/* VAULT NOTES & METADATA SECTION */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl"><h3 className="text-white font-black mb-6 text-xs uppercase tracking-[0.2em] opacity-80">Vault Notes</h3><textarea className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-slate-300 text-xs focus:border-amber-500 outline-none h-32 font-bold transition-all placeholder:text-slate-700 resize-none" placeholder="Locker location, purity details..." value={company.notes || ''} onChange={(e) => onUpdate('notes', e.target.value)}/></div>
                            <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 relative shadow-2xl"><h3 className="text-white font-black mb-8 text-xs uppercase tracking-[0.2em] opacity-80">Asset Metadata</h3><div className="space-y-6"><div><label className="text-[9px] text-slate-500 uppercase font-black block tracking-widest mb-2 opacity-50">Form Factor</label><select className="w-full bg-transparent border-b border-white/10 text-xs text-white py-1 focus:outline-none font-black tracking-tight" value={company.formFactor || 'Physical'} onChange={(e) => onUpdate('formFactor', e.target.value)} disabled={!isSuperAdmin}><option>Physical (Coins/Bars)</option><option>Digital Gold</option></select></div><div><label className="text-[9px] text-slate-500 uppercase font-black block tracking-widest mb-2 opacity-50">Purity</label><select className="w-full bg-transparent border-b border-white/10 text-xs text-white py-1 focus:outline-none font-black tracking-tight" value={company.purity || '24k'} onChange={(e) => onUpdate('purity', e.target.value)} disabled={!isSuperAdmin}><option>24k (999)</option><option>22k (916)</option></select></div><div><label className="text-[9px] text-slate-500 uppercase font-black block tracking-widest mb-2 opacity-50">Storage Location</label><input className="w-full bg-transparent border-b border-white/10 text-xs text-amber-500 font-bold py-1 focus:outline-none" value={company.storageLocation || ''} onChange={(e) => onUpdate('storageLocation', e.target.value)} placeholder="e.g. Bank Locker #402" readOnly={!isSuperAdmin}/></div></div></div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* BULLION STRENGTH GAUGE (AMBER THEMED) */}
                        <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center justify-center">
                            <h3 className="text-white font-black mb-8 text-[10px] uppercase tracking-[0.3em] opacity-40">Bullion Strength</h3>
                            <GaugeChart id="bullion-gauge" nrOfLevels={20} percent={gaugeValue} colors={['#ef4444', '#f59e0b']} arcWidth={0.25} hideText={true} />
                            <div className="text-3xl font-black text-white mt-4">{returnPct.toFixed(1)}%</div>
                            <div className={`text-[9px] font-black uppercase mt-2 tracking-widest ${profit >= 0 ? 'text-amber-400' : 'text-red-400'}`}>STATUS: {profit >= 0 ? 'APPRECIATING' : 'VOLATILE'}</div>
                        </div>

                        {/* AI ANALYSIS (Amber Button Fixed) */}
                        <div className="bg-[#0f172a] border border-amber-500/20 rounded-[2.5rem] p-8 shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] opacity-80">
                                    <i className="fa-solid fa-robot text-amber-500 mr-2"></i> Bullion AI
                                </h3>
                                {isSuperAdmin && (
                                    <button 
                                        onClick={handleRunAnalysis} 
                                        disabled={isAnalyzing} 
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all"
                                    >
                                        {isAnalyzing ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                                        {isAnalyzing ? 'Scanning...' : 'Run Scan'}
                                    </button>
                                )}
                            </div>

                            {company.ai_analysis ? (
                                <div 
                                    className="ai-report-container" 
                                    dangerouslySetInnerHTML={{ __html: company.ai_analysis }} 
                                />
                            ) : (
                                <div className="text-slate-500 text-[10px] font-bold text-center py-20 border-2 border-dashed border-white/5 rounded-2xl uppercase tracking-widest opacity-50">
                                    Activate Bullion Oracle for market thesis.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: PERFORMANCE */}
            {activeTab === 'Performance' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.3s_ease]">
                    <div className="lg:col-span-1 bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] pointer-events-none"></div>
                        <h3 className="text-white font-black mb-10 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.3em] opacity-40"><i className="fa-solid fa-chart-pie text-amber-500"></i> Capital Allocation</h3>
                        <div className="h-64 flex items-center justify-center"><Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#64748b', font: { weight: 'bold', size: 10 } } } } }} /></div>
                    </div>
                    <div className="lg:col-span-2 bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[80px] pointer-events-none"></div>
                        <h3 className="text-white font-black mb-8 flex items-center gap-3 text-xs uppercase tracking-[0.3em] opacity-40"><i className="fa-solid fa-arrow-trend-up text-amber-500"></i> Performance vs. Inflation (Index)</h3>
                        <div className="h-72">{performanceMatrixData ? <Line data={performanceMatrixData} options={chartOptions} /> : <div className="h-full flex items-center justify-center text-slate-700 font-black uppercase text-[10px] tracking-widest border border-dashed border-white/5 rounded-xl">Syncing Market Data...</div>}</div>
                    </div>
                </div>
            )}

            {/* TAB: TRANSACTIONS */}
            {activeTab === 'Transactions' && (
                <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-10 animate-[fadeIn_0.3s_ease] shadow-2xl">
                    <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Ledger</h3>
                        {isSuperAdmin && (
                            <button onClick={() => setModalState({ type: 'add', mode: 'buy' })} className="bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-lg shadow-lg hover:brightness-110 transition-all font-bold">+ Log Trade</button>
                        )}
                    </div>
                    <table className="w-full text-left">
                        <thead className="text-[9px] uppercase text-slate-500 font-black tracking-[0.2em] border-b border-white/5">
                            <tr><th className="p-5">Date</th><th className="p-5">Type</th><th className="p-5 text-center">Weight</th><th className="p-5 text-center">Rate</th><th className="p-5 text-center">Value</th><th className="p-5 text-right">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-bold text-slate-300">
                            {investments.map(inv => {
                                const weight = Math.abs(inv.quantity || inv.units || 0);
                                const rate = inv.share_price || inv.buyPrice || 0;
                                const value = weight * rate;
                                return (
                                    <tr key={inv.id} className="hover:bg-white/5 transition-all group">
                                        <td className="p-5 font-mono text-slate-500">{new Date(inv.investment_date || inv.investmentDate).toLocaleDateString()}</td>
                                        <td className="p-5"><span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest border ${inv.quantity < 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{inv.quantity < 0 ? 'SELL' : 'BUY'}</span></td>
                                        <td className="p-5 text-center font-mono">{weight} g</td>
                                        <td className="p-5 text-center font-mono text-slate-400">{formatCurrency(rate)}</td>
                                        <td className="p-5 text-center font-mono text-white font-black">{formatCurrency(value)}</td>
                                        <td className="p-5 text-right flex justify-end gap-3">
                                            {isSuperAdmin ? (
                                                <>
                                                    <button onClick={() => setModalState({ type: 'edit', data: inv, mode: inv.quantity < 0 ? 'sell' : 'buy' })} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-lg hover:scale-110 transition-transform"><i className="fa-solid fa-pen text-[10px]"></i></button>
                                                    <button onClick={() => handleDeleteRound(inv.id)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-lg hover:text-red-500 hover:scale-110 transition-transform"><i className="fa-solid fa-trash text-[10px]"></i></button>
                                                </>
                                            ) : <i className="fa-solid fa-lock text-slate-700 text-[10px]"></i>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB: VAULT */}
            {activeTab === 'Vault' && (
                <CompanyDocumentVault fileLinks={fileLinks} isSuperAdmin={isSuperAdmin} uploading={uploading} onUpload={handleFileUpload} onDelete={handleDeleteFile} />
            )}
        </div>
    );
};

export default GoldDetail;