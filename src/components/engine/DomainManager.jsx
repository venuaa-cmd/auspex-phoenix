import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient'; 
import { db } from '../../lib/firebase'; 
import { runAIAnalysis, parseAIJson } from '../../lib/aiService';

// Import stubs
import DetailedInvestModal from './domain/DetailedInvestModal';
import InvestorAnalysisModal from './domain/InvestorAnalysisModal';

// --- HELPERS ---
const cleanTitle = (name) => name ? name.replace(/\(India\)/g, '').trim() : '';

const extractValuation = (text) => {
    if (!text || text === "Pending Analysis" || text.includes("Not a defined")) return null;
    const regex = /((?:\$|USD|INR|₹|US\$)\s?\d+(?:\.\d+)?\s*(?:Billion|Million|Trillion|Crore|Cr)?)/i;
    const match = text.match(regex);
    if (!match) return null;
    let val = match[0];
    val = val.replace(/USD/i, '$').replace(/US\$/i, '$').replace(/INR/i, '₹');
    val = val.replace(/Billion/i, 'B').replace(/Million/i, 'M').replace(/Trillion/i, 'T').replace(/Crore/i, 'Cr');
    return val.trim();
};

const getNumericValue = (text) => {
    if (!text || text === "Pending Analysis") return 0;
    const valStr = extractValuation(text);
    if (!valStr) return 0;
    const num = parseFloat(valStr.replace(/[^0-9.]/g, ''));
    if (valStr.includes('T')) return num * 1000000;
    if (valStr.includes('B')) return num * 1000;
    if (valStr.includes('Cr')) return num * 10; 
    return num;
};

const getDomainIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('agri')) return 'fa-seedling';
    if (n.includes('ai') || n.includes('intelligence')) return 'fa-brain';
    if (n.includes('space')) return 'fa-rocket';
    if (n.includes('fin') || n.includes('bank')) return 'fa-building-columns';
    if (n.includes('health') || n.includes('pharma')) return 'fa-heart-pulse';
    if (n.includes('edu')) return 'fa-graduation-cap';
    if (n.includes('clean') || n.includes('energy')) return 'fa-leaf';
    if (n.includes('saas') || n.includes('software')) return 'fa-cloud';
    if (n.includes('fashion') || n.includes('apparel')) return 'fa-shirt';
    if (n.includes('gaming')) return 'fa-gamepad';
    if (n.includes('defense')) return 'fa-shield-halved';
    if (n.includes('logistics') || n.includes('supply chain')) return 'fa-truck-fast';
    if (n.includes('gold') || n.includes('silver')) return 'fa-coins';
    return 'fa-chart-pie';
};

// --- MAIN COMPONENT ---
const DomainManager = ({ domains, userRole, isSuperAdmin, onOpenCompany, fundManagers, refreshData }) => {
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [analyzingStartup, setAnalyzingStartup] = useState(null);
    const [analyzingInvestor, setAnalyzingInvestor] = useState(null);
    const [newDomain, setNewDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
    const [modalDefaultName, setModalDefaultName] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [sortBy, setSortBy] = useState('alpha'); 
    const [viewMode, setViewMode] = useState('grid'); 

    const isAdmin = isSuperAdmin || userRole === 'admin'; 

    const sortedDomains = useMemo(() => {
        const list = [...domains];
        if (sortBy === 'alpha') return list.sort((a, b) => a.name.localeCompare(b.name));
        return list.sort((a, b) => getNumericValue(b.market_cap) - getNumericValue(a.market_cap));
    }, [domains, sortBy]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newDomain.trim() || !isAdmin) return;
        setLoading(true);
        const prompt = `Identify top 5 startups and 5 promising new startups in "${newDomain}" in India. Return STRICT JSON: { "topCompanies": [], "newStartups": [], "marketCap": "Estimate", "investors": ["Inv1"] }`;
        try {
            const text = await runAIAnalysis(prompt);
            let json = parseAIJson(text);
            await supabase.from('domains').insert([{ 
                name: newDomain.trim(),
                market_cap: json.marketCap || "Pending Analysis",
                top_companies: json.topCompanies || [],
                new_startups: json.newStartups || [],
                key_investors: json.investors || []
            }]);
            setNewDomain('');
            if (refreshData) refreshData();
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleRegenerate = async () => {
        if(!window.confirm("Refresh data via AI?")) return;
        setIsRegenerating(true);
        const prompt = `Refresh data for domain: ${selectedDomain.name}. Identify top 5 startups, 5 new startups, key investors, and market cap. Return STRICT JSON: { "topCompanies": [], "newStartups": [], "marketCap": "Est", "investors": [] }`;
        try {
            const text = await runAIAnalysis(prompt);
            let json = parseAIJson(text);
            await supabase.from('domains').update({
                market_cap: json.marketCap,
                top_companies: json.topCompanies,
                new_startups: json.newStartups,
                key_investors: json.investors
            }).eq('id', selectedDomain.id);
            setSelectedDomain(prev => ({ ...prev, market_cap: json.marketCap, top_companies: json.topCompanies, new_startups: json.newStartups, key_investors: json.investors }));
            if (refreshData) refreshData();
        } catch(e) { console.error(e); }
        setIsRegenerating(false);
    };
    
    const handleDelete = async () => {
        if(window.confirm("Purge this domain and all its data?")) {
            await supabase.from('domains').delete().eq('id', selectedDomain.id);
            setSelectedDomain(null);
            if (refreshData) refreshData();
        }
    };

    const handleWatch = async (name) => {
        await db.collection('watchlist').add({ name, addedAt: new Date().toISOString() });
        alert(`Added ${name} to Intel Watchlist`);
    };

    const renderTags = (items, type) => (
        <div className="flex flex-wrap gap-2.5">
            {items && Array.isArray(items) && items.length > 0 ? items.map((item, i) => {
                const label = typeof item === 'object' ? (item.name || item.company || "Unknown") : item;
                return (
                    <div key={i} className="group relative flex items-center bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 hover:bg-white/[0.07] hover:border-[#facc15]/50 transition-all duration-300">
                        <span onClick={() => type === 'investor' ? setAnalyzingInvestor(label) : setAnalyzingStartup(label)} className="text-[13px] font-semibold text-slate-200 cursor-pointer group-hover:text-white">{label}</span>
                        <div className="flex ml-3 gap-2 opacity-0 group-hover:opacity-100 transition-opacity border-l border-white/10 pl-3">
                            <button onClick={() => handleWatch(label)} className="text-slate-400 hover:text-[#facc15] text-xs"><i className="fa-regular fa-eye"></i></button>
                            {type === 'startup' && isAdmin && (
                                <button onClick={() => { setModalDefaultName(label); setIsInvestModalOpen(true); }} className="text-slate-400 hover:text-green-400 text-xs"><i className="fa-solid fa-plus"></i></button>
                            )}
                        </div>
                    </div>
                );
            }) : <span className="text-slate-600 italic text-[13px]">Collecting intelligence...</span>}
        </div>
    );

    if (selectedDomain) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* DRILL DOWN HEADER */}
                <div className="bg-[#0f172a] border border-white/10 p-10 rounded-[2rem] mb-10 relative overflow-hidden shadow-2xl">
                    <div className="relative z-10">
                        <button onClick={() => setSelectedDomain(null)} className="group mb-6 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all">
                            <i className="fa-solid fa-chevron-left group-hover:-translate-x-1 transition-transform"></i> Return to Clusters
                        </button>
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-5xl font-black text-white mb-4 tracking-tighter">{cleanTitle(selectedDomain.name)}</h1>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-[11px] font-black text-green-500 uppercase tracking-widest">Active Market</span>
                                    </div>
                                    <span className="text-slate-500 font-mono text-xs">ID: {selectedDomain.id?.substring(0,8)}</span>
                                </div>
                            </div>
                            <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl backdrop-blur-md min-w-[350px]">
                                <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 flex items-center gap-2">
                                    <i className={`fa-solid ${getDomainIcon(selectedDomain.name)}`}></i> Full Market Analysis
                                </h4>
                                <p className="text-white text-sm leading-relaxed font-medium">{selectedDomain.market_cap}</p>
                            </div>
                        </div>

                        {/* RESTORED: THE 3 CRITICAL BUTTONS */}
                        {isAdmin && (
                            <div className="mt-10 flex flex-wrap gap-4 pt-8 border-t border-white/5">
                                <button onClick={handleRegenerate} disabled={isRegenerating} className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 transition-all flex items-center gap-3">
                                    <i className={`fa-solid fa-arrows-rotate ${isRegenerating ? 'fa-spin' : ''}`}></i> 
                                    {isRegenerating ? 'Refreshing Intel...' : 'Regenerate Analysis'}
                                </button>
                                <button onClick={() => { setModalDefaultName(''); setIsInvestModalOpen(true); }} className="bg-[#facc15] text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                                    <i className="fa-solid fa-plus"></i> Manual Deal Entry
                                </button>
                                <button onClick={handleDelete} className="ml-auto text-red-500/50 hover:text-red-500 text-[10px] font-black uppercase tracking-widest px-4 transition-all">
                                    <i className="fa-solid fa-trash-can mr-2"></i> Purge Domain
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* THE DRILL-DOWN SEGMENTS (RESTORED KEY INVESTORS) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl group">
                        <div className="flex items-center justify-between mb-8 text-white font-black text-sm uppercase tracking-[0.2em]">
                            <h3>Market Leaders</h3> <i className="fa-solid fa-crown text-yellow-500"></i>
                        </div>
                        {renderTags(selectedDomain.top_companies || selectedDomain.topCompanies, 'startup')}
                    </div>
                    <div className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl group">
                        <div className="flex items-center justify-between mb-8 text-white font-black text-sm uppercase tracking-[0.2em]">
                            <h3>Rising Stars</h3> <i className="fa-solid fa-rocket text-blue-500"></i>
                        </div>
                        {renderTags(selectedDomain.new_startups || selectedDomain.newStartups, 'startup')}
                    </div>
                    <div className="md:col-span-2 bg-white/[0.02] border border-white/10 p-8 rounded-3xl group">
                        <div className="flex items-center justify-between mb-8 text-white font-black text-sm uppercase tracking-[0.2em]">
                            <h3>Active LP/VC Entities</h3> <i className="fa-solid fa-building-columns text-slate-500"></i>
                        </div>
                        {renderTags(selectedDomain.key_investors || selectedDomain.investors || selectedDomain.keyInvestors, 'investor')}
                    </div>
                </div>

                {/* SUB-MODALS */}
                {analyzingStartup && <StartupAnalysisModal name={analyzingStartup} onClose={() => setAnalyzingStartup(null)} />}
                {isInvestModalOpen && DetailedInvestModal && <DetailedInvestModal companyName={modalDefaultName} domain={selectedDomain.name} onClose={() => setIsInvestModalOpen(false)} fundManagers={fundManagers} onOpenCompany={onOpenCompany} />}
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* ROW 1: COMMAND CENTER */}
            {isAdmin && (
                <div className="bg-[#0f172a]/80 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
                    <h3 className="text-white text-[11px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[#facc15] animate-pulse"></span> Register New Industry Cluster
                    </h3>
                    <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
                        <input type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="e.g. SpaceTech (India)" className="flex-1 bg-[#0a0f1d] border border-white/10 rounded-2xl py-4 px-6 text-white focus:border-[#facc15] outline-none text-sm transition-all" />
                        <button disabled={loading} className="bg-[#facc15] text-black font-black uppercase text-[11px] tracking-widest px-10 rounded-2xl hover:bg-white transition-all h-[56px] shadow-lg">
                            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : "Deploy Intelligence"}
                        </button>
                    </form>
                </div>
            )}

            {/* ROW 2: TACTICAL CONTROL BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Sort Engine:</span>
                    <div className="bg-black/40 p-1 rounded-xl flex gap-1">
                        <button onClick={() => setSortBy('alpha')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'alpha' ? 'bg-[#facc15] text-black' : 'text-slate-500 hover:text-white'}`}>A-Z</button>
                        <button onClick={() => setSortBy('cap')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'cap' ? 'bg-[#facc15] text-black' : 'text-slate-500 hover:text-white'}`}>Valuation</button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Projection:</span>
                    <div className="bg-black/40 p-1 rounded-xl flex gap-1">
                        <button onClick={() => setViewMode('grid')} className={`w-12 h-9 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#facc15] text-black' : 'text-slate-500 hover:text-white'}`}><i className="fa-solid fa-grip"></i></button>
                        <button onClick={() => setViewMode('list')} className={`w-12 h-9 flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#facc15] text-black' : 'text-slate-500 hover:text-white'}`}><i className="fa-solid fa-list-ul"></i></button>
                    </div>
                </div>
            </div>

            {/* ROW 3: INTELLIGENCE FEED */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedDomains.map(domain => {
                        const val = extractValuation(domain.market_cap);
                        const icon = getDomainIcon(domain.name);
                        return (
                            <div key={domain.id} onClick={() => setSelectedDomain(domain)} className="bg-[#0f172a] border border-white/5 rounded-3xl p-8 hover:border-[#facc15]/40 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden shadow-xl">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#facc15]/5 blur-2xl group-hover:bg-[#facc15]/10"></div>
                                <div className="flex justify-between items-start mb-6">
                                    <h4 className="text-xl font-bold text-white group-hover:text-[#facc15] transition-colors">{cleanTitle(domain.name)}</h4>
                                    <i className={`fa-solid ${icon} text-xl text-slate-700 group-hover:text-[#facc15] transition-colors`}></i>
                                </div>
                                <div className="flex items-start gap-5">
                                    <div className="shrink-0 min-w-[90px]">
                                        <span className="block text-3xl font-black text-[#facc15] leading-none tracking-tighter">{val || 'Scanning'}</span>
                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1 block">Est. Market Cap</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3 font-medium border-l border-white/10 pl-4">{domain.market_cap}</p>
                                </div>
                                <div className="mt-8 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white">
                                    <span>Access Dossier</span> <i className="fa-solid fa-arrow-right-long group-hover:translate-x-2 transition-transform"></i>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-12 px-10 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                        <div className="col-span-5">Industry Cluster</div>
                        <div className="col-span-4 text-center">Market Valuation</div>
                        <div className="col-span-3 text-right">Dossier</div>
                    </div>
                    {sortedDomains.map(domain => {
                        const val = extractValuation(domain.market_cap);
                        const icon = getDomainIcon(domain.name);
                        return (
                            <div key={domain.id} onClick={() => setSelectedDomain(domain)} className="grid grid-cols-12 items-center bg-[#0f172a] border border-white/5 px-10 py-6 rounded-2xl hover:border-[#facc15]/40 hover:bg-white/[0.03] transition-all cursor-pointer group">
                                <div className="col-span-5 flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-[#facc15] transition-colors border border-white/5"><i className={`fa-solid ${icon} text-lg`}></i></div>
                                    <span className="text-lg font-bold text-white tracking-tight">{cleanTitle(domain.name)}</span>
                                </div>
                                <div className="col-span-4 text-center">
                                    <span className="text-2xl font-black text-[#facc15] tracking-tighter uppercase">{val || 'ANALYZING...'}</span>
                                </div>
                                <div className="col-span-3 text-right">
                                    <span className="text-[10px] font-black text-slate-500 group-hover:text-white uppercase tracking-[0.2em] transition-all">VIEW REPORT <i className="fa-solid fa-arrow-right ml-2 text-[8px]"></i></span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DomainManager;