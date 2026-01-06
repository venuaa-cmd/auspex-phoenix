import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { UI } from '../../../lib/uiTheme';
import InvoiceGenerator from './InvoiceGenerator';

const InvoiceForm = ({ onCreate, initialData }) => {
    const [invoiceNum, setInvoiceNum] = useState(`INV-${new Date().getFullYear()}-001`);
    const [payees, setPayees] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState([{ description: '', amount: '' }]);
    const [saving, setSaving] = useState(false);
    
    // RECURRENCE STATE
    const [recurrence, setRecurrence] = useState({ 
        is_recurring: false, 
        frequency: 'ONE_TIME' 
    });

    // Generator State
    const [showGenerator, setShowGenerator] = useState(false);
    const [generatedData, setGeneratedData] = useState(null);

    // 1. FETCH INSTITUTIONAL RESOURCES
    useEffect(() => {
        const fetchResources = async () => {
            const { data: clientData } = await supabase.from('erp_entities').select('id, name, email').eq('type', 'CLIENT').eq('status', 'ACTIVE').order('name');
            const { data: assetData } = await supabase.from('erp_portfolio_assets').select('id, asset_name').eq('status', 'ACTIVE').order('asset_name');
            
            const formattedClients = (clientData || []).map(c => ({ id: c.id, name: c.name, type: 'CLIENT', email: c.email }));
            const formattedAssets = (assetData || []).map(a => ({ id: a.id, name: a.asset_name, type: 'ASSET' }));
            setPayees([...formattedClients, ...formattedAssets]);
        };
        fetchResources();
    }, []);

    // 2. POPULATE DATA (Edit Mode)
    useEffect(() => {
        if (initialData) {
            setInvoiceNum(initialData.invoice_no);
            setIssueDate(initialData.issue_date);
            setDueDate(initialData.due_date || ''); 
            
            if (initialData.entity_id) { setSelectedId(initialData.entity_id); setSelectedType('CLIENT'); } 
            else if (initialData.asset_id) { setSelectedId(initialData.asset_id); setSelectedType('ASSET'); }

            if (initialData.metadata?.items && Array.isArray(initialData.metadata.items)) {
                setItems(initialData.metadata.items);
            } else {
                setItems([{ description: initialData.notes || 'Services', amount: initialData.amount_total }]);
            }

            if (initialData.is_recurring) {
                setRecurrence({ is_recurring: true, frequency: initialData.frequency });
            }
        }
    }, [initialData]);

    const calculateTotal = () => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const handleAddItem = () => setItems([...items, { description: '', amount: '' }]);
    const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));
    const handleItemChange = (index, field, value) => { const newItems = [...items]; newItems[index][field] = value; setItems(newItems); };

    const handlePayeeChange = (e) => {
        const id = e.target.value;
        const payee = payees.find(p => p.id === id);
        setSelectedId(id);
        setSelectedType(payee ? payee.type : '');
        if (payee?.type === 'ASSET') setItems([{ description: `Sale of ${payee.name}`, amount: '' }]);
        else if (payee?.type === 'CLIENT') setItems([{ description: 'Professional Services', amount: '' }]);
        else setItems([{ description: '', amount: '' }]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedId) return alert("Select a Payer Node");
        setSaving(true);
        
        const total = calculateTotal();
        const itemsSummary = items.map(i => `${i.description}: ₹${i.amount}`).join('\n');

        const payload = {
            invoice_no: invoiceNum, 
            issue_date: issueDate, 
            due_date: dueDate ? dueDate : null, 
            amount_total: total, 
            // AUTO-STAMP: Receivables default to "PAID" (Manifests as RECEIVED in UI)
            status: 'PAID', 
            type: 'RECEIVABLE', 
            notes: itemsSummary,
            entity_id: selectedType === 'CLIENT' ? selectedId : null,
            asset_id: selectedType === 'ASSET' ? selectedId : null,
            category: selectedType === 'ASSET' ? 'Sale of Asset' : 'Sales / Income',
            
            // RECURRENCE PERSISTENCE
            is_recurring: recurrence.is_recurring,
            frequency: recurrence.is_recurring ? recurrence.frequency : 'ONE_TIME',
            
            metadata: {
                items: items,
                is_generated: true, 
                source: 'SYSTEM_INVOICE_HUB',
                is_recurring: recurrence.is_recurring,
                ...(initialData?.metadata || {}) 
            }
        };

        let error;
        if (initialData) {
            const { error: updateError } = await supabase.from('erp_invoices').update(payload).eq('id', initialData.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from('erp_invoices').insert([payload]);
            error = insertError;
        }
        
        setSaving(false);
        
        if (error) {
            alert("Protocol Error: " + error.message);
        } else {
            const payeeObj = payees.find(p => p.id === selectedId);
            setGeneratedData({
                invoice_no: invoiceNum,
                issue_date: issueDate,
                due_date: dueDate,
                payee_name: payeeObj?.name || (initialData?.display_name),
                payee_type: selectedType,
                payee_email: payeeObj?.email,
                items: items
            });
            setShowGenerator(true);
        }
    };

    const handleGeneratorClose = () => {
        setShowGenerator(false);
        onCreate(); 
    };

    return (
        <>
            <div className="flex flex-col h-full bg-white">
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6">
                    
                    {/* 1. PAYER & REFERENCE */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Bill To / Source Node</label>
                            <select className="w-full border-b-2 border-slate-100 p-3 text-[11px] font-bold outline-none focus:border-slate-900 uppercase transition-all bg-transparent" value={selectedId} onChange={handlePayeeChange} required>
                                <option value="">-- Select Client / Asset Node --</option>
                                {payees.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Invoice Protocol #</label>
                            <input className="w-full border-b-2 border-slate-100 p-3 text-[11px] font-mono font-bold outline-none focus:border-slate-900 uppercase transition-all bg-transparent" value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} required />
                        </div>
                    </div>
                    
                    {/* 2. RECURRENCE PROTOCOL */}
                    <div className="bg-slate-50 p-6 border border-slate-100 rounded-sm">
                        <div className="flex items-center justify-between mb-5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Revenue Schedule</label>
                            <div className="flex gap-2">
                                <button 
                                    type="button" 
                                    onClick={() => setRecurrence({ ...recurrence, is_recurring: false })}
                                    className={`text-[9px] font-black px-4 py-1.5 rounded-sm border-2 transition-all ${!recurrence.is_recurring ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
                                >
                                    ONE-TIME
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setRecurrence({ ...recurrence, is_recurring: true })}
                                    className={`text-[9px] font-black px-4 py-1.5 rounded-sm border-2 transition-all ${recurrence.is_recurring ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}
                                >
                                    RECURRING
                                </button>
                            </div>
                        </div>
                        
                        {recurrence.is_recurring && (
                            <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-300">
                                {['MONTHLY', 'QUARTERLY', 'ANNUALLY'].map(freq => (
                                    <button 
                                        key={freq} 
                                        type="button" 
                                        onClick={() => setRecurrence({ ...recurrence, frequency: freq })}
                                        className={`py-2 text-[9px] font-black uppercase rounded-sm border-2 transition-all ${recurrence.frequency === freq ? 'bg-indigo-900 text-white border-indigo-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                    >
                                        {freq}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 3. EXECUTION DATES */}
                     <div className="grid grid-cols-2 gap-6">
                        <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Issue Date</label><input type="date" className="w-full border-b-2 border-slate-100 p-3 text-[11px] font-bold outline-none focus:border-slate-900 font-mono" value={issueDate} onChange={e => setIssueDate(e.target.value)} required /></div>
                        <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Due Date</label><input type="date" className="w-full border-b-2 border-slate-100 p-3 text-[11px] font-bold outline-none focus:border-slate-900 font-mono" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
                    </div>

                    {/* 4. LINE ITEMS REGISTRY */}
                    <div className="flex-1 border-2 border-slate-100 rounded-sm p-6 bg-white overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-4 items-end animate-in fade-in duration-300">
                                    <div className="flex-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Description</label>
                                        <input placeholder="Service Detail..." value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} className="w-full border-b border-slate-200 p-2 text-[12px] font-bold outline-none focus:border-indigo-500 uppercase transition-all" required />
                                    </div>
                                    <div className="w-40">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Amount (₹)</label>
                                        <input type="number" placeholder="0.00" value={item.amount} onChange={e => handleItemChange(idx, 'amount', e.target.value)} className="w-full border-b border-slate-200 p-2 text-[12px] font-black outline-none focus:border-indigo-500 tabular-nums text-right" required />
                                    </div>
                                    <button type="button" onClick={() => handleRemoveItem(idx)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all"><i className="fa-solid fa-times"></i></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddItem} className="mt-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-all"><i className="fa-solid fa-plus-circle"></i> Add Revenue Line</button>
                    </div>

                    {/* 5. SUMMATION & SUBMISSION */}
                    <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                         <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Net Receivable</span>
                            <div className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(calculateTotal())}</div>
                         </div>
                         <button type="submit" disabled={saving} className="bg-slate-900 text-white px-12 py-5 text-[11px] font-black uppercase tracking-[0.4em] rounded-sm hover:bg-emerald-600 transition-all shadow-2xl active:scale-95 disabled:opacity-30">
                            {saving ? 'Processing...' : (initialData ? 'Update & Regenerate' : 'Save & Execute Node')}
                        </button>
                    </div>
                </form>
            </div>

            {showGenerator && (
                <div className="fixed inset-0 z-[10001]">
                    <InvoiceGenerator 
                        data={generatedData} 
                        companyDetails={{ name: "Auspex Investments", address: "Tech Park, Bangalore", gstin: "29ABCDE1234F1Z5" }}
                        onClose={handleGeneratorClose} 
                    />
                </div>
            )}
        </>
    );
};

export default InvoiceForm;