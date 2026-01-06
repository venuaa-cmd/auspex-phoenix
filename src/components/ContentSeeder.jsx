import React, { useState } from 'react';
import { db } from '../lib/firebase';

// --- 🔒 THE MASK ---
// We keep the ugly project path up here so your data below stays clean.
const STORAGE_BASE = "https://firebasestorage.googleapis.com/v0/b/auspex-phoenix.firebasestorage.app/o/management%2F";

const ContentSeeder = () => {
    const [status, setStatus] = useState("Idle");

    const seedData = async () => {
        if (!window.confirm("⚠️ This will overwrite Team, Portfolio, Thesis, and Insights. Proceed?")) return;
        
        setStatus("Starting sequence...");
        const batch = db.batch();

        // --- 1. TEAM MEMBERS ---
        const teamMembers = [
            {
                name: "Priya Singh", 
                role: "Managing Partner",
                bio: "Experienced leader in scaling financial ecosystems...", 
                domains: ["SaaS", "FinTech"],
                // NOW IT LOOKS CLEANER 👇
                photo_url: `${STORAGE_BASE}priya_singh.jpg?alt=media&token=34ba4e73-3908-4aa9-bedc-a6d0256707d0`
            },
            {
                name: "Venu Ananda",
                role: "Chief Technology Officer",
                bio: "Architect of the Auspex Engine...",
                domains: ["DeepTech", "Cybersecurity"],
                photo_url: "" // Add your photo to storage later and update this pattern
            }
        ];

        // Clear existing team first (optional safety)
        const teamSnap = await db.collection('team_members').get();
        teamSnap.forEach(doc => batch.delete(doc.ref));

        teamMembers.forEach(m => {
            const ref = db.collection('team_members').doc(); 
            batch.set(ref, m);
        });
        setStatus("Staged: Team Members...");

        // --- 2. PORTFOLIO ---
        const portfolio = [
            {
                companyName: "Nexus AI",
                domainName: "Artificial Intelligence",
                fundingRound: "Seed",
                fundingAmount: 25000000,
                status: "Active",
                type: "startup"
            },
            {
                companyName: "GreenSpark",
                domainName: "CleanTech",
                fundingRound: "Series A",
                fundingAmount: 80000000,
                status: "Active",
                type: "startup"
            }
        ];

        const portSnap = await db.collection('investments').get();
        portSnap.forEach(doc => batch.delete(doc.ref));

        portfolio.forEach(p => {
            const ref = db.collection('investments').doc();
            batch.set(ref, p);
        });
        setStatus("Staged: Portfolio...");

        // --- 3. THESIS ---
        const theses = [
            {
                title: "AI Infrastructure",
                description: "Investing in the picks and shovels of the AI gold rush.",
                order: 1
            },
            {
                title: "FinTech 3.0",
                description: "Embedded finance solutions for emerging economies.",
                order: 2
            }
        ];

        const thesisSnap = await db.collection('thesis_verticals').get();
        thesisSnap.forEach(doc => batch.delete(doc.ref));

        theses.forEach(t => {
            const ref = db.collection('thesis_verticals').doc();
            batch.set(ref, t);
        });
        setStatus("Staged: Thesis...");

        // --- COMMIT ---
        try {
            await batch.commit();
            setStatus("✅ Success! Content Rebuilt.");
            setTimeout(() => setStatus("Idle"), 3000);
        } catch (e) {
            console.error(e);
            setStatus("❌ Error: " + e.message);
        }
    };

    return (
        <div className="p-6 bg-slate-900 border border-blue-500/30 rounded-xl mb-6">
            <h3 className="text-white font-bold text-lg mb-2">🚀 Master Content Rebuilder</h3>
            <p className="text-slate-400 text-sm mb-4">
                Click to regenerate Team, Portfolio, and Thesis data.
            </p>
            <div className="flex items-center gap-4">
                <button 
                    onClick={seedData}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-all"
                >
                    Rebuild Site Content
                </button>
                <span className="text-[var(--brand-color)] font-mono text-xs">{status}</span>
            </div>
        </div>
    );
};

export default ContentSeeder;