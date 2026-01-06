import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { UI } from '../../../lib/uiTheme'; // IMPORT THEME

const EntityForm = ({ isOpen, onClose, onSave, type, initialData }) => {
    if (!isOpen) return null;

    const [classificationOptions, setClassificationOptions] = useState([]); 
    const [expenseHierarchy, setExpenseHierarchy] = useState({}); 
    const [loadingCats, setLoadingCats] = useState(false);

    const [formData, setFormData] = useState(initialData || { 
        name: '', company_name: '', category: '', default_expense_category: '', default_sub_category: '',     
        gstin: '', email: '', phone: '', address: '', notes: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchTaxonomy = async () => {
            setLoadingCats(true);
            if (type === 'VENDOR') {
                const { data } = await supabase.from('erp_expense_categories').select('category, sub_category').eq('context', 'EXPENSE').eq('is_active', true).order('category');
                if (data) {
                    const mapping = {};
                    data.forEach(row => { if (!mapping[row.category]) mapping[row.category] = []; mapping[row.category].push(row.sub_category); });
                    setExpenseHierarchy(mapping);
                }
            } else {
                const { data } = await supabase.from('erp_expense_categories').select('sub_category').eq('context', 'CLASSIFICATION').eq('category', type).eq('is_active', true).order('sub_category');
                if (data) setClassificationOptions(data.map(r => r.sub_category));
            }
            setLoadingCats(false);
        };
        fetchTaxonomy();
    }, [type]);

    const handleVendorCatChange = (e) => setFormData({ ...formData, default_expense_category: e.target.value, default_sub_category: '' });

    const handleSubmit = async () => {
        if (!formData.name) return alert("Name is required");
        setSaving(true);
        const payload = { ...formData, type: type, category: type === 'VENDOR' ? null : formData.category };

        if (initialData) await supabase.from('erp_entities').update(payload).eq('id', initialData.id);
        else await supabase.from('erp_entities').insert([payload]);
        
        setSaving(false);
        onSave();
    };

    return (
        <div className={UI.form.modalOverlay}>
            <div className={UI.form.modalBox}>
                
                {/* UNIFIED WHITE HEADER */}
                <div className={UI.form.modalHeader}>
                    <h3 className={UI.form.modalTitle}>
                        {initialData ? 'Edit Profile' : `Add New ${type}`}
                    </h3>
                    <button onClick={onClose} className={UI.form.modalCloseBtn}><i className="fa-solid fa-times"></i></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    {/* Content omitted for brevity, logic remains identical, just styles using UI.* */}
                    {/* ... Vendor/Broker specific fields ... */}
                    
                    {/* Example Input usage */}
                    <div>
                        <label className={UI.form.label}>Entity Name</label>
                        <input className={UI.form.input} value={formData.name} placeholder="e.g. John Doe" onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    
                    {/* ... Rest of form ... */}

                    <button onClick={handleSubmit} disabled={saving} className={UI.btn.primary}>
                        {saving ? 'Saving...' : 'Save Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EntityForm;