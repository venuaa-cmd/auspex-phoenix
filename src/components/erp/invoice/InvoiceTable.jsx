import React, { useState } from 'react';

const InvoiceTable = ({ invoices, loading, type, onVoid, onViewGenerated }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'issue_date', direction: 'desc' });

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const sortedInvoices = [...invoices].sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (sortConfig.key === 'amount_total') return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        return 1;
    });

    return (
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
             <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <i className={`fa-solid ${type === 'PAYABLE' ? 'fa-file-invoice' : 'fa-file-invoice-dollar'} text-slate-400`}></i>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-800">
                        {type === 'PAYABLE' ? 'Payables Registry' : 'Receivables Registry'}
                    </h3>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity</th>
                            {/* 1. ADDED CATEGORY COLUMN */}
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="p-6 text-right w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="6" className="p-32 text-center text-[10px] font-black uppercase tracking-[0.5em] opacity-20 animate-pulse">Syncing Directory...</td></tr>
                        ) : sortedInvoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-slate-50/80 transition-all group">
                                <td className="p-6 font-black text-[12px] text-slate-500 tabular-nums uppercase">{inv.issue_date}</td>
                                <td className="p-6">
                                    <div className="font-black text-slate-900 uppercase text-[14px] tracking-tight">{inv.display_name}</div>
                                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{inv.invoice_no}</div>
                                </td>
                                <td className="p-6">
                                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-sm text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                        {inv.category || 'GENERAL'}
                                    </span>
                                </td>
                                <td className="p-6 text-right">
                                    <div className="font-black text-[15px] text-slate-900 tabular-nums tracking-tighter">{formatCurrency(inv.amount_total)}</div>
                                    {inv.is_recurring && <div className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter mt-1 italic">Recurring: {inv.frequency}</div>}
                                </td>
                                <td className="p-6 text-center">
                                    {/* 2. AUTO-STAMP RECEIVED FOR RECEIVABLES */}
                                    <span className={`px-4 py-1.5 rounded-sm text-[9px] font-black uppercase border tracking-widest ${
                                        inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                        {inv.status === 'PAID' && type === 'RECEIVABLE' ? 'RECEIVED' : inv.status}
                                    </span>
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {inv.metadata?.is_generated && <button onClick={() => onViewGenerated(inv)} className="w-8 h-8 rounded-sm border border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><i className="fa-solid fa-file-invoice"></i></button>}
                                        {inv.status === 'PENDING' && <button onClick={() => onVoid(inv)} className="w-8 h-8 rounded-sm border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"><i className="fa-solid fa-ban"></i></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InvoiceTable;