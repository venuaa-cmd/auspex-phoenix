import React, { useState } from 'react';

const LedgerForm = ({ onAdd }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('OPERATIONAL');
    const [type, setType] = useState('DEBIT');
    const [amount, setAmount] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({ date, description, category, type, amount });
        // Reset (Keep date as today)
        setDescription('');
        setAmount('');
        // We usually keep Category/Type same for rapid entry, or reset defaults:
        setType('DEBIT'); 
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm sticky top-20">
            <h3 className="text-sm font-bold border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-receipt text-slate-400"></i> New Transaction
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* ROW 1: Date & Type */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full border border-slate-200 rounded p-2 text-sm focus:border-black outline-none bg-slate-50" 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type</label>
                        <select 
                            value={type} 
                            onChange={e => setType(e.target.value)} 
                            className={`w-full border border-slate-200 rounded p-2 text-sm font-bold outline-none focus:border-black ${type === 'CREDIT' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}
                        >
                            <option value="DEBIT">DEBIT (Expense)</option>
                            <option value="CREDIT">CREDIT (Income)</option>
                        </select>
                    </div>
                </div>

                {/* ROW 2: Category */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                    <select 
                        value={category} 
                        onChange={e => setCategory(e.target.value)} 
                        className="w-full border border-slate-200 rounded p-2 text-sm bg-white focus:border-black outline-none"
                    >
                        <option value="OPERATIONAL">OPERATIONAL (Rent, Server, etc.)</option>
                        <option value="PAYROLL">PAYROLL / SALARY</option>
                        <option value="MARKETING">MARKETING / SALES</option>
                        <option value="LEGAL">LEGAL / COMPLIANCE</option>
                        <option value="CAPITAL_INJECTION">CAPITAL INJECTION</option>
                        <option value="DEAL_EXPENSE">DEAL FLOW EXPENSE</option>
                        <option value="SOFTWARE">SOFTWARE / SAAS</option>
                    </select>
                </div>

                {/* ROW 3: Amount */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (INR)</label>
                    <input 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        placeholder="0.00"
                        className="w-full border border-slate-200 rounded p-2 text-lg font-bold focus:border-black outline-none bg-sky-50 text-slate-900" 
                        required 
                        min="0"
                    />
                </div>

                {/* ROW 4: Description */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                    <textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        className="w-full border border-slate-200 rounded p-2 text-sm focus:border-black focus:ring-0 outline-none h-20 resize-none bg-slate-50" 
                        placeholder="Details..." 
                        required
                    />
                </div>

                <button type="submit" className={`w-full text-white text-xs font-bold uppercase py-3 rounded hover:opacity-90 transition-all ${type === 'CREDIT' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {type === 'CREDIT' ? '+ Record Income' : '- Record Expense'}
                </button>
            </form>
        </div>
    );
};

export default LedgerForm;