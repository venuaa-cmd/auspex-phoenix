import React, { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const CapitalForm = ({ isOpen, onClose, onSave }) => {
    if (!isOpen) return null;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState('REVENUE'); 
    const [amount, setAmount] = useState('');
    const [source, setSource] = useState(''); 
    const [status, setStatus] = useState('REALIZED'); 
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        // ... (Logic same as before) ...
        const payload = {
            transaction_date: date,
            type: 'CREDIT',
            amount: parseFloat(amount),
            category: type === 'REVENUE' ? 'Revenue' : type === 'LOAN' ? 'Liability' : 'Funding',
            sub_category: type === 'ASSET_SALE' ? 'Asset Liquidation' : type === 'LOAN' ? 'Business Loan' : type === 'FUNDING' ? 'Equity Sale' : 'Sales',
            vendor: source,
            description: notes,
            status: status,
            created_at: new Date().toISOString()
        };
        await supabase.from('erp_ledger').insert([payload]);
        onSave(); onClose(); setSaving(false);
    };

    // FIXED STYLE: Forces Black Text on White Background for all inputs
    const inputClass = "w-full border border-slate-300 bg-white text-slate-900 rounded p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none";
    const labelClass = "block text-[9px] font-bold text-slate-500 uppercase mb-1 tracking-wider";

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease]">
                <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
                    <h2 className="text-sm font-bold uppercase tracking-widest"><i className="fa-solid fa-money-bill-wave mr-2"></i> Record Inflow</h2>
                    <button onClick={onClose}><i className="fa-solid fa-times"></i></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Source Type</label>
                            <select value={type} onChange={e=>setType(e.target.value)} className={inputClass}>
                                <option value="REVENUE">Sales / Revenue</option>
                                <option value="FUNDING">Equity Funding</option>
                                <option value="LOAN">Business Loan</option>
                                <option value="ASSET_SALE">Asset Liquidation</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <select value={status} onChange={e=>setStatus(e.target.value)} className={inputClass}>
                                <option value="REALIZED">Received (Bank)</option>
                                <option value="PROJECTED">Projected (Future)</option>
                            </select>
                        </div>
                    </div>
                    {/* ... Rest of form uses inputClass which is now fixed ... */}
                    <div><label className={labelClass}>Amount (₹)</label><input type="number" required value={amount} onChange={e=>setAmount(e.target.value)} className={`${inputClass} text-lg`} placeholder="e.g. 500000" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className={inputClass} /></div>
                        <div><label className={labelClass}>Payer</label><input type="text" required value={source} onChange={e=>setSource(e.target.value)} className={inputClass} /></div>
                    </div>
                    <button disabled={saving} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-xs rounded shadow-lg mt-4 flex justify-center gap-2">
                        {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-check"></i> Record Transaction</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CapitalForm;