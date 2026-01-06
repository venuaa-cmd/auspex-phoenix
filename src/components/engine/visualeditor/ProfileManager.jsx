import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase'; 
import RichTextEditor from './RichTextEditor'; 

const ProfileManager = () => {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Default Data Structure matches your current hardcoded text
    const [formData, setFormData] = useState({
        tagline: "We invest in conviction. We partner for the long term.",
        intro: "Auspex Investments is an early-stage venture firm that partners with visionary founders at the pre-seed and seed stages.",
        storyTitle: "The Power of the Right Partner: From Founder Struggle to Ecosystem",
        storyContent: "The path from a great idea to a successful company is paved with operational hurdles..."
    });

    // 1. FETCH DATA (Single Document 'main')
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const doc = await db.collection('company_profile').doc('main').get();
                if (doc.exists) {
                    setFormData(doc.data());
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    // 2. SAVE HANDLER
    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // We use .doc('main') to ensure there is only ever ONE profile page
            await db.collection('company_profile').doc('main').set(formData);
            alert("✅ Profile Updated Successfully!");
        } catch (err) {
            alert("Error saving: " + err.message);
        }
        setIsSaving(false);
    };

    if (loading) return <div className="text-[var(--brand-color)] animate-pulse">Loading Profile Data...</div>;

    return (
        <div className="max-w-4xl mx-auto animate-[fadeIn_0.3s_ease]">
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Edit Company Profile</h3>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-[var(--brand-color)] text-black px-6 py-2 rounded-lg font-bold hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                <form className="space-y-6">
                    {/* TAGLINE */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--brand-color)] uppercase mb-2">Main Tagline</label>
                        <input 
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none font-bold text-lg"
                            value={formData.tagline} 
                            onChange={e => setFormData({...formData, tagline: e.target.value})} 
                        />
                    </div>

                    {/* INTRO PARAGRAPH */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Introduction (Top Paragraph)</label>
                        <textarea 
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none h-24 leading-relaxed"
                            value={formData.intro} 
                            onChange={e => setFormData({...formData, intro: e.target.value})} 
                        />
                    </div>

                    <div className="border-t border-white/10 my-6"></div>

                    {/* STORY SECTION */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--brand-color)] uppercase mb-2">Story Section Title</label>
                        <input 
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none font-bold"
                            value={formData.storyTitle} 
                            onChange={e => setFormData({...formData, storyTitle: e.target.value})} 
                        />
                    </div>

                    {/* RICH TEXT STORY */}
                    <div>
                        <RichTextEditor 
                            label="Our Story (Full Content)"
                            value={formData.storyContent}
                            onChange={e => setFormData({...formData, storyContent: e.target.value})}
                            height="h-64"
                        />
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileManager;