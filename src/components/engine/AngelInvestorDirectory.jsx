import React, { useState, useMemo, useEffect } from 'react';
import { runAIAnalysis, generateInvestorThesis } from '../../lib/aiService';
import { db, auth } from '../../lib/firebase';

// --- REFINED INSTITUTIONAL STYLING ---
const glossyCardStyle = "bg-[#0f172a] border border-white/10 rounded-[2rem] p-6 hover:border-[#FFD700]/30 transition-all group relative shadow-2xl overflow-hidden cursor-pointer font-manrope";
const inputStyle = "w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-[#FFD700] outline-none text-sm font-bold transition-all font-manrope";
const labelStyle = "block text-[9px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-[0.2em] font-manrope";

// --- COMPONENT: FULL PROFILE MODAL (SCROLLABLE FIX) ---
const ProfileIntelligenceModal = ({ investor, onClose }) => {
    if (!investor) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 font-manrope" onClick={onClose}>
            {/* FIX: Added max-h and overflow-y-auto for scrolling */}
            <div className="bg-[#020617] border border-white/10 w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* FIX: Functional Close Button */}
                <button onClick={onClose} className="absolute top-6 right-8 z-50 text-slate-500 hover:text-white transition-all bg-black/50 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>

                <div className="overflow-y-auto custom-scrollbar p-10 md:p-14">
                    <div className="flex flex-col md:flex-row gap-12 items-start relative">
                        {/* Identity Core */}
                        <div className="w-full md:w-1/3 text-center">
                            <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-2 border-[#FFD700]/20 mx-auto shadow-2xl mb-6 bg-black">
                                <img src={investor.picURL || `https://ui-avatars.com/api/?name=${investor.name}&background=020617&color=FFD700&size=200`} className="w-full h-full object-cover" alt="" />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{investor.name}</h2>
                            <div className="px-4 py-1.5 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl text-[9px] text-[#FFD700] font-black uppercase tracking-widest inline-block">{investor.networth || 'Sovereign Capital'}</div>
                        </div>

                        {/* Intelligence Briefing */}
                        <div className="flex-1 space-y-10">
                            <div>
                                <label className={labelStyle}>Strategic Profile</label>
                                <p className="text-lg text-slate-300 font-bold leading-relaxed">{investor.profile}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-8">
                                <div>
                                    <label className={labelStyle}>Focus Domains</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(Array.isArray(investor.domains) ? investor.domains : (investor.domains || '').split(',')).map((d, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 uppercase">{d.trim()}</span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelStyle}>Portfolio Size</label>
                                    <div className="text-white font-black text-xl tracking-tighter">{investor.numInvestments || '10+'} Notable Bets</div>
                                </div>
                            </div>

                            <div>
                                <label className={labelStyle}>Active Deployments</label>
                                {/* FIX: Smaller, less dense company listing */}
                                <p className="text-[11px] text-[#FFD700]/70 font-medium tracking-[0.15em] uppercase leading-relaxed">
                                    {(Array.isArray(investor.companies) ? investor.companies : [investor.companies]).join(' • ')}
                                </p>
                            </div>
                            
                            {investor.linkedinURL && (
                                <a href={investor.linkedinURL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
                                    <i className="fa-brands fa-linkedin text-lg"></i> View Terminal Profile
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: INVESTOR MANAGEMENT MODAL ---
const InvestorManagementModal = ({ investor, onClose, onSave }) => {
    const isEdit = !!investor;
    const [name, setName] = useState(isEdit ? investor.name : '');
    const [profile, setProfile] = useState(isEdit ? investor.profile : '');
    const [networth, setNetworth] = useState(isEdit ? investor.networth : '');
    const [linkedinURL, setLinkedinURL] = useState(isEdit ? investor.linkedinURL : '');
    const [picURL, setPicURL] = useState(isEdit ? investor.picURL : '');
    const [domains, setDomains] = useState(isEdit ? (Array.isArray(investor.domains) ? investor.domains.join(', ') : investor.domains) : '');
    const [companies, setCompanies] = useState(isEdit ? (Array.isArray(investor.companies) ? investor.companies.join(', ') : investor.companies) : '');
    const [numInvestments, setNumInvestments] = useState(isEdit ? investor.numInvestments : '');

    const handleSubmit = () => {
        if (!name) return alert("Identification Required.");
        const data = {
            name, profile, networth, linkedinURL, picURL,
            domains: domains.split(',').map(s => s.trim()).filter(Boolean),
            companies: companies.split(',').map(s => s.trim()).filter(Boolean),
            numInvestments
        };
        onSave(null, isEdit ? 'edit' : 'add', isEdit ? (investor.id || investor.name) : null, data);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 font-manrope" onClick={onClose}>
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-xl p-10 rounded-[3rem] shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8">{isEdit ? 'Update Record' : 'Add Investor'}</h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelStyle}>Identity</label><input className={inputStyle} value={name} onChange={e => setName(e.target.value)} /></div>
                        <div><label className={labelStyle}>Image URL</label><input className={inputStyle} value={picURL} onChange={e => setPicURL(e.target.value)} /></div>
                    </div>
                    <div><label className={labelStyle}>Profile</label><input className={inputStyle} value={profile} onChange={e => setProfile(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelStyle}>AUM</label><input className={inputStyle} value={networth} onChange={e => setNetworth(e.target.value)} /></div>
                        <div><label className={labelStyle}>Total Deals</label><input className={inputStyle} value={numInvestments} onChange={e => setNumInvestments(e.target.value)} /></div>
                    </div>
                    <div><label className={labelStyle}>LinkedIn</label><input className={inputStyle} value={linkedinURL} onChange={e => setLinkedinURL(e.target.value)} /></div>
                    <div><label className={labelStyle}>Domains</label><textarea className={inputStyle} value={domains} onChange={e => setDomains(e.target.value)} rows="2" /></div>
                    <div><label className={labelStyle}>Notable Bets</label><textarea className={inputStyle} value={companies} onChange={e => setCompanies(e.target.value)} rows="2" /></div>
                </div>
                <div className="mt-8 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px]">Cancel</button>
                    <button onClick={handleSubmit} className="flex-[2] py-4 bg-[#FFD700] text-black font-black uppercase text-[10px] rounded-xl hover:scale-105 transition-all">Confirm</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const AngelInvestorDirectory = ({ userRole }) => {
    const [investorData, setInvestorData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterDomain, setFilterDomain] = useState('All');
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [editingInvestor, setEditingInvestor] = useState(null);
    const [selectedProfile, setSelectedProfile] = useState(null);

    const isSuperAdmin = userRole === 'admin' || userRole === 'super_admin';

    useEffect(() => {
        const unsub = db.collection('angel_investors').orderBy('name', 'asc').onSnapshot(snap => {
            setInvestorData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    const uniqueDomains = useMemo(() => {
        const set = new Set();
        investorData.forEach(inv => {
            const dList = Array.isArray(inv.domains) ? inv.domains : (inv.domains || '').split(',').map(s => s.trim());
            dList.forEach(d => { if(d) set.add(d); });
        });
        return ["All", ...Array.from(set).sort()];
    }, [investorData]);

    const filteredInvestors = useMemo(() => {
        return investorData.filter(inv => {
            let hasDomain = true;
            const dList = Array.isArray(inv.domains) ? inv.domains : (inv.domains || '').split(',').map(s => s.trim());
            if (filterDomain !== 'All') hasDomain = dList.includes(filterDomain);
            const query = search.toLowerCase();
            return hasDomain && (!search || inv.name.toLowerCase().includes(query) || (inv.profile && inv.profile.toLowerCase().includes(query)));
        });
    }, [investorData, filterDomain, search]);

    const handleUpdate = async (e, action, id, data) => {
        if (!isSuperAdmin) return;
        try {
            if (action === 'add') await db.collection('angel_investors').add({ ...data, addedAt: new Date().toISOString() });
            else if (action === 'edit') await db.collection('angel_investors').doc(id).update(data);
            else if (action === 'delete') {
                if (window.confirm(`Purge record?`)) await db.collection('angel_investors').doc(id).delete();
            }
        } catch (err) { alert(err.message); }
    };

    if (isLoading) return <div className="text-center py-40 text-[#FFD700] font-black uppercase animate-pulse font-manrope">Syncing Oracle...</div>;

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease] font-manrope">
            {/* HEADER */}
            <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 flex flex-wrap gap-8 items-center justify-between shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Angel Hub</h2>
                    <p className="text-[10px] text-[#FFD700] font-black uppercase tracking-[0.5em] mt-3 opacity-60">{investorData.length} Sovereign Nodes</p>
                </div>
                <div className="flex gap-4 items-center relative z-10">
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 mr-4">
                        <button onClick={() => setViewMode('grid')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[#FFD700] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}><i className="fa-solid fa-table-cells-large"></i></button>
                        <button onClick={() => setViewMode('list')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-[#FFD700] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}><i className="fa-solid fa-list-ul"></i></button>
                    </div>
                    {isSuperAdmin && <button onClick={() => { setEditingInvestor(null); setIsManagerOpen(true); }} className="bg-[#FFD700] text-black px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">+ Register Angel</button>}
                </div>
            </div>

            {/* REDUCED SEARCH & FILTERS */}
            <div className="space-y-6">
                <div className="relative group">
                    <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                    <input type="text" placeholder="Search the network..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-[#0f172a]/60 border border-white/10 rounded-[1.5rem] py-4 pl-14 pr-8 text-white text-base font-bold focus:border-[#FFD700] outline-none transition-all placeholder:text-slate-700" />
                </div>
                {/* REDUCED FILTER SIZE */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {uniqueDomains.map(d => (
                        <button key={d} onClick={() => setFilterDomain(d)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${filterDomain === d ? 'bg-white text-black border-white' : 'bg-black/40 text-slate-600 border-white/5 hover:text-white'}`}>{d}</button>
                    ))}
                </div>
            </div>

            {/* VIEW ENGINE */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredInvestors.map(inv => (
                        <div key={inv.id || inv.name} className={glossyCardStyle} onClick={() => setSelectedProfile(inv)}>
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="flex gap-4 items-center">
                                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border border-[#FFD700]/20 bg-black flex-shrink-0">
                                        <img src={inv.picURL || `https://ui-avatars.com/api/?name=${inv.name}&background=020617&color=FFD700`} className="w-full h-full object-cover grayscale group-hover:grayscale-0" alt="" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-1">{inv.name}</h3>
                                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{inv.profile}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6 border-t border-white/5 pt-6 relative z-10">
                                <div><label className="text-[7px] text-slate-600 uppercase font-black block mb-1">Capital Capacity</label><div className="text-[#FFD700] font-black text-lg tracking-tighter">{inv.networth || 'Sovereign'}</div></div>
                                <div className="text-right"><label className="text-[7px] text-slate-600 uppercase font-black block mb-1">Deals</label><div className="text-white font-black text-lg tracking-tighter">{inv.numInvestments || '10+'}</div></div>
                            </div>

                            {isSuperAdmin && (
                                <div className="flex gap-3 relative z-20 mt-4">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingInvestor(inv); setIsManagerOpen(true); }} className="w-9 h-9 bg-white/5 text-slate-500 rounded-xl flex items-center justify-center hover:bg-[#FFD700] hover:text-black border border-white/10 transition-all"><i className="fa-solid fa-pen text-[10px]"></i></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleUpdate(null, 'delete', inv.id); }} className="w-9 h-9 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white border border-red-500/20 transition-all"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 grid grid-cols-12 gap-4 text-[9px] font-black text-slate-600 uppercase tracking-widest bg-black/20">
                        <div className="col-span-5">Identity / Profile</div>
                        <div className="col-span-3">Capacity</div>
                        <div className="col-span-4 text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {filteredInvestors.map(inv => (
                            <div key={inv.id || inv.name} className="p-6 grid grid-cols-12 gap-4 items-center group hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => setSelectedProfile(inv)}>
                                <div className="col-span-5 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-black flex-shrink-0"><img src={inv.picURL || `https://ui-avatars.com/api/?name=${inv.name}&background=020617&color=FFD700`} className="w-full h-full object-cover" alt="" /></div>
                                    <div><h4 className="text-white font-black text-base uppercase tracking-tighter">{inv.name}</h4><p className="text-[9px] text-slate-500 uppercase">{inv.profile}</p></div>
                                </div>
                                <div className="col-span-3 text-[#FFD700] font-black text-sm">{inv.networth || 'Sovereign'}</div>
                                <div className="col-span-4 flex justify-end gap-3">
                                    {inv.linkedinURL && <a href={inv.linkedinURL} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-500/20 transition-all"><i className="fa-brands fa-linkedin-in"></i></a>}
                                    {isSuperAdmin && (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); setEditingInvestor(inv); setIsManagerOpen(true); }} className="w-9 h-9 bg-white/5 text-slate-500 rounded-xl flex items-center justify-center hover:bg-[#FFD700] hover:text-black border border-white/10 transition-all"><i className="fa-solid fa-pen text-[10px]"></i></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleUpdate(null, 'delete', inv.id); }} className="w-9 h-9 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white border border-red-500/20 transition-all"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODALS */}
            {selectedProfile && <ProfileIntelligenceModal investor={selectedProfile} onClose={() => setSelectedProfile(null)} />}
            {isManagerOpen && <InvestorManagementModal investor={editingInvestor} onClose={() => setIsManagerOpen(false)} onSave={handleUpdate} />}
        </div>
    );
};

export default AngelInvestorDirectory;