import React, { useMemo } from 'react';
import { 
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
    Tooltip, CartesianGrid, ReferenceLine, Cell 
} from 'recharts';

const IncomeAnalysis = ({ ledger }) => {
    
    // --- 1. DATA PROCESSING ENGINE ---
    const { revenue, capital, assets, trend, totals } = useMemo(() => {
        const revData = [];
        const capData = [];
        const astData = [];
        const trendMap = {};
        
        let tRev = 0, tCap = 0, tAst = 0;

        // Process only CREDITS (Income)
        ledger.filter(t => t.type === 'CREDIT').forEach(t => {
            const amt = Number(t.amount);
            const date = new Date(t.transaction_date);
            const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            
            // 1. Categorize
            // Adjust these text matches based on your exact Category names in Supabase
            const isRevenue = ['Revenue', 'Sales', 'Service', 'Retainer'].some(k => (t.category||'').includes(k));
            const isCapital = ['Equity', 'Loan', 'Funding', 'Investment'].some(k => (t.category||'').includes(k));
            const isAsset   = ['Asset', 'Exit', 'Liquidation'].some(k => (t.category||'').includes(k));

            if (isRevenue) {
                revData.push({ name: t.description || 'Unknown', value: amt, date: t.transaction_date });
                tRev += amt;
            } else if (isCapital) {
                capData.push({ name: t.sub_category || 'Funding', value: amt, date: t.transaction_date });
                tCap += amt;
            } else {
                astData.push({ name: t.asset_name || 'Asset Sale', value: amt, date: t.transaction_date });
                tAst += amt;
            }

            // 2. Trend Builder
            if (!trendMap[monthKey]) trendMap[monthKey] = { name: monthKey, Income: 0, dateObj: date };
            trendMap[monthKey].Income += amt;
        });

        // Sort Trend by Date
        const trendList = Object.values(trendMap).sort((a,b) => a.dateObj - b.dateObj);

        return { 
            revenue: revData, 
            capital: capData, 
            assets: astData, 
            trend: trendList,
            totals: { tRev, tCap, tAst } 
        };
    }, [ledger]);

    const formatCompact = (val) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
            
            {/* ROW 1: THE BIG NUMBERS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard title="Operating Revenue" amount={totals.tRev} icon="fa-briefcase" color="text-emerald-500" bg="bg-emerald-50" border="border-emerald-100" />
                <SummaryCard title="Capital Raised" amount={totals.tCap} icon="fa-building-columns" color="text-blue-500" bg="bg-blue-50" border="border-blue-100" />
                <SummaryCard title="Asset Realization" amount={totals.tAst} icon="fa-trophy" color="text-amber-500" bg="bg-amber-50" border="border-amber-100" />
            </div>

            {/* ROW 2: DETAILED GRAPHS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. REVENUE STREAM (OPERATING) */}
                <ChartCard title="Operating Cash Flow" subtitle="Recurring & Sales Income" isEmpty={revenue.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenue.length ? revenue : [{name: 'No Data', value: 1000}]} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                            <Tooltip cursor={{fill: 'transparent'}} formatter={(val) => revenue.length ? formatCurrency(val) : 'No Data'} />
                            <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                                {revenue.length 
                                    ? revenue.map((_, i) => <Cell key={i} fill="#10b981" />) // Green
                                    : <Cell fill="#e2e8f0" /> // Grey (Empty State)
                                }
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 2. CAPITAL STACK (FUNDING) */}
                <ChartCard title="Capital Injection" subtitle="Loans, Equity & Grants" isEmpty={capital.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={capital.length ? capital : [{name: 'No Data', value: 1000}]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={formatCompact} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: '#eff6ff'}} formatter={(val) => capital.length ? formatCurrency(val) : 'No Data'} />
                            <Bar dataKey="value" barSize={40} radius={[4, 4, 0, 0]}>
                                {capital.length 
                                    ? capital.map((_, i) => <Cell key={i} fill="#3b82f6" />) // Blue
                                    : <Cell fill="#e2e8f0" /> // Grey
                                }
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 3. ASSET REALIZATION (EXITS) */}
                <ChartCard title="Asset Liquidation" subtitle="Exits & Dividends" isEmpty={assets.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={assets.length ? assets : [{name: 'No Data', value: 1000}]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={formatCompact} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: '#fffbeb'}} formatter={(val) => assets.length ? formatCurrency(val) : 'No Data'} />
                            <Bar dataKey="value" barSize={40} radius={[4, 4, 0, 0]}>
                                {assets.length 
                                    ? assets.map((_, i) => <Cell key={i} fill="#f59e0b" />) // Amber
                                    : <Cell fill="#e2e8f0" /> // Grey
                                }
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 4. MASTER TREND (THE PULSE) */}
                <ChartCard title="Total Inflow Pulse" subtitle="Monthly Aggregated Income" isEmpty={trend.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trend.length ? trend : [{name: 'Jan', Income: 50}, {name: 'Feb', Income: 50}, {name: 'Mar', Income: 50}]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={trend.length ? "#6366f1" : "#94a3b8"} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={trend.length ? "#6366f1" : "#94a3b8"} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={formatCompact} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(val) => trend.length ? formatCurrency(val) : 'No Data'}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="Income" 
                                stroke={trend.length ? "#6366f1" : "#cbd5e1"} 
                                strokeWidth={3} 
                                fill="url(#colorIncome)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---

const SummaryCard = ({ title, amount, icon, color, bg, border }) => (
    <div className={`p-5 rounded-xl border ${border} bg-white shadow-sm flex items-center gap-4`}>
        <div className={`w-12 h-12 rounded-lg ${bg} ${color} flex items-center justify-center text-xl shadow-inner`}>
            <i className={`fa-solid ${icon}`}></i>
        </div>
        <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
            <div className="text-2xl font-black text-slate-900 mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)}
            </div>
        </div>
    </div>
);

const ChartCard = ({ title, subtitle, children, isEmpty }) => (
    <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden ${isEmpty ? 'grayscale opacity-80' : ''}`}>
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">{title}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{subtitle}</p>
            </div>
            {isEmpty && (
                <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-1 rounded uppercase">No Data</span>
            )}
        </div>
        <div className="h-64 relative z-10">
            {children}
        </div>
        
        {/* Empty State Watermark */}
        {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center z-0 opacity-5 pointer-events-none">
                <i className="fa-solid fa-chart-simple text-9xl"></i>
            </div>
        )}
    </div>
);

export default IncomeAnalysis;