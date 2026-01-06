import React, { useState } from 'react';
import { runAIAnalysis } from '../../../lib/aiService';
import { formatCurrency } from './IntelUtils';

const CompanyStrategyFeed = ({ company, investments, isSuperAdmin, onNoteSave }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateStrategy = async () => {
        if (!isSuperAdmin) return;
        setIsGenerating(true);
        
        const history = investments.map(i => 
            `${i.fundingRound || i.round_name}: Invested ${formatCurrency(i.amount_invested || i.fundingAmount)}`
        ).join('\n');
        
        const context = company.company_notes ? `Contextual Notes: ${company.company_notes}` : '';
        const prompt = `Act as a VC Strategist. Review this history:\n${history}\n${context}\n\nProvide a strategic recommendation: Double Down, Hold, or Seek Exit? Explain why in 3 bullet points.`;
        
        try {
            const res = await runAIAnalysis(prompt);
            onNoteSave('portfolio_strategy', res); 
        } catch(e) { alert("AI Intelligence Error: " + e.message); }
        setIsGenerating(false);
    };

    return (
        <div className="bg-[#0f172a] border border-[var(--brand-color)]/30 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-color)] blur-[80px] opacity-10 pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-white font-bold uppercase tracking-tighter flex items-center gap-3 underline decoration-[var(--brand-color)]/30 decoration-4 underline-offset-8">Strategy Feed</h4>
                {isSuperAdmin && (
                    <button 
                        onClick={handleGenerateStrategy} 
                        disabled={isGenerating} 
                        className="text-[9px] bg-[var(--brand-color)] text-black px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest shadow-lg hover:brightness-125 disabled:opacity-50 transition-all"
                    >
                        {isGenerating ? 'Processing...' : 'Ignite Intelligence'}
                    </button>
                )}
            </div>
            <textarea
                className={`w-full bg-black/40 border border-white/5 rounded-xl p-5 text-slate-300 focus:border-[var(--brand-color)] focus:outline-none min-h-[180px] font-mono text-xs leading-relaxed custom-scrollbar shadow-inner font-bold ${!isSuperAdmin ? 'cursor-not-allowed opacity-70' : ''}`}
                placeholder="Awaiting strategist generation..."
                value={company.portfolio_strategy || ''}
                readOnly={!isSuperAdmin}
                onChange={(e) => isSuperAdmin && onNoteSave('portfolio_strategy', e.target.value)}
            />
        </div>
    );
};

export default CompanyStrategyFeed;