import React from 'react';

const PortfolioFilters = ({ 
    search, setSearch, 
    filterDomain, setFilterDomain, 
    filterManager, setFilterManager,
    filterRound, setFilterRound,
    filterStatus, setFilterStatus,
    filterBudget, setFilterBudget,
    uniqueOptions, fundManagers, 
    isSyncing, handleSyncPrices, 
    handleExportCSV, viewMode, setViewMode,
    isSuperAdmin, setShowAddModal 
}) => {
    return (
        <div className="sticky top-4 z-50 mx-auto max-w-6xl bg-[#0f172a]/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-2 flex flex-col md:flex-row items-center gap-2">
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
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto items-center px-2">
                <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-[var(--brand-color)] outline-none hover:bg-white/10">
                    <option value="All">Domain: All</option>
                    {uniqueOptions.domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-[var(--brand-color)] outline-none hover:bg-white/10">
                    <option value="All">Manager: All</option>
                    {fundManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>

                <select value={filterRound} onChange={e => setFilterRound(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-[var(--brand-color)] outline-none hover:bg-white/10">
                    <option value="All">Round: All</option>
                    {uniqueOptions.rounds.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-[var(--brand-color)] outline-none hover:bg-white/10">
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Exited">Exited</option>
                    <option value="Watchlist">Watchlist</option>
                </select>

                <select value={filterBudget} onChange={e => setFilterBudget(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-[var(--brand-color)] outline-none hover:bg-white/10">
                    <option value="All">Size: All</option>
                    <option value="< 1Cr">&lt; 1 Cr</option>
                    <option value="1-5Cr">1 - 5 Cr</option>
                    <option value="> 5Cr">&gt; 5 Cr</option>
                </select>
            </div>

            <div className="flex gap-2 pl-2 border-l border-white/10">
                <button onClick={handleSyncPrices} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-[var(--brand-color)] hover:bg-white/10 transition-colors" title="Sync Prices">
                    <i className={`fa-solid fa-arrows-rotate ${isSyncing ? 'fa-spin' : ''}`}></i>
                </button>
                <button onClick={handleExportCSV} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-[var(--brand-color)] hover:bg-white/10 transition-colors" title="Export CSV">
                    <i className="fa-solid fa-download"></i>
                </button>
                <button onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-[var(--brand-color)] hover:bg-white/10 transition-colors">
                    <i className={`fa-solid ${viewMode === 'grid' ? 'fa-list' : 'fa-border-all'}`}></i>
                </button>
                {isSuperAdmin && (
                    <button onClick={() => setShowAddModal(true)} className="px-4 py-1.5 bg-[var(--brand-color)] text-black text-xs font-bold rounded-lg hover:brightness-110 shadow-[0_0_15px_var(--brand-glow)] whitespace-nowrap transition-all">+ Asset</button>
                )}
            </div>
        </div>
    );
};

export default PortfolioFilters;