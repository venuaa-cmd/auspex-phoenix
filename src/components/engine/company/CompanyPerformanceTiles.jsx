import React from 'react';

const CompanyPerformanceTiles = ({ stats, formatCurrency }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 1. Total Cost - Removed Italic */}
            <div className="bg-[#0f172a] border border-white/10 p-8 rounded-2xl relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-[50px] group-hover:bg-blue-500/20 transition-all"></div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mb-2 opacity-60">Deployed Capital</p>
                <h2 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(stats.totalInvested)}</h2>
                <div className="w-full bg-blue-500/30 h-1 mt-4 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-blue-500 w-full shadow-[0_0_15px_#3b82f6]"></div>
                </div>
            </div>

            {/* 2. Current Value - Removed Italic */}
            <div className="bg-[#0f172a] border border-white/10 p-8 rounded-2xl relative overflow-hidden group shadow-2xl">
                <div className={`absolute top-0 right-0 w-24 h-24 blur-[50px] transition-all ${stats.profit >= 0 ? 'bg-green-500/10 group-hover:bg-green-500/20' : 'bg-red-500/10 group-hover:bg-red-500/20'}`}></div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mb-2 opacity-60">Mark-to-Market</p>
                <h2 className={`text-4xl font-black tracking-tighter ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(stats.currentVal)}
                </h2>
                <div className={`w-full h-1 mt-4 rounded-full overflow-hidden shadow-inner ${stats.profit >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                    <div className={`h-full w-full shadow-[0_0_15px_currentColor] ${stats.profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
            </div>

            {/* 3. Alpha Multiple - READABILITY FIX APPLIED */}
            <div className="bg-[#0f172a] border border-white/10 p-8 rounded-2xl relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-[50px] group-hover:bg-purple-500/20 transition-all"></div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mb-2 opacity-60">Alpha Multiple (MOIC)</p>
                <div className="flex items-center gap-3">
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        {stats.moic}x 
                    </h2>
                    
                    {/* IMPROVED BADGE: Standard font, better padding, and higher contrast */}
                    <div className={`px-2 py-1 rounded-md text-[11px] font-bold border leading-none tracking-tight ${
                        stats.profit >= 0 
                        ? 'bg-green-500/20 border-green-500/40 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                        : 'bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                    }`}>
                        {stats.profit >= 0 ? '+' : ''}{((stats.moic - 1) * 100).toFixed(0)}%
                    </div>
                </div>
                
                <div className="w-full bg-purple-500/30 h-1 mt-4 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-purple-500 shadow-[0_0_15px_#a855f7]" style={{ width: `${Math.min(stats.moic * 20, 100)}%` }}></div>
                </div>
            </div>
        </div>
    );
};

export default CompanyPerformanceTiles;