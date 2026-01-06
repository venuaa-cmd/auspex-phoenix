import React from 'react';

export const ManagerUtilizationBar = ({ domain, spent, total }) => {
    const pct = total > 0 ? (spent / total) * 100 : 0;
    const color = pct >= 60 ? 'bg-emerald-500' : 'bg-red-500';
    
    return (
        <div className="mb-4">
            <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                <span className="text-slate-400">{domain.replace('(India)', '')}</span>
                <span className={pct >= 60 ? 'text-emerald-400' : 'text-red-400'}>{pct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
        </div>
    );
};