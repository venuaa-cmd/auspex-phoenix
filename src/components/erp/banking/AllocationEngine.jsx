import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { runSingleDomainAudit } from '../../../lib/aiService';

const AllocationEngine = ({ ledger = [] }) => {
    const [domains, setDomains] = useState([]);
    const [savedAllocations, setSavedAllocations] = useState({});
    const [employees, setEmployees] = useState([]);
    const [analyzingDomain, setAnalyzingDomain] = useState(null);
    const [expandedAudit, setExpandedAudit] = useState(null);
    
    // --- UI CONTROLS ---
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('ALPHA'); 
    const [showParked, setShowParked] = useState(false);

    // --- 1. THE DRAWDOWN ENGINE (FIXED MATH) ---
    const pulse = useMemo(() => {
        const primaryFunding = 80000000000; 
        const totalSpent = (ledger || []).filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const globalInvestCap = (primaryFunding - totalSpent) * 0.60;

        // FIXED: Only sum budgets where status is physically 'active'
        const allocationsArray = Object.values(savedAllocations);
        const activeAllocations = allocationsArray.filter(a => a.status === 'active');
        const amountAllocated = activeAllocations.reduce((sum, a) => sum + Number(a.budget || 0), 0);
        
        return { 
            globalInvestCap, amountAllocated, 
            activeCount: activeAllocations.length, 
            remaining: globalInvestCap - amountAllocated 
        };
    }, [ledger, savedAllocations]);

    useEffect(() => { fetchMasterRegistry(); }, []);

    const fetchMasterRegistry = async () => {
        const { data: dData } = await supabase.from('domains').select('name');
        if (dData) setDomains(dData);

        const { data: aData } = await supabase.from('erp_domain_allocations').select('*');
        if (aData) {
            const map = {};
            aData.forEach(item => map[item.domain_name] = item);
            setSavedAllocations(map);
        }

        const { data: eData } = await supabase.from('erp_employees').select('full_name').eq('status', 'ACTIVE');
        if (eData) setEmployees(eData);
    };

    // --- 2. STATUS TOGGLE (Park/Release Logic) ---
    const handleToggleStatus = async (domainName, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const { error } = await supabase.from('erp_domain_allocations').update({ status: newStatus }).eq('domain_name', domainName);
        if (!error) {
            setSavedAllocations(prev => ({ ...prev, [domainName]: { ...prev[domainName], status: newStatus } }));
        }
    };

    const handleSovereignAudit = async (domainName) => {
        setAnalyzingDomain(domainName);
        try {
            const managerList = employees.map(e => ({ name: e.full_name }));
            const res = await runSingleDomainAudit(domainName, managerList, pulse.remaining);
            if (res) {
                await supabase.from('erp_domain_allocations').upsert({
                    domain_name: domainName, budget: res.suggested_budget, reasoning: res.reasoning,
                    manager_splits: res.manager_splits, status: 'active', last_audit_date: new Date().toISOString()
                }, { onConflict: 'domain_name' });
                fetchMasterRegistry(); 
            }
        } finally { setAnalyzingDomain(null); }
    };

    // --- SORT & FILTER ---
    const filteredDomains = useMemo(() => {
        return domains
            .filter(d => {
                const audit = savedAllocations[d.name];
                // Show Parked Toggle Logic: if showParked is true, show everything. If false, hide inactives.
                if (!showParked && audit?.status === 'inactive') return false;
                return d.name.toLowerCase().includes(searchTerm.toLowerCase());
            })
            .sort((a, b) => {
                if (sortBy === 'ALPHA') return a.name.localeCompare(b.name);
                return (savedAllocations[b.name]?.budget || 0) - (savedAllocations[a.name]?.budget || 0);
            });
    }, [domains, savedAllocations, searchTerm, sortBy, showParked]);

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(v || 0);

    return (
        <div className="bg-[#F1F5F9] min-h-screen font-sans p-6 h-[85vh] overflow-hidden flex flex-col antialiased text-slate-900">
            
            <header className="bg-white border-b-2 border-slate-200 p-6 flex justify-between items-center shrink-0 mb-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 flex items-center justify-center text-white font-bold tracking-tighter">VEDA</div>
                    <div><h2 className="text-lg font-black uppercase tracking-tight">Waterfall Terminal</h2><p className="text-[9px] text-slate-400 font-bold uppercase">Active Nodes: {pulse.activeCount}</p></div>
                </div>
                <div className="flex gap-10 items-center">
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Cap</p>
                        <p className="text-sm font-black tabular-nums">{fmt(pulse.globalInvestCap)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Allocated</p>
                        <p className="text-sm font-black text-indigo-600 tabular-nums">{fmt(pulse.amountAllocated)}</p>
                    </div>
                    <div className="h-10 w-px bg-slate-200"></div>
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
                        <p className={`text-sm font-black tabular-nums ${pulse.remaining < 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}>
                            {fmt(pulse.remaining)}
                        </p>
                    </div>
                </div>
            </header>

            <div className="bg-white border border-slate-200 p-4 mb-6 rounded-xl flex flex-wrap items-center gap-6 shadow-sm">
                <input 
                    type="text" placeholder="Search sectors..." 
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 min-w-[300px]"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex gap-2">
                    <button onClick={() => setSortBy('ALPHA')} className={`px-4 py-2 rounded-lg text-[9px] font-black ${sortBy === 'ALPHA' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>ALPHA</button>
                    <button onClick={() => setSortBy('BUDGET')} className={`px-4 py-2 rounded-lg text-[9px] font-black ${sortBy === 'BUDGET' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>BUDGET</button>
                </div>
                <button onClick={() => setShowParked(!showParked)} className={`px-6 py-2 rounded-lg text-[10px] font-black transition-all ${showParked ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {showParked ? "VIEW ACTIVE ONLY" : "SHOW PARKED SECTORS"}
                </button>
            </div>

            <main className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-32 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max">
                {filteredDomains.map((d, idx) => {
                    const audit = savedAllocations[d.name];
                    const isBusy = analyzingDomain === d.name;
                    const isActive = audit?.status === 'active';
                    const isOpen = expandedAudit === d.name;
                    
                    return (
                        <div key={idx} className={`bg-white border ${audit ? (isActive ? 'border-indigo-100 shadow-sm' : 'border-slate-200 opacity-60 grayscale shadow-none') : 'border-slate-200 border-dashed'} p-5 flex flex-col hover:border-indigo-400 transition-all relative group`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className={`text-[7px] font-black px-2 py-0.5 rounded uppercase ${audit ? (isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400') : 'bg-slate-50 text-slate-300'}`}>
                                    {audit ? (isActive ? 'Active Fund' : 'Parked') : 'Unallocated'}
                                </span>
                                <div className="flex gap-2">
                                    {audit && <button onClick={() => setExpandedAudit(isOpen ? null : d.name)} className="text-slate-400 hover:text-indigo-600"><i className={`fa-solid ${isOpen ? 'fa-compress' : 'fa-expand'} text-[10px]`}></i></button>}
                                    {audit && <button onClick={() => handleToggleStatus(d.name, audit.status)} className={`text-[8px] font-black uppercase ${isActive ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-400 hover:text-emerald-600'}`}>{isActive ? 'Park Domain' : 'Reactivate'}</button>}
                                </div>
                            </div>

                            <h3 className="text-[13px] font-black uppercase truncate mb-1">{d.name}</h3>
                            <div className={`text-xl font-black tabular-nums ${audit && isActive ? 'text-slate-900' : 'text-slate-300'}`}>{audit ? fmt(audit.budget) : '₹0.00'}</div>

                            {/* RESTORED MANAGER ALLOCATION */}
                            {audit && isActive && (
                                <div className="mt-4 space-y-1 border-t border-slate-50 pt-4">
                                    {audit.manager_splits?.map((m, mi) => (
                                        <div key={mi} className="flex justify-between items-center"><span className="text-[8px] font-bold text-slate-400 uppercase">{m.name.split(' ')[0]}</span><span className="text-[9px] font-black text-slate-600">{fmt(m.allocation || m.monthly_limit)}</span></div>
                                    ))}
                                </div>
                            )}

                            {/* RESTORED FORENSIC EXPAND */}
                            {isOpen && audit && (
                                <div className="mt-4 p-3 bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-top-1">
                                    <label className="text-[8px] font-black text-indigo-500 uppercase block mb-1">Neural Rationale</label>
                                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium italic">"{audit.reasoning}"</p>
                                </div>
                            )}

                            <button onClick={() => handleSovereignAudit(d.name)} disabled={!!analyzingDomain} className={`mt-auto w-full py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${audit && isActive ? 'text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}>
                                {isBusy ? <i className="fa-solid fa-sync fa-spin"></i> : audit ? "Refresh AI Mandate" : "Begin Audit"}
                            </button>
                        </div>
                    );
                })}
            </main>
        </div>
    );
};

export default AllocationEngine;