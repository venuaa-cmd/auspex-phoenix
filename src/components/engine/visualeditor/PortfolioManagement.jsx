import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient'; 
import { runAIAnalysis } from '../../../lib/aiService';

// --- INSTITUTIONAL STYLING (MANROPE ENFORCED) ---
const inputStyle = "w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-[#FFD700] outline-none text-sm font-bold transition-all font-manrope shadow-inner";
const labelStyle = "block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-[0.2em] font-manrope";

const PortfolioManagement = () => {
    // --- STATE MATRIX ---
    const [eligibleStartups, setEligibleStartups] = useState([]); // Master forensic list from Supabase
    const [investments, setInvestments] = useState([]); // For performance calculations
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        web_industry: '',
        web_synopsis: '',
        web_metrics: { moic: true, irr: true, tvpi: true, dpi: false },
        is_published: false
    });

    // 1. SUPABASE FORENSIC EXTRACTION PROTOCOL
    const refreshData = async () => {
        setLoading(true);
        try {
            const { data: companies, error: cErr } = await supabase.from('companies').select('*');
            const { data: iData, error: iErr } = await supabase.from('investments').select('*');

            if (cErr || iErr) throw new Error(cErr?.message || iErr?.message);
            setInvestments(iData || []);

            // --- STRICT CURATION FILTER ---
            // Rule: Owned + Startup Equity + Not Waitlist
            const ownedStartups = (companies || []).filter(c => {
                const type = (c.type || '').toLowerCase();
                const isStartup = type.includes('startup') || type.includes('equity');
                const isNotWaitlist = c.deal_status !== 'WAITLIST';
                const hasOwnership = (iData || []).some(inv => String(inv.company_id) === String(c.id));
                return isStartup && isNotWaitlist && hasOwnership;
            });
            
            setEligibleStartups(ownedStartups);
        } catch (err) { 
            console.error("Forensic Sync Failure:", err); 
        } finally { setLoading(false); }
    };

    useEffect(() => { refreshData(); }, []);

    // 2. AI SYNOPSIS GENERATOR
    const handleGenerateSynopsis = async () => {
        if (!formData.name) return alert("Select an asset first.");
        setIsGenerating(true);
        try {
            const prompt = `Draft a clinical institutional 2-sentence investment synopsis for "${formData.name}". Sector: ${formData.web_industry}. Focus on market disruption. No fluff.`;
            const res = await runAIAnalysis(prompt);
            setFormData(prev => ({ ...prev, web_synopsis: res.trim() }));
        } catch (e) { alert("AI Oracle Disconnect"); }
        setIsGenerating(false);
    };

    // 3. HANDLERS
    const handleSelectAsset = (asset) => {
        setSelectedId(asset.id);
        let metrics = { moic: true, irr: true, tvpi: true, dpi: false };
        if (asset.web_metrics) {
            metrics = typeof asset.web_metrics === 'string' ? JSON.parse(asset.web_metrics) : asset.web_metrics;
        }
        setFormData({
            name: asset.name || asset.companyName,
            web_industry: asset.web_industry || asset.industry || 'Tech',
            web_synopsis: asset.web_synopsis || '',
            web_metrics: metrics,
            is_published: asset.is_published || false
        });
    };

    const handleSaveCuration = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('companies').update({
                web_industry: formData.web_industry,
                web_synopsis: formData.web_synopsis,
                web_metrics: formData.web_metrics,
                is_published: formData.is_published
            }).eq('id', selectedId);
            
            if (error) throw error;
            alert(`✅ Oracle Synced for ${formData.name}`);
            refreshData();
        } catch (err) { alert("Sync Error: " + err.message); }
    };

    const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);

    if (loading) return <div className="text-center py-40 text-[#FFD700] font-black animate-pulse font-manrope">SYNCHRONIZING STARTUP NODES...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-[fadeIn_0.3s_ease] font-manrope">
            
            {/* --- LEFT: CURATION CONTROL TERMINAL --- */}
            <div className="lg:col-span-1 space-y-8">
                <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Eligible Assets</h3>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                        {eligibleStartups.map(asset => (
                            <button 
                                key={asset.id} 
                                onClick={() => handleSelectAsset(asset)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest ${selectedId === asset.id ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'bg-black/40 text-slate-500 border-white/5 hover:border-white/20'}`}
                            >
                                {asset.name || asset.companyName}
                                {asset.is_published && <span className="float-right text-[8px] bg-green-500 text-white px-2 rounded-lg">LIVE</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {selectedId && (
                    <form onSubmit={handleSaveCuration} className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Curation Node</h3>
                            <button 
                                type="button" 
                                onClick={() => setFormData({...formData, is_published: !formData.is_published})}
                                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all ${formData.is_published ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40'}`}
                            >
                                {formData.is_published ? 'Published' : 'Hidden'}
                            </button>
                        </div>
                        
                        <div><label className={labelStyle}>Public Industry Label</label><input className={inputStyle} value={formData.web_industry} onChange={e => setFormData({...formData, web_industry: e.target.value})} /></div>
                        
                        <div>
                            <div className="flex justify-between items-end mb-2"><label className={labelStyle}>Synopsis</label><button type="button" onClick={handleGenerateSynopsis} disabled={isGenerating} className="text-[9px] font-black text-[#FFD700] uppercase hover:underline">{isGenerating ? 'Synthesizing...' : '✨ AI Generate'}</button></div>
                            <textarea className={`${inputStyle} h-24 resize-none`} value={formData.web_synopsis} onChange={e => setFormData({...formData, web_synopsis: e.target.value})} />
                        </div>

                        {/* METRIC SHOWCASE SELECTION */}
                        <div>
                            <label className={labelStyle}>Showcase Metrics</label>
                            <div className="grid grid-cols-4 gap-2 mt-3">
                                {['moic', 'irr', 'tvpi', 'dpi'].map(m => (
                                    <button 
                                        key={m} type="button"
                                        onClick={() => setFormData({...formData, web_metrics: {...formData.web_metrics, [m]: !formData.web_metrics[m]}})}
                                        className={`py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${formData.web_metrics[m] ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/40' : 'bg-black/40 text-slate-700 border-white/5'}`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="w-full py-5 bg-[#FFD700] text-black font-black uppercase text-xs rounded-[1.5rem] hover:scale-105 transition-all shadow-2xl">
                            Commit to Public Website
                        </button>
                    </form>
                )}
            </div>

            {/* --- RIGHT: PUBLISHED LIVE VIEW (GRID ENGINE) --- */}
            <div className="lg:col-span-2 space-y-6">
                <h3 className="text-lg font-black text-white uppercase tracking-widest opacity-40 px-2">Published Live View</h3>
                
                {/* RESTORED GRID ENGINE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {eligibleStartups.filter(f => f.is_published).map(company => {
                        // Calc live stats for the preview
                        const relatedInvs = investments.filter(inv => String(inv.company_id) === String(company.id));
                        const totalInvested = relatedInvs.reduce((acc, curr) => acc + (Number(curr.amount_invested) || 0), 0);
                        const currentValue = relatedInvs.reduce((acc, curr) => acc + (Number(curr.current_valuation) || Number(curr.amount_invested) || 0), 0);
                        const moic = totalInvested > 0 ? (currentValue / totalInvested).toFixed(2) : "1.00";
                        const metricsConfig = typeof company.web_metrics === 'string' ? JSON.parse(company.web_metrics) : (company.web_metrics || {});

                        return (
                            <div key={company.id} className="group h-56 perspective-1000 cursor-pointer">
                                <div className="flip-card-inner">
                                    {/* FRONT: BRAND IDENTITY */}
                                    <div className="flip-card-front bg-[#0f172a] border border-white/10 flex flex-col p-6 rounded-2xl overflow-hidden shadow-2xl transition-all group-hover:border-[#FFD700]/40">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-2 shadow-inner">
                                                <img src={company.logo_url || `https://ui-avatars.com/api/?name=${company.name}&background=020617&color=FFD700`} className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500" alt="" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight group-hover:text-[#FFD700] transition-colors">{company.name}</h3>
                                                <span className="text-[9px] text-[#FFD700] font-black uppercase tracking-widest bg-[#FFD700]/10 px-2 py-0.5 rounded-md border border-[#FFD700]/20">
                                                    {company.web_industry || company.industry || 'STARTUP'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 italic opacity-80 group-hover:opacity-100">
                                            "{company.web_synopsis || 'Institutional asset node briefing pending synchronization.'}"
                                        </p>
                                    </div>

                                    {/* BACK: LIVE PERFORMANCE */}
                                    <div className="flip-card-back bg-[#0f172a] border border-[#FFD700] rounded-2xl p-6 shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                                        <h4 className="text-center text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6 border-b border-white/10 pb-2">Forensic Analysis</h4>
                                        <div className="space-y-4">
                                            {metricsConfig.moic && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] text-slate-500 uppercase font-black">MOIC</span>
                                                    <span className="text-white font-mono font-black">{moic}x</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-slate-500 uppercase font-black">Invested</span>
                                                <span className="text-white font-mono font-black">{formatCurrency(totalInvested)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                                <span className="text-[9px] text-slate-500 uppercase font-black">Status</span>
                                                <span className="text-[#FFD700] font-black uppercase text-[10px]">{company.deal_status || 'ACTIVE'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {eligibleStartups.filter(f => f.is_published).length === 0 && (
                        <div className="col-span-full py-40 border-2 border-dashed border-white/5 rounded-[3rem] text-center opacity-20">
                            <p className="text-[10px] font-black uppercase tracking-[0.6em]">Awaiting Portfolio Synchronization</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PortfolioManagement;