import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const DealFlowKanban = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // --- FORM STATE ---
    const [formData, setFormData] = useState({ 
        startup_name: '', sector: '', ask_amount: '', valuation_cap: '', lead_strategist_id: '', notes: '' 
    });

    const STAGES = ['LEAD', 'DD', 'IC', 'CLOSING'];

    useEffect(() => { fetchAllData(); }, []);

    const fetchAllData = async () => {
        setLoading(true);
        const { data: dData } = await supabase.from('erp_deal_flow').select('*, erp_employees(full_name)').order('created_at', { ascending: false });
        const { data: eData } = await supabase.from('erp_employees').select('id, full_name').eq('status', 'ACTIVE');
        if (dData) setDeals(dData);
        if (eData) setEmployees(eData);
        setLoading(false);
    };

    // --- CURRENCY UTILITY ---
    const formatINR = (val) => {
        if (val === undefined || val === null || val === '') return '';
        const num = val.toString().replace(/[^0-9]/g, '');
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const parseRaw = (val) => Number(val.toString().replace(/,/g, ''));

    // --- THE INGESTION ENGINE ---
    const handleCreate = async () => {
        if (!formData.startup_name) return alert("Startup identity required for ingestion.");
        
        setLoading(true);
        const payload = {
            startup_name: formData.startup_name,
            sector: formData.sector,
            ask_amount: formData.ask_amount ? parseRaw(formData.ask_amount) : 0,
            valuation_cap: formData.valuation_cap ? parseRaw(formData.valuation_cap) : 0,
            lead_strategist_id: formData.lead_strategist_id || null,
            notes: formData.notes,
            stage: 'LEAD'
        };

        const { error } = await supabase.from('erp_deal_flow').insert([payload]);
        
        if (error) {
            alert(`Ingestion Failure: ${error.message}`);
        } else {
            setIsAddOpen(false);
            setFormData({ startup_name: '', sector: '', ask_amount: '', valuation_cap: '', lead_strategist_id: '', notes: '' });
            await fetchAllData();
        }
        setLoading(false);
    };

    const moveStage = async (id, newStage) => {
        const { error } = await supabase.from('erp_deal_flow').update({ stage: newStage }).eq('id', id);
        if (!error) fetchAllData();
    };

    const deleteDeal = async (id) => {
        if (window.confirm("Physical deletion of prospect node?")) {
            await supabase.from('erp_deal_flow').delete().eq('id', id);
            fetchAllData();
        }
    };

    const inputStyle = "w-full bg-sky-50 border border-slate-200 rounded-sm p-4 text-xs font-black text-slate-900 outline-none focus:border-indigo-600 shadow-inner";
    const labelStyle = "text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1";

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            
            {/* 1. INSTITUTIONAL HEADER */}
            <div className="bg-slate-900 border border-slate-800 p-10 rounded-sm shadow-2xl flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Deal Flow <span className="text-indigo-400">Pipeline</span></h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 italic">Venture Ingestion & Forensic Analysis</p>
                </div>
                <button 
                    onClick={() => setIsAddOpen(true)}
                    className="relative z-10 px-10 py-4 bg-indigo-600 text-white rounded-sm text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-500 transition-all active:scale-95"
                >
                    + Ingest Prospect
                </button>
                <div className="absolute right-[-20px] top-[-20px] text-[120px] font-black text-white opacity-[0.02] select-none">AUSPEX</div>
            </div>

            {/* 2. PIPELINE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {STAGES.map(stage => (
                    <div key={stage} className="flex flex-col gap-6">
                        <div className="flex justify-between items-center px-6 py-3 bg-white border border-slate-200 rounded-sm shadow-sm border-l-4 border-slate-900">
                            <span className="text-[11px] font-black text-slate-900 tracking-[0.2em]">{stage}</span>
                            <span className="text-[11px] font-black text-indigo-600 tabular-nums">
                                {deals.filter(d => d.stage === stage).length}
                            </span>
                        </div>

                        <div className="space-y-5">
                            {deals.filter(d => d.stage === stage).map(deal => (
                                <div key={deal.id} className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm hover:border-indigo-600 transition-all group relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-5 relative z-10">
                                        <div>
                                            <h4 className="text-[15px] font-black uppercase text-slate-900 leading-tight">{deal.startup_name}</h4>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{deal.sector || 'GENERAL'}</div>
                                        </div>
                                        <button onClick={() => deleteDeal(deal.id)} className="text-slate-200 hover:text-rose-600 transition-all"><i className="fa-solid fa-trash-alt text-[10px]"></i></button>
                                    </div>
                                    
                                    <div className="space-y-3 mb-6 relative z-10 border-l-2 border-slate-50 pl-4">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-400 font-bold uppercase tracking-tighter">Ask</span>
                                            <span className="text-slate-900 font-black tabular-nums">₹{formatINR(deal.ask_amount)}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-400 font-bold uppercase tracking-tighter">Cap</span>
                                            <span className="text-indigo-600 font-black tabular-nums">₹{formatINR(deal.valuation_cap)}</span>
                                        </div>
                                    </div>

                                    {/* --- HIGH-LEGIBILITY STAGE SHIFTERS --- */}
                                    <div className="flex gap-1 border-t border-slate-50 pt-5 relative z-10">
                                        {STAGES.map(s => (
                                            <button 
                                                key={s} 
                                                onClick={() => moveStage(deal.id, s)} 
                                                className={`flex-1 h-6 rounded-sm text-[8px] font-black transition-all flex items-center justify-center ${
                                                    deal.stage === s 
                                                    ? 'bg-indigo-600 text-white shadow-[0_0_8px_rgba(79,70,229,0.5)]' // Indigo BG / White Text
                                                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200' // Light Slate BG / Black Text
                                                }`}
                                                title={`Move to ${s}`}
                                            >
                                                {s.slice(0, 1)}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="absolute right-[-10px] bottom-[-10px] text-slate-50 font-black text-[60px] opacity-[0.03] select-none italic uppercase">{stage.slice(0, 1)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 3. MODAL */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[10000] flex items-center justify-center p-6">
                    <div className="bg-white border border-slate-200 p-12 rounded-sm w-full max-w-2xl shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-10 border-b-2 border-slate-900 pb-6">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Ingest Prospect Node</h3>
                            <button onClick={() => setIsAddOpen(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"><i className="fa-solid fa-xmark text-xl"></i></button>
                        </div>

                        <div className="grid grid-cols-2 gap-10 mb-10">
                            <div className="space-y-6">
                                <div>
                                    <label className={labelStyle}>Startup Entity</label>
                                    <input className={inputStyle} value={formData.startup_name} onChange={e => setFormData({...formData, startup_name: e.target.value})} placeholder="e.g. Advaya AI" />
                                </div>
                                <div>
                                    <label className={labelStyle}>Sector / Vertical</label>
                                    <input className={inputStyle} value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} placeholder="e.g. DeepTech / AI" />
                                </div>
                                <div>
                                    <label className={labelStyle}>Lead Strategist</label>
                                    <select className={inputStyle} value={formData.lead_strategist_id} onChange={e => setFormData({...formData, lead_strategist_id: e.target.value})}>
                                        <option value="">-- Assign Lead --</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className={labelStyle}>Ask Amount (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                        <input 
                                            type="text" 
                                            className={inputStyle + " pl-8 font-mono"} 
                                            value={formatINR(formData.ask_amount)} 
                                            onChange={e => setFormData({...formData, ask_amount: e.target.value.replace(/,/g, '')})} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelStyle}>Valuation Cap (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                        <input 
                                            type="text" 
                                            className={inputStyle + " pl-8 font-mono"} 
                                            value={formatINR(formData.valuation_cap)} 
                                            onChange={e => setFormData({...formData, valuation_cap: e.target.value.replace(/,/g, '')})} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelStyle}>Initial Notes</label>
                                    <textarea rows="3" className={inputStyle + " resize-none h-24"} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Strategic context..." />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-8 border-t border-slate-100">
                            <button 
                                onClick={handleCreate} 
                                disabled={loading}
                                className="flex-1 py-5 bg-slate-900 text-white rounded-sm text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Authorizing...' : 'Authorize Ingestion'}
                            </button>
                            <button onClick={() => setIsAddOpen(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[11px] tracking-[0.2em] border border-slate-200 hover:bg-slate-50 rounded-sm">Abort</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DealFlowKanban;