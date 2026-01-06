import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { UI } from '../../../lib/uiTheme';

const DocumentForm = ({ isOpen, onClose, onSave, defaultType = 'PAYABLE' }) => {
    if (!isOpen) return null;

    const [entities, setEntities] = useState([]);
    const [expenseHierarchy, setExpenseHierarchy] = useState({}); 
    const [loadingResources, setLoadingResources] = useState(false);
    
    // --- FORM STATE ---
    const [formData, setFormData] = useState({ 
        selected_id: '', 
        selected_type: '', 
        invoice_no: '', 
        invoice_date: new Date().toISOString().split('T')[0], 
        due_date: '', 
        amount_total: '', 
        notes: '', 
        category: '', 
        sub_category: '',
        
        // INVESTMENT SPECIFIC
        round_name: '', units: '', price_per_unit: '',
        
        // EVIDENCE
        attachment: null
    });

    // RECURRENCE STATE
    const [recurrence, setRecurrence] = useState({ 
        is_recurring: false, 
        frequency: 'ONE_TIME' 
    });
    
    const [saving, setSaving] = useState(false);

    // 1. FETCH INSTITUTIONAL RESOURCES
    useEffect(() => {
        const loadResources = async () => {
            setLoadingResources(true);
            const { data: extData } = await supabase.from('erp_entities').select('id, name, type, default_expense_category, default_sub_category').in('type', ['VENDOR', 'BROKER', 'CLIENT']).eq('status', 'ACTIVE').order('name');
            const { data: empData } = await supabase.from('erp_employees').select('id, full_name, role, net_payable_monthly').eq('status', 'ACTIVE').order('full_name');
            const { data: assetData } = await supabase.from('erp_portfolio_assets').select('id, asset_name').eq('status', 'ACTIVE').order('asset_name');

            const formattedEmployees = (empData || []).map(e => ({ id: e.id, name: e.full_name, type: 'TEAM', default_expense_category: 'Payroll', default_sub_category: 'Salary / Reimbursement', salary: e.net_payable_monthly || 0 }));
            const formattedAssets = (assetData || []).map(a => ({ id: a.id, name: a.asset_name, type: 'ASSET', default_expense_category: 'Asset Purchase', default_sub_category: 'Capital Allocation' }));

            const combined = [...(extData || []), ...formattedEmployees, ...formattedAssets];
            combined.sort((a, b) => a.name.localeCompare(b.name));
            setEntities(combined);

            const { data: cData } = await supabase.from('erp_expense_categories').select('category, sub_category').eq('context', 'EXPENSE').eq('is_active', true);
            if (cData) {
                const mapping = {};
                cData.forEach(row => { if (!mapping[row.category]) mapping[row.category] = new Set(); mapping[row.category].add(row.sub_category); });
                const cleanMapping = {};
                Object.keys(mapping).forEach(key => { cleanMapping[key] = Array.from(mapping[key]); });
                setExpenseHierarchy(cleanMapping);
            }
            setLoadingResources(false);
        };
        loadResources();
    }, []);

    // 2. HANDLE CONTEXT CHANGES
    const handleEntityChange = (e) => {
        const entId = e.target.value;
        const entity = entities.find(v => v.id === entId);
        
        setFormData(prev => ({
            ...prev, 
            selected_id: entId, 
            selected_type: entity?.type || '', 
            category: entity?.default_expense_category || '', 
            sub_category: entity?.default_sub_category || '',
            amount_total: entity?.type === 'TEAM' ? entity.salary : prev.amount_total,
            notes: entity?.type === 'TEAM' ? `Salary - ${new Date().toLocaleString('default', { month: 'long' })}` : entity?.type === 'ASSET' ? `Capital Call / Investment` : prev.notes
        }));

        // Auto-enable recurrence for Payroll
        if (entity?.type === 'TEAM') {
            setRecurrence({ is_recurring: true, frequency: 'MONTHLY' });
        }
    };

    useEffect(() => {
        if (formData.units && formData.price_per_unit) {
            setFormData(prev => ({ ...prev, amount_total: (prev.units * prev.price_per_unit).toString() }));
        }
    }, [formData.units, formData.price_per_unit]);

    // 3. FORENSIC UPLOAD & COMMIT
    const handleSubmit = async () => {
        if (!formData.selected_id || !formData.amount_total) return alert("Validation Failed: Payee and Amount required.");
        
        setSaving(true);
        let attachmentUrl = null;

        // A. Storage Logic
        if (formData.attachment) {
            const fileName = `INV_${Date.now()}_${formData.attachment.name}`;
            const { data, error: uploadErr } = await supabase.storage.from('invoices').upload(fileName, formData.attachment);
            if (uploadErr) {
                alert("Vault Storage Failure: " + uploadErr.message);
                setSaving(false); return;
            }
            const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(fileName);
            attachmentUrl = urlData.publicUrl;
        }

        // B. Database Commitment
        const payload = {
            type: defaultType, 
            invoice_no: formData.invoice_no, 
            issue_date: formData.invoice_date, 
            due_date: formData.due_date || null,
            amount_total: Number(formData.amount_total), 
            category: formData.category, 
            sub_category: formData.sub_category, 
            notes: formData.notes, 
            status: 'PENDING',
            evidence_url: attachmentUrl, // FIXED: Correct column mapping
            
            // Recurrence Node
            is_recurring: recurrence.is_recurring,
            frequency: recurrence.is_recurring ? recurrence.frequency : 'ONE_TIME',

            // Logic Routing
            entity_id: ['VENDOR', 'BROKER', 'CLIENT'].includes(formData.selected_type) ? formData.selected_id : null,
            employee_id: formData.selected_type === 'TEAM' ? formData.selected_id : null,
            asset_id: formData.selected_type === 'ASSET' ? formData.selected_id : null,

            metadata: {
                source: 'DOCUMENT_FORM_V5',
                round: formData.round_name,
                units: formData.units,
                price_per_unit: formData.price_per_unit,
                is_recurring: recurrence.is_recurring
            }
        };

        const { error } = await supabase.from('erp_invoices').insert([payload]);
        if (error) alert("Commitment Failure: " + error.message);
        else onSave();
        setSaving(false);
    };

    return (
        // FIXED Z-INDEX: Physically forced above the menu bar
        <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
                
                {/* HEADER */}
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.3em]">Log Obligation</h3>
                        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Institutional Audit Record</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 transition-all"><i className="fa-solid fa-times"></i></button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    
                    {/* 1. ENTITY SELECTION */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Pay To / Counterparty</label>
                        <select className="w-full border-b-2 border-slate-100 p-3 text-[11px] font-bold outline-none focus:border-slate-900 uppercase transition-all bg-transparent" value={formData.selected_id} onChange={handleEntityChange}>
                            <option value="">-- Select Payee Node --</option>
                            {entities.map(e => ( <option key={e.id} value={e.id}>{e.name} ({e.type})</option> ))}
                        </select>
                    </div>

                    {/* 2. RECURRENCE PROTOCOL */}
                    <div className="bg-slate-50 p-6 border border-slate-100 rounded-sm">
                        <div className="flex items-center justify-between mb-5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Schedule Node</label>
                            <button 
                                type="button" 
                                onClick={() => setRecurrence({ ...recurrence, is_recurring: !recurrence.is_recurring })}
                                className={`text-[9px] font-black px-4 py-1.5 rounded-sm border-2 transition-all ${recurrence.is_recurring ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}
                            >
                                {recurrence.is_recurring ? 'RECURRING_ACTIVE' : 'ONE_TIME_ENTRY'}
                            </button>
                        </div>
                        
                        {recurrence.is_recurring && (
                            <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-300">
                                {['MONTHLY', 'QUARTERLY', 'ANNUALLY'].map(freq => (
                                    <button 
                                        key={freq} 
                                        type="button" 
                                        onClick={() => setRecurrence({ ...recurrence, frequency: freq })}
                                        className={`py-2 text-[9px] font-black uppercase rounded-sm border-2 transition-all ${recurrence.frequency === freq ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                    >
                                        {freq}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 3. EVIDENCE UPLOAD */}
                    <div className={`p-6 rounded-sm border-2 border-dashed transition-all ${formData.attachment ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-indigo-400'}`}>
                        <label className="flex flex-col items-center justify-center cursor-pointer">
                            {formData.attachment ? (
                                <>
                                    <i className="fa-solid fa-check-circle text-3xl text-emerald-500 mb-3"></i>
                                    <span className="text-[11px] font-black text-emerald-700 uppercase tracking-tight">{formData.attachment.name}</span>
                                    <span className="text-[9px] text-emerald-600 uppercase mt-1">Node Verified</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-200 mb-3"></i>
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Attach Digital Bill</span>
                                    {['VENDOR', 'BROKER'].includes(formData.selected_type) && <span className="text-[9px] text-rose-500 font-bold mt-2 italic">* Mandatory Compliance Link</span>}
                                </>
                            )}
                            <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => setFormData({...formData, attachment: e.target.files[0]})} />
                        </label>
                    </div>

                    {/* 4. CLASSIFICATION NODES */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Category</label>
                            <select className="w-full border-b-2 border-slate-100 p-2 text-[11px] font-bold outline-none focus:border-slate-900 uppercase bg-transparent" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value, sub_category: '' })}>
                                <option value="">-- Classification --</option>
                                {Object.keys(expenseHierarchy).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                <option value="Asset Purchase">Asset Purchase</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Sub-Protocol</label>
                            <select className="w-full border-b-2 border-slate-100 p-2 text-[11px] font-bold outline-none focus:border-slate-900 uppercase bg-transparent" value={formData.sub_category} onChange={e => setFormData({...formData, sub_category: e.target.value})}>
                                <option value="">-- Sub-Class --</option>
                                {formData.category && expenseHierarchy[formData.category]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                <option value="Capital Allocation">Capital Allocation</option>
                            </select>
                        </div>
                    </div>

                    {/* 5. NUMERIC OBLIGATION */}
                    <div className="grid grid-cols-2 gap-6">
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Protocol Ref #</label><input className="w-full border-b-2 border-slate-100 p-2 text-[11px] font-mono font-bold outline-none focus:border-slate-900" placeholder="e.g. INV-001" value={formData.invoice_no} onChange={e => setFormData({...formData, invoice_no: e.target.value})} /></div>
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Total Liability (₹)</label><input type="number" className="w-full border-b-2 border-slate-100 p-2 text-[13px] font-black outline-none focus:border-slate-900 tabular-nums" placeholder="0.00" value={formData.amount_total} onChange={e => setFormData({...formData, amount_total: e.target.value})} /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Execution Date</label><input type="date" className="w-full border-b-2 border-slate-100 p-2 text-[11px] font-bold outline-none focus:border-slate-900 font-mono" value={formData.invoice_date} onChange={e => setFormData({...formData, invoice_date: e.target.value})} /></div>
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Audit Deadline</label><input type="date" className="w-full border-b-2 border-slate-100 p-2 text-[11px] font-bold outline-none focus:border-slate-900 font-mono" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} /></div>
                    </div>
                    
                    <button 
                        onClick={handleSubmit} 
                        disabled={saving} 
                        className="w-full py-5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.4em] hover:bg-emerald-600 transition-all shadow-2xl active:scale-95 disabled:opacity-30"
                    >
                        {saving ? 'Processing Audit Entry...' : 'Confirm Obligation Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentForm;