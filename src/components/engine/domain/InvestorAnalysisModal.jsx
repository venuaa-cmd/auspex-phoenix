import React, { useState, useEffect } from 'react';
import { runAIAnalysis, parseAIJson } from '../../../lib/aiService';

// --- AI FETCH LOGIC ---
async function fetchInvestorDetails(investorName) {
    const prompt = `
        Act as a Fundraising Expert. Analyze the Indian Investment Firm or Angel Investor: "${investorName}".
        
        Return a STRICT JSON object with these exact fields:
        {
            "synopsis": "Short professional bio (Max 2 sentences).",
            "primaryDomains": ["Domain 1", "Domain 2"],
            "typicalStage": "e.g. Seed to Series A",
            "recentDeals": ["Company A", "Company B"],
            "notablePortfolio": ["Unicorn 1", "Unicorn 2"],
            "verdict": "One sentence on their current investment activity level in India."
        }
    `;
    try {
        const text = await runAIAnalysis(prompt);
        return parseAIJson(text);
    } catch (e) { 
        console.error(e);
        return null; 
    }
}

const InvestorAnalysisModal = ({ name, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            setLoading(true);
            const result = await fetchInvestorDetails(name);
            if (isMounted) {
                setData(result || { synopsis: "AI Analysis Unavailable" });
                setLoading(false);
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, [name]);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 font-manrope" onClick={onClose}>
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg p-8 rounded-xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold text-white">Investor Profile</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                
                {/* Identity Header */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-white border-2 border-white/10 mb-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        {name.charAt(0)}
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">{name}</h2>
                    <span className="text-[var(--brand-color)] text-xs font-bold uppercase tracking-widest mt-1 bg-[var(--brand-color)]/10 px-2 py-1 rounded">
                        Investment Entity
                    </span>
                </div>

                {/* Content Area */}
                <div className="space-y-6 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="inline-block w-8 h-8 border-4 border-[var(--brand-color)] border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-[var(--brand-color)] text-xs animate-pulse font-mono uppercase">
                                Analyzing Deal Flow...
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Synopsis */}
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <h4 className="text-xs text-slate-500 uppercase font-bold mb-2">Profile</h4>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    {data?.synopsis || "No data available."}
                                </p>
                            </div>

                            {/* Tags Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-2">Focus Areas</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {data?.primaryDomains?.map((d, i) => (
                                            <span key={i} className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{d}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-2">Stage</h4>
                                    <div className="text-white text-sm font-bold">{data?.typicalStage || "N/A"}</div>
                                </div>
                            </div>

                            {/* Portfolio */}
                            <div>
                                <h4 className="text-xs text-slate-500 uppercase font-bold mb-2">Notable Bets</h4>
                                <div className="flex flex-wrap gap-2">
                                    {data?.notablePortfolio?.map((p, i) => (
                                        <span key={i} className="text-xs bg-white/10 text-white px-3 py-1 rounded-full border border-white/10">
                                            {p}
                                        </span>
                                    )) || <span className="text-slate-500 text-xs">No data</span>}
                                </div>
                            </div>

                            {/* Verdict */}
                            <div className="bg-gradient-to-r from-[var(--brand-color)]/10 to-transparent p-4 rounded-xl border-l-4 border-[var(--brand-color)]">
                                <h4 className="text-[var(--brand-color)] font-bold text-xs uppercase mb-1">
                                    <i className="fa-solid fa-gavel mr-2"></i>Activity Verdict
                                </h4>
                                <p className="text-white text-sm italic">"{data?.verdict || "Analysis pending."}"</p>
                            </div>
                        </>
                    )}
                </div>

                <button onClick={onClose} className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-lg transition-all text-sm uppercase tracking-wider">
                    Close Profile
                </button>
            </div>
        </div>
    );
};

export default InvestorAnalysisModal;