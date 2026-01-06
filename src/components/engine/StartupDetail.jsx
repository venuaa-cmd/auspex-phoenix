import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2'; // CHANGED: Imported Line instead of Bar
import { runAIAnalysis } from '../../lib/aiService';
import DilutionModal from './startup/DilutionModal';
import InputWithWords from './startup/InputWithWords';
import ExitSimulator from './startup/ExitSimulator';
import TransactionRoundCard from './startup/TransactionRoundCard';
import PerformanceAnalytics from './startup/PerformanceAnalytics';
import { formatCurrency, convertToWords, formatCurrencyInput, safeDateFormat } from './startup/IntelUtils';

// --- MAIN COMPONENT ---
const StartupDetail = ({ 
    company, isEditing, onUpdate, onDirectUpdate, domains, 
    activeTab, investments, stats, runway, 
    setModalState, handleDeleteRound, handleDeleteCompany,
    fileLinks, uploading, handleFileUpload, handleDeleteFile,
    onUpdateRound, fundManagers, currentUserEmail, isSuperAdmin,
}) => {
    
    const [activeRoundFilter, setActiveRoundFilter] = useState('All');
    const [saveStatus, setSaveStatus] = useState('');
    const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
    
    const [expandedRoundId, setExpandedRoundId] = useState(null);

    const [isProjecting, setIsProjecting] = useState(false);
    const [activeAnalysisId, setActiveAnalysisId] = useState(null); 
    const [tempAiResult, setTempAiResult] = useState(null); 
    
    const [dilutionModalData, setDilutionModalData] = useState(null);

    const totalEquity = useMemo(() => investments.reduce((sum, inv) => sum + (Number(inv.equityPct || inv.equity_pct) || 0), 0), [investments]);

    // --- NOTE SAVING HANDLER ---
    const handleNoteSave = (field, val) => {
        if (!isSuperAdmin) return; // PROHIBIT NON-ADMIN SAVES
        onUpdate(field, val); 
        if (onDirectUpdate) onDirectUpdate(field, val); 
        setSaveStatus('Saving...');
        setTimeout(() => setSaveStatus('Saved'), 1000);
        setTimeout(() => setSaveStatus(''), 3000);
    };

    const filteredInvestments = useMemo(() => {
        if (activeRoundFilter === 'All') return investments;
        return investments.filter(inv => (inv.status || 'Active') === activeRoundFilter);
    }, [investments, activeRoundFilter]);

    const handleGenerateProjection = async (inv) => {
        if (!isSuperAdmin) return;
        setIsProjecting(true);
        setActiveAnalysisId(inv.id);
        setTempAiResult(null);

        const companyName = company?.companyName || "Portfolio Company";
        const domainName = company?.domainName || "General Tech";
        const fundingRound = inv?.fundingRound || "Current Round";
        const fundingAmount = Number(inv?.amount || inv?.amount_invested || inv?.fundingAmount || 0);
        const equityPct = Number(inv?.equityPct || inv?.equity_pct || 0);
        
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 

        if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
            setTimeout(() => {
                const mockResult = `* **Valuation Target:** ₹50 Cr in 3 years. Based on a 5x revenue multiple common in Indian early-stage tech.\n* **Next Round Requirement:** Likely Series A targeting ₹12-15 Cr within 18 months.\n* **Exit Opportunity:** Acquisition by a larger conglomerate looking for vertical integration in 5-6 years.`;
                setTempAiResult(mockResult);
                setIsProjecting(false);
                if (onUpdateRound) onUpdateRound(inv.id, { projection_analysis: mockResult });
            }, 1500); 
            return;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
        
        let valuationText = "N/A";
        if (fundingAmount > 0 && equityPct > 0) {
            const preMoney = (fundingAmount / (equityPct / 100)) - fundingAmount;
            const postMoney = preMoney + fundingAmount;
            valuationText = `Implied Post-Money Valuation: ₹${(postMoney/10000000).toFixed(2)} Cr`;
        }

        const prompt = `
            You are an expert venture capital analyst specializing in the INDIAN angel investment market.
            Based on the following deal terms and current market data, provide a speculative 3-Year Projection.
            
            Deal Terms:
            - Company: "${companyName}"
            - Domain: "${domainName} (India)"
            - Funding Round: "${fundingRound}"
            - Funding Amount: ₹${fundingAmount}
            - Equity Percentage: ${equityPct}%
            - ${valuationText}
            
            Provide the projection in 3 clear bullet points focusing on financial outcomes.
            1. **Valuation Target:** A speculative target valuation (in INR) in 3 years, explaining the multiple used.
            2. **Next Round Requirement:** A brief note on the likely target (Round and Amount) for their next funding round.
            3. **Exit Opportunity:** A 1-sentence assessment of the most probable exit opportunity.
            
            Respond ONLY with the projection as plain text (using * for bullet points), not JSON.
        `;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content) {
                const resultText = data.candidates[0].content.parts[0].text;
                setTempAiResult(resultText);
                
                if (onUpdateRound) {
                    await onUpdateRound(inv.id, { projection_analysis: resultText });
                }
            }
        } catch (error) {
            console.error("Error fetching predictive projection:", error);
            setTempAiResult("Could not generate projection. Please check your API configuration.");
        } finally {
            setIsProjecting(false);
        }
    };

    const handleGenerateStrategy = async () => {
        if (!isSuperAdmin) return;
        setIsGeneratingStrategy(true);
        const history = investments.map(i => `${i.fundingRound}: Invested ${formatCurrency(i.fundingAmount)}, Val ${formatCurrency(i.currentValuation)}`).join('\n');
        
        // Use manual inputs if available
        const context = company.company_notes ? `Notes: ${company.company_notes}` : '';
        
        const prompt = `Act as a VC Strategist. Review this startup history:\n${history}\n${context}\n\nProvide a strategic recommendation: Double Down, Hold, or Seek Exit? Explain why in 3 bullet points.`;
        
        try {
            const res = await runAIAnalysis(prompt);
            handleNoteSave('portfolio_strategy', res); 
        } catch(e) { alert("AI Error: " + e.message); }
        setIsGeneratingStrategy(false);
    };

    return (
        <div className="animate-[fadeIn_0.3s_ease]">
            
            {activeTab === 'Overview' && (
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#0f172a] border border-white/10 p-8 rounded-2xl relative group shadow-2xl">
                        <div className="flex justify-between mb-2">
                            <label className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-2 font-black tracking-widest"><i className="fa-regular fa-note-sticky text-blue-400"></i> Strategic Asset Thesis</label>
                            {saveStatus && isSuperAdmin && <span className="text-[9px] text-green-400 font-black tracking-widest">{saveStatus}</span>}
                        </div>
                        <textarea 
                            className={`w-full bg-transparent text-slate-200 text-sm focus:outline-none resize-none h-24 placeholder:text-slate-700 leading-relaxed custom-scrollbar font-bold ${!isSuperAdmin ? 'cursor-not-allowed opacity-70' : ''}`} 
                            placeholder="Define the strategic roadmap, red flags, or reminders..." 
                            value={company.company_notes || ''} 
                            readOnly={!isSuperAdmin}
                            onChange={(e) => isSuperAdmin && handleNoteSave('company_notes', e.target.value)} 
                        />
                    </div>
                    <div className="bg-[#0f172a] border border-white/10 p-8 rounded-2xl flex flex-col justify-between shadow-2xl">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Next Critical Milestone</label>
                                <input 
                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[var(--brand-color)] focus:outline-none shadow-inner font-bold ${!isSuperAdmin ? 'cursor-not-allowed opacity-70' : ''}`} 
                                    placeholder="e.g. Close Series A" 
                                    value={company.next_milestone || ''} 
                                    readOnly={!isSuperAdmin}
                                    onChange={(e) => isSuperAdmin && handleNoteSave('next_milestone', e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Target Date</label>
                                <input 
                                    type="date" 
                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[var(--brand-color)] focus:outline-none shadow-inner [color-scheme:dark] font-bold ${!isSuperAdmin ? 'cursor-not-allowed opacity-70' : ''}`} 
                                    value={safeDateFormat(company.milestone_target_date)} 
                                    readOnly={!isSuperAdmin}
                                    onChange={(e) => isSuperAdmin && handleNoteSave('milestone_target_date', e.target.value)} 
                                />
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Snap-Roster ({filteredInvestments.length} Cycles)</label>
                            <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 shadow-inner">
                                {['All', 'Active', 'Watching', 'Exited'].map(filter => (
                                    <button 
                                        key={filter} 
                                        onClick={() => setActiveRoundFilter(filter)} 
                                        className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${activeRoundFilter === filter ? 'bg-[var(--brand-color)] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Overview' && filteredInvestments.length > 0 && (
                 <div className="mb-8 grid grid-cols-1 gap-2 animate-[fadeIn_0.3s_ease]">
                    {filteredInvestments.map(inv => {
                        const amount = Number(inv.amount || inv.amount_invested || inv.fundingAmount || 0);
                        return (
                            <div key={inv.id} className="bg-[#0f172a] border border-white/5 hover:border-[var(--brand-color)]/30 p-4 rounded-xl flex justify-between items-center transition-all cursor-pointer group shadow-xl" onClick={() => setModalState({ type: 'edit', data: inv })}>
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center font-bold text-[10px] text-blue-400 shadow-inner uppercase">{inv.fundingRound?.substring(0, 3).toUpperCase() || 'RND'}</div>
                                    <div>
                                        <div className="text-white font-bold text-lg uppercase group-hover:text-[var(--brand-color)] transition-colors tracking-tighter">{inv.fundingRound || inv.round_name || 'Round'}</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{new Date(inv.investmentDate || inv.investment_date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-8">
                                    <div><span className="text-[9px] text-slate-500 uppercase mr-3 font-bold opacity-60 tracking-widest">Deployed Capital</span><span className="text-xl font-mono text-white font-bold tracking-tighter">{formatCurrency(amount)}</span></div>
                                    <span className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${inv.status === 'Exited' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{inv.status || 'Active'}</span>
                                </div>
                            </div>
                        );
                    })}
                 </div>
            )}

            {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* --- STARTUP DNA --- */}
                        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 relative shadow-2xl overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px] pointer-events-none"></div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-tighter mb-6 flex items-center gap-3 underline decoration-blue-500/30 decoration-4 underline-offset-8">Startup DNA</h3>
                            
                            <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/5">
                                {/* FOUNDER */}
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Founder / Leadership</label>
                                    {isEditing && isSuperAdmin ? (
                                        <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[var(--brand-color)] outline-none shadow-inner font-bold" value={company.founders} onChange={e => onUpdate('founders', e.target.value)} />
                                    ) : (
                                        <div className="text-white font-bold text-lg tracking-tight">{company.founders || 'N/A'}</div>
                                    )}
                                </div>
                                {/* HQ / REG ADDRESS */}
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Headquarters</label>
                                    {isEditing && isSuperAdmin ? (
                                        <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[var(--brand-color)] outline-none shadow-inner font-bold" value={company.reg_address} onChange={e => onUpdate('reg_address', e.target.value)} />
                                    ) : (
                                        <div className="text-slate-300 font-bold truncate tracking-tight">{company.reg_address || 'N/A'}</div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-white/5">
                                {/* SECTOR / DOMAIN */}
                                <div className="col-span-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Target Sector</label>
                                    {isEditing && isSuperAdmin ? (
                                        <select 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-[10px] font-bold uppercase focus:border-[var(--brand-color)] outline-none" 
                                            value={company.domain_name} 
                                            onChange={e => onUpdate('domain_name', e.target.value)}
                                        >
                                            {domains.map((d,i) => <option key={i} value={d.name}>{d.name}</option>)}
                                        </select>
                                    ) : (
                                        <div className="text-[var(--brand-color)] text-[9px] font-bold uppercase tracking-widest bg-[var(--brand-color)]/10 px-3 py-1 rounded-lg border border-[var(--brand-color)]/20 inline-block">{company.domain_name || company.industry}</div>
                                    )}
                                </div>
                                {/* EMAIL */}
                                <div className="col-span-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Official Email</label>
                                    {isEditing && isSuperAdmin ? (
                                        <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none shadow-inner font-bold" value={company.email} onChange={e => onUpdate('email', e.target.value)} />
                                    ) : (
                                        <div className="text-slate-400 text-xs font-bold truncate underline decoration-white/10" title={company.email}>{company.email || '-'}</div>
                                    )}
                                </div>
                                {/* PHONE / MOBILE */}
                                <div className="col-span-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Registry Phone</label>
                                    {isEditing && isSuperAdmin ? (
                                        <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none shadow-inner font-bold" value={company.mobile_no} onChange={e => onUpdate('mobile_no', e.target.value)} />
                                    ) : (
                                        <div className="text-white text-xs font-mono font-bold">{company.mobile_no || '-'}</div>
                                    )}
                                </div>
                                {/* WEBSITE URL */}
                                <div className="col-span-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Website</label>
                                    {isEditing && isSuperAdmin ? (
                                        <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none shadow-inner font-bold" value={company.website_url} onChange={e => onUpdate('website_url', e.target.value)} />
                                    ) : (
                                        <a href={company.website_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs font-bold uppercase hover:underline truncate block tracking-widest">{company.website_url ? 'Launch Portal' : '-'}</a>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                {/* GST */}
                                <div className="col-span-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">GST Registry ID</label>
                                    {isEditing && isSuperAdmin ? (
                                        <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-mono outline-none shadow-inner font-bold" value={company.gst} onChange={e => onUpdate('gst', e.target.value)} />
                                    ) : (
                                        <div className="text-slate-500 text-xs font-mono font-bold tracking-tighter">{company.gst || 'N/A'}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* --- OPERATIONAL HEALTH --- */}
                        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 shadow-2xl">
                            <h3 className="text-lg font-bold text-white uppercase tracking-tighter mb-8 flex items-center gap-3 underline decoration-red-500/30 decoration-4 underline-offset-8">Operational Health</h3>
                            <div className="grid grid-cols-3 gap-8">
                                {isEditing && isSuperAdmin ? (
                                    <>
                                        <InputWithWords label="Liquid Cash Assets" value={company.cash_balance} field="cash_balance" onChange={onUpdate} />
                                        <InputWithWords label="Monthly Burn Rate" value={company.monthly_burn} field="monthly_burn" onChange={onUpdate} />
                                    </>
                                ) : (
                                    <>
                                        <div><label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Cash on Hand</label><div className="text-white font-bold font-mono text-2xl tracking-tighter">{formatCurrency(company.cash_balance)}</div><div className="text-[9px] text-slate-500 font-bold mt-1 tracking-widest font-bold">{convertToWords(company.cash_balance)}</div></div>
                                        <div><label className="text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest">Monthly Burn</label><div className="text-white font-bold font-mono text-2xl tracking-tighter">{formatCurrency(company.monthly_burn)}</div><div className="text-[9px] text-slate-500 font-bold mt-1 tracking-widest font-bold">{convertToWords(company.monthly_burn)}</div></div>
                                    </>
                                )}
                                <div className={`rounded-2xl p-4 border flex flex-col justify-center items-center text-center shadow-xl ${runway.status === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 animate-pulse' : 'bg-green-500/10 border-green-500/30'}`}>
                                    <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Runway</label>
                                    <div className={`text-4xl font-bold tracking-tighter ${runway.color}`}>{runway.months}</div>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] mt-2 opacity-70">Months Left</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <ExitSimulator currentValuation={Number(company.currentValuation)} equityPct={totalEquity} totalInvested={stats.totalInvested} />
                        
                        <div className="bg-[#0f172a] border border-[var(--brand-color)]/30 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-color)] blur-[80px] opacity-10 pointer-events-none"></div>
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-white font-bold uppercase tracking-tighter flex items-center gap-3 underline decoration-[var(--brand-color)]/30 decoration-4 underline-offset-8">Strategy Feed</h4>
                                {isSuperAdmin && (
                                    <button onClick={handleGenerateStrategy} disabled={isGeneratingStrategy} className="text-[9px] bg-[var(--brand-color)] text-black px-3 py-1.5 rounded-lg transition-all font-bold uppercase tracking-widest shadow-lg shadow-[var(--brand-color)]/20 hover:brightness-125">Ignite Intelligence</button>
                                )}
                            </div>
                            <textarea
                                className={`w-full bg-black/40 border border-white/5 rounded-xl p-5 text-slate-300 focus:border-[var(--brand-color)] focus:outline-none min-h-[180px] font-mono text-xs leading-relaxed custom-scrollbar shadow-inner font-bold ${!isSuperAdmin ? 'cursor-not-allowed opacity-70' : ''}`}
                                placeholder="Awaiting manual input or strategist generation..."
                                value={company.portfolio_strategy || ''}
                                readOnly={!isSuperAdmin}
                                onChange={(e) => isSuperAdmin && handleNoteSave('portfolio_strategy', e.target.value)}
                            />
                        </div>

                        {/* MASTER DELETE ACTION (VENU ONLY) */}
                        {isSuperAdmin && (
                            <div className="bg-[#0f172a] border border-red-500/20 rounded-2xl p-8 shadow-2xl">
                                <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-3"><i className="fa-solid fa-triangle-exclamation text-red-500"></i> Purge Matrix</h3>
                                <button onClick={handleDeleteCompany} className="w-full py-5 bg-red-900/20 text-red-400 border border-red-500/30 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-900/10 transform active:scale-95">Purge Entire Asset Profile</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'Performance' && <PerformanceAnalytics investments={investments} />}

     {activeTab === 'Transactions' && (
    <div className="space-y-6">
        {investments.map((inv) => (
            <TransactionRoundCard 
                key={inv.id}
                inv={inv}
                isExpanded={expandedRoundId === inv.id}
                onToggle={() => setExpandedRoundId(expandedRoundId === inv.id ? null : inv.id)}
                fundManagers={fundManagers}
                isSuperAdmin={isSuperAdmin}
                setModalState={setModalState}
                setDilutionModalData={setDilutionModalData}
                handleGenerateProjection={handleGenerateProjection}
                handleDeleteRound={handleDeleteRound}
                isProjecting={isProjecting}
                activeAnalysisId={activeAnalysisId}
                tempAiResult={tempAiResult}
            />
        ))}
    </div>
)}
            
            {activeTab === 'Vault' && (
                <div className="bg-[#0f172a] border border-white/10 rounded-[60px] p-16 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[120px] pointer-events-none"></div>
                    <h3 className="text-4xl font-bold text-white uppercase tracking-tighter mb-14 underline decoration-blue-500/30 decoration-8 underline-offset-[20px]">Document Intelligence Vault</h3>
                    
                    {isSuperAdmin && (
                        <div className="mb-16"><label className="w-full h-48 bg-black/40 border-2 border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center gap-5 cursor-pointer hover:bg-white/5 hover:border-[var(--brand-color)]/50 transition-all group shadow-inner"><i className="fa-solid fa-cloud-arrow-up text-6xl text-slate-700 group-hover:text-[var(--brand-color)] transition-colors"></i><span className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.5em] group-hover:text-white font-bold">Deploy Term Sheet / Legal Asset</span><input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} /></label></div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {fileLinks.map((link, idx) => (
                            <div key={idx} className="flex justify-between items-center p-8 bg-black/40 rounded-[35px] border border-white/5 hover:border-white/20 transition-all group shadow-2xl">
                                <div className="flex items-center gap-6 min-w-0">
                                    <div className="w-16 h-16 rounded-[22px] bg-red-500/10 flex items-center justify-center text-red-500/50 shadow-inner"><i className="fa-solid fa-file-pdf text-2xl"></i></div>
                                    <div className="min-w-0"><a href={link} target="_blank" rel="noreferrer" className="text-white text-[13px] font-bold uppercase tracking-widest hover:text-[var(--brand-color)] truncate block">{link.split('/').pop().substring(0, 35)}...</a><div className="text-[10px] text-slate-600 font-bold uppercase mt-1 tracking-[0.1em]">Validated Governance Asset</div></div>
                                </div>
                                {isSuperAdmin && <button onClick={() => handleDeleteFile(idx)} className="w-12 h-12 rounded-[18px] bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all shadow-2xl flex items-center justify-center"><i className="fa-solid fa-xmark text-xl"></i></button>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {dilutionModalData && <DilutionModal investment={dilutionModalData} onClose={() => setDilutionModalData(null)} />}
        </div>
    );
};


export default StartupDetail;
// checked