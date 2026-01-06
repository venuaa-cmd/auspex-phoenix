import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { UI } from '../../../lib/uiTheme';

import InvoiceTable from './InvoiceTable';
import DocumentForm from './DocumentForm';
import InvoiceForm from './InvoiceForm';
import InvoiceGenerator from './InvoiceGenerator';

const InvoiceManager = () => {
    const [activeTab, setActiveTab] = useState('PAYABLE');
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false);
    const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
    const [viewingInvoiceData, setViewingInvoiceData] = useState(null);

    // --- AUTOMATION SENTINEL: RECURRING PAYROLL ---
    const runPayrollAutomation = useCallback(async () => {
        const cycleRef = "PAY-JAN-2026"; 
        
        // 1. Physical Directory Check for the January Mandate
        const { data: existing } = await supabase
            .from('erp_invoices')
            .select('id')
            .eq('invoice_no', cycleRef)
            .maybeSingle();

        if (!existing) {
            console.log("Forensic Alert: Missing JAN-2026 mandate. Generating from Employee Node...");
            
            // 2. Extract personnel liabilities
            const { data: employees } = await supabase
                .from('erp_employees')
                .select('net_payable_monthly')
                .eq('status', 'ACTIVE');

            const totalLiability = employees?.reduce((sum, e) => sum + (Number(e.net_payable_monthly) || 0), 0) || 0;

            if (totalLiability > 0) {
                // 3. PHYSICAL INJECTION: Force Recurrence and Frequency
                await supabase.from('erp_invoices').insert([{
                    invoice_no: cycleRef,
                    client_name: 'INTERNAL - AUSPEX PERSONNEL',
                    display_name: 'January 2026 Payroll Mandate',
                    amount_total: totalLiability,
                    status: 'PENDING',
                    type: 'PAYABLE',
                    category: 'Payroll',
                    issue_date: '2026-01-05',
                    due_date: '2026-01-31',
                    is_recurring: true,         // FIXED
                    frequency: 'MONTHLY',        // FIXED
                    metadata: { source: 'AUTO_SENTINEL_V2', personnel_count: employees.length }
                }]);
                console.log("Success: PAY-JAN-2026 Mandate Injected.");
            }
        }
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            await runPayrollAutomation(); 
            const { data, error } = await supabase
                .from('erp_invoices')
                .select(`*, erp_entities!entity_id ( name, email ), erp_employees!employee_id ( full_name ), erp_portfolio_assets!asset_id ( asset_name )`)
                .eq('type', activeTab)
                .order('issue_date', { ascending: false });

            if (error) throw error;
            const normalizedData = (data || []).map(inv => ({
                ...inv,
                display_name: inv.erp_portfolio_assets?.asset_name || inv.erp_entities?.name || inv.erp_employees?.full_name || inv.display_name || 'Internal Accrual',
                display_email: inv.erp_entities?.email
            }));
            setInvoices(normalizedData);
        } catch (e) { console.error("OS Sync Failure:", e.message); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchInvoices(); }, [activeTab]);

    const handleViewGenerated = (invoice) => {
        const genData = {
            invoice_no: invoice.invoice_no,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            payee_name: invoice.display_name,
            payee_email: invoice.display_email,
            items: invoice.metadata?.items || [{ description: `Settlement: ${invoice.category}`, amount: invoice.amount_total }]
        };
        setViewingInvoiceData(genData);
    };

    const handleSaveComplete = () => {
        setIsDocumentFormOpen(false);
        setIsInvoiceFormOpen(false);
        fetchInvoices();
    };

    return (
        <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-900 antialiased relative">
            <div className="bg-white border-b border-slate-200 px-10 py-6 flex justify-between items-center sticky top-0 z-[10] shadow-sm">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Financial Directory</h2>
                    <div className="flex gap-6 mt-2">
                        {['PAYABLE', 'RECEIVABLE'].map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} className={`text-[10px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${activeTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>{t}</button>
                        ))}
                    </div>
                </div>
                <button onClick={() => activeTab === 'PAYABLE' ? setIsDocumentFormOpen(true) : setIsInvoiceFormOpen(true)} className="bg-slate-900 text-white px-8 py-3 text-[11px] font-black uppercase tracking-widest rounded-sm hover:bg-indigo-600 shadow-xl transition-all">
                    + Register {activeTab}
                </button>
            </div>

            <div className="p-10 max-w-[1800px] mx-auto">
                <InvoiceTable invoices={invoices} loading={loading} type={activeTab} onViewGenerated={handleViewGenerated} onVoid={fetchInvoices} />
            </div>

            {/* MODAL LAYER */}
            {isDocumentFormOpen && (
                <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
                    <DocumentForm isOpen={isDocumentFormOpen} onClose={() => setIsDocumentFormOpen(false)} onSave={handleSaveComplete} />
                </div>
            )}
            
            {isInvoiceFormOpen && (
                <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 overflow-hidden">
                    <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                            <h3 className="text-sm font-black uppercase tracking-widest leading-none">New Revenue Node</h3>
                            <button onClick={() => setIsInvoiceFormOpen(false)} className="hover:rotate-90 transition-transform"><i className="fa-solid fa-times"></i></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-white">
                            <InvoiceForm onCreate={handleSaveComplete} /> 
                        </div>
                    </div>
                </div>
            )}

            {viewingInvoiceData && (
                <div className="fixed inset-0 z-[10001]">
                    <InvoiceGenerator 
                        data={viewingInvoiceData}
                        companyDetails={{ name: "Auspex Investments", address: "Tech Park, Bangalore", gstin: "29ABCDE1234F1Z5" }}
                        onClose={() => setViewingInvoiceData(null)}
                    />
                </div>
            )}
        </div>
    );
};

export default InvoiceManager;