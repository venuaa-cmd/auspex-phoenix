import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import BankForm from './BankForm'; 

const BankRegistry = ({ onSelectBank }) => {
    const [accounts, setAccounts] = useState([]);
    const [showForm, setShowForm] = useState(false);

    const fetchAccounts = async () => {
        const { data } = await supabase.from('erp_bank_accounts').select('*');
        setAccounts(data || []);
    };

    useEffect(() => { fetchAccounts(); }, []);

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(v || 0);

    return (
        <div className="w-full min-h-screen bg-[#F1F5F9] p-10 font-sans text-slate-900 antialiased">
            
            {/* 1. MASTER HUB HEADER */}
            <div className="max-w-[1600px] mx-auto flex justify-between items-end mb-12 border-b-2 border-slate-200 pb-8">
                <div>
                    <h1 className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 mb-3">Liquidity_Registry_Node</h1>
                    <p className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">Financial Command Hub</p>
                </div>
                <button 
                    onClick={() => setShowForm(true)}
                    className="bg-slate-900 text-white px-10 py-4 text-[11px] font-black uppercase tracking-[0.2em] rounded-sm hover:bg-indigo-600 transition-all shadow-2xl active:scale-95"
                >
                    + Register New Account
                </button>
            </div>

            {/* 2. DYNAMIC NODE GRID */}
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {accounts.length > 0 ? accounts.map((acc) => (
                    <div 
                        key={acc.id} 
                        onClick={() => onSelectBank(acc.id)}
                        className="bg-white border border-slate-200 p-10 rounded-sm shadow-sm hover:shadow-2xl hover:border-indigo-500 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-sm border border-slate-100">
                                {acc.account_type || 'CURRENT'}
                            </span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors leading-tight mb-2">
                            {acc.bank_name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-tighter">ID: {acc.account_number?.slice(-4).padStart(12, 'X')}</p>
                        
                        <div className="mt-12 pt-8 border-t border-slate-50 flex justify-between items-end">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Available Liquidity</span>
                                <span className="text-3xl font-black text-slate-900 tabular-nums">{fmt(acc.current_balance)}</span>
                            </div>
                            <i className="fa-solid fa-chevron-right text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all"></i>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-40 border-2 border-dashed border-slate-300 rounded-sm flex flex-col items-center justify-center bg-white/50">
                        <i className="fa-solid fa-building-columns text-5xl text-slate-200 mb-6"></i>
                        <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">No Active Liquidity Nodes Synchronized</p>
                    </div>
                )}
            </div>

            {/* 3. REGISTRATION MODAL */}
            {showForm && (
                <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 overflow-hidden">
                    <BankForm 
                        onComplete={() => { setShowForm(false); fetchAccounts(); }} 
                        onCancel={() => setShowForm(false)} 
                    />
                </div>
            )}
        </div>
    );
};

export default BankRegistry;