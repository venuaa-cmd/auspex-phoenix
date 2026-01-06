import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ManagerDetailView from '../engine/ManagerDetailView';

// CRITICAL: export default ensures CoreManifest.js and Vite sync correctly
export default function ManagerManagementView({ 
    fundManagers = [], 
    domains = [], 
    userList = [],
    investments = [], 
    companies = [],
    liquidityEvents = [], 
    refreshData,
    formatCurrency,
    onUpdateUserRole,
    currentUserId,
    userRole, 
    isSuperAdmin 
}) {
    // --- 1. STATE ENGINE (ALL HOOKS AT TOP) ---
    const [selectedManager, setSelectedManager] = useState(null); 
    const [expandedId, setExpandedId] = useState(null); 
    const [isGovernanceOpen, setIsGovernanceOpen] = useState(false); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // Sort & Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name'); 

    // Governance Buffers
    const [tempUserId, setTempUserId] = useState('');
    const [tempRole, setTempRole] = useState('user');
    const [tempErpAccess, setTempErpAccess] = useState(false);

    // Strategist Form Buffers
    const [formId, setFormId] = useState(null);
    const [formName, setFormName] = useState('');
    const [formDesignation, setFormDesignation] = useState('');
    const [formDomains, setFormDomains] = useState([]);
    const [formUserId, setFormUserId] = useState('');
    const [formImageUrl, setFormImageUrl] = useState('');

    const hasPower = userRole === 'admin' || userRole === 'super admin' || isSuperAdmin;
    const unassignedUsers = userList.filter(u => !fundManagers.some(mgr => mgr.user_id === u.id));

    // --- DEFENSIVE PARSING UTILITY ---
    const safeParse = (data) => {
        if (!data) return {};
        if (typeof data === 'object') return data;
        try { return JSON.parse(data); } 
        catch (e) { return {}; }
    };

    // --- 2. SORT & SEARCH RESOLVER ---
    const filteredAndSortedManagers = useMemo(() => {
        let list = fundManagers.map(mgr => {
            const budget = safeParse(mgr.budget);
            const mgrInvestments = investments.filter(i => i.fund_manager_id === mgr.id);
            const spent = mgrInvestments.reduce((s, i) => s + (Number(i.amount_invested) || 0), 0);
            const util = budget.annual > 0 ? (spent / budget.annual) * 100 : 0;
            return { ...mgr, budgetObj: budget, spent, util };
        }).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
        if (sortBy === 'budget') list.sort((a, b) => b.budgetObj.annual - a.budgetObj.annual);
        if (sortBy === 'util') list.sort((a, b) => b.util - a.util);
        return list;
    }, [fundManagers, investments, searchTerm, sortBy]);

    // --- 3. EFFECTS (LOGIC RESOLVERS) ---
    useEffect(() => {
        const selectedUser = userList.find(u => u.id === tempUserId);
        if (selectedUser) {
            setTempRole(selectedUser.role || 'user');
            setTempErpAccess(selectedUser.erpAccess || false);
        }
    }, [tempUserId, userList]);

    useEffect(() => {
        if (!editMode && formUserId) {
            const user = userList.find(u => u.id === formUserId);
            if (user) setFormName(user.fullName || '');
        }
    }, [formUserId, userList, editMode]);

    useEffect(() => {
        if (selectedManager && editMode) {
            setFormId(selectedManager.id); setFormName(selectedManager.name || ''); setFormDesignation(selectedManager.designation || '');
            setFormDomains(selectedManager.domains || []); setFormUserId(selectedManager.user_id || '');
            setFormImageUrl(selectedManager.image_url || selectedManager.imageUrl || '');
        } else if (!editMode) { resetConsole(); }
    }, [selectedManager, editMode]);

    // --- 4. ACTION HANDLERS ---
    const resetConsole = () => { setEditMode(false); setFormId(null); setFormName(''); setFormDesignation(''); setFormDomains([]); setFormUserId(''); setFormImageUrl(''); };
    
    const handleSaveManager = async (e) => {
        e.preventDefault(); setIsSubmitting(true);
        const payload = { name: formName, designation: formDesignation, domains: formDomains, user_id: formUserId || null, image_url: formImageUrl || null, status: 'Active' };
        try {
            if (editMode && formId) { await supabase.from('fund_managers').update(payload).eq('id', formId); }
            else { await supabase.from('fund_managers').insert([{ ...payload, budget: { annual: 0, monthly: 0 } }]); }
            if (refreshData) refreshData(); resetConsole();
        } finally { setIsSubmitting(false); }
    };

    const toggleStatus = async (mgr) => {
        const newStatus = mgr.status === 'Inactive' ? 'Active' : 'Inactive';
        if (!window.confirm(`PROTOCOL: ${newStatus === 'Inactive' ? 'Decommission' : 'Activate'} ${mgr.name}?`)) return;
        try { await supabase.from('fund_managers').update({ status: newStatus }).eq('id', mgr.id); if (refreshData) refreshData(); } catch (err) { alert(err.message); }
    };

    const shortenNumber = (num) => {
        const n = typeof num === 'string' ? parseFloat(num) : num;
        if (!n || isNaN(n)) return "₹0";
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}CR`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
        return `₹${n.toLocaleString('en-IN')}`;
    };

    if (selectedManager && !editMode) {
        return (
            <div className="relative z-[100] bg-[#050505] min-h-screen animate-in fade-in duration-500">
                <ManagerDetailView 
                    managerId={selectedManager.id} 
                    managers={fundManagers} 
                    investments={investments} 
                    companies={companies}
                    liquidityEvents={liquidityEvents}
                    formatCurrency={formatCurrency} 
                    onBack={() => setSelectedManager(null)} 
                />
            </div>
        );
    }

    return (
        <div className="space-y-12 bg-[#050505] font-manrope text-white pb-20">
            
            {/* 1. TOP SECTION: COMMAND CONSOLE & GRID GALLERY */}
            <div className="flex flex-col xl:flex-row gap-8 tracking-widest uppercase">
                {hasPower && (
                    <div className="w-full xl:w-[400px] flex-shrink-0">
                        <div className={`sticky top-6 border p-8 bg-black transition-all duration-500 shadow-2xl ${editMode ? 'border-cyan-500 shadow-cyan-500/10' : 'border-[#FFD700]/20'}`}>
                            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                                <h3 className="text-[11px] font-black text-[#FFD700] tracking-[0.2em]">{editMode ? 'MODIFY_STRATEGIST' : 'INJECT_STRATEGIST'}</h3>
                                <button onClick={resetConsole} className="text-[9px] text-red-500 hover:text-white transition-colors">[ RESET ]</button>
                            </div>
                            <form onSubmit={handleSaveManager} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] text-slate-500 font-black">Linked_Account</label>
                                    {editMode ? (
                                        <input disabled value={formName} className="w-full bg-white/5 border border-white/5 p-4 text-[11px] text-slate-400 opacity-50 font-black" />
                                    ) : (
                                        <select value={formUserId} onChange={e => setFormUserId(e.target.value)} className="w-full bg-black border border-white/10 p-4 text-[11px] outline-none" required>
                                            <option value="">-- FETCH REGISTRY --</option>
                                            {unassignedUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] text-slate-500 font-black">Designation</label>
                                    <input value={formDesignation} onChange={e => setFormDesignation(e.target.value)} className="w-full bg-black border border-white/10 p-4 text-[11px] outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Avatar_Photo_URL</label>
                                    <input type="text" value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-black border border-white/10 p-4 text-[11px] focus:border-[#FFD700] outline-none text-cyan-400 font-mono" />
                                    {formImageUrl && (<div className="mt-2 w-12 h-12 border border-white/10 overflow-hidden"><img src={formImageUrl} className="w-full h-full object-cover grayscale" alt="Preview" /></div>)}
                                </div>
                                <div className="border border-white/5 p-5 bg-black/40">
                                    <label className="block text-[9px] text-[#FFD700] mb-4 font-black uppercase tracking-widest">Sectors_Assigned</label>
                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {domains.filter(d => d.name?.includes('(India)')).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(d => (
                                            <label key={d.id} className="flex items-center gap-4 cursor-pointer p-2 hover:bg-white/5 group">
                                                <div className={`w-4 h-4 border transition-all flex items-center justify-center ${formDomains.includes(d.name) ? 'bg-[#FFD700] border-[#FFD700]' : 'border-white/20 group-hover:border-white/40'}`}>
                                                    {formDomains.includes(d.name) && <i className="fa-solid fa-check text-black text-[10px]"></i>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={formDomains.includes(d.name)} onChange={() => setFormDomains(prev => prev.includes(d.name) ? prev.filter(x => x !== d.name) : [...prev, d.name])} />
                                                <span className="text-[12px] font-medium lowercase text-slate-400 group-hover:text-white">{d.name.replace('(India)', '').trim()}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting || (!formUserId && !editMode)} className={`w-full py-5 font-black text-[11px] tracking-[0.4em] uppercase transition-all ${editMode ? 'bg-cyan-600' : 'bg-[#FFD700] text-black shadow-xl'}`}>
                                    {isSubmitting ? 'SYNCING...' : 'EXECUTE_PROTOCOL'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div className={hasPower ? "flex-1" : "w-full"}>
                    {/* RESTORED: SORT & SEARCH UI */}
                    <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-4 border border-white/5">
                        <div className="flex gap-2">
                            {['name', 'budget', 'util'].map(type => (
                                <button key={type} onClick={() => setSortBy(type)} className={`px-4 py-2 text-[9px] font-black uppercase border transition-all ${sortBy === type ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'text-slate-500 border-white/10 hover:border-white/30'}`}>{type}</button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-64">
                            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-[10px]"></i>
                            <input type="text" placeholder="SEARCH_NODE..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-black border border-white/10 text-[10px] font-black text-white outline-none focus:border-[#FFD700]" />
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 ${hasPower ? '2xl:grid-cols-3' : '2xl:grid-cols-4'} gap-4`}>
                        {filteredAndSortedManagers.map(mgr => {
                            const isExpanded = expandedId === mgr.id;
                            return (
                                <div key={mgr.id} className={`group relative h-fit border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-[#FFD700]/50 bg-white/[0.03] shadow-2xl scale-[1.02]' : 'border-white/5 bg-black/40 hover:border-white/20'}`}>
                                    <div onClick={() => setExpandedId(isExpanded ? null : mgr.id)} className="p-5 flex items-center gap-4 cursor-pointer relative">
                                        <div className="w-14 h-14 bg-black border border-white/10 flex-shrink-0 overflow-hidden">
                                            <img src={mgr.image_url || `https://ui-avatars.com/api/?name=${mgr.name}&background=0D0D0D&color=fff`} className="w-full h-full object-cover grayscale group-hover:grayscale-0" alt="" />
                                        </div>
                                        <div className="min-w-0 pr-8">
                                            <h4 className="text-white font-black text-sm tracking-tight truncate leading-none mb-1">{mgr.name}</h4>
                                            <p className="text-[#FFD700]/60 text-[8px] font-black uppercase tracking-widest truncate">{mgr.designation || 'Strategist'}</p>
                                        </div>
                                    </div>
                                    <div className={`transition-all duration-500 ease-in-out px-5 pb-5 ${isExpanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                        <div className="flex flex-wrap gap-1.5 mb-6">
                                            {(mgr.domains || []).map((d, i) => (
                                                <span key={i} className="text-[10px] border border-white/10 bg-white/[0.05] px-2 py-0.5 text-slate-200 font-bold lowercase">{d.replace('(India)', '').trim()}</span>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-6 uppercase">
                                            <div className="bg-white/5 border border-white/5 p-3">
                                                <p className="text-[7px] text-slate-500 font-black mb-1">Annual_Budget</p>
                                                <p className="text-[11px] font-mono font-bold text-white">{shortenNumber(mgr.budgetObj.annual)}</p>
                                            </div>
                                            <div className="bg-white/5 border border-white/5 p-3">
                                                <p className="text-[7px] text-slate-500 font-black mb-1">Utilization</p>
                                                <p className="text-[11px] font-mono font-bold text-cyan-400">{mgr.util.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-4 border-t border-white/10">
                                            <button onClick={(e) => { e.stopPropagation(); setEditMode(false); setSelectedManager(mgr); }} className="flex-1 h-10 bg-[#FFD700] text-black text-[10px] font-black tracking-widest uppercase hover:brightness-125 transition-all">Dossier</button>
                                            {hasPower && (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditMode(true); setSelectedManager(mgr); }} className="w-10 h-10 bg-[#00FFFF]/10 border border-[#00FFFF]/30 text-[#00FFFF] flex items-center justify-center hover:bg-[#00FFFF] hover:text-black transition-all"><i className="fa-solid fa-sliders text-[10px]"></i></button>
                                                    <button onClick={(e) => { e.stopPropagation(); toggleStatus(mgr); }} className="w-10 h-10 bg-[#FF3131]/10 border border-[#FF3131]/30 text-[#FF3131] flex items-center justify-center hover:bg-[#FF3131] hover:text-white transition-all"><i className="fa-solid fa-skull text-[10px]"></i></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 2. BOTTOM SECTION: IDENTITY_GOVERNANCE_MATRIX */}
            {isSuperAdmin && (
                <div className={`border transition-all duration-300 ${isGovernanceOpen ? 'border-[#FFD700]/30 bg-white/[0.02]' : 'border-white/5 bg-transparent'}`}>
                    <div onClick={() => setIsGovernanceOpen(prev => !prev)} className="p-6 flex justify-between items-center cursor-pointer group hover:bg-white/5">
                        <div className="flex items-center gap-4">
                            <i className={`fa-solid fa-shield-halved text-[14px] ${isGovernanceOpen ? 'text-[#FFD700]' : 'text-slate-600'}`}></i>
                            <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 group-hover:text-white">Identity Governance & Authorization</h3>
                        </div>
                        <i className={`fa-solid fa-chevron-down text-[12px] text-slate-600 transition-transform duration-300 ${isGovernanceOpen ? 'rotate-180 text-[#FFD700]' : ''}`}></i>
                    </div>

                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isGovernanceOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-8 border-t border-white/5 bg-black">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="pb-6 px-4">User Email</th>
                                            <th className="pb-6 px-4">Auth Role</th>
                                            <th className="pb-6 px-4">Linked Profile</th>
                                            <th className="pb-6 px-4 text-center">ERP Access</th>
                                            <th className="pb-6 px-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-[11px]">
                                        {userList.map(user => (
                                            <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="py-5 px-4 font-mono text-slate-400 group-hover:text-white">{user.email}</td>
                                                <td className="py-5 px-4">
                                                    <select 
                                                        defaultValue={user.role} 
                                                        onChange={(e) => onUpdateUserRole(user.id, e.target.value, user.linkedManagerId, user.erpAccess)}
                                                        className="bg-black border border-white/10 px-4 py-2 rounded-sm text-white uppercase text-[9px] font-black focus:border-[#FFD700] outline-none"
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="admin">Admin</option>
                                                        <option value="super admin">Super Admin (ERP)</option>
                                                    </select>
                                                </td>
                                                <td className="py-5 px-4 text-cyan-400 font-black uppercase tracking-tighter">
                                                    {fundManagers.find(m => m.user_id === user.id)?.name || 'UNLINKED'}
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={user.role === 'super admin' || user.erpAccess} 
                                                        className="w-4 h-4 accent-[#FFD700] rounded-sm bg-black border-white/10"
                                                        readOnly
                                                    />
                                                </td>
                                                <td className="py-5 px-4 text-right">
                                                    <button className="text-[#FFD700] font-black uppercase text-[9px] border border-[#FFD700]/20 px-6 py-2 rounded-sm hover:bg-[#FFD700] hover:text-black transition-all">Save Protocol</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}