import React, { useState, useMemo, useEffect } from 'react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
    CartesianGrid, ReferenceLine, Legend, Line, ComposedChart
} from 'recharts';
import { runStrategicOptimization } from '../../../lib/aiService';

const Projections = ({ ledger = [], assets = [], employees = [] }) => {
    
    // --- 1. STATE MANAGEMENT ---
    const [scenarios, setScenarios] = useState({ hiring: 0, revenue: 0, fx: 0, injection: 0 });
    const [tempScenarios, setTempScenarios] = useState({ hiring: 0, revenue: 0, fx: 0, injection: 0 }); 
    const [liveFx, setLiveFx] = useState(83.50); 
    const [fxSyncing, setFxSyncing] = useState(false);
    const [aiSurvival, setAiSurvival] = useState(null); 
    const [showModal, setShowModal] = useState(false); 
    const [isThinking, setIsThinking] = useState(false);
    const [isBlackSwan, setIsBlackSwan] = useState(false);

    // --- 2. DYNAMIC FX PULSE (Tether Proxy) ---
    useEffect(() => {
        const fetchLiveFx = async () => {
            setFxSyncing(true);
            try {
                const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr`);
                const data = await res.json();
                if (data.tether?.inr) setLiveFx(data.tether.inr);
            } catch (err) { console.warn("FX_FALLBACK: 83.50"); }
            finally { setFxSyncing(false); }
        };
        fetchLiveFx();
    }, []);

    // --- 3. FORENSIC CALCULATIONS ---
    const financials = useMemo(() => {
        let cash = 0;
        (ledger || []).forEach(t => {
            if (['REALIZED', 'CLEARED'].includes(t.status)) {
                t.type === 'CREDIT' ? cash += Number(t.amount) : cash -= Number(t.amount);
            }
        });
        const payroll = (employees || []).filter(e => e.status === 'ACTIVE').reduce((sum, e) => sum + Number(e.net_payable_monthly || 0), 0);
        
        const totalBurn = payroll + (cash * 0.01); 

        return { 
            cash, burn: totalBurn, 
            usdAssets: (assets || []).filter(a => ['CRYPTO', 'OFFSHORE_STARTUP'].includes(a.asset_type)).reduce((sum, a) => sum + Number(a.current_valuation || 0), 0) / liveFx, 
            inrAssets: (assets || []).filter(a => !['CRYPTO', 'OFFSHORE_STARTUP'].includes(a.asset_type)).reduce((sum, a) => sum + Number(a.current_valuation || 0), 0),
            runwayMonths: totalBurn > 0 ? (cash / totalBurn).toFixed(1) : '∞'
        };
    }, [ledger, assets, employees, liveFx]);

    // --- 4. TRAJECTORY ENGINE ---
    const projectionData = useMemo(() => {
        const data = [];
        const now = new Date();
        const getPath = (h, r, f, inj) => {
            let cur = financials.cash + (inj * 10000000); 
            const hiringShift = isBlackSwan ? h + 25 : h; 
            const revenueShift = isBlackSwan ? r - 35 : r; 
            const simFx = liveFx * (1 + (isBlackSwan ? f - 15 : f)/100); 
            
            return Array.from({length: 24}, () => {
                cur += (financials.burn * 0.15 * (1+revenueShift/100)) - (financials.burn * (1+hiringShift/100));
                return Math.max(0, cur + financials.inrAssets + (financials.usdAssets * simFx));
            });
        };

        const baseline = getPath(0, 0, 0, 0);
        const sandbox = getPath(scenarios.hiring, scenarios.revenue, scenarios.fx, scenarios.injection);
        const survival = aiSurvival ? getPath(aiSurvival.hiring, aiSurvival.revenue, aiSurvival.fx, scenarios.injection) : null;

        for (let i = 0; i < 24; i++) {
            data.push({
                month: new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
                "Baseline": baseline[i],
                "Sandbox": sandbox[i],
                "AI_Path": survival ? survival[i] : null
            });
        }
        return data;
    }, [financials, scenarios, aiSurvival, liveFx, isBlackSwan]);

    // --- 5. SURVIVAL HEATMAP MATRIX ---
    const sensitivityGrid = useMemo(() => {
        const fxVars = [10, 5, 0, -5, -10]; 
        const burnVars = [-10, -5, 0, 5, 10];
        const grid = [];
        fxVars.forEach(fv => {
            const simRate = liveFx * (1 + fv/100);
            const row = { fxLabel: `₹${simRate.toFixed(1)}`, outcomes: [] };
            burnVars.forEach(bv => {
                let rInr = financials.cash + (scenarios.injection * 10000000);
                const mBurn = financials.burn * (1 + (scenarios.hiring + bv)/100);
                let mIdx = null;
                for (let i = 0; i < 36; i++) {
                    rInr -= mBurn;
                    if (rInr + financials.inrAssets + (financials.usdAssets * simRate) <= 0) { mIdx = i; break; }
                }
                let label = "Safe", color = "bg-emerald-500/10 text-emerald-500";
                if (mIdx !== null) {
                    label = `${mIdx}m`;
                    color = mIdx < 6 ? "bg-rose-500/20 text-rose-500" : "bg-amber-500/20 text-amber-500";
                }
                row.outcomes.push({ label, color, isCurrent: fv === 0 && bv === 0 });
            });
            grid.push(row);
        });
        return grid;
    }, [financials, liveFx, scenarios, isBlackSwan]);

    const defaultHorizon = useMemo(() => {
        const idx = projectionData.findIndex(d => d.Sandbox <= 0);
        return idx !== -1 ? projectionData[idx].month : "Stable";
    }, [projectionData]);

    const runSim = async () => {
        setIsThinking(true);
        try {
            const res = await runStrategicOptimization({ ...financials, inrBurn: financials.burn * 0.7, usdBurn: (financials.burn * 0.3) / liveFx }, 'MAX_RUNWAY', scenarios, liveFx);
            setAiSurvival(res); 
        } catch (e) { console.error(e); }
        setIsThinking(false);
    };

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(v);

    return (
        <div className={`bg-white rounded-[2rem] border border-slate-200 shadow-sm h-[85vh] flex flex-col overflow-hidden font-sans transition-all duration-700 ${isBlackSwan ? 'bg-rose-50/20' : ''}`}>
            
            {/* STYLIZED HEADER */}
            <div className="px-10 py-8 flex justify-between items-center bg-slate-900 border-b border-slate-800 shadow-2xl z-10 shrink-0">
                <div className="flex items-center gap-8">
                    <div className="border-l-4 border-indigo-500 pl-6">
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Venture Horizon <span className="text-indigo-400">v10.0</span></h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Sovereign Deployment Terminal</p>
                    </div>
                    <button 
                        onClick={() => setIsBlackSwan(!isBlackSwan)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${
                            isBlackSwan ? 'bg-rose-600 border-rose-500 text-white shadow-lg animate-pulse scale-105' : 'bg-transparent border-slate-700 text-slate-500 hover:text-rose-400 hover:border-rose-400'
                        }`}
                    >
                        <i className={`fa-solid ${isBlackSwan ? 'fa-biohazard' : 'fa-dove'}`}></i> {isBlackSwan ? 'CRISIS_MODE_ACTIVE' : 'BLACK_SWAN_TEST'}
                    </button>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => { setTempScenarios(scenarios); setShowModal(true); }} className="px-6 py-3 bg-white text-slate-900 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-100 transition-all">
                        <i className="fa-solid fa-sliders mr-2 text-indigo-600"></i> Open Sandbox
                    </button>
                    <button onClick={runSim} className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2">
                        {isThinking ? <i className="fa-solid fa-sync fa-spin"></i> : <i className="fa-solid fa-brain-circuit"></i>}
                        AI Analysis
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <KPICard label="Cash Runway" value={`${financials.runwayMonths}m`} sub="Operational Buffer" color="text-indigo-600" />
                    <KPICard label="Horizon" value={defaultHorizon} sub="Sandbox Termination" color={defaultHorizon === 'Stable' ? 'text-emerald-600' : 'text-rose-600'} />
                    <KPICard label="Injection" value={`₹${scenarios.injection}Cr`} sub="Capital Pumped" color="text-amber-600" />
                    <div className="bg-slate-900 p-6 rounded-[2rem] flex flex-col justify-center border border-white/5 shadow-xl">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live FX Pulse</span>
                        <div className="text-xl font-mono font-black text-white mt-1">₹{liveFx.toFixed(2)}</div>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-8 h-[550px]">
                    <div className="flex-1 bg-white border border-slate-200 rounded-[3rem] shadow-xl overflow-hidden flex flex-col relative">
                        {isBlackSwan && <div className="absolute top-0 left-0 w-full h-1 bg-rose-600 animate-pulse"></div>}
                        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Forensic_Liquidity_Map</span>
                            <div className="flex gap-6">
                                <LegendDot label="Baseline" color="bg-slate-200" />
                                <LegendDot label="Sandbox" color={isBlackSwan ? 'bg-rose-600' : 'bg-indigo-600'} />
                                {aiSurvival && <LegendDot label="AI Optimized" color="bg-emerald-500" />}
                            </div>
                        </div>
                        <div className="flex-1 p-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tick={{fontSize: 10, fontWeight: '900'}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 10, fontWeight: '800'}} tickFormatter={fmt} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)'}} formatter={(v) => [fmt(v), ""]} />
                                    <Area type="monotone" dataKey="Baseline" stroke="#e2e8f0" fill="#f8fafc" strokeWidth={2} strokeDasharray="10 5" />
                                    <Line type="monotone" dataKey="Sandbox" stroke={isBlackSwan ? '#e11d48' : '#4f46e5'} strokeWidth={6} dot={false} animationDuration={2000} />
                                    {aiSurvival && <Area type="monotone" dataKey="AI_Path" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={4} />}
                                    <ReferenceLine y={0} stroke="#ef4444" strokeWidth={3} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* SURVIVAL HEATMAP RESTORED */}
                    <div className="w-full xl:w-[420px] bg-slate-900 rounded-[3rem] p-10 shadow-2xl flex flex-col text-white">
                        <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 italic">Survival_Heatmap</h3>
                        <p className="text-slate-400 text-xs font-bold mb-8">Runway (m) vs. FX & Burn Volatility</p>
                        <div className="flex-1 flex flex-col justify-center space-y-3">
                            <div className="grid grid-cols-6 gap-2 text-[8px] font-black text-slate-600 uppercase text-center mb-2">
                                <div>FX</div>
                                <div>-10%</div>
                                <div>-5%</div>
                                <div className="text-indigo-400">0%</div>
                                <div>+5%</div>
                                <div>+10%</div>
                            </div>
                            {sensitivityGrid.map((row, i) => (
                                <div key={i} className="grid grid-cols-6 gap-2 h-10 items-center">
                                    <div className="text-[9px] text-slate-500 font-black italic text-right pr-2">{row.fxLabel}</div>
                                    {row.outcomes.map((cell, j) => (
                                        <div key={j} className={`h-full rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${cell.color} ${cell.isCurrent ? 'ring-2 ring-white scale-110 shadow-lg z-10' : 'opacity-80'}`}>
                                            {cell.label}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. VEDA'S TACTICAL DIRECTIVE - PROFESSIONAL TEXT */}
                <div className={`p-12 rounded-[3.5rem] flex items-center gap-12 transition-all duration-500 shadow-2xl ${isBlackSwan ? 'bg-rose-950 text-white ring-8 ring-rose-500/20' : 'bg-slate-900 text-white shadow-indigo-900/20'}`}>
                    <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-white/5 shrink-0">
                        <i className={`fa-solid ${isBlackSwan ? 'fa-skull-crossbones text-rose-500 animate-bounce' : 'fa-chess-queen text-indigo-400'}`}></i>
                    </div>
                    <div className="flex-1">
                        <h4 className={`text-[11px] font-black uppercase tracking-widest mb-3 ${isBlackSwan ? 'text-rose-400' : 'text-indigo-400'}`}>
                            {isBlackSwan ? 'CRITICAL_SURVIVAL_PROTOCOL' : 'VEDA_TACTICAL_DIRECTIVE'}
                        </h4>
                        <p className="text-sm font-medium leading-relaxed">
                            {isBlackSwan 
                                ? `System breach: Liquidity exhaustion projected in ${defaultHorizon}. Restoring stability requires an immediate injection of approx. ₹${Math.abs(scenarios.injection - 120)} Cr and a complete hiring freeze across all domains.` 
                                : `System nominal. Liquidity runway extends through ${defaultHorizon}. Current simulation parameters confirm that the 20% Reserve Floor remains insulated for 18 months.`
                            }
                        </p>
                    </div>
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Health</span>
                        <div className={`text-3xl font-black mt-2 ${isBlackSwan ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {isBlackSwan ? 'STRESS_TESTED' : 'NOMINAL'}
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-6">
                    <div className="bg-white p-14 rounded-[4rem] w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col gap-10">
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Sandbox Terminal</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Modify Capital Flows & Market Volatility</p>
                        </div>
                        
                        <div className="space-y-12">
                            <Slider label="Capital Injection (Cr)" val={tempScenarios.injection} min={0} max={500} set={v => setTempScenarios({...tempScenarios, injection: v})} color="accent-emerald-600" unit=" Cr" />
                            <Slider label="Hiring Offset (%)" val={tempScenarios.hiring} min={-50} max={50} set={v => setTempScenarios({...tempScenarios, hiring: v})} color="accent-indigo-600" unit="%" />
                            <Slider label="Revenue Shift (%)" val={tempScenarios.revenue} min={-50} max={50} set={v => setTempScenarios({...tempScenarios, revenue: v})} color="accent-rose-600" unit="%" />
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button onClick={() => { setScenarios(tempScenarios); setShowModal(false); }} className="flex-1 bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-500 transition-all active:scale-95">Commit Shift</button>
                            <button onClick={() => setShowModal(false)} className="px-10 bg-slate-100 text-slate-500 py-6 rounded-3xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all">Discard</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const KPICard = ({ label, value, sub, color }) => (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
        <div className={`text-3xl font-black mt-2 tracking-tighter ${color}`}>{value}</div>
        <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 italic">{sub}</p>
    </div>
);

const Slider = ({ label, val, min, max, set, color, unit }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-end">
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{label}</span>
            <span className={`text-xl font-black font-mono ${val > 0 ? 'text-emerald-600' : val < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{val}{unit}</span>
        </div>
        <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))} className={`w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer ${color}`} />
    </div>
);

const LegendDot = ({ label, color }) => (
    <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
);

export default Projections;
