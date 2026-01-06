import React, { useState, useMemo } from 'react';
import { runAIAnalysis } from '../../../lib/aiService';

// --- STYLES & CONSTANTS ---
const FUNDING_ROUNDS = ["Pre-seed", "Seed", "Pre-series A", "Series A", "Series B", "Series C", "Series D", "IPO", "Public Market", "Other"];
const LIQUIDATION_PREFS = ["1x", "1.5x", "2x", "2.5x", "3x", "Other"];
const PARTICIPATION_TYPES = ["Participating", "Non-Participating", "Capped Participating"];
const darkInput = "w-full bg-[#020617] border border-white/10 rounded-lg p-3 text-white text-xs focus:border-[var(--brand-color)] focus:outline-none appearance-none [&>option]:bg-[#020617] [color-scheme:dark]";
const darkLabel = "block text-[10px] font-bold text-slate-400 uppercase mb-1";

// --- HELPERS ---
const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "₹0"; 
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

const formatCurrencyInput = (value) => {
    const raw = String(value).replace(/[^0-9.]/g, '');
    if (!raw) return { raw: 0, display: '' };
    const fmt = new Intl.NumberFormat('en-IN').format(Number(raw));
    return { raw: Number(raw), display: fmt };
};

const toWords = (num) => {
    if (!num) return '';
    const abs = Math.abs(Number(num));
    if (abs >= 10000000) return `₹ ${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `~ ${(abs / 100000).toFixed(2)} L`;
    return formatCurrency(num);
};

const CurrencyInput = ({ label, value, onChange, placeholder, readOnly }) => (
    <div>
        <label className={darkLabel}>{label}</label>
        <input 
            className={`${darkInput} ${readOnly ? 'opacity-50 cursor-not-allowed bg-black/60' : ''}`} 
            value={value} 
            onChange={onChange} 
            placeholder={placeholder} 
            readOnly={readOnly}
        />
        <div className="text-[9px] text-[var(--brand-color)] mt-1 text-right font-bold h-3">
            {toWords(String(value).replace(/,/g, ''))}
        </div>
    </div>
);

const InvestmentRoundModal = ({ companyName, domainName, onClose, onSave, managers = [], allInvestments = [], existingRound = null, assetType, currentHoldings = 0, currentPrice = 0, mode = 'buy' }) => {
    const isEdit = !!existingRound;
    const isStartup = assetType === 'startup';
    const isSell = mode === 'sell';
    const isRealEstate = assetType === 'real_estate'; 

    const [amount, setAmount] = useState(isEdit ? (existingRound.amount_invested || existingRound.fundingAmount || 0) : 0);
    const [amountDisplay, setAmountDisplay] = useState(isEdit ? formatCurrency(existingRound.amount_invested || existingRound.fundingAmount).replace('₹', '').trim() : '');
    const [date, setDate] = useState(isEdit ? (existingRound.investment_date || existingRound.investmentDate) : new Date().toISOString().split('T')[0]);
    const [managerId, setManagerId] = useState(isEdit ? (existingRound.fund_manager_id || existingRound.fundManagerId || '') : '');
    const [units, setUnits] = useState(isEdit ? Math.abs(existingRound.quantity || existingRound.units || 0) : '');
    const [buyPrice, setBuyPrice] = useState(isEdit ? (existingRound.share_price || existingRound.buyPrice || 0) : (isSell ? currentPrice : ''));
    const [round, setRound] = useState(isEdit ? (existingRound.round_name || existingRound.fundingRound || 'Seed') : 'Seed');
    const [equityPct, setEquityPct] = useState(isEdit ? (existingRound.equity_pct || existingRound.equityPct || '') : '');
    const [currentValuation, setCurrentValuation] = useState(isEdit ? (existingRound.current_valuation || existingRound.currentValuation || 0) : '');
    const [valDisplay, setValDisplay] = useState(isEdit && (existingRound.current_valuation || existingRound.currentValuation) ? formatCurrency(existingRound.current_valuation || existingRound.currentValuation).replace('₹', '').trim() : '');
    const [notes, setNotes] = useState(isEdit ? existingRound.notes || '' : '');
    const [invType, setInvType] = useState(isEdit ? existingRound.investment_type || 'Equity' : 'Equity');
    const [liquidationPref, setLiquidationPref] = useState(isEdit ? existingRound.liquidation_pref || '1x' : '1x');
    const [participation, setParticipation] = useState(isEdit ? existingRound.participation_type || 'Non-Participating' : 'Non-Participating');
    const [targetYoY, setTargetYoY] = useState(isEdit ? (existingRound.target_yoy || existingRound.targetYoY || '') : '');
    const [expectedExit, setExpectedExit] = useState(isEdit ? (existingRound.expected_exit || existingRound.expectedExit || '') : '');
    const [coInvestors, setCoInvestors] = useState(isEdit ? (existingRound.co_investors || existingRound.coInvestors || '') : '');
    const [termSheetUrl, setTermSheetUrl] = useState(isEdit ? (existingRound.term_sheet_url || existingRound.termSheetUrl || '') : '');
    const [legalDocUrl, setLegalDocUrl] = useState(isEdit ? (existingRound.legal_doc_url || existingRound.legalDocUrl || '') : '');
    const [shaDate, setShaDate] = useState(isEdit ? (existingRound.shareholder_agreement_date || existingRound.shaDate || '') : '');
    const [aiAnalysis, setAiAnalysis] = useState(isEdit ? (existingRound.aiAnalysis || existingRound.ai_analysis || '') : '');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const impliedValuation = useMemo(() => {
        const amt = Number(amount) || 0;
        const eq = Number(equityPct) || 0;
        return (amt > 0 && eq > 0) ? (amt / (eq / 100)) : 0;
    }, [amount, equityPct]);

    const budgetStatus = useMemo(() => {
        if (!managerId) return null;
        const manager = managers.find(m => m.id === managerId);
        if (!manager) return null;
        const qBudget = Number(manager.budget?.quarterly) || 0;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        const used = allInvestments.filter(i => {
                const invDate = new Date(i.investmentDate || i.investment_date);
                const isManager = i.fundManagerId === managerId || i.fund_manager_id === managerId;
                const isInQuarter = invDate.getFullYear() === currentYear && (Math.floor(invDate.getMonth() / 3) + 1) === currentQuarter;
                return isManager && isInQuarter && i.id !== existingRound?.id;
            }).reduce((sum, i) => sum + (Number(i.amount_invested || i.fundingAmount) || 0), 0);
        const available = qBudget - used;
        return { qBudget, used, available, isExceeded: Number(amount) > available, managerName: manager.name };
    }, [managerId, amount, managers, allInvestments, existingRound]);

    const handleUnitChange = (val) => { 
        setUnits(val); 
        if (isStartup) {
            const s = Number(val) || 0; const p = Number(buyPrice) || 0;
            if (s > 0 && p > 0) { setAmount(s * p); setAmountDisplay(formatCurrency(s * p).replace('₹', '').trim()); }
        } else {
            const total = (Number(val) || 0) * (Number(buyPrice) || 0);
            setAmount(total); setAmountDisplay(formatCurrency(total).replace('₹', '').trim());
        }
    };

    const handlePriceChange = (val) => { 
        setBuyPrice(val); 
        if (isStartup) {
            const s = Number(units) || 0; const p = Number(val) || 0;
            if (s > 0 && p > 0) { setAmount(s * p); setAmountDisplay(formatCurrency(s * p).replace('₹', '').trim()); }
        } else {
            const total = (Number(units) || 0) * (Number(val) || 0);
            setAmount(total); setAmountDisplay(formatCurrency(total).replace('₹', '').trim());
        }
    };

    const handleAnalyzeDeal = async () => {
        setIsAnalyzing(true);
        let prompt = "";
        if (assetType === 'stock') {
             prompt = `Act as Senior Portfolio Manager. Analyze this public trade: ${companyName}, ${mode}, Price ₹${buyPrice}, Total ₹${amount}. Comment on Execution, Sizing, Verdict.`;
        } else if (assetType === 'crypto' || assetType === 'gold') {
             prompt = `Act as Trader. Analyze ${assetType} transaction: ${companyName}, Price ₹${buyPrice}. Good entry/exit? Brief bullet points.`;
        } else {
             prompt = `Analyze VC terms for ${companyName}: Val ₹${currentValuation || impliedValuation}, Invested ₹${amount} for ${equityPct}%. Red flags, market standards?`;
        }
        try {
            const analysis = await runAIAnalysis(prompt);
            setAiAnalysis(analysis);
        } catch (error) { alert("AI Error: " + error.message); }
        finally { setIsAnalyzing(false); }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!managerId) return alert("⚠️ Manager Required");
        let finalAmount = Number(amount);
        let finalQty = Number(units);
        if(!isStartup && finalAmount === 0 && finalQty > 0) finalAmount = finalQty * Number(buyPrice);
        if (finalAmount <= 0 && !isSell) return alert("⚠️ Invalid Amount");
        if (budgetStatus?.isExceeded && !isSell) return alert(`⚠️ Budget Exceeded! Available: ${formatCurrency(budgetStatus.available)}`);
        if (isSell) finalQty = -Math.abs(finalQty);

        let finalAssetClass = 'equity';
        if (assetType === 'crypto') finalAssetClass = 'Crypto';
        else if (assetType === 'real_estate') finalAssetClass = 'RealEstate';
        else if (assetType === 'stock') finalAssetClass = 'public_shares';
        else if (assetType === 'gold') finalAssetClass = 'bullion';

        onSave({
            id: existingRound?.id, amount_invested: finalAmount, investment_date: date, fund_manager_id: managerId,
            status: 'Active', asset_class: finalAssetClass, notes, round_name: isStartup ? round : (isSell ? 'Sell' : 'Buy'),
            current_valuation: Number(currentValuation || finalAmount), equity_pct: Number(equityPct),
            investment_type: invType, quantity: finalQty, share_price: Number(buyPrice), 
            liquidation_pref: liquidationPref, participation_type: participation, target_yoy: targetYoY,
            expected_exit: expectedExit, co_investors: coInvestors, term_sheet_url: termSheetUrl,
            legal_doc_url: legalDocUrl, shareholder_agreement_date: shaDate, ai_analysis: aiAnalysis 
        });
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
            <div className={`bg-[#0f172a] border ${isSell ? 'border-red-500/50' : 'border-green-500/50'} w-full max-w-lg rounded-xl shadow-2xl p-6 flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
                <div className="shrink-0 mb-4 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">{isEdit ? 'Edit Round' : (isSell ? 'Sell / Exit' : `Add Round: ${companyName}`)}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark text-lg"></i></button>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 space-y-5 pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <CurrencyInput label={isStartup ? 'Funding Amount (₹)' : 'Total Cost'} value={amountDisplay} onChange={(e) => { const {raw, display} = formatCurrencyInput(e.target.value); setAmount(raw); setAmountDisplay(display); }} readOnly={!isStartup} />
                        <div><label className={darkLabel}>Date</label><input type="date" className={darkInput} value={date} onChange={e => setDate(e.target.value)} /></div>
                    </div>
                    {isStartup && impliedValuation > 0 && <div className="bg-[#6366f1] rounded-lg p-3 flex justify-between items-center shadow-lg"><span className="text-[10px] text-white/80 uppercase font-bold tracking-widest">Implied Post-Money Valuation</span><span className="text-xl font-black text-white font-mono">{formatCurrency(impliedValuation)}</span></div>}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg"><label className={darkLabel}>Assigned Fund Manager <span className="text-red-400">*</span></label><select className={darkInput} value={managerId} onChange={e => setManagerId(e.target.value)} required><option value="">-- Select Manager --</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name} ({toWords(m.budget?.quarterly || 0)} Q-Budget)</option>)}</select></div>
                    <div className={isStartup ? "bg-blue-900/10 border border-blue-500/20 p-3 rounded-lg" : isRealEstate ? "bg-emerald-900/10 border border-emerald-500/20 p-3 rounded-lg" : "space-y-4"}>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={darkLabel}>{isRealEstate ? 'Total Area (Sq Ft)' : 'Quantity / Units'}</label><input type="number" className={darkInput} value={units} onChange={e => handleUnitChange(e.target.value)} /></div>
                            <div><label className={darkLabel}>{isSell ? 'Sale Price' : 'Buy Price'}</label><input type="number" className={darkInput} value={buyPrice} onChange={e => handlePriceChange(e.target.value)} /></div>
                        </div>
                    </div>
                    {isStartup && (
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={darkLabel}>Equity Pct. (%)</label><input type="number" className={darkInput} value={equityPct} onChange={e => setEquityPct(e.target.value)} /></div>
                            <div><label className={darkLabel}>Funding Round</label><select className={darkInput} value={round} onChange={e => setRound(e.target.value)}>{FUNDING_ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        </div>
                    )}
                    <div className="bg-[#020617] border border-[var(--brand-color)]/30 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3"><h4 className="text-xs font-bold text-[var(--brand-color)] uppercase flex items-center gap-2"><i className="fa-solid fa-wand-magic-sparkles"></i> AI Deal Analysis</h4>{!aiAnalysis && <button type="button" onClick={handleAnalyzeDeal} disabled={isAnalyzing} className="px-4 py-1.5 bg-white/5 border border-white/10 rounded text-[10px] text-white">{isAnalyzing ? 'Analyzing...' : 'Analyze Deal'}</button>}</div>
                        {aiAnalysis && <div className="text-xs text-slate-300 leading-relaxed font-medium border-l-2 border-[var(--brand-color)] pl-3 whitespace-pre-line">{aiAnalysis}</div>}
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-white/10">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 text-sm">Cancel</button>
                    <button onClick={handleSubmit} disabled={!managerId} className={`px-6 py-2 text-white rounded-lg font-bold text-sm ${!managerId ? 'bg-slate-600' : 'bg-green-600'}`}>{isSell ? 'Confirm Sale' : 'Save Entry'}</button>
                </div>
            </div>
        </div>
    );
};

export default InvestmentRoundModal;