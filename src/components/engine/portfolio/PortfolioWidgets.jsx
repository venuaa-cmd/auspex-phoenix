import React from 'react';

export const MetricBadge = ({ label, value, isGood, isBad }) => (
    <div className={`flex flex-col items-center justify-center px-1 py-1 rounded border min-w-[55px] ${isGood ? 'bg-green-500/10 border-green-500/30 text-green-400' : isBad ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-slate-400'}`}>
        <span className="text-[7px] uppercase font-black opacity-60 tracking-tighter">{label}</span>
        <span className="text-[10px] font-mono font-bold">{value}</span>
    </div>
);

export const GlobalMetric = ({ label, value, subtext, color }) => (
    <div className={`flex flex-col p-6 rounded-3xl border bg-[#0f172a] shadow-xl ${color === 'brand' ? 'border-[#facc15]/30' : color === 'green' ? 'border-green-500/30' : color === 'red' ? 'border-red-500/30' : 'border-white/5'}`}>
        <span className={`text-[10px] uppercase font-black tracking-widest mb-2 ${color === 'brand' ? 'text-[#facc15]' : color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' : 'text-slate-500'}`}>{label}</span>
        <span className={`text-3xl font-black ${color === 'brand' ? 'text-white' : 'text-slate-200'}`}>{value}</span>
        {subtext && <span className="text-[10px] text-slate-500 mt-2 font-bold">{subtext}</span>}
    </div>
);