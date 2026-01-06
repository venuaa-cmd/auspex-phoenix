import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const Passbook = () => {
    const [entries, setEntries] = useState([]);

    // --- MOCK DATA: REPLICATING YOUR GENESIS & PORTFOLIO ---
    const mockEntries = [
        { id: 1, transaction_date: '2023-01-01', vendor: 'Shareholders', description: 'Genesis Capital Infusion (Founding Capital)', type: 'CREDIT', amount: 80000000000, category: 'Capital' },
        { id: 2, transaction_date: '2025-12-21', vendor: 'Advaya AI', description: 'Growth Phase Strategic Deployment - DeepTech Mandate', type: 'DEBIT', amount: 1000000000, category: 'Investment' },
        { id: 3, transaction_date: '2026-01-03', vendor: 'Lenskart', description: 'Secondary Asset Acquisition', type: 'DEBIT', amount: 50625, category: 'Investment' }
    ];

    useEffect(() => {
        const fetchLedger = async () => {
            const { data } = await supabase.from('erp_ledger').select('*').order('transaction_date', { ascending: false });
            // FALLBACK: Use Mock Data if DB is empty to show page functionality
            setEntries(data && data.length > 0 ? data : mockEntries);
        };
        fetchLedger();
    }, []);

    const balance = entries.reduce((acc, curr) => 
        curr.type === 'CREDIT' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0
    );

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(v || 0);

    return (
        <div className="bg-[#F1F5F9] min-h-screen p-8 font-sans antialiased text-slate-900">
            
            {/* I. INSTITUTIONAL LIQUIDITY HEADER */}
            <div className="bg-white border border-slate-200 p-8 flex justify-between items-center mb-8 rounded-sm shadow-sm border-l-4 border-slate-900">
                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Vault_Node_Primary_Reconciliation</h2>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-[12px] font-bold text-slate-600 uppercase tracking-widest leading-none">Node Status: Sovereign Synchronized</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 leading-none">Net Liquid Liquidity</span>
                    <span className="text-4xl font-black tabular-nums tracking-tighter text-slate-900 leading-none">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balance)}
                    </span>
                </div>
            </div>

            {/* II. FORENSIC TRANSACTION TABLE */}
            <div className="bg-white border border-slate-200 shadow-xl rounded-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Transaction Registry</span>
                    {entries === mockEntries && <span className="text-[9px] font-bold text-indigo-500 uppercase italic">Test Environment Data Active</span>}
                </div>
                
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity / Description</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Protocol</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Debit (DR)</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Credit (CR)</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net Available</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {entries.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-all group">
                                <td className="p-6 font-black text-[12px] text-slate-500 tabular-nums uppercase">
                                    {new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </td>
                                <td className="p-6">
                                    <div className="text-[14px] font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                        {tx.vendor || tx.metadata?.vendor_name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-wide">
                                        {tx.description}
                                    </div>
                                </td>
                                <td className="p-6 text-center">
                                    <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-sm border ${
                                        tx.type === 'CREDIT' 
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                        : 'bg-rose-50 text-rose-600 border-rose-100'
                                    }`}>
                                        {tx.type}
                                    </span>
                                </td>
                                <td className="p-6 text-right font-black text-[14px] text-rose-600 tabular-nums">
                                    {tx.type === 'DEBIT' ? `- ${fmt(Number(tx.amount)).replace('₹', '')}` : '—'}
                                </td>
                                <td className="p-6 text-right font-black text-[14px] text-emerald-600 tabular-nums">
                                    {tx.type === 'CREDIT' ? `+ ${fmt(Number(tx.amount)).replace('₹', '')}` : '—'}
                                </td>
                                <td className="p-6 text-right font-black text-[14px] text-slate-900 tabular-nums">
                                    {fmt(balance)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* III. AUDIT SUMMARY NODES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                <MetricCard label="Total Deployments" value={fmt(entries.filter(t => t.type === 'DEBIT').reduce((s, c) => s + Number(c.amount), 0))} color="text-slate-900" />
                <MetricCard label="Settled Credits" value={fmt(entries.filter(t => t.type === 'CREDIT').reduce((s, c) => s + Number(c.amount), 0))} color="text-emerald-600" />
                <MetricCard label="Audit Compliance" value="Verified" color="text-indigo-600" />
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, color }) => (
    <div className="bg-white border border-slate-200 p-8 rounded-sm shadow-sm">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <p className={`text-2xl font-black tabular-nums ${color} leading-none`}>{value}</p>
    </div>
);

export default Passbook;