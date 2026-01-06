import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const formatINR = (val) => {
    if (val === '' || val === null || isNaN(val)) return '₹ 0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

const toIndianWords = (num) => {
    const val = Math.abs(Number(num));
    if (!val) return '';
    if (val >= 10000000) return `(${val / 10000000} Cr)`;
    if (val >= 100000) return `(${val / 100000} L)`;
    return '';
};

const AssetForm = ({ 
    isOpen, onClose, onAdd, onAddRound, onVoidRound,
    initialData = null, selectedType = 'STARTUP_EQUITY', mode = 'MODAL' 
}) => {
    if (mode === 'MODAL' && !isOpen) return null;

    const [domains, setDomains] = useState([]); 
    const [name, setName] = useState('');
    const [ticker, setTicker] = useState('');
    const [sector, setSector] = useState(''); 
    const [status, setStatus] = useState('ACTIVE');
    const [notes, setNotes] = useState('');
    const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
    const [equity, setEquity] = useState(0); 
    
    // AGGREGATES
    const [invested, setInvested] = useState(0);
    const [quantity, setQuantity] = useState(0); 
    const [avgPrice, setAvgPrice] = useState(0);
    const [currentVal, setCurrentVal] = useState(0); 
    
    // ROUNDS
    const [rounds, setRounds] = useState([]); 
    const [isAddingRound, setIsAddingRound] = useState(false);
    
    // NEW ROUND INPUTS
    const [newRoundDate, setNewRoundDate] = useState(new Date().toISOString().split('T')[0]);
    const [newRoundName, setNewRoundName] = useState('');
    const [newRoundQty, setNewRoundQty] = useState('');
    const [newRoundPrice, setNewRoundPrice] = useState('');
    
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchDomains = async () => {
            const { data } = await supabase.from('domains').select('name').eq('asset_class', selectedType).order('name');
            if (data) {
                setDomains(data);
                if (!initialData && data.length > 0) setSector(data[0].name);
            }
        };
        fetchDomains();
    }, [selectedType, initialData]);

    useEffect(() => {
        if (initialData) {
            setName(initialData.asset_name || '');
            setTicker(initialData.ticker || '');
            setSector(initialData.sector || '');
            setStatus(initialData.status || 'ACTIVE');
            setNotes(initialData.notes || '');
            setInvDate(initialData.investment_date || '');
            setEquity(initialData.equity_percentage || 0);

            if (initialData.rounds && initialData.rounds.length > 0) {
                setRounds(initialData.rounds);
                recalcAggregates(initialData.rounds);
            } else {
                setQuantity(0); setInvested(0); setAvgPrice(0);
            }

            if (!initialData.ticker) {
                setCurrentVal(Number(initialData.current_valuation) || 0);
            }
        }
    }, [initialData]);

    const recalcAggregates = (roundList) => {
        const valid = roundList.filter(r => !r.is_voided);
        const totalQ = valid.reduce((sum, r) => sum + Number(r.units_bought), 0);
        const totalInv = valid.reduce((sum, r) => sum + Number(r.total_investment), 0);
        
        setQuantity(totalQ);
        setInvested(totalInv);
        setAvgPrice(totalQ > 0 ? (totalInv / totalQ) : 0);

        if (initialData?.ticker || ticker) {
            const marketRate = initialData?.displayRate || 0;
            const effectiveRate = marketRate > 0 ? marketRate : (totalQ > 0 ? totalInv / totalQ : 0);
            setCurrentVal(Math.floor(totalQ * effectiveRate));
        }
    };

    const handleVoid = async (roundId, roundData) => {
        if (onVoidRound) {
            await onVoidRound(roundId, roundData);
            const updatedRounds = rounds.map(r => r.id === roundId ? { ...r, is_voided: true } : r);
            setRounds(updatedRounds);
            recalcAggregates(updatedRounds);
        }
    };

    const handleAddRoundSubmit = async () => {
        if (!newRoundQty || !newRoundPrice) return alert("Enter Qty and Price");
        setSaving(true);
        if (onAddRound) {
            await onAddRound({
                date: newRoundDate,
                round_name: newRoundName,
                qty: newRoundQty,
                price: newRoundPrice
            });
            setNewRoundQty(''); setNewRoundPrice(''); setIsAddingRound(false);
            onClose();
        }
        setSaving(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const q = parseFloat(quantity || newRoundQty || 0);
        const p = parseFloat(avgPrice || newRoundPrice || invested || 0);
        
        let finalInvested = invested;
        if (!initialData && selectedType !== 'STARTUP_EQUITY') {
             finalInvested = q * p;
        }

        if (finalInvested <= 0) {
            alert("Error: Total Investment cannot be zero.");
            setSaving(false);
            return;
        }

        const initialCurrentVal = (!ticker && currentVal) ? currentVal : finalInvested;

        await onAdd({
            asset_name: name,
            asset_type: selectedType, 
            ticker: selectedType === 'STARTUP_EQUITY' ? null : ticker,
            sector: sector,
            status: status,
            notes: notes,
            invested_amount: finalInvested, 
            current_valuation: initialCurrentVal,
            transaction_history: [{
                date: invDate || newRoundDate,
                qty: q,
                price: p,
                equity: equity
            }]
        });
        setSaving(false);
    };

    const getDisplayValue = () => {
        if (currentVal > 0) return formatINR(currentVal);
        const liveCalc = (parseFloat(newRoundQty) || 0) * (parseFloat(newRoundPrice) || 0);
        if (liveCalc > 0) return formatINR(liveCalc);
        return 'Waiting for input...';
    };

    // --- DYNAMIC LABELS ---
    const getQtyLabel = () => {
        if (selectedType === 'REAL_ESTATE') return 'Total Area (Sq.Ft)';
        if (selectedType === 'PUBLIC_STOCK') return 'Shares';
        if (selectedType === 'CRYPTO') return 'Tokens';
        return 'Qty';
    };

    const getPriceLabel = () => {
        if (selectedType === 'REAL_ESTATE') return 'Price / Sq.Ft (₹)';
        return 'Price Per Unit (₹)';
    };

    const isTickerAsset = selectedType === 'PUBLIC_STOCK' || selectedType === 'CRYPTO' || selectedType === 'GOLD' || selectedType === 'BULLION';
    const inputClass = "w-full border border-slate-300 bg-sky-50 rounded p-2.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200";
    const labelClass = "block text-[9px] font-bold text-slate-500 uppercase mb-1 tracking-wider";
    const dateStyle = { colorScheme: 'light' }; 

    const containerClass = mode === 'MODAL' ? "fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4" : "h-full flex flex-col bg-white";
    const wrapperClass = mode === 'MODAL' ? "bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden" : "flex-1 flex flex-col overflow-hidden";

    return (
        <div className={containerClass}>
            <div className={wrapperClass}>
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                    <div><h2 className="text-sm font-bold uppercase tracking-widest">{initialData ? `Manage: ${name}` : `New ${selectedType.replace('_', ' ')}`}</h2></div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><i className="fa-solid fa-times"></i></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className={selectedType === 'STARTUP_EQUITY' ? 'col-span-2' : ''}>
                            <label className={labelClass}>Asset Name</label>
                            <input value={name} onChange={e=>setName(e.target.value)} className={inputClass} disabled={initialData} required />
                        </div>
                        {isTickerAsset && (
                            <div><label className={labelClass}>Ticker</label><input value={ticker} onChange={e=>setTicker(e.target.value)} className={inputClass} disabled={initialData} /></div>
                        )}
                        <div>
                            <label className={labelClass}>Sector / Domain</label>
                            <select value={sector} onChange={e=>setSector(e.target.value)} className={inputClass} disabled={initialData}>
                                {domains.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <select value={status} onChange={e=>setStatus(e.target.value)} className={inputClass}><option>ACTIVE</option><option>EXITED</option></select>
                        </div>
                    </div>

                    {initialData && selectedType !== 'STARTUP_EQUITY' && (
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                                <h4 className="text-xs font-bold text-slate-700 uppercase">History</h4>
                                {!isAddingRound && (
                                    <button type="button" onClick={() => setIsAddingRound(true)} className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase rounded shadow hover:bg-blue-700">+ Add Entry</button>
                                )}
                            </div>
                            <div className="space-y-2 mb-4">
                                {rounds.map((r, i) => (
                                    <div key={i} className={`flex justify-between items-center text-xs p-2 rounded border ${r.is_voided ? 'bg-slate-100 border-slate-100 opacity-50' : 'bg-white border-slate-200'}`}>
                                        <div className={`flex gap-4 items-center ${r.is_voided ? 'line-through' : ''}`}>
                                            <span className="text-slate-500 w-24 font-mono">{r.investment_date}</span>
                                            <span className="font-bold text-slate-700 w-24 truncate">{r.round_name}</span>
                                            <span className="font-mono font-bold w-20 text-right">{Number(r.units_bought).toLocaleString()}</span>
                                            <span className="text-slate-400">@</span>
                                            <span className="font-mono w-24">{formatINR(r.unit_price)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 ml-auto">
                                            <span className={`font-black ${r.is_voided ? 'text-slate-400' : 'text-slate-800'}`}>{formatINR(r.total_investment)}</span>
                                            {!r.is_voided && onVoidRound && (
                                                <button type="button" onClick={() => handleVoid(r.id, r)} className="text-slate-300 hover:text-red-500 transition-colors" title="Void"><i className="fa-solid fa-ban"></i></button>
                                            )}
                                            {r.is_voided && <span className="text-[9px] font-bold text-red-500 border border-red-200 px-1 rounded bg-red-50">VOID</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {isAddingRound && (
                                <div className="bg-blue-50 p-4 rounded border border-blue-200 mb-4 animate-[fadeIn_0.2s_ease]">
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div><label className={labelClass}>Date</label><input type="date" value={newRoundDate} onChange={e=>setNewRoundDate(e.target.value)} className={inputClass} style={dateStyle} /></div>
                                        <div><label className={labelClass}>Note / Name</label><input placeholder="Round Name" value={newRoundName} onChange={e=>setNewRoundName(e.target.value)} className={inputClass} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div><label className={labelClass}>{getQtyLabel()}</label><input type="number" value={newRoundQty} onChange={e=>setNewRoundQty(e.target.value)} className={inputClass} /></div>
                                        <div><label className={labelClass}>{getPriceLabel()}</label><input type="number" value={newRoundPrice} onChange={e=>setNewRoundPrice(e.target.value)} className={inputClass} /></div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setIsAddingRound(false)} className="text-[10px] font-bold text-slate-400 uppercase bg-white border border-slate-200 px-3 py-1.5 rounded">Cancel</button>
                                        <button type="button" onClick={handleAddRoundSubmit} className="text-[10px] font-bold text-white bg-blue-600 px-4 py-1.5 rounded uppercase shadow">Save</button>
                                    </div>
                                </div>
                            )}
                            <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-4 text-center bg-white p-2 rounded">
                                <div><label className={labelClass}>Total {selectedType === 'REAL_ESTATE' ? 'Sq.Ft' : 'Units'}</label><div className="text-sm font-black text-slate-800">{Number(quantity).toLocaleString()}</div></div>
                                <div><label className={labelClass}>Avg Price</label><div className="text-sm font-black text-slate-800">{formatINR(avgPrice)}</div></div>
                                <div><label className={labelClass}>Invested</label><div className="text-sm font-black text-slate-800">{formatINR(invested)}</div></div>
                            </div>
                        </div>
                    )}

                    {!initialData && selectedType !== 'STARTUP_EQUITY' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>{getQtyLabel()}</label><input type="number" value={newRoundQty} onChange={e=>setNewRoundQty(e.target.value)} className={inputClass} required /></div>
                            <div><label className={labelClass}>{getPriceLabel()}</label><input type="number" value={newRoundPrice} onChange={e=>setNewRoundPrice(e.target.value)} className={inputClass} required /></div>
                        </div>
                    )}

                    {selectedType === 'STARTUP_EQUITY' && (
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                             <div className="grid grid-cols-2 gap-4">
                                <div><label className={labelClass}>Invested Capital (₹)</label><input type="number" value={invested} onChange={e=>setInvested(e.target.value)} className={inputClass} disabled={initialData} /></div>
                                <div><label className={labelClass}>Date</label><input type="date" value={invDate} onChange={e=>setInvDate(e.target.value)} className={inputClass} disabled={initialData} style={dateStyle} /></div>
                                <div><label className={labelClass}>Equity (%)</label><input type="number" value={equity} onChange={e=>setEquity(e.target.value)} className={inputClass} disabled={initialData} /></div>
                            </div>
                        </div>
                    )}

                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1 tracking-wider">Current Total Value</label>
                        {isTickerAsset ? (
                            <div>
                                <div className="text-xl font-black text-emerald-900">{getDisplayValue()}</div>
                                <div className="text-[9px] font-bold text-emerald-500 mt-1"><i className="fa-solid fa-lock mr-1"></i> Auto-calculated (Default: Cost Basis)</div>
                            </div>
                        ) : (
                            <div>
                                <input type="number" value={currentVal} onChange={e=>setCurrentVal(e.target.value)} className="w-full bg-white border border-emerald-200 text-lg font-bold text-emerald-900 rounded p-2 outline-none" />
                                {currentVal > 0 && <div className="text-[10px] text-emerald-600 font-bold text-right mt-1">{toIndianWords(currentVal)}</div>}
                            </div>
                        )}
                    </div>

                    <div><label className={labelClass}>Notes</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} className={inputClass} rows="2" /></div>
                </form>

                <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                    {!initialData && <button onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Cancel</button>}
                    {!initialData ? (
                        <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-blue-600 text-white text-xs font-bold uppercase rounded hover:bg-blue-700 shadow-lg">{saving ? 'Saving...' : 'Create Asset'}</button>
                    ) : (
                        <>
                            {!isTickerAsset && <button onClick={async () => { setSaving(true); await onAdd({ asset_name: name, sector, status, notes, current_valuation: currentVal }); setSaving(false); onClose(); }} className="px-6 py-2 bg-emerald-600 text-white text-xs font-bold uppercase rounded shadow">Save Changes</button>}
                            <button onClick={onClose} className="px-6 py-2 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded">Close</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssetForm;