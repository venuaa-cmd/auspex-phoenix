import React from 'react';

export const PortfolioCommandBar = ({ 
    search, setSearch, 
    uniqueOptions, fundManagers, 
    filters, setFilters, 
    actions, isSuperAdmin, isSyncing, viewMode 
}) => {
    return (
        <div className="sticky top-4 z-[40] mx-auto w-full max-w-7xl bg-[#0f172a]/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-2 flex flex-col md:flex-row items-center gap-2">
            
            {/* 1. SEARCH INPUT */}
            <div className="flex items-center gap-2 px-3 flex-1 w-full border-b md:border-b-0 md:border-r border-white/10 pb-2 md:pb-0">
                <i className="fa-solid fa-search text-slate-400"></i>
                <input 
                    type="text" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    placeholder="Search assets..." 
                    className="bg-transparent border-none text-white focus:outline-none w-full text-sm font-medium" 
                />
            </div>
            
            {/* 2. ALL FILTER DROPDOWNS */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto items-center px-2">
                <select value={filters.domain} onChange={e => setFilters({ domain: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none">
                    <option value="All">Domain: All</option>
                    {uniqueOptions.domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <select value={filters.manager} onChange={e => setFilters({ manager: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none">
                    <option value="All">Manager: All</option>
                    {fundManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>

                <select value={filters.round} onChange={e => setFilters({ round: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none">
                    <option value="All">Round: All</option>
                    {uniqueOptions.rounds.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <select value={filters.status} onChange={e => setFilters({ status: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none">
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Watchlist">Watchlist</option>
                    <option value="Exited">Exited</option>
                </select>

                <select value={filters.size} onChange={e => setFilters({ size: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none">
                    <option value="All">Size: All</option>
                    <option value="< 1Cr">&lt; 1Cr</option>
                    <option value="1-5Cr">1-5Cr</option>
                    <option value="> 5Cr">&gt; 5Cr</option>
                </select>
            </div>

            {/* 3. ACTIONS & +ASSET */}
            <div className="flex gap-2 pl-2 border-l border-white/10">
                <button onClick={actions.onSync} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-[#facc15] transition-colors" title="Sync Prices">
                    <i className={`fa-solid fa-arrows-rotate ${isSyncing ? 'fa-spin text-[#facc15]' : ''}`}></i>
                </button>
                
                <button onClick={actions.onExport} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-[#facc15] transition-colors" title="Export CSV">
                    <i className="fa-solid fa-download"></i>
                </button>

                <button onClick={actions.onToggleView} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-[#facc15] transition-colors" title="Toggle View">
                    <i className={`fa-solid ${viewMode === 'grid' ? 'fa-list' : 'fa-border-all'}`}></i>
                </button>

                {/* THE CRITICAL +ASSET BUTTON */}
                <button 
                    onClick={actions.onAddAsset} 
                    className="px-5 py-2 bg-[#facc15] text-black text-[11px] font-black uppercase tracking-wider rounded-xl hover:brightness-110 shadow-[0_0_20px_rgba(250,204,21,0.3)] whitespace-nowrap transition-all"
                >
                    + Asset
                </button>
            </div>
        </div>
    );
};