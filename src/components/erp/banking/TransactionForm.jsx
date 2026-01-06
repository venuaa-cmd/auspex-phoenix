import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { updateBankBalance } from '../../../lib/bankingService';

const TransactionForm = ({ onComplete }) => {
    const [banks, setBanks] = useState([]);
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [form, setForm] = useState({
        description: '',
        amount: '',
        type: 'DEBIT',
        category: 'Operating Expense',
        bank_id: '',
        manager_id: ''
    });

    useEffect(() => {
        const loadMetaData = async () => {
            const { data: b } = await supabase.from('erp_bank_accounts').select('id, bank_name, current_balance');
            const { data: m } = await supabase.from('erp_employees').select('id, name');
            setBanks(b || []);
            setManagers(m || []);
        };
        loadMetaData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create Ledger Entry
            const { data: txn, error: txnErr } = await supabase
                .from('erp_ledger')
                .insert([{
                    ...form,
                    status: 'CLEARED',
                    amount: Number(form.amount)
                }])
                .select();

            if (txnErr) throw txnErr;

            // 2. Trigger Bank Passbook Update
            await updateBankBalance(form.bank_id, form.amount, form.type);

            onComplete();
        } catch (error) {
            console.error("Transaction Failed:", error);
            alert("Strategic Error: Could not verify bank funds.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] shadow-2xl w-full max-w-2xl font-manrope">
            <h3 className="text-xl font-black text-white uppercase italic mb-8">Execute Capital Mandate</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transaction Type</label>
                        <select 
                            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500"
                            value={form.type}
                            onChange={e => setForm({...form, type: e.target.value})}
                        >
                            <option value="DEBIT">DEBIT (Withdrawal)</option>
                            <option value="CREDIT">CREDIT (Deposit / Income)</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount (INR)</label>
                        <input 
                            type="number" required placeholder="0.00"
                            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500"
                            value={form.amount}
                            onChange={e => setForm({...form, amount: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source Bank Account</label>
                    <select 
                        required
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500"
                        value={form.bank_id}
                        onChange={e => setForm({...form, bank_id: e.target.value})}
                    >
                        <option value="">Select Target Bank</option>
                        {banks.map(b => (
                            <option key={b.id} value={b.id}>{b.bank_name} (Bal: ₹{(b.current_balance/10000000).toFixed(2)} Cr)</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigning Manager</label>
                    <select 
                        required
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500"
                        value={form.manager_id}
                        onChange={e => setForm({...form, manager_id: e.target.value})}
                    >
                        <option value="">Select Responsible Party</option>
                        {managers.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Purpose / Description</label>
                    <textarea 
                        required
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500 h-24"
                        placeholder="Detail the strategic purpose of this transaction..."
                        value={form.description}
                        onChange={e => setForm({...form, description: e.target.value})}
                    ></textarea>
                </div>

                <button 
                    type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-white uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all active:scale-95"
                >
                    {loading ? <i className="fa-solid fa-sync fa-spin"></i> : 'Commit Transaction to Bank'}
                </button>
            </form>
        </div>
    );
};

export default TransactionForm;