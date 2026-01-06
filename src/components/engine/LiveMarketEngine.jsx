import React, { useState } from 'react';
import { db } from '../../lib/firebase';

// Update this to your actual Render URL
const PROXY_BASE_URL = "auspex-phoenix.vercel.app";

const LiveMarketEngine = () => {
    const [status, setStatus] = useState('Idle');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // --- HELPER: CONVERT TO TITLE CASE (Fixes ALL CAPS issue) ---
    const toTitleCase = (str) => {
        if (!str) return "";
        return str.replace(
            /\w\S*/g,
            text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
        );
    };

    const fetchStockPrice = async (query) => {
        // 1. Apply Casing Fix (ZOMATO -> Zomato)
        const formattedQuery = toTitleCase(query);
        
        try {
            // 2. Call the correct route (/api/stock)
            const res = await fetch(`${PROXY_BASE_URL}/api/stock?name=${encodeURIComponent(formattedQuery)}`);
            if (!res.ok) throw new Error("Stock API Error");
            const data = await res.json();
            
            let price = 0;
            if (data.currentPrice) price = (typeof data.currentPrice === 'object') ? (data.currentPrice.NSE || data.currentPrice.BSE) : data.currentPrice;
            else if (data.price) price = data.price;

            if (typeof price === 'string') price = parseFloat(price.replace(/,/g, ''));
            return price > 0 ? price : null;
        } catch (e) { 
            console.warn(`Stock Fetch Failed for ${formattedQuery}`);
            return null; 
        }
    };

    const fetchGoldPrice = async () => {
        try {
            const res = await fetch(`${PROXY_BASE_URL}/api/gold?symbol=XAU&currency=INR`);
            if (!res.ok) return null;
            const data = await res.json();
            if (data.price) return Math.floor(data.price / 31.1035); // Per Gram
            return null;
        } catch (e) { return null; }
    };

    const handleManualSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setStatus('Syncing...');
        
        try {
            const snap = await db.collection('investments').where('status', '==', 'Active').get();
            const updates = [];
            let updateCount = 0;
            const goldPricePerGram = await fetchGoldPrice();
            
            for (const doc of snap.docs) {
                const asset = doc.data();
                const type = (asset.type || asset.domainName || '').toLowerCase();
                
                // STOCK
                if (type.includes('stock') || type.includes('public')) {
                    const ticker = asset.ticker || asset.name; 
                    if (ticker) {
                        const livePrice = await fetchStockPrice(ticker);
                        if (livePrice) {
                            const qty = Number(asset.quantity) || 0;
                            const newVal = Math.floor(qty * livePrice);
                            if (newVal > 0) {
                                updates.push(doc.ref.update({ 
                                    currentValuation: newVal, 
                                    livePrice: livePrice,
                                    lastMarketSync: new Date().toISOString() 
                                }));
                                updateCount++;
                            }
                        }
                    }
                }

                // GOLD
                if (type.includes('gold') && goldPricePerGram) {
                    const weight = Number(asset.weightGrams) || Number(asset.units) || 0;
                    if (weight > 0) {
                        const newVal = Math.floor(weight * goldPricePerGram);
                        updates.push(doc.ref.update({ 
                            currentValuation: newVal, 
                            livePrice: goldPricePerGram,
                            lastMarketSync: new Date().toISOString() 
                        }));
                        updateCount++;
                    }
                }
            }

            await Promise.all(updates);
            setLastUpdate(new Date().toLocaleTimeString());
            setStatus(updateCount > 0 ? `Updated ${updateCount}` : 'Up-to-Date');

        } catch (err) { setStatus('Sync Failed'); } 
        finally { setIsSyncing(false); setTimeout(() => setStatus('Idle'), 5000); }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999]">
            <button onClick={handleManualSync} disabled={isSyncing} className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-2xl transition-all border border-white/10 ${isSyncing ? 'bg-yellow-900/80 text-yellow-200' : 'bg-[#0f172a] text-white hover:bg-slate-800'}`}>
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-yellow-400 animate-ping' : 'bg-green-400'}`}></div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider">{status === 'Idle' ? 'Sync Prices' : status}</span>
                {lastUpdate && !isSyncing && <span className="text-[10px] text-slate-500 border-l border-white/10 pl-3">{lastUpdate}</span>}
            </button>
        </div>
    );
};

export default LiveMarketEngine;