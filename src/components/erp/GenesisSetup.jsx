import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const GenesisSetup = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // FORM STATE
    const [incDate, setIncDate] = useState('2023-01-01');
    const [totalCapital, setTotalCapital] = useState('80000000000'); // 8000 Cr default
    const [myShare, setMyShare] = useState(78);
    const [investorShare, setInvestorShare] = useState(22);
    
    // FORMATTER
    const formatCr = (val) => {
        const cr = val / 10000000;
        return `${cr.toLocaleString()} Cr`;
    };

    const handleGenesis = async () => {
        setLoading(true);

        // 1. CREATE ORGANIZATION
        const { error: orgError } = await supabase.from('erp_organization').insert([{
            legal_name: 'Auspex Investments Pvt Ltd',
            incorporation_date: incDate,
            structure_type: 'PVT_LTD',
            authorized_capital: totalCapital
        }]);

        if (orgError) { alert('Genesis Failed: ' + orgError.message); setLoading(false); return; }

        // 2. CREATE CAP TABLE
        const myAmount = (totalCapital * (myShare / 100));
        const invAmount = (totalCapital * (investorShare / 100));

        const capTableData = [
            {
                shareholder_name: 'Gourav Kumar Sahu',
                stake_percentage: myShare,
                shares_held: myShare * 1000000, // Mock share count calculation
                invested_amount: myAmount,
                joined_date: incDate,
                share_class: 'FOUNDER'
            },
            {
                shareholder_name: 'Strategic Investor',
                stake_percentage: investorShare,
                shares_held: investorShare * 1000000,
                invested_amount: invAmount,
                joined_date: incDate, // Or later
                share_class: 'PREFERRED'
            }
        ];

        const { error: capError } = await supabase.from('erp_cap_table').insert(capTableData);
        if (capError) { alert('Cap Table Error: ' + capError.message); setLoading(false); return; }

        // 3. INJECT THE BIG BANG (LEDGER ENTRY)
        // This is the 8000 Cr Opening Balance
        const { error: ledgerError } = await supabase.from('erp_ledger').insert([{
            transaction_date: new Date().toISOString().split('T')[0], // Today (Re-infusion) or Inc Date
            type: 'CREDIT',
            category: 'Funding',
            sub_category: 'Share Capital',
            amount: totalCapital,
            vendor: 'Shareholders',
            description: 'Genesis Capital Infusion (Paid-Up Capital)',
            status: 'REALIZED',
            frequency: 'ONE_TIME',
            is_locked: true, // CANNOT BE DELETED
            metadata: { note: 'The Foundation of Auspex' }
        }]);

        if (ledgerError) { alert('Ledger Injection Error: ' + ledgerError.message); }
        else {
            onComplete(); // Close Wizard
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.5s_ease]">
                
                {/* HEADER */}
                <div className="bg-slate-950 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Genesis Protocol</h1>
                    <p className="text-slate-400 text-sm">Initializing Corporate Entity & Capital Structure</p>
                </div>

                <div className="p-8 space-y-8">
                    
                    {/* STEP 1: THE ENTITY */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Legal Entity Name</label>
                            <div className="font-black text-slate-900 text-lg">Auspex Investments Pvt Ltd</div>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Incorporation Date</label>
                            <input type="date" value={incDate} onChange={e=>setIncDate(e.target.value)} className="bg-transparent font-bold text-slate-900 outline-none w-full" />
                        </div>
                    </div>

                    {/* STEP 2: THE CAPITAL */}
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                        <label className="block text-xs font-bold text-emerald-600 uppercase mb-2">Total Paid-Up Capital (Infusion)</label>
                        <div className="flex justify-center items-baseline gap-2">
                            <span className="text-2xl text-emerald-700 font-bold">₹</span>
                            <input 
                                type="number" 
                                value={totalCapital} 
                                onChange={e=>setTotalCapital(e.target.value)} 
                                className="bg-transparent text-4xl font-black text-emerald-800 outline-none w-64 text-center border-b-2 border-emerald-200 focus:border-emerald-600 transition-all"
                            />
                        </div>
                        <div className="text-sm font-bold text-emerald-500 mt-2 uppercase tracking-wider">{formatCr(totalCapital)}</div>
                    </div>

                    {/* STEP 3: THE SPLIT */}
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                            <span>Shareholding Pattern</span>
                            <span>Total: {Number(myShare) + Number(investorShare)}%</span>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex mb-4">
                            <div style={{width: `${myShare}%`}} className="bg-blue-600 h-full"></div>
                            <div style={{width: `${investorShare}%`}} className="bg-purple-600 h-full"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Gourav (Founder)</label>
                                <div className="flex items-center bg-blue-50 rounded-lg px-3 py-2">
                                    <input type="number" value={myShare} onChange={e=>setMyShare(e.target.value)} className="bg-transparent w-full font-bold text-blue-900 outline-none" />
                                    <span className="text-xs font-bold text-blue-400">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-purple-600 uppercase mb-1">Strategic Investor</label>
                                <div className="flex items-center bg-purple-50 rounded-lg px-3 py-2">
                                    <input type="number" value={investorShare} onChange={e=>setInvestorShare(e.target.value)} className="bg-transparent w-full font-bold text-purple-900 outline-none" />
                                    <span className="text-xs font-bold text-purple-400">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACTION */}
                    <button 
                        onClick={handleGenesis}
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-widest rounded-xl shadow-xl transition-all flex justify-center items-center gap-3"
                    >
                        {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-fingerprint"></i>}
                        Initialize Auspex Core
                    </button>

                </div>
            </div>
        </div>
    );
};

export default GenesisSetup;