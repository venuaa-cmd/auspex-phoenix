import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { UI } from '../../../lib/uiTheme';

const OfficeManager = () => {
    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('BANKING'); // BANKING | INVENTORY | LIABILITIES | CAPITAL
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // DATA STORES
    const [accounts, setAccounts] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loans, setLoans] = useState([]);
    const [shareholders, setShareholders] = useState([]);
    const [employees, setEmployees] = useState([]);

    // FORM INPUT STATES
    const [bankForm, setBankForm] = useState({ bank_name: '', account_no: '', ifsc: '', branch: '', is_primary: false });
    const [itemForm, setItemForm] = useState({ category: 'Laptop', brand: '', model: '', serial_no: '', assigned_to: '' });
    const [loanForm, setLoanForm] = useState({ lender_name: '', loan_type: 'Term Loan', principal_amount: '', interest_rate: '', tenure_months: '', emi_amount: '' });
    const [equityForm, setEquityForm] = useState({ investor_name: '', investor_type: 'Angel', round_name: 'Seed', amount: '', equity_pct: '', valuation: '' });

    // --- 1. FETCH ALL DATA ---
    const refreshData = async () => {
        setLoading(true);
        
        // A. Banks
        const { data: banks } = await supabase.from('erp_bank_accounts').select('*').order('is_primary', { ascending: false });
        if (banks) setAccounts(banks);

        // B. Inventory (Assets)
        const { data: items } = await supabase.from('erp_inventory').select(`*, erp_employees!assigned_to (full_name)`).order('category');
        if (items) setInventory(items);

        // C. Loans (Liabilities)
        const { data: debt } = await supabase.from('erp_loans').select('*').order('created_at', { ascending: false });
        if (debt) setLoans(debt);

        // D. Shareholders (Capital)
        const { data: equity } = await supabase.from('erp_shareholders').select('*').order('equity_held_pct', { ascending: false });
        if (equity) setShareholders(equity);

        // E. Employees (For Dropdowns)
        const { data: team } = await supabase.from('erp_employees').select('id, full_name').eq('status', 'ACTIVE');
        if (team) setEmployees(team);

        setLoading(false);
    };

    useEffect(() => { refreshData(); }, []);

    // --- 2. HANDLERS ---

    // A. SAVE BANK ACCOUNT
    const handleSaveBank = async () => {
        if (!bankForm.bank_name || !bankForm.account_no) return alert("Bank Name and Account Number are required.");
        try {
            await supabase.from('erp_bank_accounts').insert([bankForm]);
            alert("Bank Account Added.");
            setIsFormOpen(false); 
            setBankForm({ bank_name: '', account_no: '', ifsc: '', branch: '', is_primary: false });
            refreshData();
        } catch (e) { alert(e.message); }
    };

    // B. SAVE ASSET (INVENTORY)
    const handleSaveItem = async () => {
        if (!itemForm.brand) return alert("Brand/Model is required.");
        try {
            const payload = { ...itemForm, assigned_to: itemForm.assigned_to || null };
            await supabase.from('erp_inventory').insert([payload]);
            alert("Asset Registered.");
            setIsFormOpen(false);
            setItemForm({ category: 'Laptop', brand: '', model: '', serial_no: '', assigned_to: '' });
            refreshData();
        } catch (e) { alert(e.message); }
    };

    // C. ORIGINATE LOAN (LIABILITY)
    const handleSaveLoan = async () => {
        if (!loanForm.lender_name || !loanForm.principal_amount) return alert("Lender and Amount required.");
        try {
            // 1. Create Loan Record
            const { data: newLoan, error } = await supabase.from('erp_loans').insert([{
                ...loanForm,
                status: 'PENDING'
            }]).select().single();
            if (error) throw error;

            // 2. Create Invoice Request (Money In)
            const invoicePayload = {
                invoice_no: `LOAN-${Date.now().toString().slice(-4)}`,
                issue_date: new Date().toISOString().split('T')[0],
                amount_total: loanForm.principal_amount,
                type: 'RECEIVABLE',
                category: 'Loan Disbursement',
                status: 'PENDING',
                notes: `Disbursement: ${loanForm.loan_type} from ${loanForm.lender_name}`,
                metadata: {
                    is_loan_disbursement: true,
                    linked_loan_id: newLoan.id,
                    vendor_name: loanForm.lender_name,
                    capital_stats: {
                        interest_rate: Number(loanForm.interest_rate),
                        tenure_months: Number(loanForm.tenure_months)
                    }
                }
            };
            await supabase.from('erp_invoices').insert([invoicePayload]);

            alert("Loan Contract Created. Check Ledger to approve funds.");
            setIsFormOpen(false);
            setLoanForm({ lender_name: '', loan_type: 'Term Loan', principal_amount: '', interest_rate: '', tenure_months: '', emi_amount: '' });
            refreshData();
        } catch (e) { alert("Error: " + e.message); }
    };

    // D. RAISE CAPITAL (EQUITY)
    const handleRaiseCapital = async () => {
        if (!equityForm.investor_name || !equityForm.amount) return alert("Investor and Amount required.");
        try {
            // 1. Check/Create Shareholder
            let shareholderId;
            const { data: existing } = await supabase.from('erp_shareholders').select('id, total_invested, equity_held_pct').eq('name', equityForm.investor_name).single();
            
            if (existing) {
                shareholderId = existing.id;
                await supabase.from('erp_shareholders').update({
                    total_invested: Number(existing.total_invested) + Number(equityForm.amount),
                    equity_held_pct: Number(existing.equity_held_pct) + Number(equityForm.equity_pct)
                }).eq('id', shareholderId);
            } else {
                const { data: newInv } = await supabase.from('erp_shareholders').insert([{
                    name: equityForm.investor_name,
                    type: equityForm.investor_type,
                    total_invested: equityForm.amount,
                    equity_held_pct: equityForm.equity_pct
                }]).select().single();
                shareholderId = newInv.id;
            }

            // 2. Log Round History
            await supabase.from('erp_equity_rounds').insert([{
                shareholder_id: shareholderId,
                round_name: equityForm.round_name,
                amount: equityForm.amount,
                equity_issued: equityForm.equity_pct,
                valuation_at_time: equityForm.valuation,
                transaction_date: new Date().toISOString()
            }]);

            // 3. Create Invoice Request (Money In)
            await supabase.from('erp_invoices').insert([{
                invoice_no: `CAP-${Date.now().toString().slice(-4)}`,
                issue_date: new Date().toISOString().split('T')[0],
                amount_total: equityForm.amount,
                type: 'RECEIVABLE',
                category: 'Equity Investment',
                status: 'PENDING',
                notes: `Capital Call: ${equityForm.round_name} - ${equityForm.investor_name}`,
                metadata: {
                    vendor_name: equityForm.investor_name,
                    sub_category: 'Fundraising',
                    capital_stats: {
                        dilution_pct: Number(equityForm.equity_pct),
                        implied_valuation: Number(equityForm.valuation),
                        round_name: equityForm.round_name
                    }
                }
            }]);

            alert("Capital Call Issued. Check Ledger to approve funds.");
            setIsFormOpen(false);
            setEquityForm({ investor_name: '', investor_type: 'Angel', round_name: 'Seed', amount: '', equity_pct: '', valuation: '' });
            refreshData();
        } catch (e) { alert("Error: " + e.message); }
    };

    // Helper for Auto-Valuation
    const calcValuation = (amt, pct) => {
        if (!amt || !pct) return '';
        return (Number(amt) / (Number(pct)/100));
    };

    return (
        <div className={UI.pageContainer}>
            {/* HEADER & TABS */}
            <div className={UI.header.container}>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Office Nexus</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Central Registry & Capital</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                    <TabButton id="BANKING" label="Banking" icon="fa-building-columns" active={activeTab} set={setActiveTab} />
                    <TabButton id="INVENTORY" label="Assets" icon="fa-laptop" active={activeTab} set={setActiveTab} />
                    <TabButton id="LIABILITIES" label="Loans" icon="fa-file-contract" active={activeTab} set={setActiveTab} />
                    <TabButton id="CAPITAL" label="Equity" icon="fa-chart-pie" active={activeTab} set={setActiveTab} />
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className={UI.contentArea}>
                
                {/* 1. BANKING VIEW */}
                {activeTab === 'BANKING' && (
                    <div className="space-y-6 animate-scaleIn">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-700 uppercase">Company Accounts</h3>
                            <button onClick={() => setIsFormOpen(true)} className={UI.btn.primary}>+ Add Bank Account</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {accounts.map(acc => (
                                <div key={acc.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all group relative">
                                    {acc.is_primary && <div className="absolute top-4 right-4 text-[9px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-bold uppercase">Primary</div>}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl"><i className="fa-solid fa-building-columns"></i></div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-sm">{acc.bank_name}</h4>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{acc.branch}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 text-center tracking-wider font-bold mb-2">{acc.account_no}</div>
                                    <div className="text-[9px] text-center text-slate-400 font-bold">IFSC: {acc.ifsc}</div>
                                </div>
                            ))}
                            {accounts.length === 0 && <div className="col-span-3 text-center p-10 text-slate-400 italic">No bank accounts linked.</div>}
                        </div>
                    </div>
                )}

                {/* 2. INVENTORY VIEW */}
                {activeTab === 'INVENTORY' && (
                    <div className="space-y-6 animate-scaleIn">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-700 uppercase">Device Registry</h3>
                            <button onClick={() => setIsFormOpen(true)} className={UI.btn.primary}>+ Register Asset</button>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Item Details</th>
                                        <th className="p-4">Serial #</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">Assigned To</th>
                                        <th className="p-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs text-slate-700 font-bold divide-y divide-slate-100">
                                    {inventory.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="p-4">
                                                <div className="text-slate-900">{item.brand}</div>
                                                <div className="text-[10px] text-slate-400 font-normal">{item.model}</div>
                                            </td>
                                            <td className="p-4 font-mono text-slate-500">{item.serial_no}</td>
                                            <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-[10px] uppercase text-slate-500 border border-slate-200">{item.category}</span></td>
                                            <td className="p-4 flex items-center gap-2">
                                                {item.erp_employees?.full_name ? <><div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-bold">{item.erp_employees.full_name.charAt(0)}</div>{item.erp_employees.full_name}</> : <span className="text-slate-400 italic">Office Pool</span>}
                                            </td>
                                            <td className="p-4 text-right"><span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[9px] uppercase font-bold">Active</span></td>
                                        </tr>
                                    ))}
                                    {inventory.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic">No assets registered.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. LOANS VIEW */}
                {activeTab === 'LIABILITIES' && (
                    <div className="space-y-6 animate-scaleIn">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-700 uppercase">Active Debt Instruments</h3>
                            <button onClick={() => setIsFormOpen(true)} className={UI.btn.primary}>+ Take New Loan</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {loans.map(loan => (
                                <div key={loan.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-bold uppercase ${loan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{loan.status}</div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div><div className="text-[10px] text-slate-400 font-bold uppercase">{loan.loan_type}</div><h4 className="text-lg font-black text-slate-900">{loan.lender_name}</h4></div>
                                        <div className="text-right"><div className="text-[10px] text-slate-400 font-bold uppercase">Principal</div><div className="text-lg font-mono font-bold text-slate-800">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(loan.principal_amount)}</div></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="text-center"><span className="block text-[8px] font-bold text-slate-400 uppercase">Rate</span><span className="text-sm font-bold text-slate-700">{loan.interest_rate}%</span></div>
                                        <div className="text-center border-l border-slate-200"><span className="block text-[8px] font-bold text-slate-400 uppercase">Tenure</span><span className="text-sm font-bold text-slate-700">{loan.tenure_months} M</span></div>
                                        <div className="text-center border-l border-slate-200"><span className="block text-[8px] font-bold text-slate-400 uppercase">EMI</span><span className="text-sm font-bold text-slate-700">{Number(loan.emi_amount) ? (Number(loan.emi_amount)/1000).toFixed(1)+'k' : '-'}</span></div>
                                    </div>
                                </div>
                            ))}
                            {loans.length === 0 && <div className="col-span-2 text-center p-10 text-slate-400 italic">No active loans found.</div>}
                        </div>
                    </div>
                )}

                {/* 4. CAPITAL VIEW */}
                {activeTab === 'CAPITAL' && (
                    <div className="space-y-6 animate-scaleIn">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-700 uppercase">Cap Table & Investors</h3>
                            <button onClick={() => setIsFormOpen(true)} className={UI.btn.primary}>+ Raise Capital</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {shareholders.map(inv => (
                                <div key={inv.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20"><i className="fa-solid fa-hand-holding-dollar text-4xl"></i></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div><span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold uppercase border border-indigo-100">{inv.type}</span><h4 className="text-lg font-black text-slate-900 mt-2">{inv.name}</h4></div>
                                        <div className="text-right"><div className="text-[10px] text-slate-400 font-bold uppercase">Equity Held</div><div className="text-xl font-mono font-black text-slate-800">{inv.equity_held_pct}%</div></div>
                                    </div>
                                    <div className="border-t border-slate-100 pt-3">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Invested</div>
                                        <div className="text-sm font-mono font-bold text-emerald-600">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(inv.total_invested)}</div>
                                    </div>
                                </div>
                            ))}
                            {shareholders.length === 0 && <div className="col-span-2 text-center p-10 text-slate-400 italic">No investors on Cap Table.</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL --- */}
            {isFormOpen && (
                <div className={UI.form.modalOverlay}>
                    <div className={UI.form.modalBox}>
                        <div className={UI.form.modalHeader}>
                            <h3 className={UI.form.modalTitle}>
                                {activeTab === 'BANKING' ? 'Add Bank Account' : activeTab === 'INVENTORY' ? 'Register New Asset' : activeTab === 'LIABILITIES' ? 'Originate Loan' : 'Issue Shares'}
                            </h3>
                            <button onClick={() => setIsFormOpen(false)} className={UI.form.modalCloseBtn}><i className="fa-solid fa-times"></i></button>
                        </div>
                        <div className="p-6 space-y-4">
                            
                            {/* A. BANK FORM */}
                            {activeTab === 'BANKING' && (
                                <div className="space-y-4 animate-scaleIn">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={UI.form.label}>Bank Name</label><input className={UI.form.input} value={bankForm.bank_name} onChange={e=>setBankForm({...bankForm, bank_name: e.target.value})} placeholder="e.g. HDFC Bank" /></div>
                                        <div><label className={UI.form.label}>Branch</label><input className={UI.form.input} value={bankForm.branch} onChange={e=>setBankForm({...bankForm, branch: e.target.value})} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={UI.form.label}>Account Number</label><input className={UI.form.input} value={bankForm.account_no} onChange={e=>setBankForm({...bankForm, account_no: e.target.value})} /></div>
                                        <div><label className={UI.form.label}>IFSC</label><input className={UI.form.input} value={bankForm.ifsc} onChange={e=>setBankForm({...bankForm, ifsc: e.target.value})} /></div>
                                    </div>
                                    <div className="flex items-center gap-2"><input type="checkbox" checked={bankForm.is_primary} onChange={e=>setBankForm({...bankForm, is_primary: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" /><label className="text-xs font-bold text-slate-600">Mark as Primary Account</label></div>
                                    <button onClick={handleSaveBank} className={UI.btn.primary + " w-full"}>Save Account</button>
                                </div>
                            )}

                            {/* B. ITEM FORM */}
                            {activeTab === 'INVENTORY' && (
                                <div className="space-y-4 animate-scaleIn">
                                    <div><label className={UI.form.label}>Category</label><select className={UI.form.input} value={itemForm.category} onChange={e=>setItemForm({...itemForm, category: e.target.value})}><option>Laptop</option><option>Mobile / Tablet</option><option>Vehicle</option><option>Furniture</option></select></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={UI.form.label}>Brand</label><input className={UI.form.input} value={itemForm.brand} onChange={e=>setItemForm({...itemForm, brand: e.target.value})} placeholder="e.g. Apple" /></div>
                                        <div><label className={UI.form.label}>Model</label><input className={UI.form.input} value={itemForm.model} onChange={e=>setItemForm({...itemForm, model: e.target.value})} placeholder="e.g. MacBook Pro" /></div>
                                    </div>
                                    <div><label className={UI.form.label}>Serial / Reg Number</label><input className={UI.form.input} value={itemForm.serial_no} onChange={e=>setItemForm({...itemForm, serial_no: e.target.value})} /></div>
                                    <div>
                                        <label className={UI.form.label}>Assign To (Optional)</label>
                                        <select className={UI.form.input} value={itemForm.assigned_to} onChange={e=>setItemForm({...itemForm, assigned_to: e.target.value})}>
                                            <option value="">-- Keep in Pool --</option>
                                            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={handleSaveItem} className={UI.btn.primary + " w-full"}>Register Asset</button>
                                </div>
                            )}

                            {/* C. LOAN FORM */}
                            {activeTab === 'LIABILITIES' && (
                                <div className="space-y-4 animate-scaleIn">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={UI.form.label}>Lender Name</label><input className={UI.form.input} placeholder="e.g. HDFC Bank" value={loanForm.lender_name} onChange={e=>setLoanForm({...loanForm, lender_name: e.target.value})} /></div>
                                        <div><label className={UI.form.label}>Type</label><select className={UI.form.input} value={loanForm.loan_type} onChange={e=>setLoanForm({...loanForm, loan_type: e.target.value})}><option>Term Loan</option><option>Overdraft</option><option>Director Loan</option><option>Line of Credit</option></select></div>
                                    </div>
                                    <div><label className={UI.form.label}>Principal Amount (₹)</label><input type="number" className={UI.form.input + " text-lg font-bold"} value={loanForm.principal_amount} onChange={e=>setLoanForm({...loanForm, principal_amount: e.target.value})} /></div>
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                        <h4 className="text-[10px] font-black text-amber-800 uppercase mb-3">Cost of Capital (DNA)</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div><label className={UI.form.label}>Rate (%)</label><input type="number" className={UI.form.input} placeholder="12.5" value={loanForm.interest_rate} onChange={e=>setLoanForm({...loanForm, interest_rate: e.target.value})} /></div>
                                            <div><label className={UI.form.label}>Tenure (M)</label><input type="number" className={UI.form.input} placeholder="36" value={loanForm.tenure_months} onChange={e=>setLoanForm({...loanForm, tenure_months: e.target.value})} /></div>
                                            <div><label className={UI.form.label}>Est. EMI</label><input type="number" className={UI.form.input} placeholder="Optional" value={loanForm.emi_amount} onChange={e=>setLoanForm({...loanForm, emi_amount: e.target.value})} /></div>
                                        </div>
                                    </div>
                                    <button onClick={handleSaveLoan} className={UI.btn.primary + " w-full"}>Create Contract & Request Funds</button>
                                </div>
                            )}

                            {/* D. EQUITY FORM */}
                            {activeTab === 'CAPITAL' && (
                                <div className="space-y-4 animate-scaleIn">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={UI.form.label}>Investor Name</label><input className={UI.form.input} placeholder="e.g. Sequoia" value={equityForm.investor_name} onChange={e=>setEquityForm({...equityForm, investor_name: e.target.value})} /></div>
                                        <div><label className={UI.form.label}>Type</label><select className={UI.form.input} value={equityForm.investor_type} onChange={e=>setEquityForm({...equityForm, investor_type: e.target.value})}><option>Angel</option><option>VC</option><option>Founder</option><option>LP</option><option>Family Office</option></select></div>
                                    </div>
                                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                        <h4 className="text-[10px] font-black text-indigo-800 uppercase mb-3">Deal Terms (Capital DNA)</h4>
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div><label className={UI.form.label}>Round Name</label><input className={UI.form.input} placeholder="e.g. Seed" value={equityForm.round_name} onChange={e=>setEquityForm({...equityForm, round_name: e.target.value})} /></div>
                                            <div><label className={UI.form.label}>Investment (₹)</label><input type="number" className={UI.form.input} value={equityForm.amount} onChange={e=>setEquityForm({...equityForm, amount: e.target.value})} /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className={UI.form.label}>Equity Issued (%)</label><input type="number" className={UI.form.input} placeholder="5.0" value={equityForm.equity_pct} onChange={e=> { const val = calcValuation(equityForm.amount, e.target.value); setEquityForm({...equityForm, equity_pct: e.target.value, valuation: val}); }} /></div>
                                            <div><label className={UI.form.label}>Implied Val (Auto)</label><div className="text-sm font-bold text-indigo-900 font-mono mt-2">{equityForm.valuation ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(equityForm.valuation)}` : '-'}</div></div>
                                        </div>
                                    </div>
                                    <button onClick={handleRaiseCapital} className={UI.btn.primary + " w-full"}>Issue Shares & Request Funds</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TabButton = ({ id, label, icon, active, set }) => (
    <button onClick={() => set(id)} className={`px-4 py-2 text-[10px] font-bold uppercase rounded-md transition-all flex items-center gap-2 ${active === id ? 'bg-blue-900 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}>
        <i className={`fa-solid ${icon}`}></i> {label}
    </button>
);

export default OfficeManager;