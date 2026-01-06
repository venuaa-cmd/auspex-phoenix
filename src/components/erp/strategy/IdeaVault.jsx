import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { analyzeIncubatorDeal } from '../../../lib/aiService';

/**
 * SOVEREIGN WORD ENGINE (FINANCIAL GRADE)
 * Correctly handles the 8,000 Cr fund scale.
 */
const convertToWords = (num) => {
    if (!num || num === 0) return 'ZERO RUPEES ONLY';
    const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
    const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    
    const format = (n) => {
        if (n === 0) return '';
        if (n > 19) return b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
        return a[n] + ' ';
    };

    let n = Math.floor(Number(num));
    let str = '';
    
    // Support for massive fund allocations (Crore logic)
    const crore = Math.floor(n / 10000000);
    if (crore > 0) {
        if (crore >= 100) {
            str += format(Math.floor(crore / 100)) + 'HUNDRED ' + format(crore % 100) + 'CRORE ';
        } else {
            str += format(crore) + 'CRORE ';
        }
    }
    
    str += format(Math.floor((n / 100000) % 100)) + (Math.floor((n / 100000) % 100) > 0 ? 'LAKH ' : '');
    str += format(Math.floor((n / 1000) % 100)) + (Math.floor((n / 1000) % 100) > 0 ? 'THOUSAND ' : '');
    str += format(Math.floor((n / 100) % 10)) + (Math.floor((n / 100) % 10) > 0 ? 'HUNDRED ' : '');
    
    const remaining = n % 100;
    if (n > 100 && remaining > 0) str += 'AND ';
    str += format(remaining);

    return str.replace(/\s+/g, ' ').trim() + ' RUPEES ONLY';
};

const IdeaVault = () => {
    const [ideas, setIdeas] = useState([]);
    const [managers, setManagers] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState({});

    // SYNCED: Using 'amount' to match the database column
    const [formData, setFormData] = useState({
        title: '', domain: 'AI Intelligence', amount: 0, 
        equity_percent: 10, debt_percent: 0, royalty_percent: 0, 
        manager_id: '', description: ''
    });

    useEffect(() => { fetchDeals(); fetchManagers(); }, []);

    const fetchDeals = async () => {
        const { data } = await supabase.from('erp_incubator_deals').select('*').order('created_at', { ascending: false });
        if (data) setIdeas(data);
    };

    const fetchManagers = async () => {
        const { data } = await supabase.from('erp_employees').select('id, full_name, role').eq('status', 'ACTIVE');
        if (data) setManagers(data);
    };

    const handleSave = async () => {
        // DNA VALIDATION
        if (!formData.title || Number(formData.amount) <= 0 || !formData.manager_id) {
            return alert("FORENSIC_ERROR: DNA missing. Mandate Title, Commitment, and Custodian are required.");
        }

        const payload = { 
            title: formData.title,
            domain: formData.domain,
            amount: Number(formData.amount), // Correct column name
            equity_percent: Number(formData.equity_percent),
            debt_percent: Number(formData.debt_percent),
            royalty_percent: Number(formData.royalty_percent),
            manager_id: formData.manager_id,
            description: formData.description
        };
        
        let result;
        if (editingId) {
            result = await supabase.from('erp_incubator_deals').update(payload).eq('id', editingId);
        } else {
            result = await supabase.from('erp_incubator_deals').insert([payload]);
        }

        if (!result.error) { 
            await fetchDeals(); 
            closeForm(); 
        } else {
            console.error("DB_COMMIT_ERROR:", result.error);
            alert(`COMMIT_DNA_FAILURE: ${result.error.message}. Ensure you ran the ADD COLUMN SQL script.`);
        }
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingId(null);
        setFormData({ title: '', domain: 'AI Intelligence', amount: 0, equity_percent: 10, debt_percent: 0, royalty_percent: 0, manager_id: '', description: '' });
    };

    const handleAudit = async (deal) => {
        setIsAnalyzing(prev => ({ ...prev, [deal.id]: true }));
        try {
            const res = await analyzeIncubatorDeal(deal, managers, 80000000000);
            await supabase.from('erp_incubator_deals').update({ 
                ai_rational: res.reasoning, verdict: res.verdict, timing_score: res.timing_score
            }).eq('id', deal.id);
            fetchDeals();
        } finally {
            setIsAnalyzing(prev => ({ ...prev, [deal.id]: false }));
        }
    };

    const currencyFmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

    return (
        <div className="bg-[#F1F5F9] min-h-screen font-sans p-8 h-[85vh] overflow-hidden flex flex-col">
            
            <header className="flex justify-between items-center bg-slate-900 p-5 shrink-0 border-b border-indigo-500 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">A</div>
                    <div>
                        <h2 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">Alpha Incubator</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sovereign Mandate Modeler</p>
                    </div>
                </div>
                <button onClick={() => setIsFormOpen(true)} className="px-6 py-2.5 bg-white text-slate-900 text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
                    + New Mandate
                </button>
            </header>

            <main className="flex-1 overflow-y-auto mt-10 space-y-12 custom-scrollbar pb-24">
                {ideas.map(deal => {
                    const manager = managers.find(m => m.id === deal.manager_id);
                    return (
                        <div key={deal.id} className="grid grid-cols-12 bg-white border border-slate-200 shadow-sm relative group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
                            
                            <div className="col-span-12 lg:col-span-7 p-10 border-r border-slate-100">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 uppercase">{deal.status || 'DRAFT'}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-l-2 border-slate-200 pl-3">{deal.domain}</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{deal.title}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex gap-4 justify-end mb-3">
                                            <button onClick={() => { setEditingId(deal.id); setFormData(deal); setIsFormOpen(true); }} className="text-slate-300 hover:text-indigo-600 transition-all"><i className="fa-solid fa-pen-nib"></i></button>
                                            <button onClick={async () => { if(confirm("Purge?")) { await supabase.from('erp_incubator_deals').delete().eq('id', deal.id); fetchDeals(); } }} className="text-slate-300 hover:text-rose-600 transition-all"><i className="fa-solid fa-trash-can"></i></button>
                                        </div>
                                        <div className="text-3xl font-black text-slate-900 tabular-nums leading-none">{currencyFmt(deal.amount)}</div>
                                        <p className="text-[9px] font-black text-indigo-500 uppercase mt-2 italic">{convertToWords(deal.amount)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4 mb-8">
                                    <TerminalMetric label="Equity" value={`${deal.equity_percent}%`} />
                                    <TerminalMetric label="Debt/Yield" value={`${deal.debt_percent}%`} />
                                    <TerminalMetric label="Royalty" value={`${deal.royalty_percent}%`} />
                                    <TerminalMetric label="Custodian" value={manager?.full_name?.split(' ')[0] || "PENDING"} />
                                </div>

                                <button onClick={() => handleAudit(deal)} className="w-full py-4 bg-slate-50 text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 hover:bg-slate-900 hover:text-white transition-all">
                                    {isAnalyzing[deal.id] ? "Neural Audit Active..." : "Initialize Clinical Strategy Audit"}
                                </button>
                            </div>

                            <div className="col-span-12 lg:col-span-5 bg-slate-50/50 p-10 flex flex-col border-l border-slate-100">
                                <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Neural_Audit_Node</h4>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar">
                                    <p className="text-[12px] font-bold text-slate-600 leading-relaxed text-justify">
                                        {deal.ai_rational || "Initialize audit to generate strategy DNA and risk metrics."}
                                    </p>
                                    {deal.ai_rational && (
                                        <div className="grid grid-cols-2 gap-4 mt-8">
                                            <div className="bg-white border border-slate-200 p-4">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Verdict</label>
                                                <div className="text-xs font-black text-indigo-600 mt-1 uppercase">{deal.verdict}</div>
                                            </div>
                                            <div className="bg-white border border-slate-200 p-4 text-right">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Timing Score</label>
                                                <div className="text-xs font-black text-slate-900 mt-1">{deal.timing_score}/10</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* MANDATE FORM MODAL */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-6 backdrop-blur-md">
                    <div className="bg-white w-full max-w-2xl border-t-[6px] border-indigo-600 shadow-2xl overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">{editingId ? 'Edit Mandate' : 'Initialize Mandate'}</h3>
                            <button onClick={closeForm} className="text-slate-400 hover:text-rose-600 transition-all"><i className="fa-solid fa-xmark text-2xl"></i></button>
                        </div>
                        
                        <div className="p-10 space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mandate Identifier</label>
                                <input type="text" className="w-full border border-slate-200 bg-white p-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commitment (₹)</label>
                                    <input type="number" className="w-full border border-slate-200 bg-white p-4 text-sm font-black text-slate-900 tabular-nums outline-none focus:border-indigo-600" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                                    <div className="text-[8px] font-black text-indigo-500 uppercase italic mt-2 leading-tight">{convertToWords(formData.amount)}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custodian</label>
                                    <select className="w-full border border-slate-200 bg-white p-4 text-sm font-bold text-slate-900 outline-none appearance-none" value={formData.manager_id} onChange={e => setFormData({...formData, manager_id: e.target.value})}>
                                        <option value="">-- SELECT MANAGER --</option>
                                        {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-8 space-y-6 border border-slate-100">
                                <Slider label="Equity" val={formData.equity_percent} min={0} max={100} set={v => setFormData({...formData, equity_percent: v})} color="accent-indigo-600" />
                                <Slider label="Debt Yield" val={formData.debt_percent} min={0} max={25} set={v => setFormData({...formData, debt_percent: v})} color="accent-slate-900" />
                                <Slider label="Royalty" val={formData.royalty_percent} min={0} max={10} set={v => setFormData({...formData, royalty_percent: v})} color="accent-emerald-600" />
                            </div>

                            <div className="flex gap-4">
                                <button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-5 font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-600 transition-all">Commit DNA</button>
                                <button onClick={closeForm} className="px-10 bg-slate-100 text-slate-500 py-5 font-black uppercase text-xs hover:bg-slate-200 transition-all">Discard</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TerminalMetric = ({ label, value }) => (
    <div className="border border-slate-100 p-4 bg-slate-50/30">
        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</label>
        <div className="text-sm font-black text-slate-900 uppercase tabular-nums">{value}</div>
    </div>
);

const Slider = ({ label, val, min, max, set, color }) => (
    <div className="flex items-center gap-6">
        <span className="text-[10px] font-black text-slate-900 uppercase w-24 shrink-0 tracking-widest">{label}</span>
        <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))} className={`flex-1 h-1.5 bg-slate-200 rounded-none appearance-none cursor-pointer ${color}`} />
        <span className="text-[10px] font-black font-mono w-10 text-right text-indigo-600">{val}%</span>
    </div>
);

export default IdeaVault;