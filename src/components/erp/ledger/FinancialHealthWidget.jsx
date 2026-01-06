import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const FinancialHealthWidget = () => {
    const [metrics, setMetrics] = useState({
        payroll: 0,
        miscExpenses: 0,
        totalExpenses: 0,
        cashBalance: 0
    });
    const [loading, setLoading] = useState(true);

    // --- CONFIGURATION (The Constitution) ---
    const LIMITS = {
        PAYROLL_PCT_MAX: 20, // Salary cannot exceed 20%
        MISC_PCT_MAX: 1      // Misc cannot exceed 1%
    };

    // --- FETCH REAL-TIME DATA ---
    useEffect(() => {
        const analyzeFinance = async () => {
            try {
                // 1. Get Monthly Payroll (Projected)
                const { data: employees } = await supabase
                    .from('erp_employees')
                    .select('net_payable_monthly')
                    .eq('status', 'ACTIVE');
                
                const payrollTotal = employees?.reduce((sum, e) => sum + (Number(e.net_payable_monthly) || 0), 0) || 0;

                // 2. Get This Month's Expenses from Ledger
                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
                
                const { data: ledger } = await supabase
                    .from('erp_ledger') // Assuming table name
                    .select('amount, category, type')
                    .eq('type', 'DEBIT') // Outflows only
                    .gte('created_at', startOfMonth);

                let miscTotal = 0;
                let opsTotal = 0;

                ledger?.forEach(tx => {
                    opsTotal += Number(tx.amount);
                    if (tx.category === 'MISCELLANEOUS' || tx.category === 'General') {
                        miscTotal += Number(tx.amount);
                    }
                });

                // Total OpEx = Payroll + Operations (Ledger)
                const totalOutflow = payrollTotal + opsTotal;

                setMetrics({
                    payroll: payrollTotal,
                    miscExpenses: miscTotal,
                    totalExpenses: totalOutflow || 1, // Avoid divide by zero
                    cashBalance: 0 // Placeholder: Connect to actual Bank Balance later
                });
            } catch (err) {
                console.error("Watchdog Error:", err);
            } finally {
                setLoading(false);
            }
        };

        analyzeFinance();
    }, []);

    // --- CALCULATE RATIOS ---
    const ratios = useMemo(() => {
        const payrollPct = (metrics.payroll / metrics.totalExpenses) * 100;
        const miscPct = (metrics.miscExpenses / metrics.totalExpenses) * 100;

        return {
            payroll: {
                value: payrollPct.toFixed(1),
                status: payrollPct > LIMITS.PAYROLL_PCT_MAX ? 'CRITICAL' : payrollPct > (LIMITS.PAYROLL_PCT_MAX * 0.8) ? 'WARNING' : 'HEALTHY'
            },
            misc: {
                value: miscPct.toFixed(1),
                status: miscPct > LIMITS.MISC_PCT_MAX ? 'CRITICAL' : 'HEALTHY'
            }
        };
    }, [metrics]);

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    if (loading) return <div className="p-4 text-xs text-slate-400 animate-pulse">Running Financial Diagnostics...</div>;

    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            
            {/* 1. PAYROLL GUARDRAIL */}
            <div className={`p-4 rounded-xl border-l-4 shadow-sm bg-white ${ratios.payroll.status === 'CRITICAL' ? 'border-red-500' : ratios.payroll.status === 'WARNING' ? 'border-orange-400' : 'border-emerald-500'}`}>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payroll Ratio</h3>
                    {ratios.payroll.status === 'CRITICAL' && <i className="fa-solid fa-triangle-exclamation text-red-500 animate-pulse"></i>}
                </div>
                <div className="text-2xl font-black text-slate-900">{ratios.payroll.value}%</div>
                <div className="text-[10px] font-bold mt-1">
                    <span className="text-slate-400">Limit: {LIMITS.PAYROLL_PCT_MAX}%</span>
                    <span className={`ml-2 ${ratios.payroll.status === 'CRITICAL' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {ratios.payroll.status === 'CRITICAL' ? 'BREACH DETECTED' : 'OPTIMAL'}
                    </span>
                </div>
                {/* Visual Bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full rounded-full ${ratios.payroll.status === 'CRITICAL' ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(ratios.payroll.value, 100)}%` }}></div>
                </div>
            </div>

            {/* 2. LEAKAGE DETECTOR (MISC EXPENSES) */}
            <div className={`p-4 rounded-xl border-l-4 shadow-sm bg-white ${ratios.misc.status === 'CRITICAL' ? 'border-red-500' : 'border-emerald-500'}`}>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Misc. Leakage</h3>
                    <i className="fa-solid fa-filter-circle-dollar text-slate-300"></i>
                </div>
                <div className="text-2xl font-black text-slate-900">{ratios.misc.value}%</div>
                <div className="text-[10px] font-bold mt-1">
                    <span className="text-slate-400">Limit: {LIMITS.MISC_PCT_MAX}%</span>
                    <span className={`ml-2 ${ratios.misc.status === 'CRITICAL' ? 'text-red-600' : 'text-slate-500'}`}>
                        ({formatCurrency(metrics.miscExpenses)})
                    </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full rounded-full ${ratios.misc.status === 'CRITICAL' ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(ratios.misc.value * 10, 100)}%` }}></div>
                </div>
            </div>

            {/* 3. TOTAL OUTFLOW MONITOR */}
            <div className="p-4 rounded-xl border-l-4 border-blue-500 shadow-sm bg-white">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Monthly Burn</h3>
                    <i className="fa-solid fa-fire-flame-curved text-orange-400"></i>
                </div>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(metrics.totalExpenses)}</div>
                <div className="text-[10px] font-bold mt-1 text-slate-500">
                    Includes Payroll & Ops
                </div>
                <div className="mt-3 flex gap-1">
                    {/* Tiny Sparkline Simulation */}
                    {[40, 60, 55, 70, 45, 80].map((h, i) => (
                        <div key={i} className="flex-1 bg-slate-100 rounded-sm h-1.5 flex items-end">
                            <div className="w-full bg-blue-200" style={{ height: `${h}%` }}></div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default FinancialHealthWidget;