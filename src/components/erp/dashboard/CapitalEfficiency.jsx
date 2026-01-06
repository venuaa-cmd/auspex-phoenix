import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const CapitalEfficiency = ({ assets, loans, equityRounds }) => {
    
    // 1. COST OF DEBT
    const debtStats = useMemo(() => {
        let totalDebt = 0;
        let weightedInterest = 0;
        loans.forEach(l => {
            const principal = Number(l.principal_amount);
            const rate = Number(l.interest_rate);
            totalDebt += principal;
            weightedInterest += (principal * rate);
        });
        const avgCost = totalDebt > 0 ? (weightedInterest / totalDebt) : 0;
        return { totalDebt, avgCost };
    }, [loans]);

    // 2. ASSET YIELD
    const assetStats = useMemo(() => {
        let totalInvested = 0;
        let currentVal = 0;
        assets.forEach(a => {
            totalInvested += Number(a.invested_amount);
            currentVal += Number(a.current_valuation);
        });
        const gain = currentVal - totalInvested;
        const yieldPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
        return { totalInvested, currentVal, yieldPct };
    }, [assets]);

    // 3. SPREAD
    const spread = assetStats.yieldPct - debtStats.avgCost;
    const isLeveragePositive = spread > 0;

    const formatPct = (n) => `${n.toFixed(2)}%`;
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(val);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.3s_ease]">
            <div className="space-y-6">
                <div className={`p-6 rounded-xl border ${isLeveragePositive ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} relative overflow-hidden`}>
                    <div className="relative z-10">
                        <h3 className={`text-xs font-black uppercase tracking-widest ${isLeveragePositive ? 'text-emerald-800' : 'text-red-800'}`}>Capital Efficiency Score</h3>
                        <div className="flex items-end gap-3 mt-2">
                            <span className={`text-4xl font-black ${isLeveragePositive ? 'text-emerald-600' : 'text-red-600'}`}>{spread > 0 ? '+' : ''}{spread.toFixed(2)}%</span>
                            <span className="text-xs font-bold text-slate-500 mb-1">Net Spread</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-medium">
                            {isLeveragePositive 
                                ? "Great Job. Your assets are growing faster than your debt cost." 
                                : "Warning. You are paying more interest than your assets are earning."}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Cost of Debt</div>
                        <div className="text-2xl font-black text-red-500 mt-1">{formatPct(debtStats.avgCost)}</div>
                        <div className="text-xs text-slate-400 mt-1">On ₹{formatCurrency(debtStats.totalDebt)} Principal</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Asset Yield</div>
                        <div className="text-2xl font-black text-blue-600 mt-1">{formatPct(assetStats.yieldPct)}</div>
                        <div className="text-xs text-slate-400 mt-1">On ₹{formatCurrency(assetStats.totalInvested)} Assets</div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase mb-4">Leverage Analysis</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { name: 'Debt Cost', value: debtStats.avgCost, fill: '#ef4444' },
                            { name: 'Asset Yield', value: assetStats.yieldPct, fill: '#2563eb' },
                            { name: 'Net Spread', value: spread, fill: isLeveragePositive ? '#10b981' : '#f59e0b' }
                        ]} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={80} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                            <Tooltip formatter={(val) => `${val.toFixed(2)}%`} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                {[{ fill: '#ef4444' }, { fill: '#3b82f6' }, { fill: isLeveragePositive ? '#10b981' : '#ef4444' }].map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Debt Load: ₹{formatCurrency(debtStats.totalDebt)}</span>
                    <span>Equity Raised: ₹{formatCurrency(equityRounds.reduce((s, r) => s + Number(r.amount), 0))}</span>
                </div>
            </div>
        </div>
    );
};

export default CapitalEfficiency;