import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { runAIAnalysis } from '../lib/aiService'; 
import { supabase } from '../lib/supabaseClient';

// --- STYLES (Institutional Sovereign Theme) ---
const dropdownStyle = "w-full bg-[#0a0f1e] text-white border border-[var(--brand-color)]/30 rounded-xl p-4 focus:border-[var(--brand-color)] focus:outline-none appearance-none cursor-pointer shadow-inner hover:bg-black/40 transition-all font-bold font-manrope";
const inputStyle = "w-full bg-black/40 border-b border-white/10 focus:border-[var(--brand-color)] p-4 text-white focus:outline-none transition-all rounded-t-xl hover:bg-white/5 font-bold font-manrope read-only:opacity-60 read-only:cursor-not-allowed";

// --- SECTOR BENCHMARKS (Now incorporating Equity logic) ---
const SECTOR_BENCHMARKS = {
    'Entertainment (India)': { 'Pre-seed': { min: 10000000, max: 30000000, label: '₹1 Cr - ₹3 Cr' }, 'Seed': { min: 30000000, max: 80000000, label: '₹3 Cr - ₹8 Cr' } },
    'DeepTech': { 'Seed': { min: 160000000, max: 580000000, label: '₹16 Cr - ₹58 Cr' } },
    'SaaS': { 'Seed': { min: 120000000, max: 330000000, label: '₹12 Cr - ₹33 Cr' } },
    'General': { 'Pre-seed': { min: 10000000, max: 60000000, label: '₹1 Cr - ₹6 Cr' }, 'Seed': { min: 30000000, max: 160000000, label: '₹3 Cr - ₹16 Cr' } }
};
const ROUND_ORDER = ['Pre-seed', 'Seed', 'Pre-A', 'Series A', 'Series B', 'Other'];

// --- HELPERS ---
const formatCurrency = (num) => (!num || isNaN(num)) ? '₹ 0' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
const convertIndianCurrencyToWords = (num) => {
    const abs = Math.abs(Number(num));
    if (abs >= 10000000) return `~ ${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `~ ${(abs / 100000).toFixed(2)} L`;
    return formatCurrency(abs);
};

const PitchInterface = ({ initialData = {}, setView }) => {
    // --- STATE MACHINE (Skipped in simplified versions) ---
    const [pitchId, setPitchId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apexFeedback, setApexFeedback] = useState(null); 
    const [isChecking, setIsChecking] = useState(false);
    
    // Fork State (New vs returning)
    const [founderStatus, setFounderStatus] = useState('unknown');
    const [showForkOptions, setShowForkOptions] = useState(false);
    const [showUpdateMenu, setShowUpdateMenu] = useState(false);
    const [showStatusReport, setShowStatusReport] = useState(false);
    const [foundUserData, setFoundUserData] = useState(null);
    const [companyStatus, setCompanyStatus] = useState('unknown');
    const [portfolioData, setPortfolioData] = useState(null);
    const [availableRounds, setAvailableRounds] = useState(ROUND_ORDER);

    const [formData, setFormData] = useState({
        name: localStorage.getItem('apex_founder_name') || initialData.name || '',
        email: localStorage.getItem('apex_founder_email') || '',
        mobileNo: localStorage.getItem('apex_founder_mobile') || '',
        startupName: initialData.startupName || '',
        domain: initialData.domain || 'Entertainment (India)',
        amount: initialData.amount || 0,
        amountDisplay: '',
        round: initialData.round || 'Pre-seed',
        equity: 10, // MISSING EQUITY COMPONENT
        elevatorPitch: ''
    });

    const [domainsList, setDomainsList] = useState([]);
    const [fundManagers, setFundManagers] = useState([]);

    // --- 1. ENGINE INITIALIZATION ---
    useEffect(() => {
        const loadData = async () => {
            const dSnap = await db.collection("domains").get();
            setDomainsList(dSnap.docs.map(d => d.data().name || d.data().domainName).filter(Boolean).sort());
            const mSnap = await db.collection("fund_managers").get();
            setFundManagers(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        loadData();
    }, []);

    // --- 2. IDENTITY RECOGNITION (Founder Memory) ---
    const checkFounderIdentity = async (val) => {
        if (!val || !val.includes('@')) return;
        const snap = await db.collection('pitch_submissions').where('email', '==', val).orderBy('submissionDate', 'desc').limit(1).get();
        if (!snap.empty) {
            const lastPitch = snap.docs[0].data();
            setFoundUserData(lastPitch);
            setFounderStatus('returning');
            setApexFeedback({ text: `Welcome back, ${lastPitch.name}. I've auto-filled your identity tokens. Is this a new play or are we updating the old file?`, type: "success" });
            setShowForkOptions(true);
        }
    };

    // --- 3. THE EQUITY VALUATION ANALYZER (Loki/Jarvis Persona) ---
    const analyzeValuation = (amount, equity, domain, round) => {
        if (!amount || !equity || equity <= 0) return;
        
        const impliedValuation = (amount / (equity / 100));
        const sector = SECTOR_BENCHMARKS[domain] || SECTOR_BENCHMARKS['General'];
        const roundData = sector[round] || SECTOR_BENCHMARKS['General'][round] || { max: 50000000, label: 'Market Standard' };

        // Loki Reaction: Greed Check
        if (impliedValuation > roundData.max * 1.5) {
            setApexFeedback({
                text: `Really? LoL. You want ${convertIndianCurrencyToWords(amount)} for ${equity}%? That's a ${convertIndianCurrencyToWords(impliedValuation)} valuation. A bit greedy for ${round} in ${domain}, buddy. Market average is ${roundData.label}.`,
                type: "danger"
            });
        } 
        // Jarvis Reaction: Dilution Warning
        else if (equity > 25) {
            setApexFeedback({
                text: `Partner, giving away ${equity}% this early? You'll have no skin left for Series A. Drop the equity ask, and I'll help you justify a higher valuation to my boss.`,
                type: "warning"
            });
        } else {
            setApexFeedback({ text: "Spot on. This valuation fits our internal allocation bucket perfectly. I'll make sure the humans see this.", type: "success" });
        }
    };

    const handleInput = (field, val) => {
        const newData = { ...formData, [field]: val };
        setFormData(newData);
        if (['amount', 'equity', 'domain', 'round'].includes(field)) {
            analyzeValuation(newData.amount, newData.equity, newData.domain, newData.round);
        }
    };

    // --- 4. STATUS RETRIEVAL (Returning User logic) ---
    const handleCheckStatus = async () => {
        setIsChecking(true);
        try {
            const { data } = await supabase.from('companies').select('deal_status, description').eq('name', foundUserData.startupName).limit(1);
            setPortfolioData({
                status: data?.[0]?.deal_status || foundUserData.status,
                adminNotes: data?.[0]?.description || foundUserData.adminNotes || "File is in forensic screening."
            });
            setShowStatusReport(true);
            setApexFeedback(null);
        } catch (e) { console.error(e); }
        setIsChecking(false);
    };

    // --- 5. SUBMISSION & TOKEN DELIVERY ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            localStorage.setItem('apex_founder_name', formData.name);
            localStorage.setItem('apex_founder_email', formData.email);
            localStorage.setItem('apex_founder_mobile', formData.mobileNo);

            const docRef = await db.collection('pitch_submissions').add({
                ...formData,
                submissionDate: new Date().toISOString(),
                status: 'New',
                source: 'Sovereign Uplink'
            });

            const aiMsg = `*Apex winks.* "I've logged the play, <b>${formData.name}</b>. Your secure access code is **${docRef.id}**. I'll 'accidentally' leave your file on top of the manager's desk."`;
            window.Apex.triggerPostPitchSequence(aiMsg, docRef.id);
            setView('chat');
        } catch (err) { alert("Uplink Error: " + err.message); }
        setIsSubmitting(false);
    };

    // --- 6. RENDER DYNAMIC STATUS REPORT ---
    if (showStatusReport && foundUserData) {
        return (
            <div className="animate-[fadeIn_0.5s_ease] max-w-3xl mx-auto pb-10">
                <div className="mb-8 border-l-4 border-[var(--brand-color)] pl-6 py-4 bg-gradient-to-r from-[var(--brand-color)]/10 to-transparent rounded-r-xl">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Mission Status Report</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Confidential Docket // Verified Access</p>
                </div>
                <div className="bg-[#0a0f1e] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                    <div className="grid grid-cols-2 gap-10">
                        <div><label className="text-[9px] text-slate-500 uppercase font-black tracking-widest block mb-2">Venture</label><div className="text-white font-black text-xl tracking-tight uppercase">{foundUserData.startupName}</div></div>
                        <div className="text-right"><label className="text-[9px] text-slate-500 uppercase font-black tracking-widest block mb-2">Status</label><div className="text-[var(--brand-color)] font-black text-xl tracking-tight uppercase">{portfolioData?.status}</div></div>
                    </div>
                    <div className="bg-black/40 p-6 rounded-2xl border border-white/5 italic text-slate-300 text-sm">"{portfolioData?.adminNotes}"</div>
                    <button onClick={() => setView('chat')} className="w-full py-4 bg-white/5 border border-white/10 text-white font-black uppercase text-xs rounded-xl hover:bg-white/10 transition-all">Close Docket</button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-10 font-manrope animate-[fadeIn_0.5s_ease] relative">
            {/* FLOATING LOKI FEEDBACK (The Analysis Vision) */}
            {apexFeedback && (
                <div className={`fixed bottom-10 right-10 max-w-xs p-6 rounded-[2rem] border shadow-2xl backdrop-blur-xl z-[100] animate-[slideIn_0.3s_ease] ${apexFeedback.type === 'danger' ? 'border-red-500 bg-red-500/10' : 'border-[var(--brand-color)] bg-black/80'}`}>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center shrink-0 border border-white/10"><i className="fa-solid fa-robot text-[var(--brand-color)]"></i></div>
                        <div className="text-xs leading-relaxed text-white">
                            <b className="uppercase tracking-[0.2em] text-[var(--brand-color)] block mb-1">Apex Intel</b>
                            {apexFeedback.text}
                        </div>
                    </div>
                    {showForkOptions && (
                        <div className="flex gap-2 mt-4"><button onClick={() => { setShowForkOptions(false); setCompanyStatus('new'); }} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-[10px] font-bold uppercase border border-white/10">New Play</button><button onClick={() => { setShowForkOptions(false); setShowUpdateMenu(true); }} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-[10px] font-bold uppercase border border-white/10">Check File</button></div>
                    )}
                    {showUpdateMenu && (
                        <div className="flex flex-col gap-2 mt-4"><button onClick={handleCheckStatus} className="bg-[var(--brand-color)] text-black px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">B. Check Status</button></div>
                    )}
                </div>
            )}

            <div className="mb-12 border-l-4 border-[var(--brand-color)] pl-8 py-4 bg-gradient-to-r from-[var(--brand-color)]/10 to-transparent rounded-r-[2rem]">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 leading-none">Initialize Pitch Sequence</h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Sovereign Uplink Established // Enter Metadata</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                    <div className="space-y-1"><label className="text-[10px] text-slate-500 font-black uppercase ml-2">Full Name</label><input value={formData.name} onChange={e => handleInput('name', e.target.value)} className={inputStyle} placeholder="John Doe" required readOnly={founderStatus === 'returning'} /></div>
                    <div className="space-y-1"><label className="text-[10px] text-slate-500 font-black uppercase ml-2">Email</label><input type="email" value={formData.email} onChange={e => handleInput('email', e.target.value)} onBlur={(e) => checkFounderIdentity(e.target.value)} className={inputStyle} placeholder="founder@startup.com" required readOnly={founderStatus === 'returning'} /></div>
                    <div className="space-y-1"><label className="text-[10px] text-slate-500 font-black uppercase ml-2">Mobile</label><input type="tel" value={formData.mobileNo} onChange={e => handleInput('mobileNo', e.target.value.slice(0, 10))} className={inputStyle} placeholder="9876543210" required readOnly={founderStatus === 'returning'} /></div>
                </div>

                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-1"><label className="text-[10px] text-slate-500 font-black uppercase ml-2">Venture Identity</label><input value={formData.startupName} onChange={e => handleInput('startupName', e.target.value)} className={inputStyle} placeholder="Project X" required /></div>
                        <div className="space-y-1"><label className="text-[10px] text-slate-500 font-black uppercase ml-2">Vertical</label><select value={formData.domain} onChange={e => handleInput('domain', e.target.value)} className={dropdownStyle}><option>Entertainment (India)</option>{domainsList.map(d => <option key={d}>{d}</option>)}</select></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="space-y-1"><label className="text-[10px] text-slate-500 font-black uppercase ml-2">Funding Round</label><select value={formData.round} onChange={e => handleInput('round', e.target.value)} className={dropdownStyle}><option>Pre-seed</option><option>Seed</option><option>Series A</option></select></div>
                        <div className="space-y-1"><label className="text-[10px] text-slate-500 font-black uppercase ml-2">Capital Ask (INR)</label><input type="number" value={formData.amount} onChange={e => handleInput('amount', Number(e.target.value))} className={inputStyle} placeholder="e.g. 5000000" required /></div>
                        
                        {/* DYNAMIC EQUITY & VALUATION COMPONENT */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-black uppercase ml-2 tracking-widest">Equity Offered (%)</label>
                            <input type="number" value={formData.equity} onChange={e => handleInput('equity', Number(e.target.value))} className={`${inputStyle} border-[var(--brand-color)]/40`} placeholder="e.g. 10" required />
                            <span className="text-[9px] text-[var(--brand-color)] font-black uppercase mt-3 block tracking-widest">Val: {convertIndianCurrencyToWords(formData.amount / (formData.equity / 100))}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mb-4 block">The Narrative Unfair Advantage</label>
                    <textarea value={formData.elevatorPitch} onChange={e => handleInput('elevatorPitch', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-sm focus:border-[var(--brand-color)] outline-none h-40 resize-none transition-all font-bold" placeholder="Describe your disruption..." required />
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-[var(--brand-color)] text-black font-black uppercase tracking-[0.3em] rounded-[2rem] shadow-[0_0_50px_var(--brand-glow)] hover:scale-[1.02] active:scale-95 transition-all">
                    {isSubmitting ? 'Establishing Uplink...' : 'Initiate Capital protocol'}
                </button>
            </form>
        </div>
    );
};

export default PitchInterface;