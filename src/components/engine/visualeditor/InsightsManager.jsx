import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase'; 
import RichTextEditor from './RichTextEditor'; 

const InsightsManager = () => {
    const [activeTab, setActiveTab] = useState('blogs'); // 'blogs' or 'whitepapers'
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    const [currentId, setCurrentId] = useState(null);
    
    // Unified Form State (Handles fields for both types)
    const [formData, setFormData] = useState({
        title: '',
        category: '', // Used for Blog Category
        summary: '',  // Used for Blog Summary
        content: '',  // Used for Blog Full Text
        image_url: '', // Blog Cover Image
        pdf_url: '',   // Whitepaper Google Drive ID/Link
        domain_tag: '' // Comma-separated string for both
    });

    // 1. FETCH DATA (Dynamic based on Tab)
    useEffect(() => {
        setLoading(true);
        const collectionName = activeTab === 'blogs' ? 'insights_blog' : 'whitepapers';
        
        // Blogs sort by time, Whitepapers might not have timestamp, so we sort by title or just default
        let query = db.collection(collectionName);
        if (activeTab === 'blogs') query = query.orderBy('timestamp', 'desc');

        const unsubscribe = query.onSnapshot(snap => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setItems(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [activeTab]);

    // --- HELPER: GOOGLE DRIVE ID EXTRACTOR ---
    const extractDriveId = (url) => {
        if (!url) return '';
        // If user pasted a full URL, extract the ID
        const match = url.match(/[-\w]{25,}/);
        return match ? match[0] : url;
    };

    // 2. HANDLERS
    const handleEdit = (item) => {
        // Convert Array to String for editing
        const domainString = Array.isArray(item.domain_tag) 
            ? item.domain_tag.join(', ') 
            : (item.domain_tag || '');

        setFormData({
            title: item.title || '',
            category: item.category || '',
            summary: item.summary || '',
            content: item.content || '',
            image_url: item.image_url || '',
            pdf_url: item.pdf_url || '',
            domain_tag: domainString
        });
        setCurrentId(item.id);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if(!window.confirm(`Delete this ${activeTab === 'blogs' ? 'Article' : 'Whitepaper'}?`)) return;
        const collectionName = activeTab === 'blogs' ? 'insights_blog' : 'whitepapers';
        try {
            await db.collection(collectionName).doc(id).delete();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const resetForm = () => {
        setFormData({ title: '', category: '', summary: '', content: '', image_url: '', pdf_url: '', domain_tag: '' });
        setCurrentId(null);
        setIsEditing(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const collectionName = activeTab === 'blogs' ? 'insights_blog' : 'whitepapers';
        
        // 1. Process Domains (Split string to array)
        const domainArray = formData.domain_tag.split(',')
            .map(d => d.trim())
            .filter(Boolean);

        // 2. Base Payload
        let payload = {
            title: formData.title,
            domain_tag: domainArray // Saves as ["F&B", "Spirits"]
        };

        // 3. Type-Specific Fields
        if (activeTab === 'blogs') {
            payload = {
                ...payload,
                category: formData.category,
                summary: formData.summary,
                content: formData.content,
                image_url: formData.image_url,
                timestamp: isEditing ? (items.find(b => b.id === currentId)?.timestamp || new Date()) : new Date()
            };
        } else {
            // Whitepaper Specifics
            payload = {
                ...payload,
                pdf_url: extractDriveId(formData.pdf_url) // Auto-clean the ID
            };
        }

        try {
            if (currentId) {
                await db.collection(collectionName).doc(currentId).update(payload);
            } else {
                await db.collection(collectionName).add(payload);
            }
            resetForm();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const formatDate = (ts) => {
        if(!ts) return '';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString();
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-[fadeIn_0.3s_ease]">
            {/* --- LEFT: EDITOR FORM --- */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-fit sticky top-6">
                
                {/* TABS SWITCHER */}
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 mb-6">
                    <button 
                        onClick={() => { setActiveTab('blogs'); resetForm(); }}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${activeTab === 'blogs' ? 'bg-[var(--brand-color)] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Blogs (Articles)
                    </button>
                    <button 
                        onClick={() => { setActiveTab('whitepapers'); resetForm(); }}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${activeTab === 'whitepapers' ? 'bg-[var(--brand-color)] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Whitepapers (PDF)
                    </button>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {isEditing ? <i className="fa-solid fa-pen-nib text-[var(--brand-color)]"></i> : <i className="fa-solid fa-plus text-[var(--brand-color)]"></i>}
                        {isEditing ? `Edit ${activeTab === 'blogs' ? 'Article' : 'Paper'}` : `New ${activeTab === 'blogs' ? 'Article' : 'Paper'}`}
                    </h3>
                    {isEditing && (
                        <button onClick={resetForm} className="text-xs text-[var(--brand-color)] border border-[var(--brand-color)] px-2 py-1 rounded hover:bg-[var(--brand-color)] hover:text-black transition-all">+ New</button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* COMMON: TITLE */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Header / Title</label>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required placeholder="e.g. The EV Revolution" />
                    </div>

                    {/* COMMON: DOMAINS */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Domain List (Comma Separated)</label>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none" value={formData.domain_tag} onChange={e => setFormData({...formData, domain_tag: e.target.value})} placeholder="F&B, Spirits, Logistics" required />
                    </div>

                    {/* --- CONDITIONAL FIELDS: BLOGS --- */}
                    {activeTab === 'blogs' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Blog Category</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none text-xs" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Market Trends" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Picture URL</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none text-xs font-mono" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://firebasestorage..." />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Brief Description</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none h-20 text-sm" value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} placeholder="Hook the reader..." />
                            </div>
                            
                            <RichTextEditor 
                                label="Full Blog Content" 
                                value={formData.content} 
                                onChange={e => setFormData({...formData, content: e.target.value})} 
                                height="h-64" 
                            />
                        </>
                    )}

                    {/* --- CONDITIONAL FIELDS: WHITEPAPERS --- */}
                    {activeTab === 'whitepapers' && (
                        <div className="bg-[var(--brand-color)]/5 border border-[var(--brand-color)]/20 p-4 rounded-xl">
                            <label className="block text-xs font-bold text-[var(--brand-color)] uppercase mb-1">Google Drive PDF Link</label>
                            <input 
                                className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none font-mono text-xs" 
                                value={formData.pdf_url} 
                                onChange={e => setFormData({...formData, pdf_url: e.target.value})} 
                                placeholder="Paste full share link here..." 
                                required
                            />
                            <p className="text-[10px] text-slate-500 mt-2">
                                <i className="fa-solid fa-magic-wand-sparkles mr-1"></i>
                                Auto-Extractor Active: Paste the full link, we'll grab the ID.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2 pt-4">
                        <button type="submit" className="flex-1 bg-[var(--brand-color)] text-black font-bold py-3 rounded-lg hover:brightness-110 shadow-[0_0_15px_var(--brand-glow)]">
                            {isEditing ? 'Publish Updates' : 'Publish'}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={resetForm} className="px-4 bg-white/10 text-white rounded-lg hover:bg-white/20">Cancel</button>
                        )}
                    </div>
                </form>
            </div>

            {/* --- RIGHT: LIST VIEW --- */}
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">Library: {activeTab === 'blogs' ? 'Articles' : 'Whitepapers'}</h3>
                    <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">{items.length} Items</span>
                </div>

                <div className="space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
                    {loading && <div className="text-[var(--brand-color)] animate-pulse text-sm">Syncing...</div>}
                    
                    {items.map(item => (
                        <div key={item.id} className={`flex flex-col gap-3 p-4 bg-black/40 border rounded-xl transition-all ${isEditing && currentId === item.id ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5' : 'border-white/10 hover:border-white/30'}`}>
                            
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3 items-start">
                                    {/* Icon / Image */}
                                    <div className="w-12 h-12 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-white/10 flex items-center justify-center text-slate-500">
                                        {activeTab === 'blogs' && item.image_url ? (
                                            <img src={item.image_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <i className={`fa-regular ${activeTab === 'blogs' ? 'fa-newspaper' : 'fa-file-pdf'} text-xl`}></i>
                                        )}
                                    </div>
                                    
                                    {/* Info */}
                                    <div>
                                        <h4 className="text-white font-bold leading-tight text-sm mb-1">{item.title}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {/* Render Domain Tags */}
                                            {Array.isArray(item.domain_tag) ? item.domain_tag.map((tag, i) => (
                                                <span key={i} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300 border border-white/5">{tag}</span>
                                            )) : (
                                                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300 border border-white/5">{item.domain_tag}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(item)} className="w-8 h-8 flex items-center justify-center hover:bg-blue-500/20 rounded-full text-blue-400 transition-colors"><i className="fa-solid fa-pen"></i></button>
                                    <button onClick={() => handleDelete(item.id)} className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-full text-red-400 transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                                </div>
                            </div>
                            
                            {/* Summary preview for blogs */}
                            {activeTab === 'blogs' && item.summary && (
                                <p className="text-slate-500 text-xs line-clamp-2 border-t border-white/5 pt-2">
                                    {item.summary}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InsightsManager;