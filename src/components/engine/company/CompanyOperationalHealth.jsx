import React from 'react';
import InputWithWords from './InputWithWords';
import { formatCurrency, convertToWords } from './IntelUtils';

const CompanyOperationalHealth = ({ company, isEditing, isSuperAdmin, onUpdate, runway }) => {
    const labelClass = "text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest";

    return (
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white uppercase tracking-tighter mb-8 flex items-center gap-3 underline decoration-red-500/30 decoration-4 underline-offset-8">Operational Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {isEditing && isSuperAdmin ? (
                    <>
                        <InputWithWords label="Liquid Cash Assets" value={company.cash_balance} field="cash_balance" onChange={onUpdate} />
                        <InputWithWords label="Monthly Burn Rate" value={company.monthly_burn} field="monthly_burn" onChange={onUpdate} />
                    </>
                ) : (
                    <>
                        <div>
                            <label className={labelClass}>Cash on Hand</label>
                            <div className="text-white font-bold font-mono text-2xl tracking-tighter">{formatCurrency(company.cash_balance)}</div>
                            <div className="text-[9px] text-slate-500 font-bold mt-1 tracking-widest">{convertToWords(company.cash_balance)}</div>
                        </div>
                        <div>
                            <label className={labelClass}>Monthly Burn</label>
                            <div className="text-white font-bold font-mono text-2xl tracking-tighter">{formatCurrency(company.monthly_burn)}</div>
                            <div className="text-[9px] text-slate-500 font-bold mt-1 tracking-widest">{convertToWords(company.monthly_burn)}</div>
                        </div>
                    </>
                )}
                <div className={`rounded-2xl p-4 border flex flex-col justify-center items-center text-center shadow-xl ${runway.status === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 animate-pulse' : 'bg-green-500/10 border-green-500/30'}`}>
                    <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Runway</label>
                    <div className={`text-4xl font-bold tracking-tighter ${runway.color}`}>{runway.months}</div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] mt-2 opacity-70">Months Left</span>
                </div>
            </div>
        </div>
    );
};

export default CompanyOperationalHealth;