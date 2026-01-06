import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase'; 

const CareersManager = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form Data
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        role: '',
        company: 'Auspex Internal', // or Portfolio Company Name
        location: 'Bangalore (Hybrid)',
        type: 'Full-time',
        link: '', // URL to apply (Typeform/LinkedIn/Email)
        status: 'Open'
    });

    // 1. FETCH JOBS
    useEffect(() => {
        const unsubscribe = db.collection('careers')
            .orderBy('status', 'desc') // Open first
            .onSnapshot(snap => {
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setJobs(data);
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    // 2. HANDLERS
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (currentId) await db.collection('careers').doc(currentId).update(formData);
            else await db.collection('careers').add(formData);
            resetForm();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if(window.confirm("Remove this listing?")) await db.collection('careers').doc(id).delete();
    };

    const resetForm = () => {
        setFormData({ role: '', company: 'Auspex Internal', location: '', type: 'Full-time', link: '', status: 'Open' });
        setCurrentId(null);
        setIsEditing(false);
    };

    const handleEdit = (job) => {
        setFormData(job);
        setCurrentId(job.id);
        setIsEditing(true);
    };

    // --- 🚀 SOCIAL LAUNCHER LOGIC ---
    const launchSocial = (platform, job) => {
        const text = `
🚀 WE ARE HIRING: ${job.role}

📍 Location: ${job.location}
🏢 Team: ${job.company}
⚡ Type: ${job.type}

We are looking for builders who want to shape the future of DeepTech and FinTech. 

Apply here: ${job.link || "Link in bio"}

#AuspexInvestments #Hiring #${job.role.replace(/\s/g, '')} #VCJobs
        `.trim();

        let url = '';
        if (platform === 'linkedin') {
            // LinkedIn Text Share Intent
            url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
        } else if (platform === 'x') {
            // X (Twitter) Intent
            url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        }

        window.open(url, '_blank');
    };

    if (loading) return <div className="text-[var(--brand-color)] animate-pulse">Loading Opportunities...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-[fadeIn_0.3s_ease]">
            
            {/* LEFT: EDITOR */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-fit sticky top-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">
                        {isEditing ? 'Edit Position' : 'Post New Job'}
                    </h3>
                    {isEditing && <button onClick={resetForm} className="text-xs text-[var(--brand-color)] border border-[var(--brand-color)] px-2 py-1 rounded hover:bg-[var(--brand-color)] hover:text-black transition-all">+ New</button>}
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Role Title</label>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} required placeholder="e.g. Investment Analyst" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company / Team</label>
                            <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none text-xs" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location</label>
                            <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none text-xs" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Application Link (Typeform/Email)</label>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none text-xs font-mono" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://..." />
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                        <button type="submit" className="flex-1 bg-[var(--brand-color)] text-black font-bold py-3 rounded-lg hover:brightness-110 shadow-[0_0_15px_var(--brand-glow)]">
                            {isEditing ? 'Update Listing' : 'Post Job'}
                        </button>
                    </div>
                </form>
            </div>

            {/* RIGHT: JOB LIST & SOCIAL LAUNCHER */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white mb-2">Active Openings</h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {jobs.map(job => (
                        <div key={job.id} className={`p-4 bg-black/40 border rounded-xl transition-all ${isEditing && currentId === job.id ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5' : 'border-white/10 hover:border-white/30'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="text-white font-bold">{job.role}</h4>
                                    <p className="text-[var(--brand-color)] text-xs uppercase font-bold">{job.company} • {job.location}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(job)} className="text-blue-400 hover:text-white transition-colors"><i className="fa-solid fa-pen"></i></button>
                                    <button onClick={() => handleDelete(job.id)} className="text-red-400 hover:text-white transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                                </div>
                            </div>
                            
                            {/* SOCIAL ACTION BAR */}
                            <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                                <button 
                                    onClick={() => launchSocial('linkedin', job)}
                                    className="flex-1 bg-[#0077b5]/20 hover:bg-[#0077b5] text-[#0077b5] hover:text-white border border-[#0077b5]/50 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="fa-brands fa-linkedin"></i> Post to LinkedIn
                                </button>
                                <button 
                                    onClick={() => launchSocial('x', job)}
                                    className="flex-1 bg-white/5 hover:bg-white text-white border border-white/20 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="fa-brands fa-x-twitter"></i> Post to X
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CareersManager;