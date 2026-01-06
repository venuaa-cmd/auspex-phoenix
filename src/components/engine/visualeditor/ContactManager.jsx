import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase'; 

const ContactManager = () => {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Default Data Structure
    const [formData, setFormData] = useState({
        email_pitch: "pitch@auspexinvestments.com",
        email_general: "info@auspexinvestments.com",
        address_line1: "123 Innovation Drive",
        address_line2: "Bangalore, KA, India",
        locations: "Dubai | Riyadh | Bahrain",
        // New Phone Fields
        phone_enquiry: "+91 80 1234 5678",
        phone_media: "+91 80 8765 4321",
        phone_update: "+91 80 1122 3344"
    });

    // 1. FETCH DATA
    useEffect(() => {
        const fetchData = async () => {
            try {
                const doc = await db.collection('company_profile').doc('contact').get();
                if (doc.exists) {
                    setFormData(prev => ({ ...prev, ...doc.data() })); // Merge to ensure new fields exist
                }
            } catch (err) {
                console.error("Error fetching contact:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 2. SAVE HANDLER
    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await db.collection('company_profile').doc('contact').set(formData);
            alert("✅ Contact Info Updated!");
        } catch (err) {
            alert("Error saving: " + err.message);
        }
        setIsSaving(false);
    };

    if (loading) return <div className="text-[var(--brand-color)] animate-pulse">Loading Contact Info...</div>;

    return (
        <div className="max-w-5xl mx-auto animate-[fadeIn_0.3s_ease]">
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Edit Contact Channels</h3>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-[var(--brand-color)] text-black px-6 py-2 rounded-lg font-bold hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                <form className="space-y-8">
                    {/* 1. EMAILS */}
                    <div>
                        <h4 className="text-[var(--brand-color)] font-bold text-sm mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Digital Lines</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Pitch Deck Email</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--brand-color)]" value={formData.email_pitch} onChange={e => setFormData({...formData, email_pitch: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">General Inquiries Email</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--brand-color)]" value={formData.email_general} onChange={e => setFormData({...formData, email_general: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* 2. PHONES (NEW SECTION) */}
                    <div>
                        <h4 className="text-[var(--brand-color)] font-bold text-sm mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Voice Lines</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">General Enquiry</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--brand-color)]" value={formData.phone_enquiry} onChange={e => setFormData({...formData, phone_enquiry: e.target.value})} placeholder="+91..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Media / PR</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--brand-color)]" value={formData.phone_media} onChange={e => setFormData({...formData, phone_media: e.target.value})} placeholder="+91..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Portfolio Updates</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--brand-color)]" value={formData.phone_update} onChange={e => setFormData({...formData, phone_update: e.target.value})} placeholder="+91..." />
                            </div>
                        </div>
                    </div>

                    {/* 3. LOCATION */}
                    <div>
                        <h4 className="text-[var(--brand-color)] font-bold text-sm mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Physical Presence</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none" value={formData.address_line1} onChange={e => setFormData({...formData, address_line1: e.target.value})} placeholder="Building / Street" />
                            <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none" value={formData.address_line2} onChange={e => setFormData({...formData, address_line2: e.target.value})} placeholder="City, State, Zip" />
                            <input className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none font-mono text-sm" value={formData.locations} onChange={e => setFormData({...formData, locations: e.target.value})} placeholder="Dubai | Riyadh | Bahrain" />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContactManager;