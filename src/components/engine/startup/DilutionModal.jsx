import React, { useState, useMemo } from 'react';
import { formatCurrency, formatCurrencyInput } from './IntelUtils';
// --- INTERNAL HELPERS (RETAINED FOR STABILITY) ---

const DilutionModal = ({ investment, onClose }) => {
    // DATA EXTRACTION FROM PROPS
    const currentEquity = Number(investment.equityPct || investment.equity_pct || 0);
    const investedAmount = Number(investment.amount_invested || investment.amount || investment.fundingAmount || 0);
    const currentValuation = Number(investment.currentValuation || investment.currentValue || 0);

    // LOGIC: CALCULATE EFFECTIVE POST-MONEY
    const effectiveCurrentPostMoney = currentValuation > 0 
        ? currentValuation 
        : (currentEquity > 0 ? (investedAmount / (currentEquity / 100)) : 0);

    // STATE: SIMULATION INPUTS
    const [preMoney, setPreMoney] = useState(effectiveCurrentPostMoney * 2); 
    const [preMoneyDisplay, setPreMoneyDisplay] = useState(formatCurrency(effectiveCurrentPostMoney * 2).replace('₹', '').trim());
    
    const [raiseAmount, setRaiseAmount] = useState(50000000); 
    const [raiseDisplay, setRaiseDisplay] = useState("5,00,00,000");

    // HANDLERS
    const handlePreMoneyChange = (val) => {
        const { raw, display } = formatCurrencyInput(val);
        setPreMoney(raw);
        setPreMoneyDisplay(display);
    };

    const handleRaiseChange = (val) => {
        const { raw, display } = formatCurrencyInput(val);
        setRaiseAmount(raw);
        setRaiseDisplay(display);
    };

    // THE INTEL ENGINE: DILUTION MATH
    const stats = useMemo(() => {
        const nextPostMoney = Number(preMoney) + Number(raiseAmount);
        const newInvestorsStakePct = nextPostMoney > 0 ? (raiseAmount / nextPostMoney) * 100 : 0;
        const dilutionFactor = (100 - newInvestorsStakePct) / 100;
        const myNewEquity = currentEquity * dilutionFactor;
        const myNewValue = (nextPostMoney * myNewEquity) / 100;
        const valueChange = myNewValue - ((effectiveCurrentPostMoney * currentEquity) / 100);

        return {
            nextPostMoney,
            newInvestorsStakePct,
            myNewEquity,
            myNewValue,
            valueChange,
            dilutionPct: currentEquity - myNewEquity
        };
    }, [preMoney, raiseAmount, currentEquity, effectiveCurrentPostMoney]);

    // STYLING MACROS
    const darkInput = "w-full bg-[#020617] border border-white/10 rounded-lg p-3 text-white text-xs focus:border-[var(--brand-color)] outline-none font-mono text-right shadow-inner";
    const labelStyle = "text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2 block";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-[#0f172a] border border-blue-500/30 w-full max-w-lg rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.2)] p-8 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* HEADER */}
                <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tighter flex items-center gap-3">
                            <i className="fa-solid fa-chart-pie text-blue-400"></i> Dilution Simulator
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                            Modeling Expansion for <span className="text-white underline decoration-blue-500/50 underline-offset-4">{investment.companyName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
                </div>

                {/* CURRENT STATE CARD */}
                <div className="bg-black/40 rounded-2xl p-6 mb-8 grid grid-cols-2 gap-6 border border-white/5 shadow-inner">
                    <div>
                        <span className={labelStyle}>Current Stake</span>
                        <div className="text-white font-bold font-mono text-xl tracking-tighter">{currentEquity}%</div>
                    </div>
                    <div className="text-right">
                        <span className={labelStyle}>Current Post-Money</span>
                        <div className="text-white font-bold font-mono text-lg tracking-tighter">{formatCurrency(effectiveCurrentPostMoney)}</div>
                    </div>
                </div>

                {/* SIMULATION INPUTS */}
                <div className="space-y-6 mb-10">
                    <h4 className="text-[10px] font-bold text-[var(--brand-color)] uppercase tracking-[0.3em] border-b border-white/10 pb-2">Hypothetical Future Round</h4>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className={labelStyle}>Projected Pre-Money</label>
                            <input type="text" value={preMoneyDisplay} onChange={e => handlePreMoneyChange(e.target.value)} className={darkInput} />
                        </div>
                        <div>
                            <label className={labelStyle}>New Capital Raise</label>
                            <input type="text" value={raiseDisplay} onChange={e => handleRaiseChange(e.target.value)} className={darkInput} />
                        </div>
                    </div>
                </div>

                {/* RESULTS GRID */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-900/10 border border-blue-500/30 p-5 rounded-2xl">
                        <span className="text-[9px] text-blue-400 uppercase font-bold tracking-widest block mb-2">Adjusted Equity</span>
                        <div className="text-2xl font-bold text-white">{stats.myNewEquity.toFixed(2)}%</div>
                        <div className={`text-[9px] font-bold mt-2 uppercase ${stats.dilutionPct > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            Dilution: {stats.dilutionPct > 0 ? `-${stats.dilutionPct.toFixed(2)}%` : 'None'}
                        </div>
                    </div>

                    <div className={`bg-opacity-10 border p-5 rounded-2xl ${stats.valueChange >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <span className={`text-[9px] uppercase font-bold tracking-widest block mb-2 ${stats.valueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>Projected Stake Value</span>
                        <div className="text-2xl font-bold text-white">{formatCurrency(stats.myNewValue)}</div>
                        <div className="text-[9px] text-slate-500 font-bold mt-2 uppercase">
                            {stats.valueChange >= 0 ? 'Appreciation Expected' : 'Burn-adjusted value'}
                        </div>
                    </div>
                </div>

                <button onClick={onClose} className="w-full mt-10 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-bold uppercase tracking-[0.3em] text-[10px] transition-all border border-white/5 shadow-xl">Close Simulator</button>
            </div>
        </div>
    );
};

export default DilutionModal;