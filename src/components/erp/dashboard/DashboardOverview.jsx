import React, { useMemo, useState } from 'react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector, 
    BarChart, Bar, XAxis, YAxis, Legend, CartesianGrid 
} from 'recharts';

/**
 * RENDERER: Active Sector Highlight
 * Provides a stable visual anchor so the chart doesn't "flicker" on hover.
 */
const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-black text-xs uppercase tracking-tighter">
                {payload.name}
            </text>
            <Sector
                cx={cx} cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx} cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 6}
                outerRadius={outerRadius + 10}
                fill={fill}
            />
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
            <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#334155" className="text-[10px] font-black uppercase">
                {`₹${(value / 10000000).toFixed(2)} Cr`}
            </text>
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#94a3b8" className="text-[9px] font-bold">
                {`(${(percent * 100).toFixed(2)}%)`}
            </text>
        </g>
    );
};

const DashboardOverview = ({ ledger = [], assets = [] }) => {
    const [activeIndexMarket, setActiveIndexMarket] = useState(0);
    const [activeIndexBurn, setActiveIndexBurn] = useState(0);

    // --- 1. KPI ENGINE ---
    const kpis = useMemo(() => {
        let cashOnHand = 0;
        ledger.forEach(t => { 
            if (t.status === 'REALIZED' || t.status === 'CLEARED') { 
                if (t.type === 'CREDIT') cashOnHand += Number(t.amount); 
                if (t.type === 'DEBIT') cashOnHand -= Number(t.amount); 
            } 
        });

        const totalPortfolioValue = assets.reduce((sum, a) => sum + Number(a.current_valuation || 0), 0);
        const totalAssets = totalPortfolioValue + cashOnHand; 
        const burn = ledger.filter(t => t.type === 'DEBIT' && t.status !== 'PROJECTED').reduce((sum, t) => sum + Number(t.amount), 0);
        
        const liquidAssets = assets.filter(a => ['PUBLIC_STOCK', 'CRYPTO', 'BULLION'].includes(a.asset_type)).reduce((sum, a) => sum + Number(a.current_valuation || 0), 0);
        const fixedAssets = totalPortfolioValue - liquidAssets;

        return { cashOnHand, totalPortfolioValue, totalAssets, burn, liquidAssets, fixedAssets };
    }, [ledger, assets]);

    const marketData = [
        { name: 'Cash', value: kpis.cashOnHand, fill: '#10b981' },
        { name: 'Liquid Assets', value: kpis.liquidAssets, fill: '#6366f1' },
        { name: 'Fixed Assets', value: kpis.fixedAssets, fill: '#f59e0b' }
    ];

    const formatCr = (val) => `₹${(val / 10000000).toFixed(2)} Cr`;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* KPI STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard title="Net Liquidity" value={formatCr(kpis.cashOnHand)} sub="Ready for Deployment" color="text-emerald-600" />
                <KPICard title="Portfolio Alpha" value={formatCr(kpis.totalPortfolioValue)} sub="Current Asset Value" color="text-indigo-600" />
                <KPICard title="Total Assets" value={formatCr(kpis.totalAssets)} sub="System Nominal" color="text-slate-900" />
                <KPICard title="Gross Burn" value={formatCr(kpis.burn)} sub="Life-to-Date Outflow" color="text-rose-600" />
            </div>

            {/* CHARTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 1. ASSET COMPOSITION PIE */}
                <div className="lg:col-span-6 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative">
                    <div className="mb-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Treasury_Composition_Audit</h3>
                        <p className="text-sm font-black text-slate-900 mt-1 uppercase">Capital_Split_By_Liquidity</p>
                    </div>
                    
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    activeIndex={activeIndexMarket}
                                    activeShape={renderActiveShape}
                                    data={marketData}
                                    cx="50%" cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    dataKey="value"
                                    onMouseEnter={(_, index) => setActiveIndexMarket(index)}
                                >
                                    {marketData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={4} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => formatCr(val)} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. BURN VELOCITY BAR */}
                <div className="lg:col-span-6 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational_Hemorrhage_Monitor</h3>
                        <p className="text-sm font-black text-slate-900 mt-1 uppercase">Top_5_Burn_Categories</p>
                    </div>
                    <div className="h-80 w-full">
                        <BurnChart ledger={ledger} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, sub, color }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</h4>
        <div className={`text-xl font-black mt-2 tracking-tighter ${color}`}>{value}</div>
        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">{sub}</p>
    </div>
);

const BurnChart = ({ ledger }) => {
    const data = useMemo(() => {
        const map = {};
        ledger.filter(t => t.type === 'DEBIT' && t.status !== 'PROJECTED').forEach(t => {
            const cat = t.category || 'Misc';
            map[cat] = (map[cat] || 0) + Number(t.amount);
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [ledger]);

    const formatCompact = (val) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(val);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={90} 
                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b', textTransform: 'uppercase' }} 
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="bg-slate-900 text-white p-3 rounded-xl border border-white/10 shadow-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{payload[0].payload.name}</p>
                                    <p className="text-sm font-black mt-1 font-mono">₹{payload[0].value.toLocaleString()}</p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={32} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default DashboardOverview;