import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';

// --- INSTITUTIONAL STYLING (MANROPE ENFORCED) ---
const labelStyle = "text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block font-manrope";
const inputStyle = "w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-[#FFD700] outline-none text-sm font-bold transition-all font-manrope shadow-inner";

// --- COMPONENT: DETAILED INTELLIGENCE MODAL (FIXED CLOSE) ---
const DealDetailModal = ({ deal, onClose }) => {
    if (!deal) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 font-manrope" onClick={onClose}>
            <div className="bg-[#020617] border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 right-0 w-full h-40 bg-gradient-to-b from-[#FFD700]/5 to-transparent pointer-events-none"></div>
                
                {/* VERIFIED CLOSE PROTOCOL */}
                <button onClick={onClose} className="absolute top-6 right-8 z-50 text-slate-500 hover:text-white transition-all bg-black/50 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>

                <div className="relative z-10 p-10 md:p-14">
                    <div className="flex items-center gap-6 mb-10">
                        <div className="w-16 h-16 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center border border-[#FFD700]/20 shadow-xl">
                            <i className="fa-solid fa-rocket text-2xl text-[#FFD700]"></i>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">{deal.startupName}</h2>
                            <span className="text-[10px] bg-[#FFD700]/10 border border-[#FFD700]/20 px-3 py-1 rounded-lg text-[#FFD700] font-black uppercase tracking-widest">{deal.domain}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10 py-8 border-t border-b border-white/5">
                        <div>
                            <label className={labelStyle}>Capital Infusion</label>
                            <div className="text-white font-black text-2xl tracking-tighter">{deal.fundingAmount}</div>
                        </div>
                        <div>
                            <label className={labelStyle}>Strategic Round</label>
                            <div className="text-[#FFD700] font-black text-2xl tracking-tighter uppercase">{deal.fundingRound}</div>
                        </div>
                    </div>

                    <div className="mt-10">
                        <label className={labelStyle}>Syndicate / Investors</label>
                        <div className="flex flex-wrap gap-2.5 mt-4">
                            {deal.investmentCompanies?.map((inv, i) => (
                                <span key={i} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-300 uppercase tracking-wide">{inv}</span>
                            )) || <span className="text-slate-600 italic">Oracle Link Interrupted: No syndicate data found.</span>}
                        </div>
                    </div>

                    <div className="mt-12 pt-6 border-t border-white/5 flex justify-between items-center opacity-30">
                        <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Record Timestamp: {deal.dealDate}</div>
                        <i className="fa-solid fa-shield-halved text-white text-sm"></i>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: ADD/EDIT MODAL (SCROLLABLE FIX) ---
const DealManagementModal = ({ deal, onClose, onSave }) => {
    const isEdit = !!deal;
    const [form, setForm] = useState({
        startupName: isEdit ? deal.startupName : '',
        domain: isEdit ? deal.domain : '',
        fundingAmount: isEdit ? deal.fundingAmount : '',
        fundingRound: isEdit ? deal.fundingRound : 'Seed',
        investors: isEdit ? (deal.investmentCompanies?.join(', ') || '') : '',
        date: isEdit ? deal.dealDate : new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(isEdit ? deal.id : null, {
            ...form,
            investmentCompanies: form.investors.split(',').map(s => s.trim()).filter(Boolean)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 font-manrope" onClick={onClose}>
            {/* FIX: Added max-h and scroll context to Edit Pop-up */}
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-10 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{isEdit ? 'Refine Record' : 'Log New Deal'}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-all"><i className="fa-solid fa-xmark text-xl"></i></button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-10 pt-6 space-y-6">
                    <div><label className={labelStyle}>Startup Identity</label><input className={inputStyle} value={form.startupName} onChange={e => setForm({...form, startupName: e.target.value})} required /></div>
                    <div><label className={labelStyle}>Market Sector</label><input className={inputStyle} value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-6">
                        <div><label className={labelStyle}>Amount</label><input className={inputStyle} value={form.fundingAmount} onChange={e => setForm({...form, fundingAmount: e.target.value})} required /></div>
                        <div>
                            <label className={labelStyle}>Round</label>
                            <select className={inputStyle} value={form.fundingRound} onChange={e => setForm({...form, fundingRound: e.target.value})}>
                                {["Pre-seed", "Seed", "Pre-A", "Series A", "Series B", "Series C", "Series D", "Other"].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div><label className={labelStyle}>Execution Date</label><input type="date" className={`${inputStyle} [color-scheme:dark]`} value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                    <div><label className={labelStyle}>Syndicate (Comma Separated)</label><textarea className={inputStyle} value={form.investors} onChange={e => setForm({...form, investors: e.target.value})} rows="3" /></div>
                </form>

                <div className="p-10 pt-0 flex gap-4">
                    <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-all">Cancel</button>
                    <button type="submit" onClick={handleSubmit} className="flex-[2] py-4 bg-[#FFD700] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 transition-all shadow-2xl">Execute Record</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN WIDGET ---
const DealFlowWidget = ({ userRole }) => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState({ field: 'dealDate', dir: 'desc' });
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [manageModal, setManageModal] = useState({ open: false, data: null });

    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    useEffect(() => {
        const unsub = db.collection('market_deals').onSnapshot(snap => {
            setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSort = (field) => setSort({ field, dir: sort.field === field && sort.dir === 'asc' ? 'desc' : 'asc' });

    const handleSave = async (id, data) => {
        try {
            const payload = {
                startupName: data.startupName, domain: data.domain, fundingAmount: data.fundingAmount,
                fundingRound: data.fundingRound, investmentCompanies: data.investmentCompanies,
                dealDate: data.date, lastUpdated: new Date().toISOString()
            };
            if (id) await db.collection('market_deals').doc(id).update(payload);
            else await db.collection('market_deals').add({ ...payload, createdAt: new Date().toISOString() });
        } catch (e) { alert(e.message); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("⚠️ PURGE PROTOCOL: Permanently delete this record?")) {
            await db.collection('market_deals').doc(id).delete();
        }
    };

    const filteredAndSortedDeals = useMemo(() => {
        return deals
            .filter(d => d.startupName?.toLowerCase().includes(filter.toLowerCase()) || d.domain?.toLowerCase().includes(filter.toLowerCase()))
            .sort((a, b) => {
                const valA = a[sort.field] || '';
                const valB = b[sort.field] || '';
                return sort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
    }, [deals, filter, sort]);

    if (loading) return <div className="text-center py-40 text-[#FFD700] font-black uppercase animate-pulse font-manrope">Syncing Deal Oracle...</div>;

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease] font-manrope pb-20">
            {/* HEADER */}
            <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-8 flex flex-wrap gap-8 items-center justify-between shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#FFD700]/5 to-transparent pointer-events-none"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Deal Flow</h2>
                    <p className="text-[9px] text-[#FFD700] font-black uppercase tracking-[0.4em] mt-3 opacity-60">Verified External Market Intelligence</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setManageModal({ open: true, data: null })} className="bg-[#FFD700] text-black px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl">+ Log New Deal</button>
                )}
            </div>

            {/* REFINED SEARCH TERMINAL */}
            <div className="relative group">
                <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 text-sm"></i>
                <input type="text" placeholder="Search by identity or domain footprint..." value={filter} onChange={e => setFilter(e.target.value)} className="w-full bg-[#0f172a]/60 border border-white/10 rounded-[1.5rem] py-4 pl-14 pr-8 text-white text-base font-bold focus:border-[#FFD700] outline-none transition-all placeholder:text-slate-800 shadow-xl" />
            </div>

            {/* SORTABLE TABLE VIEW */}
            <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                    <thead className="bg-black/40 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] border-b border-white/5">
                        <tr>
                            <th className="p-6 cursor-pointer hover:text-[#FFD700]" onClick={() => handleSort('dealDate')}>Date <i className="fa-solid fa-sort ml-1 opacity-20"></i></th>
                            <th className="p-6 cursor-pointer hover:text-[#FFD700]" onClick={() => handleSort('startupName')}>Startup <i className="fa-solid fa-sort ml-1 opacity-20"></i></th>
                            <th className="p-6">Round / Amount</th>
                            <th className="p-6">Syndicate</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredAndSortedDeals.map(deal => (
                            <tr key={deal.id} onClick={() => setSelectedDeal(deal)} className="group hover:bg-white/[0.02] transition-all cursor-pointer">
                                <td className="p-6 text-[11px] font-bold text-slate-500">{deal.dealDate}</td>
                                <td className="p-6">
                                    <div className="text-white font-black text-base uppercase tracking-tighter group-hover:text-[#FFD700] transition-colors">{deal.startupName}</div>
                                    <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">{deal.domain}</span>
                                </td>
                                <td className="p-6">
                                    <div className="text-white font-black text-base tracking-tighter">{deal.fundingAmount}</div>
                                    <div className="text-[#FFD700] text-[8px] font-black uppercase tracking-widest">{deal.fundingRound}</div>
                                </td>
                                <td className="p-6 text-[10px] text-slate-500 font-medium uppercase leading-relaxed max-w-[250px] truncate">
                                    {deal.investmentCompanies?.join(' • ') || '-'}
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={(e) => { e.stopPropagation(); setManageModal({ open: true, data: deal }); }} className="w-8 h-8 bg-white/5 text-slate-500 rounded-lg flex items-center justify-center hover:bg-[#FFD700] hover:text-black border border-white/10 transition-all"><i className="fa-solid fa-pen text-[10px]"></i></button>
                                        {isAdmin && <button onClick={(e) => handleDelete(e, deal.id)} className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white border border-red-500/20 transition-all"><i className="fa-solid fa-trash-can text-[10px]"></i></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODALS */}
            {selectedDeal && <DealDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}
            {manageModal.open && <DealManagementModal deal={manageModal.data} onClose={() => setManageModal({ open: false, data: null })} onSave={handleSave} />}
        </div>
    );
};

export default DealFlowWidget;