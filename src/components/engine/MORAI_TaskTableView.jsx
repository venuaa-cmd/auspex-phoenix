import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { supabase } from '../../lib/supabaseClient';
import { runAIAnalysis, parseAIJson } from '../../lib/aiService';
import MORAI_TaskEditor from './morai/MORAI_TaskEditor';

const PROXY_BASE_URL = "https://auspex-phoenix.vercel.app";

const MORAI_TaskTableView = ({ investments = [] }) => {
    const [companies, setCompanies] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isScanning, setIsScanning] = useState(false); 
    
    // --- FEEDBACK & NAVIGATION ---
    const [notification, setNotification] = useState({ show: false, msg: '', type: 'success' });
    const [activeFilter, setActiveFilter] = useState('TRIGGERS');
    const [editingTask, setEditingTask] = useState(null);

    // --- ENGINE STATE ---
    const [assetTypeFilter, setAssetTypeFilter] = useState('STOCK');
    const [selectedAssetKey, setSelectedAssetKey] = useState(''); 
    const [targetPrice, setTargetPrice] = useState('');
    const [simType, setSimType] = useState('BUY');
    const [buyPrice, setBuyPrice] = useState(0); 
    const [liveMarketPrice, setLiveMarketPrice] = useState(0);
    const [isLoadingPrice, setIsLoadingPrice] = useState(false);

    const safeNum = (val) => {
        if (!val) return 0;
        const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(val);
        return isNaN(n) ? 0 : n;
    };

    const triggerToast = (msg, type = 'success') => {
        setNotification({ show: true, msg, type });
        setTimeout(() => setNotification({ show: false, msg: '', type: 'success' }), 4000);
    };

    const formatStamp = (date) => {
        if (!date) return "";
        return new Date(date).toLocaleString('en-IN', { 
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
        });
    };

    // --- 1. DATA SYNC ---
    useEffect(() => {
        const fetchBase = async () => {
            const { data } = await supabase.from('companies').select('*');
            if (data) setCompanies(data);
        };
        fetchBase();

        const unsub = db.collection("ai_triggers").orderBy("createdAt", "desc")
            .onSnapshot(s => setAlerts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, []);

    // --- 2. THE ENGINE: LIVE FETCHING (STOCK | CRYPTO | GOLD) ---
    useEffect(() => {
        const syncEngine = async () => {
            if (!selectedAssetKey) return;
            setIsLoadingPrice(true);
            const [id, name, ticker] = selectedAssetKey.split('|');

            const match = investments.find(inv => inv.company_id === id);
            setBuyPrice(safeNum(match?.share_price));

            try {
                let liveVal = 0;
                if (assetTypeFilter === 'STOCK') {
                    const res = await fetch(`${PROXY_BASE_URL}/api/stock?name=${encodeURIComponent(name)}`);
                    const result = await res.json();
                    const priceRaw = result.price?.NSE || result.price?.BSE || result.stockDetailsReusableData?.price || result.price;
                    liveVal = safeNum(priceRaw);
                    // FIXED: Auto-Currency Parity Logic
                    if (result.currency === 'USD') liveVal *= 89.97;
                } else if (assetTypeFilter === 'CRYPTO') {
                    const idMap = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana' };
                    const cgId = idMap[ticker?.toUpperCase()] || ticker?.toLowerCase();
                    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?vs_currencies=inr&ids=${cgId}`);
                    const data = await res.json();
                    liveVal = safeNum(data[cgId]?.inr);
                } else if (assetTypeFilter === 'GOLD') {
                    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?vs_currencies=inr&ids=pax-gold`);
                    const data = await res.json();
                    liveVal = safeNum(data['pax-gold']?.inr) / 31.1035; 
                }
                setLiveMarketPrice(liveVal);
            } catch (err) { setLiveMarketPrice(0); }
            finally { setIsLoadingPrice(false); }
        };
        syncEngine();
    }, [selectedAssetKey, assetTypeFilter, investments]);

    // --- 3. CLASSIFICATION ---
    const categorizedAlerts = useMemo(() => {
        if (activeFilter === 'TRIGGERS') return alerts; 
        return alerts.filter(a => (a.type || '').toUpperCase() === activeFilter);
    }, [alerts, activeFilter]);

    // --- 4. ACTION HANDLERS ---
    const handleNewTrigger = async () => {
        if (!selectedAssetKey) return triggerToast("Select an asset first", "error");
        setIsGenerating(true);
        const [id, name] = selectedAssetKey.split('|');
        const pnl = buyPrice > 0 ? (((liveMarketPrice - buyPrice) / buyPrice) * 100).toFixed(2) : 0;
        
        try {
            const prompt = `ACT AS M.O.R.A.I. Analyze ${name}. Cost: ₹${buyPrice}, Market: ₹${liveMarketPrice.toFixed(2)}. Simulating ${simType} at ₹${targetPrice}. Return HEADMASTER JSON { "msg": "Tactical verdict in Sentence case" }`;
            const res = await runAIAnalysis(prompt);
            const data = parseAIJson(res);
            
            await db.collection("ai_triggers").add({
                type: 'HEADMASTER',
                msg: `[${name} Simulation]: ${data.msg} (P/L: ${pnl}%)`,
                createdAt: new Date().toISOString()
            });
            
            triggerToast(`${name} Node Locked`);
            setActiveFilter('TRIGGERS'); 
        } catch (e) {
            triggerToast("Critical Fault: Engine Timeout", "error");
        } finally { setIsGenerating(false); }
    };

    const handleSystemScan = async () => {
        setIsScanning(true);
        triggerToast("Portfolio Scan Initiated...");
        try {
            const prompt = `Perform Portfolio Audit: ${JSON.stringify(investments.slice(0,10))}. Return JSON { "alerts": [{ "type": "URGENT", "msg": "Contextual analysis" }] }`;
            const res = await runAIAnalysis(prompt);
            const data = parseAIJson(res);
            if (data?.alerts) {
                const batch = db.batch();
                data.alerts.forEach(a => batch.set(db.collection("ai_triggers").doc(), { ...a, createdAt: new Date().toISOString() }));
                await batch.commit();
                triggerToast("System Audit Complete");
            }
        } finally { setIsScanning(false); }
    };

    return (
        <div className="w-full space-y-6 pb-40 px-10 relative">
            
            {/* TACTICAL STATUS NOTIFICATION */}
            {notification.show && (
                <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[100] px-10 py-5 rounded-2xl border backdrop-blur-3xl animate-in slide-in-from-top-10 duration-700 flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'}`}>
                    <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em]">{notification.msg}</span>
                </div>
            )}

            {/* COMMAND CENTER PANEL */}
            <div className="bg-black/90 border border-white/10 p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row gap-8 items-end">
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    <div>
                        <label className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-2 block italic">01 Asset Class</label>
                        <select value={assetTypeFilter} onChange={e => setAssetTypeFilter(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white">
                            <option value="STOCK">Public Stock</option>
                            <option value="CRYPTO">Crypto</option>
                            <option value="GOLD">Gold</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-2 block italic">02 Selection</label>
                        <select value={selectedAssetKey} onChange={e => setSelectedAssetKey(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white">
                            <option value="">-- Choose Asset --</option>
                            {companies.filter(c => c.type?.includes(assetTypeFilter === 'STOCK' ? 'public' : assetTypeFilter.toLowerCase())).map(c => (
                                <option key={c.id} value={`${c.id}|${c.name}|${c.ticker}`}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-2 block italic">03 Sim Price (Cr)</label>
                        <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white" placeholder="0.00" />
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                        <span className="text-[6px] text-slate-400 block uppercase italic">Entry Price</span>
                        <span className="text-xs font-medium text-white">₹{buyPrice.toLocaleString()}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                        <span className="text-[6px] text-slate-400 block uppercase italic">Market Pulse</span>
                        <span className="text-xs font-medium text-[#FFD700]">{isLoadingPrice ? '...' : `₹${liveMarketPrice.toLocaleString()}`}</span>
                    </div>
                    <select value={simType} onChange={e => setSimType(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white">
                        <option value="BUY">Action: BUY</option><option value="SELL">Action: SELL</option>
                    </select>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleNewTrigger} disabled={isGenerating} className="px-10 py-5 bg-[#FFD700] text-black rounded-2xl text-[9px] font-bold uppercase tracking-widest shadow-xl hover:bg-white transition-all">
                        {isGenerating ? 'ANALYZING...' : 'NEW TRIGGER'}
                    </button>
                    <button onClick={handleSystemScan} disabled={isScanning} className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl text-[9px] font-bold uppercase tracking-widest">
                        {isScanning ? 'SCANNING...' : 'SYSTEM SCAN'}
                    </button>
                </div>
            </div>

            {/* MASTER VIEW STRIP */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {['TRIGGERS', 'HEADMASTER', 'CRITICAL', 'URGENT', 'WARNING', 'ATTENTION', 'GREEN-LIT'].map(cat => (
                    <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-6 py-2 rounded-full text-[8px] font-bold uppercase tracking-widest border transition-all ${activeFilter === cat ? 'bg-white text-black border-white shadow-lg' : 'bg-black/40 text-slate-600 border-white/5 hover:border-white/20'}`}>
                        {cat}
                    </button>
                ))}
            </div>

            {/* TACTICAL GRID */}
            <div className="flex h-[450px] w-full gap-3 overflow-hidden">
                {categorizedAlerts.map((alert) => (
                    <div key={alert.id} onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)} className={`relative h-full transition-all duration-1000 ease-[cubic-bezier(0.9,0,0.1,1)] cursor-pointer overflow-hidden rounded-[2.5rem] border ${expandedId === alert.id ? 'flex-[18] bg-black border-[#FFD700]/40 shadow-2xl' : 'flex-[0.5] bg-[#020617] border-white/5'}`}>
                        {expandedId === alert.id ? (
                            <div className="p-12 h-full flex flex-col justify-between animate-in fade-in duration-700">
                                <div className="overflow-y-auto no-scrollbar pr-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${alert.type === 'CRITICAL' ? 'bg-red-500 animate-pulse' : 'bg-[#FFD700]'}`}></div>
                                            <span className="text-[9px] font-bold text-[#FFD700] uppercase tracking-[0.3em]">{alert.type} NODE</span>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{formatStamp(alert.createdAt)}</span>
                                            <button className="text-[8px] font-bold text-slate-500 uppercase hover:text-white">Close X</button>
                                        </div>
                                    </div>
                                    <p className="text-xl font-medium text-white/90 leading-relaxed tracking-tight">{alert.msg}</p>
                                </div>
                                <div className="flex gap-4 pt-8 border-t border-white/5">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingTask(alert); }} className="px-8 py-3 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-[#FFD700] transition-all">Execute / Edit</button>
                                    <button onClick={async (e) => { e.stopPropagation(); if(window.confirm('Purge node?')) await db.collection("ai_triggers").doc(alert.id).delete(); }} className="px-8 py-3 border border-rose-500/20 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Purge Node</button>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-90deg] whitespace-nowrap">
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${alert.type === 'CRITICAL' ? 'text-red-500' : 'text-slate-700'}`}>{alert.type}</span>
                                <span className="text-[6px] font-bold text-slate-800 uppercase mt-2">{formatStamp(alert.createdAt)}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {editingTask && <MORAI_TaskEditor task={editingTask} onClose={() => setEditingTask(null)} />}
        </div>
    );
};

export default MORAI_TaskTableView;