import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient'; 
import { formatCurrency, calculateMetrics } from './portfolio/PortfolioUtils';
import { GlobalMetric } from './portfolio/PortfolioWidgets';
import { PortfolioIntelligence } from './portfolio/PortfolioIntelligence';
import { PortfolioCommandBar } from './portfolio/PortfolioCommandBar'; 
import CompanyDetailView from './CompanyDetailView';
import AddInvestmentModal from './portfolio/AddInvestmentModal';

const PROXY_BASE_URL = "https://auspex-phoenix.vercel.app";

const PortfolioManager = ({ 
    investments = [], 
    companies = [], 
    domains = [], 
    onSelectCompany, 
    selectedCompanyId, 
    currentUserEmail, 
    fundManagers = [], 
    refreshData 
}) => {
    const [localSelectedId, setLocalSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [filterAssetClass, setFilterAssetClass] = useState('All');
    const [filterDomain, setFilterDomain] = useState('All');
    const [filterManager, setFilterManager] = useState('All');
    const [filterRound, setFilterRound] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterSize, setFilterSize] = useState('All');
    const [viewMode, setViewMode] = useState('grid'); 
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [livePrices, setLivePrices] = useState({}); 

    const activeId = selectedCompanyId || localSelectedId;
    const isSuperAdmin = currentUserEmail?.toLowerCase().trim() === 'venu.ananda@auspexinvestments.com';

    // --- 1. MARKET SYNC ENGINE (FIXES 1.00x MOIC) ---
    useEffect(() => {
        const syncMarketRates = async () => {
            const prices = { ...livePrices };
            const liveAssets = companies.filter(c => {
                const type = (c.type || c.industry || '').toLowerCase();
                return type.includes('crypto') || type.includes('gold') || type.includes('stock') || type.includes('public');
            });

            for (const asset of liveAssets) {
                try {
                    const type = (asset.type || asset.industry || '').toLowerCase();
                    if (type.includes('crypto')) {
                        const res = await fetch(`${PROXY_BASE_URL}/api/crypto?id=${(asset.ticker || 'BTC').toLowerCase()}`);
                        const data = await res.json();
                        if (data.price) prices[asset.id] = data.price;
                    } else if (type.includes('gold')) {
                        const res = await fetch(`${PROXY_BASE_URL}/api/gold`);
                        const data = await res.json();
                        if (data.pricePerGram) prices[asset.id] = data.pricePerGram;
                    } else if (type.includes('stock') || type.includes('public')) {
                        const res = await fetch(`${PROXY_BASE_URL}/api/stock?name=${encodeURIComponent(asset.ticker || asset.name)}`);
                        const data = await res.json();
                        let p = data.price && typeof data.price === 'object' ? (parseFloat(data.price.NSE) || parseFloat(data.price.BSE) || 0) : (parseFloat(data.price) || 0);
                        if (p > 0) prices[asset.id] = p;
                    }
                } catch (e) { console.warn(`Oracle Sync failed for ${asset.name}`); }
            }
            setLivePrices(prices);
        };
        if (companies.length > 0) syncMarketRates();
    }, [companies]);

    // --- 2. THE FORENSIC ENGINE (RESTORED INTELLIGENCE, WAITLIST, & SEARCH) ---
    const { stats, groupedAssets, chartData, uniqueOptions, analysisText } = useMemo(() => {
        const assetMap = {};
        const domainsSet = new Set();
        const roundsSet = new Set();

        investments.forEach(inv => {
            const cId = inv.company_id || inv.companyId;
            if (!cId) return;
            const linkedCompany = companies.find(c => String(c.id) === String(cId));
            const rawManagerId = inv.fund_manager_id || inv.fundManagerId;
            const manager = fundManagers.find(m => String(m.id) === String(rawManagerId));
            const rawType = (linkedCompany?.type || inv.asset_class || '').toLowerCase().trim();
            
            let uiCategory = 'Startup'; let icon = 'fa-rocket'; let color = 'text-blue-500'; let bgGlow = 'from-blue-500/10';
            if (rawType.includes('stock') || rawType.includes('public')) { uiCategory = 'Stock'; icon = 'fa-chart-line'; color = 'text-violet-500'; bgGlow = 'from-violet-500/10'; }
            else if (rawType.includes('gold')) { uiCategory = 'Gold'; icon = 'fa-coins'; color = 'text-amber-500'; bgGlow = 'from-amber-500/10'; }
            else if (rawType.includes('real_estate')) { uiCategory = 'RealEstate'; icon = 'fa-building'; color = 'text-emerald-500'; bgGlow = 'from-emerald-500/10'; }
            else if (rawType.includes('crypto')) { uiCategory = 'Crypto'; icon = 'fa-bitcoin'; color = 'text-purple-500'; bgGlow = 'from-purple-500/10'; }

            if (!assetMap[cId]) {
                assetMap[cId] = {
                    id: cId, displayName: linkedCompany?.name || inv.company_name || "Unknown Asset",
                    domainName: linkedCompany?.industry || "General", invested: 0, current: 0, status: inv.status || 'Active',
                    date: inv.investment_date || inv.created_at, managerName: manager ? manager.name : "UNASSIGNED",
                    fund_manager_id: rawManagerId, round_name: inv.round_name || "Growth", asset_class_ui: uiCategory, icon, themeColor: color, glow: bgGlow
                };
            }

            const livePrice = livePrices[cId] || 0;
            let currentValuation = Number(inv.current_valuation || inv.amount_invested || 0);
            if (['Crypto', 'Gold', 'Stock'].includes(uiCategory) && livePrice > 0) {
                currentValuation = Number(inv.quantity || inv.units || 0) * livePrice;
            }

            assetMap[cId].invested += Number(inv.amount_invested || 0);
            assetMap[cId].current += currentValuation;
            if (assetMap[cId].domainName) domainsSet.add(assetMap[cId].domainName);
            if (inv.round_name) roundsSet.add(inv.round_name);
        });

        // RESTORED: WAITLIST/PITCH PIPELINE
        companies.forEach(c => {
            if (c.deal_status === 'WAITLIST' && !assetMap[c.id]) {
                assetMap[c.id] = { id: c.id, displayName: c.name, domainName: c.industry || "General", invested: 0, current: 0, status: 'Watchlist', managerName: 'N/A', round_name: 'Pitch', asset_class_ui: 'Startup', icon: 'fa-rocket', themeColor: 'text-blue-500', glow: 'from-blue-500/10' };
            }
        });

        // --- FIXED FILTER LOGIC: Restored every criteria dropdown ---
        const filtered = Object.values(assetMap).filter(item => {
            const matchesSearch = !search || item.displayName.toLowerCase().includes(search.toLowerCase());
            const matchesManager = filterManager === 'All' || String(item.fund_manager_id) === String(filterManager);
            const matchesDomain = filterDomain === 'All' || item.domainName === filterDomain;
            const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
            const matchesRound = filterRound === 'All' || item.round_name === filterRound;
            const matchesClass = filterAssetClass === 'All' || item.asset_class_ui === filterAssetClass;
            
            let matchesSize = true;
            if (filterSize === '< 1Cr') matchesSize = item.invested < 10000000;
            else if (filterSize === '1-5Cr') matchesSize = item.invested >= 10000000 && item.invested < 50000000;
            else if (filterSize === '> 5Cr') matchesSize = item.invested >= 50000000;

            return matchesSearch && matchesManager && matchesDomain && matchesStatus && matchesRound && matchesClass && matchesSize;
        });

        const chartMap = { 'Startup': 0, 'RealEstate': 0, 'Gold': 0, 'Stock': 0, 'Crypto': 0 };
        filtered.forEach(i => { if (chartMap[i.asset_class_ui] !== undefined) chartMap[i.asset_class_ui] += i.current; });

        const totalInv = filtered.reduce((acc, curr) => acc + curr.invested, 0);
        const totalCur = filtered.reduce((acc, curr) => acc + curr.current, 0);
        const profit = totalCur - totalInv;
        const gainPct = totalInv > 0 ? ((profit / totalInv) * 100).toFixed(1) : "0";

        return { 
            stats: { 
                totalInv, totalCur, profit, gainPct, 
                activeCount: filtered.filter(a => a.status === 'Active').length, 
                watchlistCount: filtered.filter(a => a.status === 'Watchlist').length, 
                distressedCount: filtered.filter(a => a.status === 'Active' && (a.current / (a.invested || 1)) < 1.0).length 
            },
            groupedAssets: filtered, 
            chartData: { labels: Object.keys(chartMap), datasets: [{ data: Object.values(chartMap), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#a855f7'], borderWidth: 0 }] },
            uniqueOptions: { domains: Array.from(domainsSet).sort(), rounds: Array.from(roundsSet).sort() },
            analysisText: `Monitoring ${filtered.length} positions with net ROI of ${gainPct}%.`
        };
    }, [investments, companies, fundManagers, search, filterAssetClass, filterDomain, filterRound, filterStatus, filterSize, filterManager, livePrices]);

    // --- 3. PURGE HANDLER (RESTORED) ---
    const handleDeleteAsset = async (e, item) => {
        e.stopPropagation(); 
        if (!isSuperAdmin) return;
        if (window.confirm(`Permanently delete ${item.displayName}? This cannot be undone.`)) {
            try {
                await supabase.from('investments').delete().eq('company_id', item.id);
                const { error } = await supabase.from('companies').delete().eq('id', item.id);
                if (error) throw error;
                if (refreshData) refreshData();
            } catch (err) { alert("Purge Failed: " + err.message); }
        }
    };

    if (activeId) {
        const company = companies.find(c => String(c.id) === String(activeId));
        return <CompanyDetailView company={company} allInvestments={investments} fundManagers={fundManagers} domains={domains} refreshData={refreshData} currentUserEmail={currentUserEmail} userRole={isSuperAdmin ? 'super_admin' : 'viewer'} onBack={() => { setLocalSelectedId(null); if(onSelectCompany) onSelectCompany(null); }} />;
    }

    return (
        <div className="flex flex-col space-y-8 pb-20 font-manrope">
            {/* AUDIT PERFORMANCE METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlobalMetric label="Deployed Capital" value={formatCurrency(stats.totalInv)} color="brand" />
                <GlobalMetric label="Mark-to-Market" value={formatCurrency(stats.totalCur)} />
                <GlobalMetric label="Net Alpha P&L" value={formatCurrency(stats.profit)} subtext={`${stats.gainPct}% ROI`} color={stats.profit >= 0 ? 'green' : 'red'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlobalMetric label="Active Positions" value={stats.activeCount} color="green" />
                <GlobalMetric label="Watchlist Deals" value={stats.watchlistCount} subtext="Pipeline Monitoring" color="yellow" />
                <GlobalMetric label="Distressed Assets" value={stats.distressedCount} subtext="MOIC < 1.0" color="red" />
            </div>

            {/* FULLY RESTORED COMMAND BAR */}
            <PortfolioCommandBar 
                search={search} setSearch={setSearch} 
                uniqueOptions={uniqueOptions} fundManagers={fundManagers} 
                filters={{ domain: filterDomain, manager: filterManager, status: filterStatus, round: filterRound, size: filterSize }} 
                setFilters={(f) => { 
                    if (f.domain !== undefined) setFilterDomain(f.domain); 
                    if (f.manager !== undefined) setFilterManager(f.manager); 
                    if (f.status !== undefined) setFilterStatus(f.status); 
                    if (f.round !== undefined) setFilterRound(f.round); 
                    if (f.size !== undefined) setFilterSize(f.size); 
                }} 
                actions={{ onSync: () => setIsSyncing(true), onAddAsset: () => setShowAddModal(true), onExport: () => {}, onToggleView: () => setViewMode(viewMode === 'grid' ? 'list' : 'grid') }} 
                isSuperAdmin={isSuperAdmin} isSyncing={isSyncing} viewMode={viewMode} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1"><PortfolioIntelligence analysisText={analysisText} chartData={chartData} filterAssetClass={filterAssetClass} setFilterAssetClass={setFilterAssetClass} assetCount={groupedAssets.length} /></aside>
                <main className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {groupedAssets.map(item => {
                            const m = calculateMetrics(item.invested, item.current, item.status, item.date);
                            const borderStyle = item.status === 'Watchlist' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5 hover:border-[#facc15]/50';
                            
                            return (
                                <div key={item.id} onClick={() => setLocalSelectedId(item.id)} className={`bg-[#0f172a] border rounded-[2.5rem] p-8 transition-all cursor-pointer group shadow-2xl relative overflow-hidden ${borderStyle}`}>
                                    <div className={`absolute -right-4 -bottom-4 text-[10rem] opacity-[0.03] transition-all group-hover:opacity-[0.07] pointer-events-none ${item.themeColor}`}><i className={`fa-solid ${item.icon}`}></i></div>
                                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${item.glow} to-transparent blur-[80px] pointer-events-none opacity-40`}></div>
                                    
                                    {isSuperAdmin && <button onClick={(e) => handleDeleteAsset(e, item)} className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all z-50 border border-red-500/20 flex items-center justify-center shadow-xl"><i className="fa-solid fa-trash-can text-sm"></i></button>}

                                    <div className="relative z-10 flex justify-between items-start mb-6">
                                        <div>
                                            <div className="flex items-center gap-2"><i className={`fa-solid ${item.icon} text-xs ${item.themeColor} opacity-70`}></i><h4 className="text-xl font-black text-white group-hover:text-[#facc15] uppercase">{item.displayName}</h4></div>
                                            {/* RESTORED ASSET: DOMAIN BRANDING */}
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{item.asset_class_ui}: {item.domainName}</span>
                                        </div>
                                        {item.status === 'Watchlist' && <div className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded text-[8px] font-black text-yellow-500 uppercase tracking-widest">Waitlist</div>}
                                    </div>

                                    <div className="relative z-10 flex items-end justify-between mb-8 p-5 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-sm">
                                        <div><span className="text-[9px] text-slate-500 uppercase block mb-1 font-black">Invested</span><span className="text-sm font-bold text-slate-300">{formatCurrency(item.invested)}</span></div>
                                        <div className="text-right"><span className="text-[9px] text-[#facc15] uppercase block mb-1 font-black">Mark-to-Market</span><span className="text-2xl font-black text-white">{formatCurrency(item.current)}</span></div>
                                    </div>

                                    <div className="relative z-10 grid grid-cols-4 gap-2">
                                        {[ { label: 'MOIC', val: `${m.moic}x`, good: !m.isDistressed, bad: m.isDistressed }, { label: 'IRR', val: `${m.irr}%`, good: !m.isDistressed, bad: m.isDistressed }, { label: 'TVPI', val: `${m.tvpi}x` }, { label: 'DPI', val: `${m.dpi}x` } ].map((stat, i) => (
                                            <div key={i} className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${stat.good ? 'bg-green-500/5 border-green-500/20 text-green-400' : stat.bad ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-white/5 border-white/5 text-slate-400'}`}><span className="text-[8px] uppercase font-black opacity-50 mb-1">{stat.label}</span><span className="text-[11px] font-black font-mono">{stat.val}</span></div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>
            <AddInvestmentModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} domains={domains} fundManagers={fundManagers} onSave={refreshData} />
        </div>
    );
};

export default PortfolioManager;