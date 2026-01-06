import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const TreasuryLedger = ({ toWords, isSuperAdmin }) => {
    const [ledgerBalance, setLedgerBalance] = useState(0);

    useEffect(() => {
        const fetchLedger = async () => {
            const { data: credits } = await supabase.from('fund_ledger').select('amount').eq('type', 'CREDIT');
            const { data: debits } = await supabase.from('fund_ledger').select('amount').eq('type', 'DEBIT');
            const total = (credits?.reduce((a,b)=>a+Number(b.amount),0)||0) - (debits?.reduce((a,b)=>a+Number(b.amount),0)||0);
            setLedgerBalance(total);
        };
        fetchLedger();
    }, []);

    return (
        <div className="bg-[#0f172a] border border-[#FFD700]/10 p-10 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center relative overflow-hidden shadow-2xl">
            <div className="z-10">
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase underline decoration-[#FFD700]/30 decoration-8 underline-offset-[16px]">Treasury Reservoir</h2>
                <p className="text-[10px] font-bold text-[#FFD700] uppercase mt-4 tracking-widest opacity-60 italic">Liquidity available for immediate deployment</p>
            </div>
            <div className="text-right z-10 bg-black/40 p-8 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] block mb-2 opacity-50">Current Dry Powder</label>
                <div className="text-5xl font-black text-white tracking-tighter italic font-mono">{toWords(ledgerBalance)}</div>
            </div>
        </div>
    );
};

export default TreasuryLedger;