import React, { useState } from 'react';
import { db } from '../../lib/firebase';

const pitchCollection = db.collection("pitch_submissions");

const ManualPitchForm = ({ onClose, allDomains, allRounds, refreshParentData, formatCurrency }) => {
    const [startupName, setStartupName] = useState('');
    const [domain, setDomain] = useState(allDomains[0] || '');
    const [fundingAmountInput, setFundingAmountInput] = useState('');
    const [fundingRound, setFundingRound] = useState(allRounds[0] || 'Seed');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!startupName || !domain || !fundingAmountInput) return alert("Required fields missing.");
        try {
            await pitchCollection.add({
                startupName, domain, fundingAmount: Number(fundingAmountInput),
                fundingRound, source: 'Manual Internal Entry', adminNotes: notes,
                status: 'New', submissionDate: new Date().toISOString()
            });
            alert("Deal Deployed.");
            if (refreshParentData) refreshParentData(); 
            onClose();
        } catch (err) { alert("Error: " + err.message); }
    };

    return (
        <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-white/10 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tight">Manual Deal Entry</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Startup Name" value={startupName} onChange={e => setStartupName(e.target.value)} className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white text-xs font-bold outline-none" required />
                <div className="grid grid-cols-2 gap-4">
                    <select value={domain} onChange={e => setDomain(e.target.value)} className="p-4 bg-black/40 border border-white/10 rounded-xl text-white text-xs font-bold outline-none">
                        {allDomains.map(d => (<option key={d} value={d}>{d}</option>))}
                    </select>
                    <select value={fundingRound} onChange={e => setFundingRound(e.target.value)} className="p-4 bg-black/40 border border-white/10 rounded-xl text-white text-xs font-bold outline-none">
                        {allRounds.map(r => (<option key={r} value={r}>{r}</option>))}
                    </select>
                </div>
                <div className="relative">
                    <input type="text" placeholder="Funding Ask (INR)" value={fundingAmountInput} onChange={e => setFundingAmountInput(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white text-xs font-mono outline-none" required />
                    {fundingAmountInput && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">{formatCurrency(Number(fundingAmountInput))}</span>}
                </div>
                <textarea placeholder="Strategy context" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white text-xs font-bold h-24" />
                <div className="flex justify-end gap-4 pt-2">
                    <button type="button" onClick={onClose} className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Cancel</button>
                    <button type="submit" className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest">Submit Deal</button>
                </div>
            </form>
        </div>
    );
};

export default ManualPitchForm;