import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- CONFIGURATION ---
const PROXY_BASE_URL = "https://auspex-phoenix.vercel.app"; 
const ASSET_MAPS = {
    STOCK: { 
        label: "Public Stock", 
        placeholder: "Enter Company (e.g. Reliance)", 
        api: `${PROXY_BASE_URL}/api/stock?name=`, 
        unit: '₹' 
    },
    CRYPTO: { 
        label: "Crypto Token", 
        placeholder: "Enter Ticker (e.g. BTC)", 
        idMap: { 
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 
            'DOGE': 'dogecoin', 'MATIC': 'matic-network',
            'GOLD': 'pax-gold', 'SILVER': 'kinesis-silver' 
        }, 
        api: `https://api.coingecko.com/api/v3/simple/price?vs_currencies=inr&include_24hr_change=true&ids=`, 
        unit: '₹' 
    },
    METAL: { 
        label: "Bullion", 
        placeholder: "Type 'Gold' or 'Silver'", 
        fixedAssets: { 'GOLD': 'pax-gold', 'SILVER': 'kinesis-silver' }, 
        api: `https://api.coingecko.com/api/v3/simple/price?vs_currencies=inr&include_24hr_change=true&ids=`, 
        unit: '₹' 
    }
};

const MarketWatcher = () => {
    const [activeTab, setActiveTab] = useState('STOCK');
    const [ticker, setTicker] = useState('');
    const [searchData, setSearchData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [assets, setAssets] = useState([]);
    const [prices, setPrices] = useState({});

    // --- 1. FETCH ASSETS ---
    const fetchAssets = async () => {
        const { data } = await supabase
            .from('erp_portfolio_assets')
            .select('*')
            .eq('status', 'ACTIVE')
            .neq('asset_type', 'STARTUP_EQUITY'); 
        if (data) setAssets(data);
    };

    useEffect(() => { fetchAssets(); }, []);

    // --- 2. SEARCH VISUALIZER ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!ticker.trim()) return;
        setLoading(true); setSearchData(null);

        try {
            let query = ticker.trim();
            const config = ASSET_MAPS[activeTab];
            let price = 0, change = "0.00", name = query, symbol = query;

            if (activeTab === 'STOCK') {
                query = query.replace(/\.NS/gi, '').replace(/\.BO/gi, '');
                const res = await fetch(`${config.api}${encodeURIComponent(query)}`);
                const data = await res.json();
                if (!res.ok || data.error) throw new Error("Stock node not found.");
                name = data.companyName || query;
                symbol = data.symbol || query;
                price = parseFloat(data.price?.NSE || data.price?.BSE || data.price || 0);
                change = data.percentChange || "0.00";
            } else {
                let assetId = query.toLowerCase();
                const upperQuery = query.toUpperCase();
                if (config.idMap && config.idMap[upperQuery]) assetId = config.idMap[upperQuery];
                if (activeTab === 'METAL' && config.fixedAssets[upperQuery]) assetId = config.fixedAssets[upperQuery];

                const res = await fetch(`${config.api}${assetId}`);
                const data = await res.json();
                const assetKey = Object.keys(data)[0];
                if (!assetKey) throw new Error("Digital asset node not found.");
                price = data[assetKey].inr || 0;
                if (assetKey === 'pax-gold' || assetKey === 'gold') price /= 31.1035; 
                change = data[assetKey].inr_24h_change?.toFixed(2) || "0.00";
                name = query.toUpperCase();
            }

            const history = Array(14).fill(price).map((p) => p + (Math.random() * (p * 0.02) - (p * 0.01)));
            setSearchData({ symbol: symbol.toUpperCase(), name, price, change, labels: Array.from({ length: 14 }, (_, i) => `D${i+1}`), chartData: history });
        } catch (err) { alert(err.message); } finally { setLoading(false); }
    };

    // --- 3. BATCH SCAN (Dynamic Ticker Pulse) ---
    const scanPortfolio = async () => {
        setSyncing(true);
        const newPrices = { ...prices }; 
        const stocks = assets.filter(a => a.asset_type === 'PUBLIC_STOCK' && a.ticker);
        const crypto = assets.filter(a => ['CRYPTO', 'BULLION', 'GOLD', 'METAL'].includes(a.asset_type) && a.ticker);

        for (const stock of stocks) {
            try {
                const query = stock.ticker.replace(/\.NS/gi, '');
                const res = await fetch(`${ASSET_MAPS.STOCK.api}${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    const price = parseFloat(data.price?.NSE || data.price?.BSE || 0);
                    if (price > 0) newPrices[stock.id] = { unitPrice: price, change: data.percentChange };
                }
            } catch (e) { console.warn("Pulsing stock node failed:", stock.ticker); }
        }

        if (crypto.length > 0) {
            try {
                const idMap = ASSET_MAPS.CRYPTO.idMap;
                const apiIds = crypto.map(c => idMap[c.ticker.toUpperCase()] || c.ticker.toLowerCase()).join(',');
                const res = await fetch(`${ASSET_MAPS.CRYPTO.api}${apiIds}`);
                if (res.ok) {
                    const data = await res.json();
                    crypto.forEach(c => {
                        const apiId = idMap[c.ticker.toUpperCase()] || c.ticker.toLowerCase();
                        if (data[apiId]) {
                            let unitPrice = data[apiId].inr;
                            if (apiId === 'pax-gold' || apiId === 'gold') unitPrice /= 31.1035; 
                            newPrices[c.id] = { unitPrice: unitPrice, change: data[apiId].inr_24h_change?.toFixed(2) };
                        }
                    });
                }
            } catch (e) { console.warn("Pulsing crypto nodes failed.", e); }
        }
        setPrices(newPrices);
        setSyncing(false);
    };

    // --- 4. MANUAL RATE INPUT ---
    const handleManualUpdate = (assetId, value) => {
        const rate = parseFloat(value);
        if (!isNaN(rate)) setPrices(prev => ({ ...prev, [assetId]: { unitPrice: rate, isManual: true } }));
    };

    // --- 5. SYNC DB (THE TOTAL FMV FIX) ---
   const commitValuations = async () => {
        if (!confirm("Synchronize TOTAL Portfolio FMV? Logic: [Live Price] x [Quantity Held]")) return;
        setSyncing(true);
        const now = new Date().toISOString();

        for (const asset of assets) {
            if (prices[asset.id]) {
                const liveUnitPrice = prices[asset.id].unitPrice;
                // Correct schema mapping: 'quantity'
                const qty = Number(asset.quantity) || 0; 
                
                // MATH: Total Value = Market Price * Units Held
                const totalFairMarketValue = liveUnitPrice * qty;

                await supabase
                    .from('erp_portfolio_assets')
                    .update({ 
                        current_valuation: totalFairMarketValue, 
                        last_price_update: now
                    })
                    .eq('id', asset.id);
            }
        }
        alert("Institutional Sync Complete.");
        if (onSyncComplete) onSyncComplete(); // Refresh parent data
        setSyncing(false);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="bg-white p-8 rounded-sm border border-slate-200 shadow-sm animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-slate-900 text-white flex items-center justify-center text-xl shadow-xl shadow-indigo-500/10"><i className="fa-solid fa-radar"></i></div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Market Intelligence</h3>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5">Real-time Node Monitoring</div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={scanPortfolio} disabled={syncing} className="px-6 py-2.5 bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all">
                        {syncing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-satellite-dish mr-2 text-indigo-600"></i> Pulse Rates</>}
                    </button>
                    {/* ALWAYS VISIBLE SYNC BUTTON FOR FMV */}
                    <button 
                        onClick={commitValuations} 
                        disabled={Object.keys(prices).length === 0 || syncing}
                        className={`px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-xl transition-all ${Object.keys(prices).length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                        Sync Total FMV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                {/* LEFT: ASSETS BOARD */}
                <div className="md:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {assets.map(asset => {
                            const isManual = !asset.ticker;
                            const liveData = prices[asset.id];
                            const qty = Number(asset.quantity) || 1;
                            const dbUnitPrice = Number(asset.current_valuation) / qty; // Derive Unit Price from Total for Comparison
                            const liveRate = liveData ? liveData.unitPrice : null;
                            const diff = liveRate ? ((liveRate - dbUnitPrice) / dbUnitPrice) * 100 : 0;

                            return (
                                <div key={asset.id} className={`p-6 border rounded-sm bg-white shadow-sm flex flex-col justify-between h-full group transition-all hover:border-indigo-200 ${isManual ? 'border-amber-100' : 'border-slate-100'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="font-black text-slate-900 text-[14px] uppercase tracking-tight leading-none mb-1.5">{asset.asset_name}</div>
                                            <div className="text-[9px] text-slate-400 font-mono uppercase bg-slate-50 px-2 py-1 rounded inline-block tracking-tighter">QTY: {asset.quantity} | {asset.ticker || 'MANUAL'}</div>
                                        </div>
                                        {liveRate && (
                                            <div className={`px-2.5 py-1 rounded-sm text-[10px] font-black tabular-nums border ${diff >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 border-t border-slate-50 pt-4 mt-auto items-end">
                                        <div>
                                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">DB Unit Price</div>
                                            <div className="text-[12px] font-bold text-slate-500 font-mono tracking-tighter">{formatCurrency(dbUnitPrice)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter mb-2">Market Feed</div>
                                            {isManual ? (
                                                <div className="flex items-center justify-end gap-1 bg-sky-50 p-1 rounded-sm border border-sky-100">
                                                    <span className="text-xs font-bold text-slate-400">₹</span>
                                                    <input type="number" placeholder={dbUnitPrice.toFixed(2)} className="w-24 text-right text-[13px] font-black text-indigo-900 bg-transparent outline-none" onBlur={(e) => handleManualUpdate(asset.id, e.target.value)} />
                                                </div>
                                            ) : (
                                                <div className={`text-[15px] font-black font-mono tracking-tighter ${liveRate ? 'text-indigo-900' : 'text-slate-200'}`}>
                                                    {liveRate ? formatCurrency(liveRate) : '---'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: SEARCH VISUALIZER */}
                <div className="md:col-span-4 space-y-6">
                     <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                        <div className="flex gap-1.5 mb-6 bg-slate-50 p-1 rounded-sm">
                            {['STOCK', 'CRYPTO', 'METAL'].map(tab => (
                                <button key={tab} onClick={() => { setActiveTab(tab); setSearchData(null); setTicker(''); }} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-sm transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>{tab}</button>
                            ))}
                        </div>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                            <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} placeholder={ASSET_MAPS[activeTab].placeholder} className="flex-1 bg-sky-50 border border-slate-200 rounded-sm p-3 text-xs font-black text-slate-900 outline-none focus:border-indigo-600" />
                            <button disabled={loading} type="submit" className="bg-slate-900 px-4 rounded-sm text-white hover:bg-indigo-600 transition-all shadow-lg active:scale-95"><i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-search'}`}></i></button>
                        </form>

                        {searchData ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-end mb-6 border-b border-slate-50 pb-4">
                                    <div><h3 className="text-xl font-black text-slate-900 tracking-tighter">{searchData.symbol}</h3><div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{searchData.name}</div></div>
                                    <div className="text-right"><div className="text-lg font-mono font-black text-slate-900 tabular-nums">{formatCurrency(searchData.price)}</div><div className={`text-[10px] font-black uppercase mt-1 ${parseFloat(searchData.change) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{searchData.change}% 24H</div></div>
                                </div>
                                <div className="h-40 w-full">
                                    <Line data={{ labels: searchData.labels, datasets: [{ data: searchData.chartData, borderColor: '#4f46e5', borderWidth: 3, pointRadius: 0, fill: true, tension: 0.4, backgroundColor: 'rgba(79, 70, 229, 0.05)' }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } }, scales: { x: { display: false }, y: { display: false } } }} />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16 text-slate-200 border-2 border-dashed border-slate-50 rounded-sm"><i className="fa-solid fa-chart-line text-4xl mb-4 opacity-10"></i><div className="text-[9px] uppercase font-black tracking-[0.4em] opacity-30">Analytical IDLE</div></div>
                        )}
                        <div className="absolute right-[-15px] bottom-[-15px] text-slate-50 font-black text-7xl select-none opacity-[0.03]">INTELLIGENCE</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketWatcher;