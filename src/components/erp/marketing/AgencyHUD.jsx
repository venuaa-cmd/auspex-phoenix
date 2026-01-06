import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const AgencyHUD = () => {
    const [managers, setManagers] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [agencyPool, setAgencyPool] = useState({ total: 0, spent: 0 });
    const [loading, setLoading] = useState(true);
    
    // UI MODAL STATES
    const [activeModal, setActiveModal] = useState(null); // 'ALLOCATE', 'DEPLOY', 'SPEND'
    const [selectedNode, setSelectedNode] = useState(null);

    const [formData, setFormData] = useState({
        manager_id: '', campaign_id: '', amount: '', name: '', type: 'Digital', end_date: ''
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const [mRes, pRes, cRes] = await Promise.all([
            supabase.from('erp_employees').select('id, full_name, marketing_credits, role').eq('status', 'ACTIVE'),
            supabase.from('erp_treasury_buckets').select('*').eq('bucket_name', 'AGENCY_POOL').single(),
            supabase.from('erp_agency_campaigns').select('*, erp_employees(full_name)').order('created_at', { ascending: false })
        ]);
        
        if (mRes.data) setManagers(mRes.data);
        if (pRes.data) setAgencyPool({ total: pRes.data.total_allocation, spent: pRes.data.spent_amount });
        if (cRes.data) setCampaigns(cRes.data);
        setLoading(false);
    };

    // --- 1. ALLOCATION LOGIC (SET/EDIT BUDGET) ---
    const handleAllocation = async () => {
        const amount = Number(formData.amount);
        const manager = managers.find(m => m.id === formData.manager_id);
        if (!manager || amount < 0) return alert("Valid strategist and positive value required.");

        // Update Manager Credits (The "Liquid Node Balance")
        const { error } = await supabase.from('erp_employees').update({ marketing_credits: amount }).eq('id', manager.id);
        
        if (!error) {
            alert(`Node Balance Synchronized for ${manager.full_name}`);
            fetchData();
            setActiveModal(null);
        }
    };

    // --- 2. LOG ACTUAL SPEND ---
    const handleLogSpend = async () => {
        const spend = Number(formData.amount);
        const campaign = campaigns.find(c => c.id === formData.campaign_id);
        if (!campaign || spend <= 0) return alert("Select campaign and valid amount.");

        const newSpent = Number(campaign.spent_to_date) + spend;
        if (newSpent > campaign.authorized_budget) return alert("Budget Violation: Spend exceeds authorized campaign cap.");

        // Update Campaign Spent and Global Treasury Spent
        await supabase.from('erp_agency_campaigns').update({ spent_to_date: newSpent }).eq('id', campaign.id);
        await supabase.from('erp_treasury_buckets').update({ spent_amount: Number(agencyPool.spent) + spend }).eq('bucket_name', 'AGENCY_POOL');

        alert("Spend Logged. Sovereign Pool Synchronized.");
        fetchData();
        setActiveModal(null);
    };

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

    // DYNAMIC MATH FOR HEADER
    const totalAllocatedToNodes = managers.reduce((acc, m) => acc + (m.marketing_credits || 0), 0);
    const unallocatedReserve = agencyPool.total - totalAllocatedToNodes;

    return (
        <div className="bg-[#F8FAFC] min-h-screen p-8 animate-in fade-in duration-500">
            
            {/* 1. SOVEREIGN STATUS (Corrected Math) */}
            <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="bg-slate-900 p-8 rounded-sm shadow-2xl border-l-4 border-indigo-500">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Master Agency Pool</span>
                    <span className="text-2xl font-black text-white font-mono">{fmt(agencyPool.total)}</span>
                </div>
                <div className="bg-white p-8 rounded-sm shadow-sm border border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Allocated to Node Balances</span>
                    <span className="text-2xl font-black text-indigo-600 font-mono">{fmt(totalAllocatedToNodes)}</span>
                </div>
                <div className="bg-white p-8 rounded-sm shadow-sm border border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unallocated Reserve</span>
                    <span className={`text-2xl font-black font-mono ${unallocatedReserve < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {fmt(unallocatedReserve)}
                    </span>
                </div>
            </div>

            {/* 2. STRATEGIST SCORECARDS */}
            <div className="mb-12">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Strategist Node Control</h3>
                    <button onClick={() => setActiveModal('ALLOCATE')} className="text-[10px] font-black text-indigo-600 uppercase border-b-2 border-indigo-600 pb-1">Manage Allocations</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {managers.map(m => {
                        const managerCampaigns = campaigns.filter(c => c.manager_id === m.id);
                        const totalSpent = managerCampaigns.reduce((acc, c) => acc + (c.spent_to_date || 0), 0);
                        return (
                            <div key={m.id} className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm group hover:border-indigo-500 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="text-[14px] font-black text-slate-900 uppercase leading-none mb-1">{m.full_name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase">{m.role}</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-colors">
                                        <i className="fa-solid fa-user-shield text-xs"></i>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[11px] font-black">
                                        <span className="text-slate-400 uppercase">Liquid Balance</span>
                                        <span className="text-indigo-600">{fmt(m.marketing_credits)}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] font-black">
                                        <span className="text-slate-400 uppercase">Active Nodes</span>
                                        <span className="text-slate-900">{managerCampaigns.length}</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-50 flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-400">Total Spent</span>
                                        <span className="text-rose-500">{fmt(totalSpent)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. CAMPAIGN LEDGER (The Functional Table) */}
            <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Active Deployment Ledger</span>
                    <button onClick={() => setActiveModal('DEPLOY')} className="px-6 py-2.5 bg-slate-900 text-white text-[9px] font-black uppercase rounded-sm shadow-lg hover:bg-indigo-600 transition-all">
                        + Deploy New Node
                    </button>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-white border-b-2 border-slate-900">
                        <tr>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase">Campaign Node / Strategist</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">Authorized Budget</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">Total Spent</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">Utilization</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {campaigns.map(c => {
                            const util = (c.spent_to_date / c.authorized_budget) * 100;
                            return (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="p-6">
                                        <div className="text-[14px] font-black text-slate-900 uppercase leading-none mb-1.5">{c.campaign_name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase">{c.erp_employees?.full_name} • {c.service_type}</div>
                                    </td>
                                    <td className="p-6 text-right font-mono font-bold text-slate-900">{fmt(c.authorized_budget)}</td>
                                    <td className="p-6 text-right font-mono font-bold text-rose-500">{fmt(c.spent_to_date)}</td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${util > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${util}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-900 tabular-nums">{util.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <button onClick={() => { setFormData({...formData, campaign_id: c.id}); setActiveModal('SPEND'); }} className="text-[9px] font-black text-indigo-600 uppercase border border-indigo-600 px-3 py-1.5 rounded-sm hover:bg-indigo-600 hover:text-white transition-all">Log Spend</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- MODALS SYSTEM --- */}
            {activeModal && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[10000] flex items-center justify-center p-6">
                    <div className="bg-white border border-slate-200 p-12 rounded-sm w-full max-w-xl shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-10 border-b-2 border-slate-900 pb-6">
                            <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tighter">
                                {activeModal === 'ALLOCATE' ? 'Allocation Control' : activeModal === 'SPEND' ? 'Log Forensic Spend' : 'Deploy Campaign Node'}
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-slate-400 text-2xl hover:text-slate-900"><i className="fa-solid fa-xmark"></i></button>
                        </div>

                        <div className="space-y-8">
                            {activeModal === 'ALLOCATE' && (
                                <>
                                    <select className="w-full bg-sky-50 border border-slate-200 p-4 text-xs font-black text-slate-900" onChange={e => setFormData({...formData, manager_id: e.target.value})}>
                                        <option value="">-- Choose Strategist node --</option>
                                        {managers.map(m => <option key={m.id} value={m.id}>{m.full_name.toUpperCase()}</option>)}
                                    </select>
                                    <input type="number" className="w-full bg-sky-50 border border-slate-200 p-4 text-xs font-black" placeholder="New Target Balance (₹)" onChange={e => setFormData({...formData, amount: e.target.value})} />
                                    <button onClick={handleAllocation} className="w-full py-5 bg-slate-900 text-white rounded-sm text-[11px] font-black uppercase shadow-xl hover:bg-indigo-600 transition-all">Synchronize Allocation</button>
                                </>
                            )}

                            {activeModal === 'SPEND' && (
                                <>
                                    <div className="bg-slate-50 p-6 rounded-sm border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Active Campaign ID</span>
                                        <span className="text-sm font-black text-slate-900 uppercase">{campaigns.find(c => c.id === formData.campaign_id)?.campaign_name}</span>
                                    </div>
                                    <input type="number" className="w-full bg-sky-50 border border-slate-200 p-4 text-xs font-black text-rose-600" placeholder="Expenditure Amount (₹)" onChange={e => setFormData({...formData, amount: e.target.value})} />
                                    <button onClick={handleLogSpend} className="w-full py-5 bg-rose-600 text-white rounded-sm text-[11px] font-black uppercase shadow-xl hover:bg-rose-700 transition-all">Log Forensic Expenditure</button>
                                </>
                            )}
                            
                            {/* DEPLOY modal logic similar to above but calls campaign insert... */}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgencyHUD;