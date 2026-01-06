import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase'; 
import RichTextEditor from './RichTextEditor'; 

const TeamManager = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        bio: '',
        photo_url: '',
        domains: '',
        order: 99
    });

    // 1. FETCH MEMBERS (Sorted by Order)
    useEffect(() => {
        const unsubscribe = db.collection('team_members')
            .orderBy('order', 'asc') 
            .onSnapshot(snap => {
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setMembers(data);
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    // 2. HANDLERS
    const handleEdit = (member) => {
        setFormData({
            name: member.name || '',
            role: member.role || '',
            bio: member.bio || '',
            photo_url: member.photo_url || '',
            domains: Array.isArray(member.domains) ? member.domains.join(', ') : (member.domains || ''),
            order: member.order || 99
        });
        setCurrentId(member.id);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Delete this team member?")) return;
        try {
            await db.collection('team_members').doc(id).delete();
        } catch (err) {
            alert("Error deleting: " + err.message);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', role: '', bio: '', photo_url: '', domains: '', order: 99 });
        setCurrentId(null);
        setIsEditing(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            order: parseInt(formData.order) || 99,
            domains: formData.domains.split(',').map(d => d.trim()).filter(Boolean)
        };

        try {
            if (currentId) {
                await db.collection('team_members').doc(currentId).update(payload);
            } else {
                await db.collection('team_members').add(payload);
            }
            resetForm();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    if (loading) return <div className="text-[var(--brand-color)] animate-pulse">Loading Directors...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.3s_ease]">
            {/* --- EDITOR FORM --- */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-fit sticky top-6">
                <h3 className="text-lg font-bold text-white mb-4">
                    {isEditing ? 'Edit Director' : 'Add New Director'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* ORDER INPUT */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--brand-color)] uppercase mb-1">Display Priority (1 = First)</label>
                        <input 
                            type="number"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none font-mono"
                            value={formData.order} onChange={e => setFormData({...formData, order: e.target.value})} 
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Role / Title</label>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} required />
                    </div>
                    
                    <RichTextEditor label="Detailed Bio" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} height="h-48" />

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Photo URL</label>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none text-xs" value={formData.photo_url} onChange={e => setFormData({...formData, photo_url: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Focus Areas</label>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none" value={formData.domains} onChange={e => setFormData({...formData, domains: e.target.value})} placeholder="SaaS, AI" />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button type="submit" className="flex-1 bg-[var(--brand-color)] text-black font-bold py-3 rounded-lg hover:brightness-110">{isEditing ? 'Update' : 'Add'}</button>
                        {isEditing && <button type="button" onClick={resetForm} className="px-4 bg-white/10 text-white rounded-lg hover:bg-white/20">Cancel</button>}
                    </div>
                </form>
            </div>

            {/* --- LIST VIEW --- */}
            <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">Current Board</h3>
                    <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">{members.length} Members</span>
                </div>

                {members.map(m => (
                    <div key={m.id} className="flex items-start gap-4 p-4 bg-black/40 border border-white/10 rounded-xl hover:border-white/30 transition-all">
                        <div className="flex flex-col items-center gap-2">
                            {/* Order Badge */}
                            <span className="text-[10px] font-mono bg-white/10 px-2 rounded text-slate-400">#{m.order}</span>
                            <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-white/20">
                                {m.photo_url ? (
                                    <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold">{m.name?.charAt(0)}</div>
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-white font-bold">{m.name}</h4>
                            <p className="text-[var(--brand-color)] text-xs font-bold uppercase tracking-wider">{m.role}</p>
                            <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                                {m.bio ? m.bio.replace(/<[^>]+>/g, '') : ''}
                            </p>
                        </div>
                        
                        {/* ACTION BUTTONS */}
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(m)} className="w-8 h-8 flex items-center justify-center hover:bg-blue-500/20 rounded-full text-blue-400 transition-colors" title="Edit">
                                <i className="fa-solid fa-pen"></i>
                            </button>
                            {/* --- THIS BUTTON IS BACK --- */}
                            <button onClick={() => handleDelete(m.id)} className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-full text-red-400 transition-colors" title="Delete">
                                <i className="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamManager;