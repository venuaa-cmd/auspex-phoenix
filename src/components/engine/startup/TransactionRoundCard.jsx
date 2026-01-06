import React from 'react';
import { formatCurrency } from './IntelUtils';

/**
 * AUSPEX INTEL CORE - TRANSACTION ROUND CARD
 * Encapsulates expansion logic, AI insights, and structural context for a round.
 */
const TransactionRoundCard = ({ 
    inv, 
    isExpanded, 
    onToggle, 
    fundManagers, 
    isSuperAdmin, 
    setModalState, 
    setDilutionModalData, 
    handleGenerateProjection, 
    handleDeleteRound,
    isProjecting,
    activeAnalysisId,
    tempAiResult
}) => {
    const roundName = inv.round_name || inv.fundingRound || "Investment Round";
    const amount = Number(inv.amount || inv.amount_invested || inv.fundingAmount || 0);
    const date = inv.investment_date || inv.investmentDate || new Date().toISOString();
    const currentVal = Number(inv.currentValuation || inv.currentValue || amount);
    const moic = amount > 0 ? (currentVal / amount).toFixed(2) + 'x' : '1.00x';
    const managerName = fundManagers?.find(m => m.id === (inv.fund_manager_id || inv.fundManagerId))?.name || 'Unknown';
    const analysisToShow = (activeAnalysisId === inv.id && tempAiResult) || inv.projection_analysis;

    return (
        <div className={`border rounded-[30px] overflow-hidden transition-all duration-500 ${
            isExpanded ? 'bg-[#0f172a] border-[var(--brand-color)] shadow-[0_0_60px_rgba(0,0,0,0.8)]' : 'bg-[#0f172a] border-white/5 hover:border-white/20'
        }`}>
            {/* --- CARD HEADER (ROSTER VIEW) --- */}
            <div className="p-8 flex justify-between items-center cursor-pointer select-none group" onClick={onToggle}>
                <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-[22px] bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-base text-blue-400 shadow-inner uppercase">
                        {roundName.substring(0, 3).toUpperCase()}
                    </div>
                    <div>
                        <div className="text-white font-bold text-2xl uppercase tracking-tighter flex items-center gap-3">
                            {roundName}
                            {isExpanded && <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-color)] animate-pulse"></div>}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2 font-black">
                            <i className="fa-regular fa-calendar mr-2 text-[var(--brand-color)]"></i> 
                            {new Date(date).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-14">
                    <div className="text-right hidden sm:block">
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.4em] mb-1 opacity-60">Basis Injected</div>
                        <div className="text-white font-mono font-bold text-3xl tracking-tighter">{formatCurrency(amount)}</div>
                    </div>
                    <i className={`fa-solid fa-chevron-right text-slate-700 transition-transform duration-500 ${isExpanded ? 'rotate-90 text-[var(--brand-color)]' : ''}`}></i>
                </div>
            </div>

            {/* --- EXPANDED FORENSIC INTELLIGENCE --- */}
            {isExpanded && (
                <div className="border-t border-white/10 bg-black/40 p-12 animate-[fadeIn_0.5s_ease]">
                    <h4 className="text-[10px] font-bold text-[var(--brand-color)] uppercase tracking-[0.5em] mb-10 border-b border-white/10 pb-5">
                        Strategic Round Intelligence Matrix
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        {isSuperAdmin ? (
                            <button onClick={() => setModalState({ type: 'exit_transaction', data: inv })} className="p-6 rounded-[25px] bg-[var(--brand-color)] text-black font-bold uppercase tracking-[0.3em] text-xs shadow-[0_0_40px_var(--brand-glow)] hover:brightness-110 transition-all transform hover:scale-[1.01]">
                                Execute Strategic Exit / Realize Liquidity
                            </button>
                        ) : (
                            <div className="p-6 rounded-[25px] bg-white/5 border border-white/5 text-slate-600 font-bold uppercase text-[10px] text-center tracking-[0.4em]">
                                Operational Command Tier Restricted
                            </div>
                        )}
                        
                        <div className="flex gap-6">
                            <button onClick={() => setDilutionModalData(inv)} className="flex-1 p-6 rounded-[25px] bg-blue-900/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all font-bold uppercase text-[10px] tracking-widest shadow-2xl">
                                Model Dilution
                            </button>
                            {isSuperAdmin && (
                                <button onClick={() => handleGenerateProjection(inv)} disabled={isProjecting && activeAnalysisId === inv.id} className="flex-1 p-6 rounded-[25px] bg-purple-900/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all font-bold uppercase text-[10px] tracking-widest shadow-2xl">
                                    {isProjecting && activeAnalysisId === inv.id ? 'Neural Logic Initializing...' : 'AI 3-Yr Forecast'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* AI & PROJECTION ANALYSIS */}
                    {(inv.ai_analysis || analysisToShow) && (
                        <div className="mb-14 grid grid-cols-1 md:grid-cols-2 gap-10 animate-[fadeIn_0.6s_ease]">
                            {inv.ai_analysis && (
                                <div className="bg-[#020617] border border-indigo-500/30 p-10 rounded-[40px] relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-transparent"></div>
                                    <h4 className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.5em] mb-8 flex items-center gap-3"><i className="fa-solid fa-file-contract"></i> Round DNA Analysis</h4>
                                    <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-line font-bold">{inv.ai_analysis}</div>
                                </div>
                            )}
                            {analysisToShow && (
                                <div className="bg-[#020617] border border-purple-500/30 p-10 rounded-[40px] relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-500 to-transparent"></div>
                                    <h4 className="text-purple-400 text-[10px] font-bold uppercase tracking-[0.5em] mb-8 flex items-center gap-4"><i className="fa-solid fa-crystal-ball text-xs"></i> Speculative Forecast</h4>
                                    <div className="text-slate-200 text-xs leading-relaxed space-y-5 font-bold">
                                        {analysisToShow.split('*').map((line, idx) => (
                                            line.trim() && <div key={idx} className="flex gap-4">
                                                <span className="text-purple-400 mt-1.5">●</span> 
                                                <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }}></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* METRICS GRID */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
                        {[
                            { label: "Entry Post-Money", val: formatCurrency(currentVal) },
                            { label: "Equity Stake", val: `${(Number(inv.equityPct || inv.equity_pct) || 0).toFixed(2)}%` },
                            { label: "Alpha Multi", val: moic, color: "text-[var(--brand-color)]" },
                            { label: "Architect", val: managerName }
                        ].map((m, i) => (
                            <div key={i} className="bg-white/5 p-6 rounded-3xl border border-white/5 shadow-inner text-center">
                                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-3 tracking-[0.3em] opacity-60">{m.label}</span>
                                <span className={`${m.color || 'text-white'} font-mono font-bold text-xl tracking-tighter`}>{m.val}</span>
                            </div>
                        ))}
                    </div>

                    {/* STRUCTURAL CONTEXT */}
                    <div className="mt-12 border-t border-white/10 pt-10">
                        <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.6em] mb-10">Structural Round Context</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                            {[
                                { icon: "fa-arrow-trend-up", label: "Target YoY", val: inv.target_yoy || inv.targetYoY ? `${inv.target_yoy || inv.targetYoY}%` : 'PROPRIETARY', color: "text-green-500/40" },
                                { icon: "fa-door-open", label: "Expected Exit", val: inv.expected_exit ? new Date(inv.expected_exit).toLocaleDateString() : 'TBD', color: "text-blue-500/40" },
                                { icon: "fa-shield-halved", label: "Co-Investors", val: inv.co_investors || '-', color: "text-purple-500/40" },
                                { icon: "fa-scale-balanced", label: "Structure Type", val: inv.participationType || 'Equity (Pari Passu)', color: "text-yellow-500/40" }
                            ].map((c, i) => (
                                <div key={i} className="bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                                    <div className="flex items-center gap-4 mb-3">
                                        <i className={`fa-solid ${c.icon} ${c.color}`}></i>
                                        <span className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">{c.label}</span>
                                    </div>
                                    <div className="text-white font-bold text-base truncate" title={c.val}>{c.val}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ADMINISTRATIVE OVERRIDE */}
                    {isSuperAdmin && (
                        <div className="flex justify-end gap-6 pt-12 mt-12 border-t border-white/10">
                            <button onClick={() => setModalState({ type: 'edit', data: inv })} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all flex items-center gap-4 shadow-2xl">
                                <i className="fa-solid fa-pen-nib"></i> Modify Entry
                            </button>
                            <button onClick={() => handleDeleteRound(inv.id)} className="px-10 py-4 bg-red-900/20 text-red-400 border border-red-500/30 rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all flex items-center gap-4 shadow-2xl shadow-red-900/20 transform active:scale-95">
                                <i className="fa-solid fa-trash-can"></i> Purge From Roster
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TransactionRoundCard;