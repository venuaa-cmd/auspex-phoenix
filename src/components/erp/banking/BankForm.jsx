import React, { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const BankForm = ({ onComplete, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        bank_name: '',
        account_no: '', // FIXED: Matches database column "account_no"
        current_balance: '80000000000', // Genesis Capital Default
        account_type: 'CURRENT'
    });

    // --- REAL-TIME CURRENCY FORMATTER ---
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Physical Schema Mapping: erp_bank_accounts
        const { error } = await supabase.from('erp_bank_accounts').insert([{
            bank_name: form.bank_name.toUpperCase(),
            account_no: form.account_no, 
            current_balance: Number(form.current_balance),
            account_type: form.account_type
        }]);

        if (error) {
            alert('Protocol Alert: ' + error.message);
        } else {
            onComplete(); // Refreshes the Bank Registry grid
        }
        setLoading(false);
    };

    return (
        <div className="bg-white w-full max-w-xl p-12 rounded-sm shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10 border-b-2 border-slate-900 pb-6">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Add Liquidity Node</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Sovereign Treasury Protocol</p>
                </div>
                <i className="fa-solid fa-building-columns text-slate-100 text-5xl"></i>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* 1. INSTITUTION NAME (Removed Grey Bits) */}
                <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Institution Name</label>
                    <input 
                        required 
                        placeholder="e.g., HDFC BANK, BKC BRANCH"
                        className="w-full border-b-2 border-slate-100 p-3 outline-none focus:border-slate-900 font-bold text-slate-900 uppercase transition-all bg-transparent text-lg" 
                        value={form.bank_name} 
                        onChange={e => setForm({...form, bank_name: e.target.value})} 
                    />
                </div>

                {/* 2. ACCOUNT IDENTIFICATION */}
                <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Account Identification (No)</label>
                    <input 
                        required 
                        placeholder="232201000551"
                        className="w-full border-b-2 border-slate-100 p-3 outline-none focus:border-slate-900 font-bold font-mono text-slate-900 text-lg tracking-widest bg-transparent" 
                        value={form.account_no} 
                        onChange={e => setForm({...form, account_no: e.target.value})} 
                    />
                </div>

                {/* 3. CAPITAL ALLOCATION (With Words & Formatting) */}
                <div className="space-y-1 p-8 border border-slate-100 bg-slate-50/30 rounded-sm">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-3">Opening Capital Allocation</label>
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-slate-400">₹</span>
                        <input 
                            type="number" 
                            required 
                            className="w-full p-2 bg-transparent outline-none font-black text-5xl text-slate-900 tabular-nums border-b border-transparent focus:border-slate-200 transition-all" 
                            value={form.current_balance} 
                            onChange={e => setForm({...form, current_balance: e.target.value})} 
                        />
                    </div>
                    {/* LIVE FORMATTING */}
                    <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-tighter italic">
                            {formatCurrency(form.current_balance)}
                        </p>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Global Cap Definition</span>
                    </div>
                </div>

                {/* 4. ACTION BUTTONS */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        className="py-5 text-[11px] font-black uppercase border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all tracking-[0.2em] rounded-sm"
                    >
                        Abort Registration
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="py-5 text-[11px] font-black uppercase bg-slate-900 text-white hover:bg-indigo-600 transition-all tracking-[0.2em] shadow-xl shadow-slate-900/20 rounded-sm"
                    >
                        {loading ? 'Initializing Node...' : 'Confirm Node Entry'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BankForm;