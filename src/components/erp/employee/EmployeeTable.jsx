import React from 'react';

const EmployeeTable = ({ employees, loading }) => {
    
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
             <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Auspex Team Directory</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{employees.length} Active</span>
            </div>
            
            {/* FIXED HEIGHT SCROLL CONTAINER: Prevents page from getting too long */}
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500 bg-slate-50 shadow-sm">
                            <th className="p-3 font-bold">Name / Role</th>
                            <th className="p-3 font-bold">Statutory</th>
                            <th className="p-3 font-bold text-right">Gross (CTC)</th>
                            <th className="p-3 font-bold text-right text-red-600">Deductions</th>
                            <th className="p-3 font-bold text-right text-emerald-600">Net Pay</th>
                            <th className="p-3 font-bold text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                        {loading ? <tr><td colSpan="6" className="p-4 text-center italic text-slate-400">Loading Team...</td></tr> : employees.map(emp => {
                            const structure = emp.salary_structure || {}; 
                            const deductions = structure.deductions ? structure.deductions.totalDeductions : 0;
                            
                            return (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-900">{emp.full_name}</div>
                                        <div className="font-medium text-slate-400 text-[10px] uppercase">{emp.role}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-col gap-0.5 font-mono text-[10px] text-slate-500">
                                            <span>PAN: {emp.pan_number || '-'}</span>
                                            <span>UAN: {emp.uan_number || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right font-medium text-slate-500">
                                        {formatCurrency(emp.monthly_salary)}
                                    </td>
                                    <td className="p-3 text-right font-medium text-red-500">
                                        -{formatCurrency(deductions)}
                                    </td>
                                    <td className="p-3 text-right font-bold font-mono text-emerald-600 bg-emerald-50/50">
                                        {formatCurrency(emp.net_payable_monthly || emp.monthly_salary)}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${emp.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                         {employees.length === 0 && !loading && (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-400">No employees found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmployeeTable;