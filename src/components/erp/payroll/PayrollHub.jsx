import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { updateBankBalance } from '../../../lib/bankingService'; 
import { calculateSalaryStructure } from './PayrollEngine';

const PayrollHub = () => {
    const [employees, setEmployees] = useState([]);
    const [ledgerBalance, setLedgerBalance] = useState(199999999141); // Hardwired for Treasury Sync
    const [processing, setProcessing] = useState(false);

    useEffect(() => { 
        fetchEmployees(); 
        fetchTreasuryPulse(); 
    }, []);

    const fetchEmployees = async () => {
        const { data } = await supabase.from('erp_employees').select('*').eq('status', 'ACTIVE');
        if (data) setEmployees(data);
    };

    const fetchTreasuryPulse = async () => {
        const { data: credits } = await supabase.from('erp_ledger').select('amount').eq('type', 'CREDIT');
        const { data: debits } = await supabase.from('erp_ledger').select('amount').eq('type', 'DEBIT');
        setLedgerBalance((credits?.reduce((a, b) => a + Number(b.amount), 0) || 0) - (debits?.reduce((a, b) => a + Number(b.amount), 0) || 0));
    };

    // --- 1. RECONCILIATION & ACCRUAL ENGINE ---
    const payrollSummary = useMemo(() => {
        return employees.reduce((acc, emp) => {
            const salaryInput = emp.base_salary_monthly || emp.gross_salary || 0;
            const struct = calculateSalaryStructure(salaryInput);
            acc.net += struct.netPay; 
            acc.tds += struct.deductions.tds;
            return acc;
        }, { net: 0, tds: 0 });
    }, [employees]);

    // AUTOMATED ACCOUNTING INJECTION (Invoices & Ledger Reflectance)
    useEffect(() => {
        if (payrollSummary.net > 0 && employees.length > 0) {
            syncPayrollToAccounting();
        }
    }, [payrollSummary.net]);

    const syncPayrollToAccounting = async () => {
        const cycleMonth = "JAN-2026";
        
        // Check for existing accrual record
        const { data: existingInv } = await supabase
            .from('erp_invoices')
            .select('id')
            .eq('invoice_number', `PAY-${cycleMonth}`)
            .single();

        if (!existingInv) {
            // A. Raise Internal Invoice
            await supabase.from('erp_invoices').insert([{
                invoice_number: `PAY-${cycleMonth}`,
                client_name: 'INTERNAL - AUSPEX PERSONNEL',
                total_amount: payrollSummary.net,
                status: 'PENDING',
                due_date: '2026-01-31',
                metadata: { type: 'PAYROLL_ACCRUAL', personnel_count: employees.length }
            }]);

            // B. Reflect as Cleared Ledger Liability
            await supabase.from('erp_ledger').insert([{
                transaction_date: '2026-01-05',
                type: 'DEBIT',
                category: 'Payroll',
                amount: payrollSummary.net,
                description: `Accrued Payroll Liability: ${cycleMonth}`,
                status: 'CLEARED',
                metadata: { vendor_name: 'Auspex Personnel', is_internal: true }
            }]);
        }
    };

    // --- 2. SOVEREIGN WORDS EXPANSION ---
    const toWords = (num) => {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const format = (n, s) => (n > 0 ? `${toWords(n)}${s} ` : '');
        if (num === 0) return 'Zero';
        if (num < 20) return a[num];
        if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + a[num % 10] : '');
        return (
            format(Math.floor(num / 100000000000), 'Kharab') +
            format(Math.floor((num % 100000000000) / 1000000000), 'Arab') +
            format(Math.floor((num % 1000000000) / 10000000), 'Crore') +
            format(Math.floor((num % 10000000) / 100000), 'Lakh') +
            format(Math.floor((num % 100000) / 1000), 'Thousand') +
            format(Math.floor((num % 1000) / 100), 'Hundred') +
            (num % 100 > 0 ? 'and ' : '') + toWords(num % 100)
        );
    };

    const handleDisburse = async () => {
        const { data: primaryBank } = await supabase.from('erp_bank_accounts').select('id, current_balance').eq('is_primary', true).single();
        if (!primaryBank || primaryBank.current_balance < payrollSummary.net) return alert("VAULT_LOCKED: Insufficient Funds.");

        if (!window.confirm("Authorize synchronous disbursement?")) return;
        setProcessing(true);
        try {
            // Update the accrual to REALIZED status
            await supabase.from('erp_ledger')
                .update({ status: 'REALIZED' })
                .eq('description', `Accrued Payroll Liability: JAN-2026`);

            await updateBankBalance(primaryBank.id, -payrollSummary.net); 
            alert("PAYROLL_REALIZED."); 
            fetchEmployees(); fetchTreasuryPulse();
        } finally { setProcessing(false); }
    };

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

    return (
        <div className="bg-[#F1F5F9] min-h-screen p-10 font-sans antialiased text-slate-900">
            
            {/* COMMAND HEADER */}
            <div className="flex justify-between items-end mb-10 border-b-2 border-slate-200 pb-8">
                <div>
                    <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Personnel_Expenditure_Node</h2>
                    <p className="text-3xl font-black uppercase tracking-tighter">Payroll Command <span className="text-indigo-600">v4.1</span></p>
                </div>
                <button 
                    onClick={handleDisburse} 
                    disabled={processing || payrollSummary.net === 0} 
                    className="bg-slate-900 text-white px-10 py-4 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-emerald-600 transition-all shadow-2xl disabled:opacity-20"
                >
                    {processing ? 'Processing...' : 'Authorize Disbursement'}
                </button>
            </div>

            {/* INSTITUTIONAL LIQUIDITY IMPACT */}
            <div className="bg-white border-2 border-slate-900 p-10 rounded-sm mb-10 flex justify-between items-start shadow-xl relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <i className="fa-solid fa-building-columns text-indigo-500 text-2xl"></i>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Liquidity Impact</h4>
                    </div>
                    <p className="text-[13px] font-black text-slate-900 uppercase">
                        Consumes <span className="text-indigo-600">{ledgerBalance > 0 ? ((payrollSummary.net / ledgerBalance) * 100).toFixed(6) : 0}%</span> of fund liquidity.
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Total Net Payable (Cycle)</span>
                    <span className="text-4xl font-black tabular-nums tracking-tighter text-slate-900 block leading-none">
                        {fmt(payrollSummary.net)}
                    </span>
                    <p className="text-[11px] font-black text-indigo-600 uppercase mt-4 tracking-tighter italic border-t border-slate-100 pt-3">
                        {toWords(Math.floor(payrollSummary.net))} Rupees Only
                    </p>
                </div>
            </div>

            {/* PERSONNEL AUDIT LEDGER */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Strategist Payroll Registry</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Status: {employees.length} Personnel Found</span>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50">
                        <tr className="border-b border-slate-200">
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategist Node</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tax (TDS)</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net Payable</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                        {employees.map(emp => {
                            const struct = calculateSalaryStructure(emp.base_salary_monthly || emp.gross_salary || 0);
                            return (
                                <tr key={emp.id} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 group">
                                    <td className="p-6">
                                        <div className="text-[14px] font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                            {emp.full_name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-wide">
                                            {emp.role} • {emp.employee_id}
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase rounded-sm">
                                            Authorization Required
                                        </span>
                                    </td>
                                    <td className="p-6 text-right font-black text-[13px] text-rose-500 tabular-nums">
                                        - {fmt(struct.deductions.tds)}
                                    </td>
                                    <td className="p-6 text-right font-black text-[15px] text-slate-900 tabular-nums">
                                        {fmt(struct.netPay)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PayrollHub;