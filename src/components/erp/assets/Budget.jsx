import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { UI } from '../../../lib/uiTheme';

const Budget = () => {
    const [allocations, setAllocations] = useState([
        { id: 1, category: 'Payroll', allocated: 6000000, spent: 0 },
        { id: 2, category: 'Asset Purchase', allocated: 50000000, spent: 0 },
        { id: 3, category: 'Utilities', allocated: 200000, spent: 0 },
        { id: 4, category: 'Marketing', allocated: 1500000, spent: 0 },
    ]);

    useEffect(() => {
        const calculateSpend = async () => {
            const { data: ledger } = await supabase.from('erp_ledger').select('amount, category').eq('type', 'DEBIT');
            
            if (ledger) {
                const updatedAllocations = allocations.map(a => {
                    const spent = ledger
                        .filter(l => l.category === a.category)
                        .reduce((sum, l) => sum + Number(l.amount), 0);
                    return { ...a, spent };
                });
                setAllocations(updatedAllocations);
            }
        };
        calculateSpend();
    }, []);

    const updateCap = (id, val) => {
        const newArr = allocations.map(a => a.id === id ? { ...a, allocated: Number(val) } : a);
        setAllocations(newArr);
        // Note: In a real app, save this to a 'budget_config' table
    };

    return (
        <div className={UI.pageContainer}>
            <div className={UI.header.container}>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Budget Allocation</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Fiscal Year 2025</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
                {allocations.map(item => {
                    const percent = Math.min(100, Math.round((item.spent / item.allocated) * 100));
                    const isCritical = percent > 90;

                    return (
                        <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isCritical ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                        <i className={`fa-solid ${item.category === 'Payroll' ? 'fa-users' : item.category === 'Asset Purchase' ? 'fa-rocket' : 'fa-tag'}`}></i>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{item.category}</h3>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{percent}% Utilized</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 uppercase font-bold">Remaining</div>
                                    <div className={`text-sm font-mono font-bold ${isCritical ? 'text-red-600' : 'text-emerald-600'}`}>
                                        ₹{new Intl.NumberFormat('en-IN').format(item.allocated - item.spent)}
                                    </div>
                                </div>
                            </div>

                            {/* BAR */}
                            <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${isCritical ? 'bg-red-500' : 'bg-blue-600'}`} 
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>

                            {/* INPUTS */}
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div>
                                    <label className="text-[8px] font-bold text-slate-400 uppercase block">Spent</label>
                                    <div className="text-xs font-mono font-bold text-slate-700">₹{item.spent.toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                    <label className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Allocated Cap</label>
                                    <input 
                                        type="number" 
                                        className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold text-right outline-none focus:border-blue-400"
                                        value={item.allocated}
                                        onChange={(e) => updateCap(item.id, e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Budget;