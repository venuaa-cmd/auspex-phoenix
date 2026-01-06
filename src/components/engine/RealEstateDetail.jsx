import React, { useState, useMemo } from 'react';
// FIX: Added Doughnut to imports
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    Title, 
    Tooltip, 
    Legend, 
    BarElement, 
    ArcElement // FIX: Added ArcElement for Doughnut support
} from 'chart.js';
import { runAIAnalysis } from '../../lib/aiService';

// FIX: Registered ArcElement
ChartJS.register(CategoryScale, LinearScale, Title, Tooltip, Legend, BarElement, ArcElement);

// --- QUANTITATIVE HELPERS ---
const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

// --- SUB-COMPONENT: EDITABLE FIELD ---
const EditableField = ({ label, value, field, isEditing, onChange, type = "text", placeholder, readOnly }) => (
    <div className="mb-4 font-manrope">
        <label className="text-[9px] text-slate-500 uppercase font-black block mb-2 tracking-[0.2em]">{label}</label>
        {(isEditing && !readOnly) ? (
            <input 
                type={type}
                className="w-full bg-black/60 border border-emerald-500/20 rounded-xl p-4 text-white text-sm focus:border-emerald-500 outline-none transition-all font-bold shadow-inner"
                value={value || ''}
                onChange={(e) => onChange(field, e.target.value)}
                placeholder={placeholder}
            />
        ) : (
            <div className="text-white font-black text-lg tracking-tight leading-none uppercase">
                {label.includes('Rate') || label.includes('Rent') || label.includes('Valuation') ? formatCurrency(value) : (value || 'Sovereign Asset')}
            </div>
        )}
    </div>
);

// --- MAIN STATION COMPONENT ---
const RealEstateDetail = ({ 
    company, isEditing, onUpdate, 
    activeTab, investments = [], stats, fundManagers = [],
    setModalState, handleDeleteRound,
    fileLinks, handleFileUpload, handleDeleteFile, uploading,
    currentUserEmail 
}) => {
    const [expandedRoundId, setExpandedRoundId] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    const isSuperAdmin = currentUserEmail?.toLowerCase().trim() === 'venu.ananda@auspexinvestments.com';
    
    // DATA MAPPING
    const totalInvested = stats?.totalInvested || 0;
    const currentValue = stats?.currentVal || 0;
    const profit = stats?.profit || 0;
    const rentalIncome = Number(company.monthly_rent || 0) * 12;

    const rentalYield = useMemo(() => (totalInvested > 0 ? (rentalIncome / totalInvested) * 100 : 0), [rentalIncome, totalInvested]);
    const appreciation = useMemo(() => (totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0), [currentValue, totalInvested]);
    const totalReturn = rentalYield + appreciation;

    const getManagerName = (managerId) => {
        const manager = fundManagers.find(m => m.id === managerId);
        return manager ? manager.name : 'Authorized Strategist';
    };

    // --- DYNAMIC AI ANALYSIS ENGINE ---
    const handleRunAnalysis = async () => {
        if (!isSuperAdmin) return;
        setIsAnalyzing(true);
        setSaveStatus('');
        
        const prompt = `
            Act as a Commercial Real Estate Analyst for the Indian market.
            Analyze this property based on the following metrics:
            - Location: ${company.location || 'Pune, MH'}
            - Total Cost: ${formatCurrency(totalInvested)}
            - Calculated Rental Yield: ${rentalYield.toFixed(2)}%
            - Appreciation: ${appreciation.toFixed(2)}%

            Provide a comprehensive valuation report (Max 150 words):
            1. **Yield vs. Market:** Comment on the Rental Yield compared to a 6-8% market standard.
            2. **Capital Gain:** Is the appreciation rate healthy for a long-term hold (5+ years)?
            3. **Action:** Recommend Hold or Divest, based on performance.
            
            Format using HTML tags <b>, <ul>, <li>. No markdown.
        `;

        try {
            const res = await runAIAnalysis(prompt);
            const cleanHtml = res.replace(/```html/gi, '').replace(/```/gi, '').trim();
            if (onUpdate) {
                await onUpdate('ai_market_analysis', cleanHtml); 
                setSaveStatus('Oracle Refined');
            }
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (e) { alert("Oracle Fail: Connection Interrupted."); }
        finally { setIsAnalyzing(false); }
    };

    return (
        <div className="animate-[fadeIn_0.5s_ease] space-y-10 font-manrope">
            
            {/* --- TAB: OVERVIEW --- */}
            {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        {/* ASSET DNA */}
                        <div className="bg-[#0f172a] border border-emerald-500/10 rounded-[2.5rem] p-10 relative shadow-2xl overflow-hidden group">
                            <h3 className="text-white font-black mb-10 flex items-center gap-4 text-xl uppercase tracking-tighter">
                                <i className="fa-solid fa-building-circle-check text-emerald-500"></i> Property DNA & Details
                            </h3>
                            <div className="grid grid-cols-2 gap-10">
                                <EditableField label="Strategic Location" value={company.location} field="location" isEditing={isEditing} readOnly={!isSuperAdmin} onChange={onUpdate} />
                                <EditableField label="Asset Classification" value={company.asset_type} field="asset_type" isEditing={isEditing} readOnly={!isSuperAdmin} onChange={onUpdate} />
                                <EditableField label="Total Footprint (SQ FT)" value={company.total_area} field="total_area" isEditing={isEditing} readOnly={!isSuperAdmin} onChange={onUpdate} type="number" />
                                <EditableField label="Entry Rate (/SQ FT)" value={company.buy_rate} field="buy_rate" isEditing={isEditing} readOnly={!isSuperAdmin} onChange={onUpdate} type="number" />
                                <EditableField label="Market Benchmark (/SQ FT)" value={company.market_rate} field="market_rate" isEditing={isEditing} readOnly={!isSuperAdmin} onChange={onUpdate} type="number" />
                            </div>
                        </div>

                        {/* YIELD ENGINE */}
                        <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                            <h3 className="text-white font-black mb-10 flex items-center gap-4 text-xl uppercase tracking-tighter">
                                <i className="fa-solid fa-receipt text-blue-500"></i> Tenancy & Income
                            </h3>
                            <div className="grid grid-cols-2 gap-10">
                                <EditableField label="Primary Tenant" value={company.tenant_name} field="tenant_name" isEditing={isEditing} readOnly={!isSuperAdmin} onChange={onUpdate} />
                                <EditableField label="Monthly Inflow" value={company.monthly_rent} field="monthly_rent" isEditing={isEditing} readOnly={!isSuperAdmin} onChange={onUpdate} type="number" />
                                <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                                    <label className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em] block mb-2 opacity-50">Annualized Forecast</label>
                                    <div className="text-white font-black text-2xl tracking-tighter">{formatCurrency(rentalIncome)}</div>
                                </div>
                                <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                                    <label className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em] block mb-2 opacity-50">Rental Yield (Calculated)</label>
                                    <div className={`text-2xl font-black tracking-tighter ${rentalYield > 6 ? 'text-green-400' : 'text-yellow-400'}`}>{rentalYield.toFixed(2)}%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI ANALYST SIDEBAR */}
                    <div className="space-y-10 lg:col-span-1">
                        <div className="bg-[#0f172a] border border-emerald-500/20 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-3"><i className="fa-solid fa-microchip text-emerald-400"></i> AI Analyst</h3>
                                {isSuperAdmin && (
                                    <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="px-4 py-1.5 bg-emerald-500 text-black rounded-xl text-[9px] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-all">
                                        {isAnalyzing ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Run Scan'}
                                    </button>
                                )}
                            </div>
                            <div className="ai-report-container min-h-[250px] bg-black/40 rounded-2xl p-6 border border-white/5 overflow-y-auto custom-scrollbar" 
                                 dangerouslySetInnerHTML={{ __html: company.ai_market_analysis || '<p class="text-slate-600 text-center pt-24 uppercase font-black text-[9px] tracking-widest">Awaiting Metric Synthesis</p>' }} 
                            />
                            {saveStatus && <p className="text-[8px] text-emerald-400 font-black uppercase text-center mt-4 tracking-widest animate-pulse">{saveStatus}</p>}
                        </div>

                        {/* PROPERTY NOTES */}
                        <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 opacity-40">Property Notes</h3>
                            <textarea 
                                className="w-full bg-black/60 border border-white/10 rounded-2xl p-6 text-slate-300 text-xs font-bold focus:border-emerald-500 outline-none h-44 resize-none shadow-inner"
                                placeholder="Inspection notes, potential repairs..."
                                value={company.company_notes || ''}
                                readOnly={!isSuperAdmin}
                                onChange={(e) => isSuperAdmin && onUpdate('company_notes', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

           {/* --- UPDATED PERFORMANCE TAB WITH WEALTH WATERFALL --- */}
{activeTab === 'Performance' && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-[fadeIn_0.4s_ease] font-manrope">
        
        {/* 1. THE WEALTH WATERFALL (VALUE ATTRIBUTION) */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-white/5 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none"></div>
            <div className="mb-10">
                <h3 className="text-white font-black text-2xl uppercase tracking-tighter mb-2">
                    Wealth <span className="text-emerald-500">Waterfall</span>
                </h3>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">
                    Forensic Attribution of Value Creation Node
                </p>
            </div>
            
            <div className="h-72 w-full">
                <Bar 
                    data={{
                        labels: ['Initial Outlay', 'Rental Inflow', 'Market Growth', 'Current MTM'],
                        datasets: [{
                            data: [
                                [0, totalInvested / 10000000], // Start at 0 to Total (in Cr)
                                [totalInvested / 10000000, (totalInvested + rentalIncome) / 10000000], // Step up by rent
                                [(totalInvested + rentalIncome) / 10000000, currentValue / 10000000], // Step to Current Value
                                [0, currentValue / 10000000] // Final Terminal Bar
                            ],
                            backgroundColor: ['rgba(255,255,255,0.05)', '#10b981', '#3b82f6', '#FFD700'],
                            borderRadius: 12,
                            borderSkipped: false,
                        }]
                    }} 
                    options={{
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { weight: 'black' } } },
                            x: { grid: { display: false }, ticks: { color: '#fff', font: { weight: 'black', size: 9 } } }
                        }
                    }} 
                />
            </div>
        </div>

        {/* 2. ALPHA BENCHMARK NODES */}
        <div className="lg:col-span-1 bg-black/40 border border-white/5 rounded-[3rem] p-10 shadow-2xl flex flex-col justify-center gap-8">
             <div className="space-y-1">
                <label className="text-[8px] text-slate-500 uppercase font-black tracking-widest block opacity-40">Oracle valuation</label>
                <div className="text-3xl font-black text-white tracking-tighter">{formatCurrency(currentValue)}</div>
             </div>
             <div className="space-y-1">
                <label className="text-[8px] text-slate-500 uppercase font-black tracking-widest block opacity-40">Alpha Variance</label>
                <div className={`text-3xl font-black tracking-tighter ${totalReturn >= 7 ? 'text-green-400' : 'text-yellow-500'}`}>
                    {(totalReturn - 7).toFixed(2)}%
                </div>
             </div>
             <div className="pt-6 border-t border-white/5">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] text-slate-500 font-black uppercase">Market Floor</span>
                    <span className="text-white font-mono font-black text-xs">7.00%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(totalReturn / 15) * 100}%` }}></div>
                </div>
             </div>
        </div>
    </div>
)}

            {/* --- TAB: TRANSACTIONS --- */}
            {activeTab === 'Transactions' && (
                <div className="bg-[#0f172a] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
                        <h3 className="text-white font-black text-lg uppercase tracking-tighter flex items-center gap-4">
                            <i className="fa-solid fa-layer-group text-emerald-500"></i> Execution Ledger
                        </h3>
                        {isSuperAdmin && <button onClick={() => setModalState({ type: 'add', mode: 'buy' })} className="px-8 py-3 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] shadow-xl hover:scale-105 active:scale-95 transition-all">+ Add Entry</button>}
                    </div>
                    <div className="divide-y divide-white/5">
                        {investments.map((inv) => (
                            <div key={inv.id} className={`transition-all ${expandedRoundId === inv.id ? 'bg-black/60 border-l-4 border-emerald-500' : 'hover:bg-white/5 border-l-4 border-transparent'}`}>
                                <div className="p-8 flex justify-between items-center cursor-pointer" onClick={() => setExpandedRoundId(expandedRoundId === inv.id ? null : inv.id)}>
                                    <div className="flex items-center gap-8">
                                        <div className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase border ${inv.units < 0 ? 'border-red-500 text-red-500' : 'border-emerald-500 text-emerald-500'}`}>{inv.units < 0 ? 'SOLD' : 'BOUGHT'}</div>
                                        <div>
                                            <div className="text-white text-lg font-black tracking-tighter uppercase">{new Date(inv.investmentDate || inv.investment_date).toLocaleDateString()}</div>
                                            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">Acquisition: {formatCurrency(inv.share_price || inv.buyPrice)} / SQ FT</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12">
                                        <div className="text-right">
                                            <div className="text-white font-black text-2xl tracking-tighter uppercase">{Math.abs(inv.total_area || inv.quantity || inv.units || 0)} SQ FT</div>
                                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{formatCurrency(inv.amount_invested || inv.amount)} Deployed</div>
                                        </div>
                                        <i className={`fa-solid fa-chevron-down text-slate-700 transition-transform ${expandedRoundId === inv.id ? 'rotate-180 text-emerald-500' : ''}`}></i>
                                    </div>
                                </div>

                                {expandedRoundId === inv.id && (
                                    <div className="p-10 border-t border-white/5 bg-[#020617]/50 animate-[fadeIn_0.3s_ease]">
                                        <h4 className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-4">Deal Notes / Legal</h4>
                                        <p className="text-xs text-slate-400 font-semibold mb-8 italic">"{inv.notes || inv.company_notes || "No notes recorded for this transaction."}"</p>
                                        <div className="grid grid-cols-2 gap-10">
                                            <div><span className="text-[8px] text-slate-500 uppercase font-black block mb-2 opacity-50">Authorized Lead</span><span className="text-white font-bold text-sm uppercase">{getManagerName(inv.fund_manager_id)}</span></div>
                                            <div><span className="text-[8px] text-slate-500 uppercase font-black block mb-2 opacity-50">Asset Registry</span>{inv.term_sheet_url ? <a href={inv.term_sheet_url} target="_blank" rel="noreferrer" className="text-blue-400 underline underline-offset-4 text-xs font-black hover:text-emerald-400">VALIDATED PDF</a> : <span className="text-slate-600 text-xs uppercase">No Registry Found</span>}</div>
                                        </div>
                                        {isSuperAdmin && (
                                            <div className="flex justify-end gap-4 mt-10 pt-8 border-t border-white/5">
                                                <button onClick={() => setModalState({ type: 'edit', data: inv, assetType: 'real_estate' })} className="px-6 py-2 bg-white/5 text-slate-400 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:text-white transition-all">Refine Entry</button>
                                                <button onClick={() => handleDeleteRound(inv.id)} className="px-6 py-2 bg-red-900/20 text-red-400 border border-red-500/30 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Purge</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- TAB: VAULT --- */}
            {activeTab === 'Vault' && (
                <div className="bg-[#0f172a] border border-white/5 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-12 flex items-center gap-6"><i className="fa-solid fa-folder-closed text-emerald-500"></i> Legal Vault</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {isSuperAdmin && (
                            <label className="h-44 bg-black/40 border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-emerald-500/5 transition-all group">
                                <i className="fa-solid fa-cloud-arrow-up text-4xl text-slate-700 group-hover:text-emerald-500 transition-colors"></i>
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-white">{uploading ? 'Syncing...' : 'Upload Validated Contract'}</span>
                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            </label>
                        )}
                        {(fileLinks || []).map((link, idx) => (
                            <div key={idx} className="flex justify-between items-center p-8 bg-black/60 border border-white/5 rounded-[2.5rem] hover:border-emerald-500/30 transition-all group shadow-xl">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner"><i className="fa-solid fa-file-signature text-2xl"></i></div>
                                    <div>
                                        <a href={link} target="_blank" rel="noreferrer" className="text-white text-sm font-black uppercase hover:text-emerald-400 block truncate max-w-[150px]">{link.split('/').pop().substring(0, 15)}...</a>
                                        <div className="text-[8px] text-slate-600 font-black uppercase mt-1">Validated Legal Registry</div>
                                    </div>
                                </div>
                                {isSuperAdmin && <button onClick={() => handleDeleteFile(idx)} className="text-slate-800 hover:text-red-500 transition-all"><i className="fa-solid fa-circle-xmark text-xl"></i></button>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RealEstateDetail;