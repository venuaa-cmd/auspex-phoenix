import React, { useState } from 'react';
import { formatCurrency } from './IntelUtils';

/**
 * AUSPEX INTEL CORE - EXIT SIMULATOR
 * Real-time speculative model for stake value and multiples.
 */
const ExitSimulator = ({ currentValuation, equityPct, totalInvested }) => {
    // Default valuation simulation target is 10x of the deployment basis
    const [exitValuation, setExitValuation] = useState(currentValuation || totalInvested * 10);
    
    const myStakeValue = (exitValuation * equityPct) / 100;
    const multiple = totalInvested > 0 ? (myStakeValue / totalInvested).toFixed(1) : 0;

    return (
        <div className="bg-[#0f172a] border border-blue-500/30 rounded-xl p-6 mb-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl pointer-events-none"></div>
            
            <h3 className="text-white font-bold uppercase tracking-tighter mb-4 flex items-center gap-2">
                <i className="fa-solid fa-crystal-ball text-blue-400"></i> Exit Simulator
            </h3>

            <div className="mb-6">
                <input 
                    type="range" 
                    min={totalInvested} 
                    max={totalInvested * 100} 
                    step={totalInvested} 
                    value={exitValuation} 
                    onChange={(e) => setExitValuation(Number(e.target.value))} 
                    className="w-full accent-blue-500 cursor-pointer" 
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
                    <span>1x</span>
                    <span className="text-white italic">Target: {formatCurrency(exitValuation)}</span>
                    <span>100x</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-4">
                <div>
                    <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Projected Payday</label>
                    <div className="text-xl font-bold text-white italic tracking-tighter">
                        {formatCurrency(myStakeValue)}
                    </div>
                </div>
                <div className="text-right">
                    <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Multiple</label>
                    <div className={`text-xl font-bold tracking-tighter ${multiple > 5 ? 'text-green-400' : 'text-blue-400'}`}>
                        {multiple}x
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExitSimulator;