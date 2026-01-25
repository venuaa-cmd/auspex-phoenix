import React from 'react';

/**
 * GOVERNOR VISUALS: SECTOR UTILIZATION MONITOR
 * Used in the Domain Audit Grid.
 * FIX: Added defensive check for 'domain' to prevent .replace() crash.
 */
export const ManagerUtilizationBar = ({ domain = "", spent = 0, total = 0 }) => {
    const pct = total > 0 ? (spent / total) * 100 : 0;
    
    // Aapti Visual Logic: Emerald for high utilization, Red for stagnation/overload
    const color = pct >= 60 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
    
    // Defensive String cleanup
    const safeDomain = (domain || "Unassigned_Node").replace(/\(India\)/g, '').trim();
    
    return (
        <div className="mb-4">
            <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                <span className="text-slate-400 tracking-widest">{safeDomain}</span>
                <span className={pct >= 60 ? 'text-emerald-400' : 'text-red-400'}>{pct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                    className={`h-full ${color} transition-all duration-1000 ease-out`} 
                    style={{ width: `${Math.min(pct, 100)}%` }} 
                />
            </div>
        </div>
    );
};

/**
 * GOVERNOR VISUALS: PERSONNEL ROSTER MONITOR
 * Used in the Active Strategist Roster.
 * Handles complex Manager object parsing and investment calculation.
 */
export const PersonnelUtilizationBar = ({ manager, investments = [] }) => {
    // 1. DEFENSIVE IDENTITY CHECK
    const safeName = (manager?.name || "Unknown_Strategist").replace(/\(India\)/g, '').trim();
    
    // 2. CALCULATE DEPLOYMENT
    const mgrInvestments = investments.filter(i => i.fund_manager_id === manager?.id);
    const totalSpent = mgrInvestments.reduce((sum, i) => sum + (Number(i.investment_amount || i.amount_invested) || 0), 0);
    
    // 3. DEFENSIVE BUDGET PARSING
    let annualLimit = 0;
    try {
        const budgetData = typeof manager?.budget === 'string' 
            ? JSON.parse(manager.budget) 
            : manager?.budget;
        annualLimit = Number(budgetData?.annual || 0);
    } catch (e) {
        annualLimit = 0;
    }

    const utilization = annualLimit > 0 ? (totalSpent / annualLimit) * 100 : 0;
    const isOverCap = utilization > 100;

    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                    {safeName}_Deployment_Load
                </span>
                <span className={`text-[10px] font-mono font-bold ${isOverCap ? 'text-rose-500' : 'text-cyan-400'}`}>
                    {utilization.toFixed(1)}%
                </span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                    className={`h-full transition-all duration-1000 ease-out ${
                        isOverCap 
                        ? 'bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.4)]' 
                        : 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    }`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                />
            </div>
        </div>
    );
};