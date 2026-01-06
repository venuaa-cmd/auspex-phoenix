import React, { useState } from 'react';
import TeamManager from './engine/visualeditor/TeamManager';
import ThesisManager from './engine/visualeditor/ThesisManager';     // <--- Make sure this is imported
import InsightsManager from './engine/visualeditor/InsightsManager'; // <--- THIS WAS MISSING
import ProfileManager from './engine/visualeditor/ProfileManager';   // <--- This too
import ContactManager from './engine/visualeditor/ContactManager';
import CareersManager from './engine/visualeditor/CareersManager';
import PortfolioManagement from './engine/visualeditor/PortfolioManagement';

const VisualEditor = () => {
    const [activeSection, setActiveSection] = useState('team');

    const sections = [
        { id: 'profile', label: 'Profile (About Us)' },
        { id: 'team', label: 'Team (Directors)' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'thesis', label: 'Thesis' },
        { id: 'insights', label: 'Insights (Blog)' },
	{ id: 'careers', label: 'Careers & Social' },
        { id: 'contact', label: 'Contact Info' }
    ];

    return (
        <div className="animate-[fadeIn_0.3s_ease]">
            {/* --- HEADER & DROPDOWN --- */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-white/10 p-6 rounded-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <i className="fa-solid fa-pen-nib text-[var(--brand-color)]"></i> 
                        Visual Content Editor
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Manage public-facing website content directly.</p>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-400 font-bold uppercase">Editing:</label>
                    <div className="relative group">
                        <select 
                            value={activeSection}
                            onChange={(e) => setActiveSection(e.target.value)}
                            className="appearance-none bg-black border border-[var(--brand-color)] text-white py-2 pl-4 pr-10 rounded-lg cursor-pointer focus:outline-none focus:shadow-[0_0_15px_var(--brand-glow)] font-bold text-sm min-w-[200px]"
                        >
                            {sections.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--brand-color)]">
                            <i className="fa-solid fa-chevron-down text-xs"></i>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 min-h-[500px]">
                
                {/* 1. PROFILE */}
                {activeSection === 'profile' && <ProfileManager />}

                {/* 2. TEAM */}
                {activeSection === 'team' && <TeamManager />}
                
                {/* 3. THESIS (Adding this ensures your accordion editor works here too) */}
                {activeSection === 'thesis' && <ThesisManager />}

                {/* 4. INSIGHTS (This is what was missing for your blog) */}
                {activeSection === 'insights' && <InsightsManager />}

                {activeSection === 'portfolio' && <PortfolioManagement />}
                
                {/* 6. CONTACT (Placeholder) */}
                {activeSection === 'contact' && <ContactManager />}
		{activeSection === 'careers' && <CareersManager />}
            </div>
        </div>
    );
};

export default VisualEditor;