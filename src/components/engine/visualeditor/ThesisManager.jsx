import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase'; 
import RichTextEditor from './RichTextEditor'; 

const ThesisManager = () => {
    const [theses, setTheses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        order: 99
    });

    // 1. FETCH THESIS VERTICALS (Sorted)
    useEffect(() => {
        const unsubscribe = db.collection('thesis_verticals')
            .orderBy('order', 'asc')
            .onSnapshot(snap => {
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTheses(data);
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    // 2. HANDLERS
    const handleEdit = (item) => {
        setFormData({
            title: item.title || '',
            description: item.description || '',
            order: item.order || 99
        });
        setCurrentId(item.id);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Delete this thesis vertical?")) return;
        try {
            await db.collection('thesis_verticals').doc(id).delete();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    // --- RESET FORM TO "ADD NEW" MODE ---
    const resetForm = () => {
        setFormData({ title: '', description: '', order: 99 });
        setCurrentId(null);
        setIsEditing(false); // This flips the UI back to "Add New"
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            order: parseInt(formData.order) || 99
        };

        try {
            if (currentId) {
                // Update Existing
                await db.collection('thesis_verticals').doc(currentId).update(payload);
            } else {
                // Create New
                await db.collection('thesis_verticals').add(payload);
            }
            resetForm(); // Clear form after save
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    if (loading) return <div className="text-[var(--brand-color)] animate-pulse">Loading Thesis...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.3s_ease]">
            {/* --- EDITOR FORM --- */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-fit sticky top-6">
                
                {/* HEADER + RESET BUTTON */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {isEditing ? <i className="fa-solid fa-pen-to-square text-[var(--brand-color)]"></i> : <i className="fa-solid fa-plus text-[var(--brand-color)]"></i>}
                        {isEditing ? 'Edit Vertical' : 'Add New Vertical'}
                    </h3>
                    {isEditing && (
                        <button 
                            onClick={resetForm}
                            className="text-xs text-[var(--brand-color)] border border-[var(--brand-color)] px-2 py-1 rounded hover:bg-[var(--brand-color)] hover:text-black transition-all"
                        >
                            + New
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div>
                        <label className="block text-xs font-bold text-[var(--brand-color)] uppercase mb-1">Display Priority</label>
                        <input 
                            type="number"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none font-mono"
                            value={formData.order} onChange={e => setFormData({...formData, order: e.target.value})} 
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Title (Accordion Header)</label>
                        <input 
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none font-bold"
                            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required 
                            placeholder="e.g. AI Infrastructure"
                        />
                    </div>
                    
                    <RichTextEditor 
                        label="Description (Expanded Content)" 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        height="h-48" 
                    />

                    <div className="flex gap-2 pt-4">
                        <button type="submit" className="flex-1 bg-[var(--brand-color)] text-black font-bold py-3 rounded-lg hover:brightness-110 shadow-[0_0_15px_var(--brand-glow)]">
                            {isEditing ? 'Update Vertical' : 'Add Vertical'}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={resetForm} className="px-4 bg-white/10 text-white rounded-lg hover:bg-white/20">
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* --- LIST VIEW --- */}
            <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">Active Verticals</h3>
                    <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">{theses.length} Items</span>
                </div>

                {theses.map(item => (
                    <div key={item.id} className={`flex items-center gap-4 p-4 bg-black/40 border rounded-xl transition-all ${isEditing && currentId === item.id ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5' : 'border-white/10 hover:border-white/30'}`}>
                        
                        {/* Order Badge */}
                        <div className="flex flex-col items-center justify-center w-10 shrink-0">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Ord</span>
                            <span className="text-lg font-mono text-white font-bold">{item.order}</span>
                        </div>

                        {/* Content Preview */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
                            <p className="text-slate-400 text-xs line-clamp-2">
                                {item.description ? item.description.replace(/<[^>]+>/g, '') : ''}
                            </p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleEdit(item)} 
                                className="w-8 h-8 flex items-center justify-center hover:bg-blue-500/20 rounded-full text-blue-400 transition-colors" 
                                title="Edit"
                            >
                                <i className="fa-solid fa-pen"></i>
                            </button>
                            <button 
                                onClick={() => handleDelete(item.id)} 
                                className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-full text-red-400 transition-colors" 
                                title="Delete"
                            >
                                <i className="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ThesisManager;