import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

const WarRoom = ({ ledger, assets, employees }) => {
    
    // --- 1. LIVE TELEMETRY (REAL DATA) ---
    const financials = useMemo(() => {
        // A. Current Cash (Ledger)
        let cash = 0;
        ledger.forEach(t => {
            if (t.status === 'REALIZED' || t.status === 'CLEARED') {
                if (t.type === 'CREDIT') cash += Number(t.amount);
                if (t.type === 'DEBIT') cash -= Number(t.amount);
            }
        });

        // B. Monthly Burn (Payroll + Avg Ops)
        const payrollBurn = employees.filter(e => e.status === 'ACTIVE').reduce((sum, e) => sum + Number(e.net_payable_monthly || 0), 0);
        
        // C. Monthly Revenue (Avg last 3 months)
        const revenueTxns = ledger.filter(t => t.type === 'CREDIT' && t.category === 'Revenue');
        const avgRevenue = revenueTxns.length > 0 ? (revenueTxns.reduce((sum, t) => sum + Number(t.amount), 0) / 3) : 0; // Simplified 3-mo avg

        // D. Liquid Assets (Buffer)
        const liquidAssets = assets
            .filter(a => ['PUBLIC_STOCK', 'CRYPTO', 'BULLION'].includes(a.asset_type))
            .reduce((sum, a) => sum + Number(a.current_valuation), 0);

        return { cash, payrollBurn, avgRevenue, liquidAssets };
    }, [ledger, assets, employees]);

    // --- 2. WAR GAMING CONTROLS (SIMULATION STATE) ---
    const [scenarios, setScenarios] = useState({
        hiring: 0,      // % Increase in Payroll
        revenue: 0,     // % Growth/Decline in Sales
        market: 0,      // % Portfolio Impact
    });

    // --- 3. THE SIMULATION ENGINE ---
    const projection = useMemo(() => {
        const data = [];
        const months = 24;
        const now = new Date();

        // Apply Levers
        const adjustedBurn = financials.payrollBurn * (1 + (scenarios.hiring / 100));
        const adjustedRevenue = financials.avgRevenue * (1 + (scenarios.revenue / 100));
        const liquidBuffer = financials.liquidAssets * (1 + (scenarios.market / 100));
        
        // Base Cash Start
        let runningCash = financials.cash;
        let survivalMonth = months;
        let dipBelowZero = false;

        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            
            // Net Burn calculation
            const netBurn = adjustedBurn - adjustedRevenue; // If +ve, we are burning. If -ve, we are profitable.
            runningCash -= netBurn;

            // If cash hits zero, use liquid assets? (Optional logic, visualized as "Danger Zone")
            const totalLiquidity = runningCash + liquidBuffer;

            if (totalLiquidity <= 0 && !dipBelowZero) {
                survivalMonth = i;
                dipBelowZero = true;
            }

            data.push({
                month: label,
                cash: runningCash,
                liquidity: totalLiquidity, // Cash + Liquid Assets
                zero: 0
            });
        }

        return { data, survivalMonth, dipBelowZero };
    }, [financials, scenarios]);

    // Formatters
    const formatCompact = (val) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="grid grid-cols-12 gap-6 animate-[fadeIn_0.3s_ease]">
            
            {/* LEFT: COMMAND CONSOLE */}
            <div className="col-span-12 md:col-span-4 space-y-6">
                
                {/* HEADS UP DISPLAY */}
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-900"></div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Projected Runway</h3>
                    <div className={`text-4xl font-black ${projection.dipBelowZero ? (projection.survivalMonth < 6 ? 'text-red-600' : 'text-amber-500') : 'text-emerald-500'}`}>
                        {projection.dipBelowZero ? `${projection.survivalMonth} Months` : 'Infinite'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase">
                        {projection.dipBelowZero ? "Cash Death Date" : "Sustainable Growth"}
                    </div>
                    {projection.dipBelowZero && (
                        <div className="mt-2 text-sm font-bold text-slate-900">
                            {projection.data[projection.survivalMonth]?.month}
                        </div>
                    )}
                </div>

                {/* SLIDERS */}
                <div className="bg-blue-900 text-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-sm font-bold uppercase tracking-widest border-b border-blue-700 pb-3 mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-sliders"></i> War Gaming
                    </h3>

                    {/* LEVER 1: HIRING */}
                    <div className="mb-6">
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                            <span className="text-blue-200">Hiring Velocity</span>
                            <span className={scenarios.hiring > 0 ? 'text-red-400' : 'text-emerald-400'}>{scenarios.hiring > 0 ? '+' : ''}{scenarios.hiring}%</span>
                        </div>
                        <input 
                            type="range" min="-50" max="100" step="5" 
                            value={scenarios.hiring} 
                            onChange={(e) => setScenarios({...scenarios, hiring: Number(e.target.value)})}
                            className="w-full h-1 bg-blue-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* LEVER 2: REVENUE */}
                    <div className="mb-6">
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                            <span className="text-blue-200">Revenue Growth</span>
                            <span className={scenarios.revenue >= 0 ? 'text-emerald-400' : 'text-red-400'}>{scenarios.revenue > 0 ? '+' : ''}{scenarios.revenue}%</span>
                        </div>
                        <input 
                            type="range" min="-50" max="200" step="5" 
                            value={scenarios.revenue} 
                            onChange={(e) => setScenarios({...scenarios, revenue: Number(e.target.value)})}
                            className="w-full h-1 bg-blue-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* LEVER 3: MARKET */}
                    <div className="mb-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                            <span className="text-blue-200">Market Volatility</span>
                            <span className={scenarios.market >= 0 ? 'text-emerald-400' : 'text-red-400'}>{scenarios.market > 0 ? '+' : ''}{scenarios.market}%</span>
                        </div>
                        <input 
                            type="range" min="-60" max="30" step="5" 
                            value={scenarios.market} 
                            onChange={(e) => setScenarios({...scenarios, market: Number(e.target.value)})}
                            className="w-full h-1 bg-blue-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="text-[9px] text-blue-400 mt-2 italic">Impacts value of liquid portfolio buffer.</div>
                    </div>
                </div>

            </div>

            {/* RIGHT: THE DEATH LINE CHART */}
            <div className="col-span-12 md:col-span-8 bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-slate-900 uppercase">Cash Flow Projection</h3>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase"><div className="w-2 h-2 rounded-full bg-blue-600"></div> Cash Balance</div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> + Liquid Assets</div>
                    </div>
                </div>
                
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projection.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorLiq" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="month" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10}} tickFormatter={formatCompact} axisLine={false} tickLine={false} />
                            <CartesianGrid vertical={false} stroke="#f1f5f9" />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(val) => formatCurrency(val)}
                            />
                            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                            
                            <Area type="monotone" dataKey="liquidity" stroke="#10b981" fillOpacity={1} fill="url(#colorLiq)" strokeDasharray="5 5" />
                            <Area type="monotone" dataKey="cash" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCash)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default WarRoom;