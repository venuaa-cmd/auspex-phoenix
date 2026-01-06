import React from 'react';

const ASSET_TYPES = [
    { id: 'STARTUP_EQUITY', label: 'Startup Equity', icon: 'fa-rocket', desc: 'Private Companies, Angel Investing', color: 'border-blue-200 hover:bg-blue-50 text-blue-600' },
    { id: 'PUBLIC_STOCK', label: 'Public Stock', icon: 'fa-chart-line', desc: 'NSE/BSE, US Stocks, ETFs', color: 'border-emerald-200 hover:bg-emerald-50 text-emerald-600' },
    { id: 'CRYPTO', label: 'Crypto & Web3', icon: 'fa-bitcoin-sign', desc: 'Tokens, DeFi, NFTs', color: 'border-indigo-200 hover:bg-indigo-50 text-indigo-600' },
    { id: 'REAL_ESTATE', label: 'Real Estate', icon: 'fa-building', desc: 'Land, Commercial, REITs', color: 'border-orange-200 hover:bg-orange-50 text-orange-600' },
    { id: 'BULLION', label: 'Bullion', icon: 'fa-coins', desc: 'Gold, Silver, Precious Metals', color: 'border-yellow-200 hover:bg-yellow-50 text-yellow-600' }
];

const AssetTypeSelector = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease]">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                
                {/* HEADER */}
                <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add New Investment</h2>
                        <p className="text-xs text-slate-500 font-bold mt-1">Select the asset class to configure the correct data fields.</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>
                
                {/* GRID SELECTOR */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50">
                    {ASSET_TYPES.map(type => (
                        <button 
                            key={type.id}
                            onClick={() => onSelect(type.id)}
                            className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 bg-white transition-all hover:scale-105 hover:shadow-xl group ${type.color}`}
                        >
                            <div className="w-14 h-14 rounded-full bg-white border-2 border-current flex items-center justify-center mb-4 text-2xl shadow-sm group-hover:bg-current group-hover:text-white transition-colors">
                                <i className={`fa-solid ${type.icon}`}></i>
                            </div>
                            <span className="font-black uppercase text-sm tracking-wider mb-1 text-slate-900">{type.label}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{type.desc}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AssetTypeSelector;