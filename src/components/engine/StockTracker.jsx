import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { db } from '../../lib/firebase'; 

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- YOUR VERCEL BACKEND ---
const PROXY_BASE_URL = "https://auspex-phoenix.vercel.app"; 

const StockTracker = () => {
    const [ticker, setTicker] = useState(''); // Start Blank
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [watchlist, setWatchlist] = useState([]);
    
    // --- NEW: TOGGLE STATE ---
    const [activeExchange, setActiveExchange] = useState('NSE'); 

    useEffect(() => {
        const unsub = db.collection('stock_watchlist').orderBy('addedAt', 'desc').onSnapshot(snap => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWatchlist(list);
        });
        return () => unsub();
    }, []);

    const addToWatchlist = async () => {
        if (!data) return;
        const exists = watchlist.find(w => w.symbol === data.symbol);
        if (exists) return alert(`${data.symbol} is already in your watchlist.`);
        try { await db.collection('stock_watchlist').add({ symbol: data.symbol, name: data.companyName, addedAt: new Date().toISOString() }); } catch (err) { console.error(err); }
    };

    const removeFromWatchlist = async (id, e) => {
        e.stopPropagation(); 
        if (window.confirm("Remove from watchlist?")) await db.collection('stock_watchlist').doc(id).delete();
    };

    const handleSearch = async (e, overrideTicker = null) => {
        if (e) e.preventDefault();
        
        const queryTicker = overrideTicker || ticker;
        if (!queryTicker) return;
        if (overrideTicker) setTicker(queryTicker);

        setLoading(true); setError(''); setData(null);
        
        // Clean ticker for frontend display
        let query = queryTicker.replace(/\.NS/gi, '').replace(/\.BO/gi, '').trim();

        try {
            const liveUrl = `${PROXY_BASE_URL}/api/stock?name=${encodeURIComponent(query)}`;
            const liveRes = await fetch(liveUrl);
            
            if (!liveRes.ok) {
                const errorJson = await liveRes.json().catch(() => ({}));
                throw new Error(errorJson.details || errorJson.error || `Server Error: ${liveRes.status}`);
            }
            
            const liveData = await liveRes.json();
            if (liveData.error) throw new Error(liveData.details || liveData.error);

            // --- PARSE DUAL PRICES ---
            let prices = { NSE: 0, BSE: 0 };
            
            // Check if price is an object (NSE/BSE) or single number
            if (liveData.price && typeof liveData.price === 'object') {
                prices.NSE = parseFloat(liveData.price.NSE) || 0;
                prices.BSE = parseFloat(liveData.price.BSE) || 0;
            } else {
                // Single price fallback
                prices.NSE = parseFloat(liveData.price) || 0;
            }

            // Set initial active exchange
            const initialExchange = prices.NSE > 0 ? 'NSE' : 'BSE';
            setActiveExchange(initialExchange);

            // Generate Chart Data (Visual Drift)
            const basePrice = prices[initialExchange] || 0;
            const historyPrices = Array(14).fill(basePrice).map((p) => p + (Math.random() * (p * 0.02) - (p * 0.01))); 
            const historyLabels = Array.from({ length: 14 }, (_, i) => `Day ${i+1}`);

            setData({
                symbol: liveData.symbol || query.toUpperCase(),
                companyName: liveData.companyName || query,
                prices: prices, // Store both
                currency: "INR",
                change: liveData.change || "0.00",
                changePct: liveData.percentChange || "0.00",
                marketCap: liveData.marketCap || "N/A",
                peRatio: liveData.peRatio || "N/A",
                labels: historyLabels,
                chartData: historyPrices
            });

        } catch (err) {
            console.error("Stock Search Failed:", err);
            setError(err.message);
        } finally { setLoading(false); }
    };

    // Helper to get current display price
    const currentDisplayPrice = data ? (activeExchange === 'NSE' ? data.prices.NSE : data.prices.BSE) : 0;

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full animate-[fadeIn_0.4s_ease]">
            
            {/* LEFT: WATCHLIST */}
            <div className="md:w-1/3 flex flex-col gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1 max-h-[600px] flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">My Watchlist</h3>
                    <div className="overflow-y-auto custom-scrollbar flex-1 space-y-2">
                        {watchlist.length === 0 ? (
                            <div className="text-slate-500 text-sm text-center py-4">No stocks saved.</div>
                        ) : (
                            watchlist.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => handleSearch(null, item.name)}
                                    className={`p-3 rounded-lg border border-white/5 cursor-pointer transition-all flex justify-between items-center group ${ticker === item.name ? 'bg-[var(--brand-color)]/10 border-[var(--brand-color)]/50' : 'bg-black/20 hover:bg-white/5'}`}
                                >
                                    <div><div className="text-white font-bold text-sm">{item.symbol}</div><div className="text-[10px] text-slate-400">{item.name}</div></div>
                                    <button onClick={(e) => removeFromWatchlist(item.id, e)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-2"><i className="fa-solid fa-trash"></i></button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT: MAIN CHART */}
            <div className="md:w-2/3 bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-xl font-bold text-white">Market Watch</h2>
                    {error && <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">{error}</span>}
                </div>
                
                <form onSubmit={handleSearch} className="flex gap-4 mb-6">
                    <input 
                        type="text" 
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value)}
                        placeholder="Enter Company (e.g. Reliance)"
                        className="bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none flex-1"
                    />
                    <button disabled={loading} type="submit" className="bg-[var(--brand-color)] text-black font-bold px-6 py-3 rounded-lg hover:brightness-110 disabled:opacity-50">{loading ? '...' : 'Track'}</button>
                </form>

                {data && (
                    <div className="animate-[fadeIn_0.5s_ease]">
                        <div className="flex justify-between items-end mb-6 p-5 bg-black/20 rounded-xl border border-white/5">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">{data.companyName}</h3>
                                
                                {/* --- TOGGLE BUTTONS --- */}
                                <div className="flex gap-2 mt-3">
                                    {data.prices.NSE > 0 && (
                                        <button 
                                            onClick={() => setActiveExchange('NSE')}
                                            className={`text-xs px-3 py-1 rounded border transition-all font-mono ${activeExchange === 'NSE' ? 'bg-white text-black border-white font-bold' : 'bg-transparent text-slate-500 border-white/10 hover:text-white hover:border-white'}`}
                                        >
                                            NSE
                                        </button>
                                    )}
                                    {data.prices.BSE > 0 && (
                                        <button 
                                            onClick={() => setActiveExchange('BSE')}
                                            className={`text-xs px-3 py-1 rounded border transition-all font-mono ${activeExchange === 'BSE' ? 'bg-white text-black border-white font-bold' : 'bg-transparent text-slate-500 border-white/10 hover:text-white hover:border-white'}`}
                                        >
                                            BSE
                                        </button>
                                    )}
                                </div>

                                {data.marketCap !== "N/A" && <div className="text-xs text-slate-500 mt-2">Mkt Cap: {data.marketCap}</div>}
                            </div>
                            
                            <div className="text-right">
                                <div className="text-4xl font-bold text-white">₹{currentDisplayPrice}</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{activeExchange}</div>
                                <div className={`text-sm font-bold mt-1 flex items-center justify-end gap-1 ${parseFloat(data.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {parseFloat(data.change) >= 0 ? '▲' : '▼'} {data.change} ({data.changePct}%)
                                </div>
                            </div>
                            
                            <button onClick={addToWatchlist} className="ml-4 w-10 h-10 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-[var(--brand-color)] hover:border-[var(--brand-color)] flex items-center justify-center transition-all" title="Add to Watchlist">
                                <i className="fa-regular fa-star"></i>
                            </button>
                        </div>
                        
                        <div className="h-72 w-full bg-gradient-to-b from-[var(--brand-color)]/5 to-transparent rounded-xl p-4 border border-white/5">
                            <Line 
                                data={{
                                    labels: data.labels,
                                    datasets: [{
                                        label: `${activeExchange} Price`,
                                        data: data.chartData, // Visual placeholder
                                        borderColor: '#18B8B9',
                                        backgroundColor: 'rgba(24, 184, 185, 0.1)',
                                        borderWidth: 2,
                                        tension: 0.4,
                                        fill: true
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: { x: { display: false }, y: { position: 'right', grid: { color: 'rgba(255,255,255,0.05)' } } }
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockTracker;