import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

import AssetTypeSelector from './AssetTypeSelector';
import AssetForm from './AssetForm';
import InvoiceForm from '../invoice/InvoiceForm'; // <--- NEW IMPORT

const PortfolioManager = () => {
    const [assets, setAssets] = useState([]);
    const [rounds, setRounds] = useState({});
    const [expandedAssetId, setExpandedAssetId] = useState(null);
    const [loading, setLoading] = useState(true);

    // VIEW STATE
    const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
    const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false); // <--- NEW STATE (Selling)
    const [selectedType, setSelectedType] = useState('STARTUP_EQUITY');
    const [editingAsset, setEditingAsset] = useState(null);
    const [invoiceRequestData, setInvoiceRequestData] = useState(null); // <--- NEW STATE

    // --- 1. FETCH DATA (Original Logic) ---
    const fetchData = async () => {
        setLoading(true);
        const { data: assetData } = await supabase.from('erp_portfolio_assets').select('*').order('asset_name');
        const { data: roundData } = await supabase.from('erp_asset_rounds').select('*').order('investment_date', { ascending: false });

        if (assetData) {
            const roundMap = {};
            roundData?.forEach(r => {
                if (!roundMap[r.asset_id]) roundMap[r.asset_id] = [];
                roundMap[r.asset_id].push(r);
            });
            setRounds(roundMap);
            setAssets(assetData);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // --- 2. CALCULATED METRICS (Preserved Full Logic) ---
    const processedAssets = useMemo(() => {
        const today = new Date();
        
        return assets.map(asset => {
            const assetRounds = rounds[asset.id] || [];
            
            // FILTER: Only count NON-VOIDED rounds for math
            const validRounds = assetRounds.filter(r => !r.is_voided);

            // AGGREGATE
            const totalUnits = validRounds.reduce((sum, r) => sum + Number(r.units_bought), 0);
            const totalInvested = validRounds.reduce((sum, r) => sum + Number(r.total_investment), 0);
            
            // CURRENT VALUATION LOGIC
            const dbValue = Number(asset.current_valuation) || 0;
            let currentTotalValue = 0;
            let displayRate = 0;

            const isRateBased = asset.ticker || asset.asset_type === 'REAL_ESTATE' || asset.asset_type === 'CRYPTO' || asset.asset_type === 'PUBLIC_STOCK';

            if (isRateBased && totalUnits > 0) {
                displayRate = dbValue;
                currentTotalValue = displayRate * totalUnits;
            } else {
                currentTotalValue = dbValue > 0 ? dbValue : totalInvested;
            }

            // Stale Check
            let isStale = false;
            if (isRateBased && asset.last_price_update) {
                const lastUpdate = new Date(asset.last_price_update);
                const diffTime = Math.abs(today - lastUpdate);
                if (Math.ceil(diffTime / (1000 * 60 * 60 * 24)) > 7) isStale = true;
            }

            const gain = currentTotalValue - totalInvested;
            const returnPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

            return { 
                ...asset, totalUnits, totalInvested, 
                currentTotalValue, displayRate, gain, returnPct, 
                rounds: assetRounds, isStale
            };
        });
    }, [assets, rounds]);

    // --- 3. HANDLERS (REWIRED FOR LEDGER) ---

    const openNewAssetFlow = () => { setEditingAsset(null); setIsTypeSelectorOpen(true); };
    const handleTypeSelect = (type) => { setSelectedType(type); setIsTypeSelectorOpen(false); setIsAssetFormOpen(true); };
    
    const handleEditClick = (asset) => {
        setEditingAsset(asset);
        setSelectedType(asset.asset_type);
        setIsAssetFormOpen(true);
    };

    // A. NEW ASSET REQUEST (Intercepts Save)
    const handleRequestNewAsset = async (formData) => {
        try {
            // Extract initial round details
            const initialRound = formData.transaction_history?.[0] || {};
            const units = initialRound.qty || 0;
            const price = initialRound.price || 0;
            const total = formData.invested_amount || (units * price);

            // Create Invoice Payload
            const payload = {
                invoice_no: `REQ-NEW-${Date.now().toString().slice(-6)}`,
                issue_date: new Date().toISOString().split('T')[0],
                amount_total: total,
                type: 'PAYABLE', 
                category: 'Asset Purchase',
                status: 'PENDING',
                notes: `Capital Injection for New Asset: ${formData.asset_name}`,
                
                // METADATA: Instructions for Ledger
                metadata: {
                    is_new_asset: true,
                    new_asset_name: formData.asset_name,
                    new_asset_type: formData.asset_type,
                    sector: formData.sector,
                    ticker: formData.ticker,
                    round: 'Initial Funding',
                    units: units,
                    price_per_unit: price
                }
            };

            const { error } = await supabase.from('erp_invoices').insert([payload]);
            if (error) throw error;

            alert("Request Sent! The asset will appear in your portfolio once the Ledger approves the fund release.");
            setIsAssetFormOpen(false);
        } catch (err) { alert(err.message); }
    };

    // B. ADD ROUND REQUEST (Intercepts Add Round)
    const handleRequestAddRound = async (roundData) => {
        try {
            const total = Number(roundData.qty) * Number(roundData.price);
            
            const payload = {
                invoice_no: `REQ-BUY-${Date.now().toString().slice(-6)}`,
                issue_date: roundData.date || new Date().toISOString().split('T')[0],
                amount_total: total,
                type: 'PAYABLE', 
                category: 'Asset Purchase',
                status: 'PENDING',
                notes: `Follow-on Investment: ${editingAsset.asset_name} (${roundData.round_name})`,
                asset_id: editingAsset.id, // Link to existing
                
                metadata: {
                    round: roundData.round_name,
                    units: roundData.qty,
                    price_per_unit: roundData.price
                }
            };

            const { error } = await supabase.from('erp_invoices').insert([payload]);
            if (error) throw error;

            alert("Investment Request Sent to Ledger.");
            setIsAssetFormOpen(false);
        } catch (err) { alert(err.message); }
    };

    // C. SELL REQUEST (New Action)
    const handleSellClick = (asset) => {
        setInvoiceRequestData({
            asset_id: asset.id,
            display_name: asset.asset_name,
            type: 'RECEIVABLE', // Money In
            category: 'Sale of Asset',
            notes: `Liquidation / Sale of ${asset.asset_name}`,
            metadata: {
                is_sale: true,
                round: 'Liquidation',
                units: asset.totalUnits // Default to max
            }
        });
        setIsInvoiceOpen(true);
    };

    // D. VOID ROUND (Kept as Admin Correction for now)
    const handleVoidRound = async (roundId, roundData) => {
        try {
            await supabase.from('erp_asset_rounds').update({ is_voided: true }).eq('id', roundId);
            await supabase.from('erp_ledger').insert([{
                transaction_date: new Date().toISOString(),
                type: 'CREDIT', 
                category: 'Adjustment',
                sub_category: 'Voided Transaction',
                amount: roundData.total_investment,
                vendor: editingAsset?.asset_name || 'System',
                description: `VOIDED: ${roundData.round_name} (Ref: ${roundId})`,
                status: 'REALIZED'
            }]);
            fetchData(); 
        } catch (err) { alert(err.message); }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    const chartData = processedAssets.map(a => ({ name: a.asset_name, value: Number(a.currentTotalValue) }));
    const COLORS = ['#1e3a8a', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

    return (
        <div className="grid grid-cols-12 gap-6 animate-[fadeIn_0.3s_ease]">
            {/* LIST */}
            <div className="col-span-12 md:col-span-8 space-y-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <h2 className="text-sm font-black text-blue-900 uppercase tracking-widest">Portfolio Holdings</h2>
                    <button onClick={openNewAssetFlow} className="px-5 py-2 bg-blue-900 text-white text-[10px] font-bold uppercase rounded-lg shadow-md hover:bg-blue-800 transition-all">
                        <i className="fa-solid fa-plus mr-2"></i> New Asset
                    </button>
                </div>

                <div className="space-y-3">
                    {processedAssets.map(asset => {
                        const isExpanded = expandedAssetId === asset.id;
                        return (
                            <div key={asset.id} className={`bg-white rounded-xl border transition-all ${isExpanded ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-slate-200 shadow-sm hover:border-blue-300'}`}>
                                <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {asset.rounds.filter(r => !r.is_voided).length}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900">{asset.asset_name}</h3>
                                            <div className="flex gap-2 text-[10px] uppercase font-bold text-slate-400">
                                                <span className="bg-slate-50 px-1 border border-slate-100 rounded">{asset.asset_type.replace('_', ' ')}</span>
                                                {asset.ticker && <span className="bg-blue-50 text-blue-600 px-1 border border-blue-100 rounded">{asset.ticker}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-right">
                                        <div className="hidden sm:block">
                                            <div className="text-[9px] text-slate-400 uppercase font-bold">Total Invested</div>
                                            <div className="text-xs font-bold text-slate-700">{formatCurrency(asset.totalInvested)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-slate-400 uppercase font-bold">Current Value</div>
                                            <div className="text-sm font-black text-blue-900">{formatCurrency(asset.currentTotalValue)}</div>
                                        </div>
                                        <div className={`w-16 text-right ${asset.gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            <div className="text-xs font-black">{asset.gain >= 0 ? '+' : ''}{asset.returnPct.toFixed(1)}%</div>
                                        </div>
                                        <i className={`fa-solid fa-chevron-down text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                                        {/* ACTION BAR (NEW) */}
                                        <div className="flex gap-3 mb-4">
                                            <button onClick={(e) => { e.stopPropagation(); handleEditClick(asset); }} className="flex-1 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase rounded shadow hover:bg-blue-700">
                                                <i className="fa-solid fa-cart-plus mr-1"></i> Buy More (Request)
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleSellClick(asset); }} className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded shadow hover:bg-emerald-700">
                                                <i className="fa-solid fa-sack-dollar mr-1"></i> Sell / Liquidate (Request)
                                            </button>
                                        </div>

                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="text-[9px] uppercase text-slate-400 border-b border-slate-200">
                                                    <th className="pb-2 pl-2">Date</th>
                                                    <th className="pb-2">Round</th>
                                                    <th className="pb-2 text-right">Units</th>
                                                    <th className="pb-2 text-right">Price/Unit</th>
                                                    <th className="pb-2 text-right">Total</th>
                                                    <th className="pb-2 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs text-slate-700 font-bold">
                                                {asset.rounds.map(round => (
                                                    <tr key={round.id} className={`border-b border-slate-100 last:border-0 ${round.is_voided ? 'opacity-50' : ''}`}>
                                                        <td className={`py-2 pl-2 font-mono text-[10px] ${round.is_voided ? 'line-through' : ''}`}>{round.investment_date}</td>
                                                        <td className={`py-2 ${round.is_voided ? 'line-through' : ''}`}>{round.round_name}</td>
                                                        <td className={`py-2 text-right ${round.is_voided ? 'line-through' : ''}`}>{Number(round.units_bought).toLocaleString()}</td>
                                                        <td className={`py-2 text-right text-slate-500 ${round.is_voided ? 'line-through' : ''}`}>{formatCurrency(round.unit_price)}</td>
                                                        <td className={`py-2 text-right text-slate-900 ${round.is_voided ? 'line-through' : ''}`}>{formatCurrency(round.total_investment)}</td>
                                                        <td className="py-2 text-center">
                                                            {round.is_voided ? (
                                                                <span className="text-[9px] font-bold text-red-500 border border-red-200 px-1 rounded bg-red-50">VOID</span>
                                                            ) : (
                                                                // VOID BUTTON (Admin Only Correction)
                                                                <button onClick={() => handleVoidRound(round.id, round)} className="text-slate-300 hover:text-red-500 transition-colors" title="Void Round"><i className="fa-solid fa-ban"></i></button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CHART */}
            <div className="col-span-12 md:col-span-4">
                 <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm sticky top-24">
                    <h3 className="text-xs font-bold text-slate-900 uppercase mb-4">Capital Allocation</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(val) => formatCurrency(val)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <AssetTypeSelector isOpen={isTypeSelectorOpen} onClose={() => setIsTypeSelectorOpen(false)} onSelect={handleTypeSelect} />
            
            {/* ASSET FORM (WIRED TO REQUEST HANDLERS) */}
            <AssetForm 
                isOpen={isAssetFormOpen} 
                onClose={() => { setIsAssetFormOpen(false); setEditingAsset(null); }} 
                onAdd={handleRequestNewAsset} // <--- INTERCEPT
                onAddRound={handleRequestAddRound} // <--- INTERCEPT
                onVoidRound={handleVoidRound} // <--- KEEP DIRECT
                initialData={editingAsset} 
                selectedType={selectedType} 
                mode="MODAL" 
            />

            {/* INVOICE FORM (FOR SELLING) */}
            {isInvoiceOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-4xl rounded-xl overflow-hidden h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-emerald-900 text-white">
                            <h3 className="text-sm font-bold uppercase">Liquidate Asset: {invoiceRequestData?.display_name}</h3>
                            <button onClick={() => setIsInvoiceOpen(false)}><i className="fa-solid fa-times"></i></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <InvoiceForm 
                                onCreate={() => { setIsInvoiceOpen(false); alert("Sale Invoice Raised!"); }}
                                initialData={invoiceRequestData}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioManager;