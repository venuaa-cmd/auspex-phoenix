import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { UI } from '../../../lib/uiTheme';

const LedgerExecutionModal = ({ isOpen, onClose, onConfirm, request, mode, readOnly = false }) => {
    if (!isOpen || !request) return null;

    const [saving, setSaving] = useState(false);
    const [isPartial, setIsPartial] = useState(false);
    const [actionView, setActionView] = useState('PAY'); 
    const [deferDate, setDeferDate] = useState('');
    
    // --- DYNAMIC BANKING ---
    const [bankOptions, setBankOptions] = useState([]);

    // --- CONTEXT DETECTION ---
    const category = request.category || '';
    const isLoan = ['Loan', 'Debt', 'Credit Line'].some(t => category.includes(t));
    const isEquity = ['Equity', 'Investment', 'Seed', 'Series A'].some(t => category.includes(t));
    const isAssetDeal = !!request.asset_id || request.metadata?.sub_category === 'Asset Acquisition' || category === 'Asset Purchase' || category === 'Sale of Asset';

    // --- FORM STATE (Capital DNA Fields) ---
    const [execData, setExecData] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: request.amount_total || request.amount, 
        payment_source: '', 
        payment_ref: '', 
        tds_deducted: 0,
        next_payment_date: '',
        
        // ASSET DNA
        round_name: request.metadata?.round || '',
        units: request.metadata?.units || '',
        price_per_unit: request.metadata?.price_per_unit || '',
        
        // CAPITAL DNA
        interest_rate: '',   
        tenure_months: '',   
        dilution_pct: '',    
        post_money_val: '',  
        
        notes: ''
    });

    // FETCH BANKS
    useEffect(() => {
        if (isOpen && !readOnly) {
            const loadBanks = async () => {
                const { data } = await supabase.from('erp_bank_accounts').select('id, bank_name, account_no, is_primary');
                if (data && data.length > 0) {
                    setBankOptions(data);
                    const defaultBank = data.find(b => b.is_primary) || data[0];
                    setExecData(prev => ({ ...prev, payment_source: `${defaultBank.bank_name} - ${defaultBank.account_no.slice(-4)}` }));
                } else {
                    setExecData(prev => ({ ...prev, payment_source: 'Petty Cash' }));
                }
            };
            loadBanks();
        }
    }, [isOpen, readOnly]);

    const payeeName = request.metadata?.vendor_name || request.erp_portfolio_assets?.asset_name || request.erp_entities?.name || request.erp_employees?.full_name || request.vendor || 'Unknown';

    // --- EXECUTE HANDLER (BANK-LEDGER DRIFT REPAIR) ---
    const handleExecute = async () => {
        if (isPartial && !execData.next_payment_date) return alert("Please select a date for the remaining payment.");
        
        if (isLoan && !execData.interest_rate) return alert("Please enter the Interest Rate for this Loan.");
        if (isEquity && !execData.dilution_pct) return alert("Please enter the Equity Dilution %.");

        setSaving(true);
        try {
            // 1. IDENTIFY SOURCE BANK FOR RECONCILIATION
            const selectedBank = bankOptions.find(b => `${b.bank_name} - ${b.account_no.slice(-4)}` === execData.payment_source);

            // 2. CREATE LEDGER ENTRY
            const ledgerPayload = {
                transaction_date: execData.date,
                type: mode, 
                category: request.category,
                amount: execData.amount, 
                description: isAssetDeal ? `Inv Settlement: ${request.invoice_no}` : `Settlement: ${request.invoice_no}`,
                status: 'REALIZED',
                linked_invoice_id: request.id,
                metadata: {
                    source: 'LEDGER_EXECUTION',
                    vendor_name: payeeName,
                    sub_category: isAssetDeal ? 'Asset Acquisition' : isLoan ? 'Debt Service' : isEquity ? 'Fundraising' : 'General',
                    payment_source: execData.payment_source,
                    payment_ref: execData.payment_ref,
                    bank_node_id: selectedBank?.id || null, // Forensic Link
                    tds_amount: execData.tds_deducted,
                    gross_obligation: request.amount_total,
                    is_partial: isPartial,
                    capital_stats: {
                        interest_rate: isLoan ? Number(execData.interest_rate) : null,
                        tenure_months: isLoan ? Number(execData.tenure_months) : null,
                        dilution_pct: isEquity ? Number(execData.dilution_pct) : null,
                        implied_valuation: isEquity ? (Number(execData.amount) / (Number(execData.dilution_pct)/100)) : null
                    },
                    asset_math: isAssetDeal ? { units: execData.units, price: execData.price_per_unit } : null,
                    notes: execData.notes
                }
            };

            const { error: ledgerError } = await supabase.from('erp_ledger').insert([ledgerPayload]);
            if (ledgerError) throw ledgerError;

            // 3. PHYSICAL BANK RECONCILIATION (FIXING THE DRIFT)
            if (selectedBank) {
                const adjustment = mode === 'DEBIT' ? -Number(execData.amount) : Number(execData.amount);
                const { error: bankError } = await supabase.rpc('adjust_bank_balance', { 
                    target_bank_id: selectedBank.id, 
                    amount_change: adjustment 
                });
                if (bankError) console.error("Bank Reconciliation Error:", bankError.message);
            }

            // 4. UPDATE INVOICE STATUS
            const newStatus = isPartial ? 'PARTIAL' : 'PAID';
            const invoiceUpdate = { status: newStatus };
            if (isPartial) invoiceUpdate.due_date = execData.next_payment_date; 
            await supabase.from('erp_invoices').update(invoiceUpdate).eq('id', request.id);

            // 5. ASSET DNA UPDATE (PORTFOLIO SYNC)
            if (isAssetDeal && request.asset_id) {
                const { data: asset } = await supabase.from('erp_portfolio_assets').select('total_capital_deployed, units_owned').eq('id', request.asset_id).single();
                if (asset) {
                    const newDepl = mode === 'DEBIT' ? Number(asset.total_capital_deployed) + Number(execData.amount) : Number(asset.total_capital_deployed) - Number(execData.amount);
                    const newUnits = mode === 'DEBIT' ? Number(asset.units_owned) + Number(execData.units) : Number(asset.units_owned) - Number(execData.units);
                    
                    await supabase.from('erp_portfolio_assets').update({
                        total_capital_deployed: newDepl,
                        units_owned: newUnits,
                        last_transaction_date: execData.date,
                        current_valuation: isEquity ? (Number(execData.amount) / (Number(execData.dilution_pct)/100)) : undefined
                    }).eq('id', request.asset_id);
                }
            }

            onConfirm();
        } catch (e) {
            alert("Execution Failed: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDefer = async () => {
        if (!deferDate) return alert("Select a new due date.");
        await supabase.from('erp_invoices').update({ due_date: deferDate }).eq('id', request.id);
        onConfirm();
    };

    const handleVoid = async () => {
        if (!confirm("Void this invoice?")) return;
        await supabase.from('erp_invoices').update({ status: 'CANCELLED' }).eq('id', request.id);
        onConfirm();
    };

    if (readOnly) {
        const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);
        return (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg p-10 rounded-sm shadow-2xl border border-slate-200 animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-8 border-b border-slate-900 pb-4">
                        <h3 className="text-xl font-black uppercase tracking-tighter">Transaction Receipt</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><i className="fa-solid fa-times"></i></button>
                    </div>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-8">
                            <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Settled Amount</p><p className="text-3xl font-black text-slate-900 tabular-nums leading-none">{fmt(request.amount)}</p></div>
                            <div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Date</p><p className="text-sm font-black text-slate-900 uppercase">{request.transaction_date}</p></div>
                        </div>
                        <div className="bg-slate-50 p-6 border border-slate-100 rounded-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Beneficiary Entity</p>
                            <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{request.metadata?.vendor_name || request.vendor || payeeName}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2 italic">{request.description}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-full mt-10 bg-slate-900 text-white py-4 text-[11px] font-black uppercase tracking-[0.2em] rounded-sm hover:bg-indigo-600 transition-all shadow-xl">Close Audit View</button>
                </div>
            </div>
        );
    }

    return (
        <div className={UI.form.modalOverlay}>
            <div className={UI.form.modalBox}>
                <div className={UI.form.modalHeader}>
                    <div>
                        <h3 className={UI.form.modalTitle}>Authorize Transaction</h3>
                        <div className="text-[10px] text-blue-600 font-bold mt-0.5 uppercase tracking-widest">
                            {isLoan ? 'Debt Instrument' : isEquity ? 'Equity Round' : 'Standard Settlement'}
                        </div>
                    </div>
                    <button onClick={onClose} className={UI.form.modalCloseBtn}><i className="fa-solid fa-times text-slate-900"></i></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center">
                        <div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Beneficiary</span><span className="text-sm font-black text-slate-900">{payeeName}</span></div>
                        <div className="text-right"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Invoice Value</span><span className="text-sm font-mono font-bold text-slate-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(request.amount_total)}</span></div>
                    </div>

                    <div className="flex p-1 bg-slate-100 rounded-lg">
                        <button onClick={() => setActionView('PAY')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-md ${actionView === 'PAY' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Pay Now</button>
                        <button onClick={() => setActionView('DEFER')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-md ${actionView === 'DEFER' ? 'bg-white shadow text-amber-600' : 'text-slate-400'}`}>Defer</button>
                        <button onClick={() => setActionView('VOID')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-md ${actionView === 'VOID' ? 'bg-white shadow text-red-600' : 'text-slate-400'}`}>Cancel</button>
                    </div>

                    {actionView === 'PAY' && (
                        <div className="space-y-4 animate-scaleIn">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={UI.form.label}>Payment Source</label>
                                    <select className="w-full border border-slate-300 bg-sky-50 rounded p-2 text-xs text-slate-900 font-bold outline-none" value={execData.payment_source} onChange={e => setExecData({...execData, payment_source: e.target.value})}>
                                        {bankOptions.map(b => <option key={b.id} value={`${b.bank_name} - ${b.account_no.slice(-4)}`}>{b.bank_name} •••• {b.account_no.slice(-4)}</option>)}
                                        {bankOptions.length === 0 && <option>Petty Cash</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className={UI.form.label}>Ref / UTR</label>
                                    <input className="w-full border border-slate-300 bg-sky-50 rounded p-2 text-xs text-slate-900 font-bold outline-none" value={execData.payment_ref} onChange={e => setExecData({...execData, payment_ref: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={UI.form.label}>Execution Date</label><input type="date" className="w-full border border-slate-300 bg-sky-50 rounded p-2 text-xs text-slate-900 font-bold outline-none" value={execData.date} onChange={e => setExecData({...execData, date: e.target.value})} /></div>
                                <div><label className={UI.form.label}>Net Settlement (₹)</label><input type="number" className="w-full border border-slate-300 bg-sky-50 rounded p-2 text-xs text-slate-900 font-black outline-none text-right" value={execData.amount} onChange={e => setExecData({...execData, amount: e.target.value})} /></div>
                            </div>

                            {isLoan && (
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                                    <h4 className="text-[10px] font-black text-amber-800 uppercase mb-3 border-b border-amber-200 pb-1">Debt Terms</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={UI.form.label}>Interest Rate (%)</label><input type="number" className="w-full bg-white border border-amber-200 p-2 text-xs font-bold rounded" value={execData.interest_rate} onChange={e => setExecData({...execData, interest_rate: e.target.value})} /></div>
                                        <div><label className={UI.form.label}>Tenure (Months)</label><input type="number" className="w-full bg-white border border-amber-200 p-2 text-xs font-bold rounded" value={execData.tenure_months} onChange={e => setExecData({...execData, tenure_months: e.target.value})} /></div>
                                    </div>
                                </div>
                            )}

                            {isEquity && (
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                                    <h4 className="text-[10px] font-black text-indigo-800 uppercase mb-3 border-b border-indigo-200 pb-1">Equity Terms</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={UI.form.label}>Dilution (%)</label><input type="number" className="w-full bg-white border border-indigo-200 p-2 text-xs font-bold rounded" value={execData.dilution_pct} onChange={e => setExecData({...execData, dilution_pct: e.target.value})} /></div>
                                        <div><label className={UI.form.label}>Implied Val.</label><div className="text-sm font-black text-indigo-700 mt-2 font-mono">{execData.dilution_pct && execData.amount ? `₹${new Intl.NumberFormat('en-IN').format(Number(execData.amount) / (Number(execData.dilution_pct)/100))}` : '-'}</div></div>
                                    </div>
                                </div>
                            )}

                            {isAssetDeal && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Asset Parameters</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={UI.form.label}>Units</label><input type="number" className="w-full bg-white border border-slate-300 p-2 text-xs font-bold rounded" value={execData.units} onChange={e => setExecData({...execData, units: e.target.value})} /></div>
                                        <div><label className={UI.form.label}>Price/Unit</label><input type="number" className="w-full bg-white border border-slate-300 p-2 text-xs font-bold rounded" value={execData.price_per_unit} onChange={e => setExecData({...execData, price_per_unit: e.target.value})} /></div>
                                    </div>
                                </div>
                            )}

                            <div><label className={UI.form.label}>Audit Notes</label><textarea className="w-full border border-slate-300 bg-sky-50 rounded p-2 text-xs text-slate-900 font-bold outline-none" rows="2" value={execData.notes} onChange={e => setExecData({...execData, notes: e.target.value})} /></div>

                            <button onClick={handleExecute} disabled={saving} className="w-full py-4 bg-slate-900 text-white rounded-sm text-[11px] font-black uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-xl">
                                {saving ? 'Synchronizing Treasury...' : 'Authorize & Synchronize'}
                            </button>
                        </div>
                    )}

                    {actionView === 'DEFER' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                            <label className={UI.form.label}>New Audit Deadline</label>
                            <input type="date" className={UI.form.input} value={deferDate} onChange={e => setDeferDate(e.target.value)} />
                            <button onClick={handleDefer} className="w-full py-4 bg-amber-600 text-white rounded-sm text-[11px] font-black uppercase tracking-widest hover:bg-amber-700">Confirm Deferral</button>
                        </div>
                    )}

                    {actionView === 'VOID' && (
                        <div className="p-8 text-center space-y-4 animate-in zoom-in-95">
                            <i className="fa-solid fa-triangle-exclamation text-4xl text-rose-500"></i>
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Mark this obligation as Null & Void?</p>
                            <button onClick={handleVoid} className="w-full py-4 bg-rose-600 text-white rounded-sm text-[11px] font-black uppercase tracking-widest hover:bg-rose-700">Execute Void Protocol</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LedgerExecutionModal;