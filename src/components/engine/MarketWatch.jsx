import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { db } from '../../lib/firebase'; 
import * as XLSX from 'xlsx';

// CRITICAL: Using the correct import path provided by the user
import { fetchPredictiveProjection, runAIAnalysis } from '../../lib/aiService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- CONFIGURATION ---
const PROXY_BASE_URL = "https://auspex-phoenix.vercel.app"; 
const ASSET_MAPS = {
    STOCK: { label: "Public Stock", placeholder: "Enter Company (e.g. Reliance, HDFC)", api: `${PROXY_BASE_URL}/api/stock?name=`, unit: '₹' },
    CRYPTO: { label: "Crypto Token", placeholder: "Enter Ticker (e.g. BTC, ETH, SOL)", idMap: { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'DOGE': 'dogecoin', 'MATIC': 'matic-network' }, api: `https://api.coingecko.com/api/v3/simple/price?vs_currencies=inr&include_24hr_change=true&ids=`, unit: '₹' },
    METAL: { label: "Bullion / Metal", placeholder: "Type 'Gold' or 'Silver'", fixedAssets: { 'GOLD': 'pax-gold', 'SILVER': 'gram-silver' }, api: `https://api.coingecko.com/api/v3/simple/price?vs_currencies=inr&include_24hr_change=true&ids=`, unit: '₹' },
};

// --- SUB-COMPONENT: SIMULATED DEAL MODAL ---
const SimulatedDealModal = ({ isOpen, onClose, item, currentRate, unitPrefix, assetClass, initialMode = 'view' }) => {
    // Mode state: 'view' (History) or 'add' (New Entry)
    const [modeView, setModeView] = useState(initialMode);
    
    // Form States
    const [price, setPrice] = useState(currentRate.toFixed(assetClass === 'STOCK' ? 2 : 0).toString());
    const [transactions, setTransactions] = useState([]);
    const [mode, setMode] = useState('buy'); // buy vs sell action
    const [quantity, setQuantity] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
    const [notes, setNotes] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Fetch transactions
    useEffect(() => {
        if (!isOpen || !item?.id) return;
        const unsub = db.collection('stock_watchlist')
            .doc(item.id)
            .collection('market_transactions')
            .orderBy('date', 'desc') // Newest first
            .onSnapshot(snap => {
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTransactions(list);
            });
        return () => unsub();
    }, [isOpen, item]);

    // --- P&L CALCULATION ENGINE ---
    const { currentHoldings, totalInvested, marketValue, netProfit } = useMemo(() => {
        let currentHoldings = 0;
        let totalInvested = 0;

        const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedTx.forEach(tx => {
            const amount = tx.quantity * tx.price;
            if (tx.mode === 'buy') {
                currentHoldings += tx.quantity;
                totalInvested += amount;
            } else if (tx.mode === 'sell') {
                if (currentHoldings > 0) {
                    const costPerUnit = totalInvested / currentHoldings;
                    totalInvested -= (tx.quantity * costPerUnit);
                    currentHoldings -= tx.quantity;
                }
            }
        });
        
        const marketValue = currentHoldings * currentRate;
        const netProfit = marketValue - totalInvested;

        return { currentHoldings, totalInvested, marketValue, netProfit };
    }, [transactions, currentRate]);

    const handleSaveTransaction = async (e) => {
        e.preventDefault();
        if (Number(quantity) <= 0) return alert("Quantity must be greater than zero.");
        
        const transactionData = {
            mode, 
            quantity: Number(quantity),
            price: Number(price),
            date,
            notes,
            aiAnalysis: aiAnalysis || 'N/A', 
            timestamp: new Date().toISOString()
        };

        try {
            await db.collection('stock_watchlist').doc(item.id).collection('market_transactions').add(transactionData);
            alert(`✅ Recorded: ${mode.toUpperCase()} ${quantity} @ ${unitPrefix}${price}`);
            setModeView('view'); // Switch back to history view after saving
            setQuantity('');
            setNotes('');
        } catch (err) {
            console.error(err);
            alert("Error saving simulation.");
        }
    };

    const formatCurrency = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

    // --- AI ANALYSIS (FORMATTED HTML FIX) ---
    const handleAnalyzeDeal = async () => {
        setIsAnalyzing(true);
        const prompt = `
            Analyze hypothetical trade: ${mode.toUpperCase()} ${quantity} units of ${item.symbol} at ${unitPrefix}${price}. 
            Current live rate: ${unitPrefix}${currentRate}. 

            STRUCTURE RULES:
            1. Use <h2> for headers.
            2. Use <ul> and <li> for points.
            3. Use <b> tags for metrics. No markdown bolding (**).
            4. Wrap paragraphs in <p> tags. Return ONLY HTML body content.
        `;
        try {
             const res = await runAIAnalysis(prompt);
             const cleanHtml = res
                .replace(/```html/g, '')
                .replace(/```/g, '')
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') 
                .trim();
             setAiAnalysis(cleanHtml);
        } catch (error) { alert("AI Service Unavailable"); } 
        finally { setIsAnalyzing(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 font-manrope" onClick={onClose}>
            <div className="bg-[#0f172a] border border-white/20 w-full max-w-3xl rounded-[2rem] shadow-2xl p-8 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* HEADER */}
                <div className="shrink-0 mb-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                            SIMULATION NODE
                        </h3>
                        <div className="text-[10px] text-[#FFD700] font-black uppercase tracking-[0.3em] mt-1">Asset: {item?.name} ({item?.symbol})</div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
                </div>

                {/* DASHBOARD STRIP */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 grid grid-cols-4 gap-6 mb-8">
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Live Oracle</div>
                        <div className="text-sm font-black text-white">{unitPrefix}{currentRate.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Sim Holdings</div>
                        <div className="text-sm font-black text-white">{currentHoldings.toLocaleString('en-IN')} Units</div>
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Market Value</div>
                        <div className="text-sm font-black text-white">{formatCurrency(marketValue)}</div>
                    </div>
                    <div>
                        <div className="text-[9px] text-[#FFD700] uppercase font-black tracking-widest mb-1">Forensic P&L</div>
                        <div className={`text-sm font-black ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
                        </div>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex bg-black/40 p-1.5 rounded-2xl mb-6 border border-white/5">
                    <button 
                        onClick={() => setModeView('view')} 
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            modeView === 'view' ? 'bg-[#FFD700] text-black shadow-lg' : 'text-slate-500 hover:text-white'
                        }`}
                    >
                        Audit History
                    </button>
                    <button 
                        onClick={() => setModeView('add')} 
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            modeView === 'add' ? 'bg-[#FFD700] text-black shadow-lg' : 'text-slate-500 hover:text-white'
                        }`}
                    >
                        + New Entry
                    </button>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-3">
                    
                    {/* --- VIEW MODE: READ ONLY HISTORY LOG --- */}
                    {modeView === 'view' && (
                        <div className="space-y-4">
                            {transactions.length === 0 ? (
                                <div className="text-center py-20 text-slate-700 font-black uppercase text-xs tracking-widest border border-dashed border-white/5 rounded-3xl">No historical simulations found.</div>
                            ) : (
                                transactions.map(tx => (
                                    <div key={tx.id} className="bg-white/5 border border-white/5 p-5 rounded-2xl hover:bg-white/[0.07] transition-all">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${tx.mode === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {tx.mode}
                                                </div>
                                                <div className="text-xs font-black text-white uppercase tracking-tighter">{new Date(tx.date).toLocaleDateString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Execution Rate</div>
                                                <div className="text-sm font-black text-white">{unitPrefix}{tx.price.toLocaleString('en-IN')}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mb-4">
                                            <div>
                                                <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Volume</div>
                                                <div className="text-xs text-slate-300 font-bold">{tx.quantity} units</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Transaction Value</div>
                                                <div className="text-xs text-slate-300 font-bold">{formatCurrency(tx.quantity * tx.price)}</div>
                                            </div>
                                        </div>

                                        {(tx.notes || tx.aiAnalysis !== 'N/A') && (
                                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                                {tx.notes && <div className="text-[11px] text-slate-400 font-bold italic mb-3">"{tx.notes}"</div>}
                                                {tx.aiAnalysis && tx.aiAnalysis !== 'N/A' && (
                                                    <div 
                                                        className="ai-report-container text-[10px] leading-relaxed"
                                                        dangerouslySetInnerHTML={{ __html: tx.aiAnalysis }}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* --- ADD MODE: INPUT FORM --- */}
                    {modeView === 'add' && (
                        <form onSubmit={handleSaveTransaction} className="space-y-6">
                            
                            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                <button type="button" onClick={() => setMode('buy')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'buy' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Buy</button>
                                <button type="button" onClick={() => setMode('sell')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'sell' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Sell</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] uppercase text-slate-500 font-black tracking-widest mb-2 ml-1">Execution Rate ({unitPrefix})</label>
                                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm font-bold focus:border-[#FFD700] outline-none transition-all" required />
                                </div>
                                <div>
                                    <label className="block text-[9px] uppercase text-slate-500 font-black tracking-widest mb-2 ml-1">Unit Volume</label>
                                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm font-bold focus:border-[#FFD700] outline-none transition-all" placeholder="0" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase text-slate-500 font-black tracking-widest mb-2 ml-1">Simulation Date</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm [color-scheme:dark] font-bold outline-none focus:border-[#FFD700] transition-all" required />
                            </div>

                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Entry rationale & strategy..." className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm h-24 resize-none focus:border-[#FFD700] outline-none font-bold" />

                            <div className="border-t border-white/5 pt-6">
                                <button type="button" onClick={handleAnalyzeDeal} disabled={isAnalyzing || !quantity} className="w-full py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mb-4 transition-all disabled:opacity-50">
                                    {isAnalyzing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-wand-magic-sparkles"></i> Run AI Strategy Check</>}
                                </button>
                                {aiAnalysis && (
                                    <div 
                                        className="ai-report-container text-[11px] bg-black/60 p-5 rounded-2xl border border-purple-500/30 shadow-2xl mb-4"
                                        dangerouslySetInnerHTML={{ __html: aiAnalysis }}
                                    />
                                )}
                            </div>

                            <button type="submit" className="w-full py-4 bg-[#FFD700] text-black font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] transition-all shadow-2xl">
                                Save Simulation
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---
const MarketWatch = () => {
    // STATE
    const [assetClass, setAssetClass] = useState('STOCK'); 
    const [ticker, setTicker] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [watchlist, setWatchlist] = useState([]);
    const [activeExchange, setActiveExchange] = useState('NSE'); 
    
    // NEW STATE: Modal Handling
    const [showDealModal, setShowDealModal] = useState(false);
    const [selectedWatchlistItem, setSelectedWatchlistItem] = useState(null);
    const [modalMode, setModalMode] = useState('view'); // 'view' or 'add'

    // CONFIG DERIVED FROM STATE
    const config = ASSET_MAPS[assetClass];
    
    // THE CRITICAL FIX: Define unitPrefix here for the SimulatedDealModal call
    const unitPrefix = config.unit;

    // --- 1. FETCH WATCHLIST ---
    useEffect(() => {
        const unsub = db.collection('stock_watchlist')
            .where('assetClass', '==', assetClass)
            .onSnapshot(snap => {
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                list.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
                setWatchlist(list);
            }, (err) => console.error(err));
        return () => unsub();
    }, [assetClass]); 

    // Helper to get current display price
    const currentDisplayPrice = data ? (activeExchange === 'NSE' ? data.prices.NSE : data.prices.BSE || data.prices.NSE) : 0;

    // --- 2. ADD TO WATCHLIST ---
    const addToWatchlist = async () => {
        if (!data || !data.symbol) return alert("Error: No valid asset data.");
        const exists = watchlist.find(w => w.symbol === data.symbol && w.assetClass === assetClass);
        if (exists) return alert(`${data.symbol} is already in your watchlist.`);
        try { 
            await db.collection('stock_watchlist').add({ 
                symbol: data.symbol, 
                name: data.companyName, 
                assetClass: assetClass,
                addedAt: new Date().toISOString(),
                entryPrice: currentDisplayPrice 
            }); 
        } catch (err) { alert("Failed to save to wishlist."); }
    };

    const removeFromWatchlist = async (id, e) => {
        e.stopPropagation(); 
        if (window.confirm("Purge asset from watchlist?")) await db.collection('stock_watchlist').doc(id).delete();
    };

    // OPEN MODAL HANDLER
    const handleOpenDealModal = async (item, mode) => {
        setTicker(item.symbol);
        // Ensure data is fresh for calculations
        await handleSearch(null, item.symbol);
        setSelectedWatchlistItem(item);
        setModalMode(mode); 
        setShowDealModal(true);
    };

    // --- 3. SEARCH & FETCH DATA ---
    const handleSearch = async (e, overrideTicker = null) => {
        if (e) e.preventDefault();
        const queryTicker = overrideTicker || ticker;
        if (!queryTicker) return;
        if (overrideTicker) setTicker(queryTicker);

        setLoading(true); setError(''); setData(null);
        
        try {
            if (assetClass === 'STOCK') {
                const query = queryTicker.trim().replace(/\.NS/gi, '').replace(/\.BO/gi, '');
                const liveUrl = `${config.api}${encodeURIComponent(query)}`;
                const liveRes = await fetch(liveUrl);
                const liveData = await liveRes.json();
                if (!liveRes.ok || liveData.error) throw new Error("Security not found");

                const prices = { NSE: 0, BSE: 0 };
                if (liveData.price && typeof liveData.price === 'object') {
                    prices.NSE = parseFloat(liveData.price.NSE) || 0;
                    prices.BSE = parseFloat(liveData.price.BSE) || 0;
                } else { prices.NSE = parseFloat(liveData.price) || 0; }
                
                setActiveExchange(prices.NSE > 0 ? 'NSE' : 'BSE');
                const price = prices[prices.NSE > 0 ? 'NSE' : 'BSE'] || 0;

                setData({
                    symbol: query.toUpperCase(),
                    companyName: liveData.companyName || query,
                    prices, currency: "INR", change: liveData.change || "0.00",
                    changePct: liveData.percentChange || "0.00", assetClass,
                    labels: Array.from({ length: 14 }, (_, i) => `D${i+1}`),
                    chartData: Array(14).fill(price).map(p => p * (0.98 + Math.random() * 0.04))
                });

            } else {
                let assetId = queryTicker.trim().toLowerCase();
                if (assetClass === 'CRYPTO') assetId = config.idMap[queryTicker.toUpperCase()] || assetId;
                else if (assetClass === 'METAL') assetId = config.fixedAssets[queryTicker.toUpperCase()] || assetId;

                const res = await fetch(`${config.api}${assetId}`);
                const liveData = await res.json();
                const assetKey = Object.keys(liveData)[0];
                if (!assetKey) throw new Error("Asset not found");

                const dataItem = liveData[assetKey];
                let price = dataItem.inr || 0; 
                if (assetClass === 'METAL' && (assetKey === 'pax-gold' || assetKey === 'gold')) price /= 31.1035; 
                 
                setData({
                    symbol: queryTicker.toUpperCase(),
                    companyName: assetClass === 'CRYPTO' ? queryTicker.toUpperCase() : queryTicker,
                    prices: { NSE: price }, currency: "INR", 
                    change: dataItem.inr_24h_change?.toFixed(2) || "0.00",
                    changePct: dataItem.inr_24h_change?.toFixed(2) || "0.00",
                    assetClass, labels: Array.from({ length: 14 }, (_, i) => `D${i+1}`),
                    chartData: Array(14).fill(price).map(p => p * (0.98 + Math.random() * 0.04))
                });
                setActiveExchange('NSE');
            }
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const isStock = assetClass === 'STOCK';

    const getTabStyle = (type) => {
        if (assetClass !== type) return 'text-slate-500 hover:text-white bg-transparent';
        if (type === 'STOCK') return 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/30';
        if (type === 'CRYPTO') return 'bg-black text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]';
        if (type === 'METAL') return 'bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-yellow-400/50';
        return '';
    };

    return (
        <div className="w-full flex flex-col md:flex-row gap-8 h-full animate-[fadeIn_0.5s_ease] font-manrope">
            {/* LEFT: WATCHLIST (1/4 Width) */}
            <div className="md:w-1/4 flex flex-col gap-6">
                 <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    {['STOCK', 'CRYPTO', 'METAL'].map(asset => (
                         <button key={asset} onClick={() => { setAssetClass(asset); setData(null); setTicker(''); setError(''); }} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${assetClass === asset ? 'bg-[#FFD700] text-black shadow-2xl' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>{asset}</button>
                    ))}
                </div>

                <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-6 flex-1 shadow-2xl overflow-hidden flex flex-col">
                    <h3 className="text-[10px] font-black text-white mb-6 uppercase tracking-[0.3em] opacity-40 border-b border-white/5 pb-4 flex justify-between items-center px-2">
                        <span>{assetClass} Watchlist</span>
                        <span className="text-[#FFD700]">{watchlist.length}</span>
                    </h3>
                    
                    <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3 px-1">
                        {watchlist.length === 0 ? <div className="text-slate-700 text-[10px] font-black text-center py-20 uppercase tracking-widest">No assets tracked.</div> : watchlist.map(item => (
                            <div key={item.id} onClick={() => handleSearch(null, item.symbol)} className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${ticker === item.symbol ? 'bg-[#FFD700]/5 border-[#FFD700]/30' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <div className="text-white font-black text-sm uppercase tracking-tighter">{item.symbol}</div>
                                    <button onClick={(e) => removeFromWatchlist(item.id, e)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                                </div>
                                <div className="flex items-center gap-3 mt-3">
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenDealModal(item, 'add'); }} className="flex-1 py-1.5 bg-[#FFD700]/10 text-[#FFD700] rounded-lg text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 hover:bg-[#FFD700] hover:text-black transition-all">Simulate</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenDealModal(item, 'view'); }} className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 hover:text-white transition-all">Logs</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: MAIN CHART (3/4 Width) */}
            <div className="md:w-3/4 bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl flex flex-col">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD700]/5 blur-[120px] pointer-events-none opacity-40"></div>
                
                <div className="relative z-10 flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Market Watch</h2>
                        <div className="text-[10px] text-[#FFD700] font-black uppercase tracking-[0.4em] mt-2">Live Oracle Feed: {config.label}</div>
                    </div>
                    {error && <span className="text-[10px] text-red-400 bg-red-400/10 px-4 py-2 rounded-xl border border-red-400/20 font-black uppercase tracking-widest">{error}</span>}
                </div>
                
                <form onSubmit={handleSearch} className="relative z-10 flex gap-4 mb-10">
                    <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder={config.placeholder} className="bg-black/40 border border-white/10 rounded-2xl p-5 text-white text-sm font-black focus:border-[#FFD700] outline-none flex-1 transition-all" />
                    <button disabled={loading} type="submit" className="bg-[#FFD700] text-black font-black uppercase text-xs tracking-[0.2em] px-10 py-5 rounded-2xl hover:scale-105 transition-all shadow-2xl disabled:opacity-50">{loading ? 'Searching...' : 'Track Asset'}</button>
                </form>

                {data ? (
                    <div className="animate-[fadeIn_0.5s_ease] flex-1 flex flex-col">
                        <div className="flex justify-between items-end mb-10 p-8 bg-black/40 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <h3 className="text-4xl font-black text-white tracking-tighter uppercase">{data.companyName}</h3>
                                    <button onClick={addToWatchlist} className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-slate-500 hover:text-[#FFD700] hover:border-[#FFD700] transition-all flex items-center justify-center shadow-xl"><i className="fa-regular fa-star text-lg"></i></button>
                                </div>
                                <div className="flex gap-3">
                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-slate-400 font-black tracking-widest">{data.symbol}</span>
                                    {assetClass === 'STOCK' && <span className="px-3 py-1 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg text-[10px] text-[#FFD700] font-black uppercase tracking-widest">{activeExchange}</span>}
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <div className="text-6xl font-black text-white tracking-tighter drop-shadow-2xl">₹{currentDisplayPrice.toLocaleString()}</div>
                                <div className={`text-sm font-black mt-2 flex items-center justify-end gap-2 ${parseFloat(data.changePct) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {parseFloat(data.changePct) >= 0 ? '▲' : '▼'} {data.changePct}% <span className="text-slate-500 opacity-50 ml-1">24H</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 bg-gradient-to-b from-white/5 to-transparent rounded-[2.5rem] p-8 border border-white/5 relative">
                            <Line 
                                data={{ labels: data.labels, datasets: [{ data: data.chartData, borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.05)', borderWidth: 4, tension: 0.4, pointRadius: 0, pointHoverRadius: 8, fill: true }] }} 
                                options={{ 
                                    responsive: true, maintainAspectRatio: false, 
                                    plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.9)', titleFont: { weight: 'bold' }, padding: 15, cornerRadius: 12 } }, 
                                    scales: { x: { display: false }, y: { position: 'right', grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#475569', font: { weight: 'bold', size: 10 } } } } 
                                }} 
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
                        <i className={`fa-solid ${assetClass === 'STOCK' ? 'fa-chart-line' : assetClass === 'CRYPTO' ? 'fa-bitcoin' : 'fa-coins'} text-6xl mb-6 text-[#FFD700]`}></i>
                        <span className="text-xs font-black uppercase tracking-[0.5em]">Synchronizing Asset Oracle</span>
                    </div>
                )}
            </div>

            {showDealModal && selectedWatchlistItem && (
                <SimulatedDealModal 
                    isOpen={showDealModal} onClose={() => setShowDealModal(false)}
                    item={selectedWatchlistItem} currentRate={currentDisplayPrice}
                    unitPrefix={unitPrefix} assetClass={assetClass} initialMode={modalMode} 
                />
            )}
        </div>
    );
};

export default MarketWatch;