import React, { useState, useMemo } from 'react';

const ExpenseDeepDive = ({ ledger, employees, searchTerm }) => {
    const [view, setView] = useState('SALARY');
    
    // PAYROLL ANALYSIS
    const salaryData = useMemo(() => {
        return employees
            .filter(e => e.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(e => ({ 
                name: e.full_name, 
                role: e.role, 
                cost: Number(e.net_payable_monthly || e.monthly_salary) 
            }))
            .sort((a,b) => b.cost - a.cost);
    }, [employees, searchTerm]);
    
    // VENDOR ANALYSIS
    const vendorData = useMemo(() => {
        const map = {}; 
        ledger
            .filter(t => t.type === 'DEBIT' && t.category !== 'Payroll')
            .forEach(t => { 
                const v = t.metadata?.vendor_name || t.vendor || 'Unknown'; 
                if (!map[v]) map[v] = { name: v, total: 0, transactions: 0 }; 
                map[v].total += Number(t.amount); 
                map[v].transactions += 1; 
            });
        
        return Object.values(map)
            .filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.total - a.total);
    }, [ledger, searchTerm]);
    
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="grid grid-cols-12 gap-6 animate-[fadeIn_0.3s_ease]">
            
            {/* TOGGLE SWITCH */}
            <div className="col-span-12 md:col-span-3 space-y-2 flex md:block gap-2 overflow-x-auto">
                <button onClick={() => setView('SALARY')} className={`flex-1 w-full text-left p-3 rounded-xl border text-xs font-bold transition-all whitespace-nowrap ${view === 'SALARY' ? 'bg-blue-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <i className="fa-solid fa-users mr-2"></i> Payroll Analysis
                </button>
                <button onClick={() => setView('VENDOR')} className={`flex-1 w-full text-left p-3 rounded-xl border text-xs font-bold transition-all whitespace-nowrap ${view === 'VENDOR' ? 'bg-blue-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <i className="fa-solid fa-shop mr-2"></i> Vendor Analysis
                </button>
            </div>

            {/* DATA TABLE */}
            <div className="col-span-12 md:col-span-9 bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px] overflow-x-auto">
                {view === 'SALARY' && (
                    <table className="w-full text-left min-w-[300px]">
                        <thead>
                            <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-100">
                                <th className="pb-2">Employee</th>
                                <th className="pb-2">Role</th>
                                <th className="pb-2 text-right">Monthly Cost</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {salaryData.map((e, i) => (
                                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="py-3 font-bold text-slate-700">{e.name}</td>
                                    <td className="py-3 text-slate-500">{e.role}</td>
                                    <td className="py-3 text-right font-mono">{formatCurrency(e.cost)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {view === 'VENDOR' && (
                    <div className="space-y-3">
                        {vendorData.map((v, i) => (
                            <div key={i} className="flex justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="text-xs font-bold text-slate-800">
                                    {v.name} <span className="text-slate-400 font-normal ml-1">({v.transactions} txns)</span>
                                </div>
                                <div className="text-sm font-black text-slate-900">{formatCurrency(v.total)}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseDeepDive;