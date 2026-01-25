import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { db } from '../../lib/firebase'; 
import { fetchQuarterlyTacticalStrategy } from '../../lib/aiService';
import { runGovernorAudit } from './ManagerGovernorLogic'; 
import { ManagerUtilizationBar } from './GovernorVisuals'; 
import ManagerDetailView from '../engine/ManagerDetailView'; 

/**
 * DOMAIN BUDGET MANAGEMENT: THE SOVEREIGN COMMAND CENTER
 * RESTORED: Master Treasury HUD + Dual Archive + Forensic Audit Grid + Personnel Roster
 * INTEGRATED: Stage 2 Final Authorization (6-Step Automated Commitment)
 */
const DomainBudgetManagement = ({ domains = [], toWords, formatCurrency, isSuperAdmin }) => {
    // --- 1. CORE DATA STATE (Full Restoration) ---
    const [ledgerBalance, setLedgerBalance] = useState(0); 
    const [fundManagers, setFundManagers] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [companies, setCompanies] = useState([]); 
    const [isUpdating, setIsUpdating] = useState(false);
    const [moraiAlerts, setMoraiAlerts] = useState([]);
    
    // --- 2. PERSISTENCE & PREVIEW STATE (Full Restoration) ---
    const [previewData, setPreviewData] = useState(null);
    const [previousAllocations, setPreviousAllocations] = useState({}); 
    const [marketAnalysis, setMarketAnalysis] = useState("SYNCING_INTELLIGENCE...");
    const [deploymentAnalysis, setDeploymentAnalysis] = useState("SYNCING_RATIONALE...");
    const [lastSyncTime, setLastSyncTime] = useState(null);

    // --- 3. GOVERNOR & PERSONNEL STATE (Full Restoration) ---
    const [managerWallets, setManagerWallets] = useState([]);
    const [selectedManagerId, setSelectedManagerId] = useState(null);
    const [governorResults, setGovernorResults] = useState([]);

    // --- 4. CAPITAL INJECTION STATE (Full Restoration) ---
    const [showInflowModal, setShowInflowModal] = useState(false);
    const [inflowAmount, setInflowAmount] = useState("");
    const [inflowDesc, setInflowDesc] = useState("Direct Capital Injection");

    // --- 4.5 SEARCH & SORT STATES (Full Restoration) ---
    const [sortType, setSortType] = useState('budget'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [domainSearch, setDomainSearch] = useState('');
    const [domainSort, setDomainSort] = useState('name'); 

    // --- DEFENSIVE PARSING PROTOCOL (Full Restoration) ---
    const safeParse = (data) => {
        if (!data) return {};
        if (typeof data === 'object') return data;
        if (data === '[object Object]') return {};
        try { return JSON.parse(data); } 
        catch (e) { return {}; }
    };

    // --- 5. TACTICAL DATA SYNC (Restored Ledger & Domain Logic) ---
    const fetchSystemData = async () => {
        try {
            // A. Fetch Intelligence Archives
            const { data: auditData } = await supabase.from('erp_strategic_audits').select('*').order('audit_date', { ascending: false }).limit(1).single();
            if (auditData) {
                setMarketAnalysis(auditData.market_intelligence);
                setDeploymentAnalysis(auditData.deployment_rationale);
            }

            // B. Check Funds: Ledger Math (Credits - Debits)
            const { data: credits } = await supabase.from('fund_ledger').select('amount').eq('type', 'CREDIT');
            const { data: debits } = await supabase.from('fund_ledger').select('amount').eq('type', 'DEBIT');
            const balance = (credits?.reduce((a, b) => a + Number(b.amount), 0) || 0) - 
                            (debits?.reduce((a, b) => a + Number(b.amount), 0) || 0);
            setLedgerBalance(balance);

            // C. Previous Allocations for Delta Calculation
            const { data: currentDomains } = await supabase.from('domains').select('name, allocated_budget');
            if (currentDomains) {
                setPreviousAllocations(currentDomains.reduce((acc, d) => ({...acc, [d.name]: d.allocated_budget || 0}), {}));
            }

            // D. Personnel Roster & Exposure Maps
            const { data: walletData } = await supabase.from('manager_domain_allocations').select('*');
            if (walletData) setManagerWallets(walletData);

            const { data: mData } = await supabase.from('fund_managers').select('*');
            const { data: iData } = await supabase.from('investments').select('*');
            const { data: cData } = await supabase.from('companies').select('*');
            
            if (mData) setFundManagers(mData);
            if (iData) setInvestments(iData);
            if (cData) setCompanies(cData);

            setLastSyncTime(new Date().toLocaleString());
        } catch (error) { console.error("DATA_SYNC_ERROR:", error); }
    };

    useEffect(() => { fetchSystemData(); }, []);

    // --- 6. CALCULATE % CHANGE HELPER ---
    const calculateChange = (newAmount, domainName) => {
        const oldAmount = previousAllocations[domainName] || 0;
        if (oldAmount === 0) return 0;
        return (((newAmount - oldAmount) / oldAmount) * 100).toFixed(1);
    };

    // --- 7. STRATEGIC FILTERING & AGGREGATORS ---
    const baseStrategicDomains = useMemo(() => domains.filter(d => d.name?.includes('(India)')), [domains]);
    const totalAllocated = useMemo(() => baseStrategicDomains.reduce((sum, d) => sum + (d.allocated_budget || 0), 0), [baseStrategicDomains]);

    const domainAudit = useMemo(() => {
        return baseStrategicDomains.map(d => {
            const sectorInvestments = investments.filter(inv => {
                const company = companies.find(c => c.id === inv.company_id);
                const industry = company?.industry || "";
                return industry === d.name || industry === d.name.replace('(India)', '').trim();
            });
            const totalSpent = sectorInvestments.reduce((sum, i) => sum + (Number(i.amount_invested) || 0), 0);
            const allocated = Number(d.allocated_budget) || 0;
            const utilization = allocated > 0 ? (totalSpent / allocated) * 100 : 0;
            return { id: d.id, name: d.name.replace('(India)', '').trim(), allocated, totalSpent, utilization: utilization > 100 ? 100 : utilization, rawUtil: utilization };
        });
    }, [baseStrategicDomains, investments, companies]);

    const filteredAndSortedDomains = useMemo(() => {
        let list = domainAudit.filter(d => d.name.toLowerCase().includes(domainSearch.toLowerCase()));
        if (domainSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
        if (domainSort === 'allocated') list.sort((a, b) => b.allocated - a.allocated);
        if (domainSort === 'spent') list.sort((a, b) => b.totalSpent - a.totalSpent);
        return list;
    }, [domainAudit, domainSearch, domainSort]);

    const filteredManagers = useMemo(() => {
        let list = fundManagers.map(mgr => {
            const budget = safeParse(mgr.budget);
            const mgrInvestments = investments.filter(i => i.fund_manager_id === mgr.id);
            const spent = mgrInvestments.reduce((s, i) => s + (Number(i.amount_invested) || 0), 0);
            const util = budget.annual > 0 ? (spent / budget.annual) * 100 : 0;
            return { ...mgr, budgetObj: budget, spent, util };
        }).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (sortType === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
        if (sortType === 'budget') list.sort((a, b) => (b.budgetObj?.annual || 0) - (a.budgetObj?.annual || 0));
        if (sortType === 'utilization') list.sort((a, b) => b.util - a.util);
        return list;
    }, [fundManagers, investments, searchTerm, sortType]);

    // --- 8. TREASURY INFLOW PROTOCOL ---
    const handleInjectCapital = async (e) => {
        e.preventDefault();
        const amt = Number(inflowAmount);
        if (!amt || amt <= 0) return;
        setIsUpdating(true);
        try {
            await supabase.from('fund_ledger').insert([{ amount: amt, type: 'CREDIT', description: inflowDesc, reference: 'ERP_MANUAL_INJECTION' }]);
            setShowInflowModal(false); setInflowAmount(""); await fetchSystemData();
        } catch (err) { alert("Ledger Breach: " + err.message); }
        setIsUpdating(false);
    };

    // --- 9. STAGE 1: INITIATE TACTICAL AUDIT ---
    const handleInitiateAnalysis = async () => {
        setIsUpdating(true);
        try {
            // Steps 1, 2, 3 & 5: AI Market Analysis + Expertise Check
            const strategy = await fetchQuarterlyTacticalStrategy(ledgerBalance, baseStrategicDomains, fundManagers, investments);
            if (!strategy) throw new Error("AI Controller Offline.");
            
            // Governor Audit check against current wallets
            setGovernorResults(runGovernorAudit(strategy.allocations, fundManagers, managerWallets));
            
            setPreviewData(strategy); 
            setMarketAnalysis(strategy.market_intel); 
            setDeploymentAnalysis(strategy.deployment_rationale);
        } catch (err) { alert("Analysis Failed: " + err.message); }
        finally { setIsUpdating(false); }
    };

    // --- 10. STAGE 2: FINAL SOVEREIGN AUTHORIZATION (The Full Commit) ---
    const handleFinalCommit = async () => {
        if (!previewData) return;
        setIsUpdating(true);
        try {
            // Step 4: Total Deployment Debit from Ledger
            const totalDeployment = previewData.allocations.reduce((sum, a) => sum + a.budget, 0);
            await supabase.from('fund_ledger').insert([{ 
                amount: totalDeployment, 
                type: 'DEBIT', 
                description: `Tactical Deployment: ${new Date().toLocaleDateString()}`, 
                reference: 'AI_REBALANCE_PROTOCOL' 
            }]);

            // Step 4 & 6: Update Domains and Managers
            for (const alloc of previewData.allocations) {
                // Update Domain Budget
                await supabase.from('domains').update({ allocated_budget: alloc.budget }).eq('name', alloc.domain);
                
                // Update Manager Assignments
                for (const mAlloc of (alloc.manager_assignments || [])) {
                    const manager = fundManagers.find(m => m.id === mAlloc.id);
                    if (manager) {
                        const existingBudget = safeParse(manager.budget);
                        // Update Master Manager Table
                        await supabase.from('fund_managers').update({ 
                            budget: { ...existingBudget, annual: (existingBudget.annual || 0) + mAlloc.amount } 
                        }).eq('id', manager.id);
                        
                        // Update Domain-Specific Manager Allocation
                        const curW = managerWallets.find(w => w.manager_id === manager.id && w.domain_name === alloc.domain);
                        await supabase.from('manager_domain_allocations').upsert({ 
                            manager_id: manager.id, 
                            domain_name: alloc.domain, 
                            allocated_amount: (curW?.allocated_amount || 0) + mAlloc.amount, 
                            last_updated: new Date() 
                        });
                    }
                }
            }

            // Archive the Intelligence
            await supabase.from('erp_strategic_audits').insert([{ 
                market_intelligence: previewData.market_intel, 
                deployment_rationale: previewData.deployment_rationale 
            }]);

            alert("TREASURY_DEPLOYED: Ledger updated & Audits Archived.");
            setPreviewData(null); 
            await fetchSystemData(); 
        } catch (err) { alert("Commit Failed: " + err.message); }
        finally { setIsUpdating(false); }
    };

    const shorten = (num) => {
        if (!num) return "₹0";
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}CR`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        return `₹${num.toLocaleString('en-IN')}`;
    };

    // --- CONDITIONAL VIEW: MANAGER AUDIT ---
    if (selectedManagerId) return <ManagerDetailView managerId={selectedManagerId} onBack={() => setSelectedManagerId(null)} managers={fundManagers} investments={investments} companies={companies} formatCurrency={formatCurrency} />;

    return (
        <div className="space-y-10 font-manrope text-white pb-40 relative">
            {/* 1. MASTER TREASURY HUD */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2 bg-black border border-white/5 p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-2xl">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-[10px] font-black text-[#FFD700] tracking-[0.4em] uppercase">Total_Treasury_Reserve</h2>
                            {isSuperAdmin && (
                                <button onClick={() => setShowInflowModal(true)} className="text-[8px] bg-[#FFD700]/10 hover:bg-[#FFD700] hover:text-black px-3 py-1 rounded-md transition-all font-black uppercase tracking-widest border border-[#FFD700]/20">+ Inject_Capital</button>
                            )}
                        </div>
                        <div className="text-4xl font-black tracking-tighter text-white font-mono">{formatCurrency(ledgerBalance)}</div>
                        <p className="text-[8px] font-mono text-slate-600 mt-4 uppercase italic">{toWords(ledgerBalance)}</p>
                    </div>
                </div>
                <div className="bg-white/[0.02] border border-white/10 p-8 rounded-2xl text-center">
                    <p className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase mb-2">Common_Asset_Pool (20%)</p>
                    <div className="text-2xl font-black text-white font-mono">{formatCurrency(ledgerBalance * 0.20)}</div>
                </div>
                <div className="bg-[#FFD700]/5 border border-[#FFD700]/20 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] font-black text-[#FFD700] tracking-[0.3em] uppercase mb-2">Strategic_Weighting</p>
                    <div className="text-3xl font-black text-white font-mono">{ledgerBalance > 0 ? ((totalAllocated / ledgerBalance) * 100).toFixed(1) : 0}%</div>
                </div>
            </div>

            {/* 2. DUAL ANALYSIS ARCHIVE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-black border border-cyan-500/20 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-cyan-500/5 px-6 py-3 border-b border-cyan-500/20 flex items-center gap-3"><i className="fa-solid fa-chart-line text-cyan-400 text-xs"></i><h3 className="text-[9px] font-black text-cyan-400 tracking-[0.4em] uppercase">Market_Intelligence_Audit</h3></div>
                    <div className="p-8 text-[11px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap h-64 overflow-y-auto custom-scrollbar">{marketAnalysis}</div>
                </div>
                <div className="bg-black border border-[#FFD700]/20 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-[#FFD700]/5 px-6 py-3 border-b border-[#FFD700]/20 flex items-center gap-3"><i className="fa-solid fa-shield-halved text-[#FFD700] text-xs"></i><h3 className="text-[9px] font-black text-[#FFD700] tracking-[0.4em] uppercase">Tactical_Deployment_Rationale</h3></div>
                    <div className="p-8 text-[11px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap h-64 overflow-y-auto custom-scrollbar">{deploymentAnalysis}</div>
                </div>
            </div>

            {/* 3. NEURAL_DOMAIN_UTILIZATION_AUDIT (With Search/Sort) */}
            <div className="bg-black/60 border border-white/5 p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                    <div>
                        <h3 className="text-[11px] font-black text-[#FFD700] uppercase tracking-[0.5em] mb-2">Forensic_Audit</h3>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Neural_Domain_Utilization_Audit</h2>
                    </div>
                </div>

                <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.03] p-6 border border-cyan-500/10 rounded-xl shadow-xl">
                    <div className="flex gap-3">
                        {['name', 'allocated', 'spent'].map(type => (
                            <button key={type} onClick={() => setDomainSort(type)} className={`px-6 py-2 text-[10px] font-black uppercase border transition-all ${domainSort === type ? 'bg-cyan-600 text-white border-cyan-500' : 'text-slate-500 border-white/10 hover:border-cyan-500/30'}`}>
                                {type.replace('allocated', 'Allocated Budget').replace('spent', 'Consumed Budget')}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-80">
                        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 text-[10px]"></i>
                        <input type="text" placeholder="SEARCH_DOMAIN_NODE..." value={domainSearch} onChange={e => setDomainSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-black border border-cyan-500/30 text-[10px] font-black text-white outline-none focus:border-cyan-400 transition-all" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                    {filteredAndSortedDomains.map(d => {
                        const previewAlloc = previewData?.allocations?.find(a => a.domain === (d.name + ' (India)'));
                        const change = previewAlloc ? calculateChange(previewAlloc.budget, (d.name + ' (India)')) : 0;

                        return (
                            <div key={d.id} className="space-y-4 group">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] group-hover:text-cyan-400 transition-colors">{d.name}</p>
                                        <div className="flex gap-4 mt-1.5">
                                            <div className="space-y-0.5"><p className="text-[7px] font-black text-slate-500 uppercase">Allocated_Limit</p><p className="text-[10px] font-mono font-bold text-slate-300">{shorten(d.allocated)}</p></div>
                                            <div className="space-y-0.5"><p className="text-[7px] font-black text-slate-500 uppercase">Actual_Spent</p><p className="text-[10px] font-mono font-bold text-emerald-400">{shorten(d.totalSpent)}</p></div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {previewAlloc && <span className={`text-[8px] font-black px-2 py-0.5 rounded mr-2 ${change >= 0 ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>{change}% DELTA</span>}
                                        <span className={`text-[12px] font-black font-mono ${d.rawUtil > 90 ? 'text-rose-400' : 'text-cyan-400'}`}>{d.rawUtil.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px] ${d.rawUtil > 90 ? 'bg-rose-500 shadow-rose-500/50' : 'bg-cyan-500 shadow-cyan-500/50'}`} style={{ width: `${d.utilization}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. PERSONNEL_AUDIT_ROSTER (With Restored Filters & Utilization) */}
            <div className="mt-20 border-t border-white/5 pt-10">
                <div className="flex justify-between items-end mb-8">
                    <h3 className="text-[11px] font-black text-[#FFD700] uppercase tracking-[0.5em]">Active_Personnel_Audit_Roster</h3>
                </div>

                <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.03] p-6 border border-white/5 rounded-xl shadow-xl">
                    <div className="flex gap-3">
                        {['name', 'budget', 'utilization'].map(type => (
                            <button key={type} onClick={() => setSortType(type)} className={`px-6 py-2 text-[10px] font-black uppercase border transition-all ${sortType === type ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'text-slate-500 border-white/10 hover:border-white/30'}`}>
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-80">
                        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]"></i>
                        <input type="text" placeholder="SEARCH_BY_MANAGER_NAME..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-black border border-white/10 text-[10px] font-black text-white outline-none focus:border-[#FFD700] transition-all" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredManagers.map(manager => (
                        <div key={manager.id} className="bg-black/40 border border-white/5 p-6 rounded-xl hover:border-cyan-500/50 transition-all text-left group">
                            <div className="flex items-center gap-4 mb-6">
                                <img src={manager.image_url} className="w-12 h-12 object-cover grayscale border border-white/10" alt="" />
                                <div><span className="text-[10px] font-black text-white uppercase tracking-widest leading-none block mb-1">{manager.name}</span><p className="text-[8px] text-[#FFD700] uppercase font-black">{manager.designation}</p></div>
                            </div>
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-[9px] font-black"><span className="text-slate-500 uppercase">Alloc_Budget</span><span className="text-white">{shorten(manager.budgetObj.annual)}</span></div>
                                <div className="flex justify-between text-[9px] font-black"><span className="text-slate-500 uppercase">Actual_Spent</span><span className="text-emerald-400">{shorten(manager.spent)}</span></div>
                                <div className="flex justify-between text-[9px] font-black"><span className="text-slate-500 uppercase">Utilization</span><span className="text-cyan-400">{manager.util.toFixed(1)}%</span></div>
                            </div>
                            <ManagerUtilizationBar manager={manager} investments={investments} />
                            <button onClick={() => setSelectedManagerId(manager.id)} className="w-full mt-4 py-2 bg-white/5 border border-white/10 text-[9px] font-black uppercase hover:bg-cyan-600 hover:text-white transition-all">OPEN_AUDIT →</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* COMMAND BUTTONS & MODALS */}
            {isSuperAdmin && !previewData && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
                    <button onClick={handleInitiateAnalysis} disabled={isUpdating} className="px-20 py-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-black uppercase tracking-[0.5em] shadow-[0_0_50px_rgba(6,182,212,0.4)] flex items-center gap-4 transition-all">
                        <i className={`fa-solid ${isUpdating ? 'fa-sync fa-spin' : 'fa-brain'}`}></i>
                        {isUpdating ? 'CONDUCTING_TACTICAL_AUDIT...' : 'INITIATE_QUARTERLY_AUDIT'}
                    </button>
                </div>
            )}

            {previewData && (
                <div className="fixed bottom-0 left-0 w-full bg-[#FFD700] p-6 flex items-center justify-between z-[60] animate-slide-up">
                    <div className="flex items-center gap-8">
                        <div className="bg-black text-[#FFD700] p-4 rounded-xl">
                            <div className="text-[9px] font-black uppercase tracking-tighter">VEDA INTELLIGENCE</div>
                            <div className="text-sm font-bold truncate max-w-md">{marketAnalysis}</div>
                        </div>
                        <div className="text-black hidden md:block">
                            <div className="text-[9px] font-black uppercase tracking-tighter opacity-60">Governor Status</div>
                            <div className="text-lg font-black">{governorResults?.length || 0} Breaches Detected</div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setPreviewData(null)} className="px-8 py-4 text-black font-black uppercase text-[10px] tracking-widest border-2 border-black/20 rounded-xl">Discard</button>
                        <button onClick={handleFinalCommit} disabled={isUpdating} className="px-12 py-4 bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-2xl hover:bg-slate-900 transition-all">
                            {isUpdating ? 'COMMITTING...' : 'Authorize Sovereign Deployment'}
                        </button>
                    </div>
                </div>
            )}

            {/* INFLOW MODAL */}
            {showInflowModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
                    <div className="bg-[#0f172a] border border-[#FFD700]/30 w-full max-w-md p-10 rounded-[3rem] shadow-2xl">
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8 italic">Inject_Sovereign_Capital</h2>
                        <form onSubmit={handleInjectCapital} className="space-y-6">
                            <div><label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-2">Inflow Amount (INR)</label><input type="number" value={inflowAmount} onChange={(e) => setInflowAmount(e.target.value)} className="w-full bg-black/40 border-b border-[#FFD700]/30 p-4 text-white text-2xl font-mono focus:outline-none focus:border-[#FFD700]" placeholder="500000000" required /></div>
                            <div><label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-2">Reference Description</label><input value={inflowDesc} onChange={(e) => setInflowDesc(e.target.value)} className="w-full bg-black/40 border-b border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#FFD700]" required /></div>
                            <div className="flex gap-4 pt-6"><button type="submit" disabled={isUpdating} className="flex-1 py-4 bg-[#FFD700] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg">Authorize Inflow</button><button type="button" onClick={() => setShowInflowModal(false)} className="px-6 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Cancel</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DomainBudgetManagement;