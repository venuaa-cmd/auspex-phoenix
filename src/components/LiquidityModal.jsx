import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const LiquidityModal = ({ investment, onClose, onSuccess }) => {
    const [step, setStep] = useState('input'); // 'input' or 'receipt'
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [eventType, setEventType] = useState('Secondary_Sale');
    const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
    const [quantitySold, setQuantitySold] = useState(investment.remaining_quantity || investment.quantity || 0);
    const [pricePerShare, setPricePerShare] = useState(0);
    const [totalPayout, setTotalPayout] = useState(0);
    const [notes, setNotes] = useState('');

    // --- AUTOMATIC CALCULATIONS ---
    useEffect(() => {
        const total = quantitySold * pricePerShare;
        setTotalPayout(total);
    }, [quantitySold, pricePerShare]);

    // --- RECEIPT DATA (Calculated on submit) ---
    const [receipt, setReceipt] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const currentQty = Number(investment.remaining_quantity || investment.quantity || 0);
            
            // 1. VALIDATION
            if (Number(quantitySold) > currentQty) {
                alert(`Error: You only hold ${currentQty} units. You cannot sell ${quantitySold}.`);
                setIsSubmitting(false);
                return;
            }

            // 2. LOG THE EXIT (Insert into liquidity_events)
            const { error: eventError } = await supabase
                .from('liquidity_events')
                .insert([{
                    investment_id: investment.id,
                    event_date: exitDate,
                    event_type: eventType,
                    quantity_liquidated: quantitySold,
                    price_per_share: pricePerShare,
                    total_payout_amount: totalPayout,
                    notes: notes
                }]);

            if (eventError) throw eventError;

            // 3. UPDATE THE ASSET (Update investments table)
            const newRemaining = currentQty - Number(quantitySold);
            let newStatus = investment.status;
            if (newRemaining <= 0) newStatus = 'Fully_Exited';
            else newStatus = 'Partially_Exited';

            const { error: updateError } = await supabase
                .from('investments')
                .update({ 
                    remaining_quantity: newRemaining,
                    status: newStatus
                })
                .eq('id', investment.id);

            if (updateError) throw updateError;

            // 4. GENERATE RECEIPT & SWITCH VIEW
            const costBasisPerShare = (investment.amount || investment.amount_invested) / (investment.initial_quantity || investment.quantity || 1); // Avoid div by zero
            const costBasisSold = costBasisPerShare * quantitySold;
            const realizedGain = totalPayout - costBasisSold;
            const returnMultiple = costBasisSold > 0 ? (totalPayout / costBasisSold).toFixed(2) : '∞';

            setReceipt({
                grossProceeds: totalPayout,
                costBasis: costBasisSold,
                realizedGain: realizedGain,
                multiple: returnMultiple,
                newRemaining: newRemaining
            });

            setStep('receipt'); // <--- SWITCH TO RECEIPT MODE

        } catch (error) {
            console.error('Exit Failed:', error);
            alert('Apex Error: Transaction Failed. Check console.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseFinal = () => {
        if (onSuccess) onSuccess("Transaction Logged Successfully."); // Trigger parent refresh
        onClose();
    };

    // --- RENDER: RECEIPT MODE ---
    if (step === 'receipt' && receipt) {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]">
                <div className="bg-[#0f172a] w-full max-w-lg border border-green-500/50 rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.2)] overflow-hidden">
                    <div className="p-6 bg-green-900/20 border-b border-green-500/30 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-black"><i className="fa-solid fa-check text-xl"></i></div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Trade Executed</h2>
                            <div className="text-xs text-green-400 font-mono uppercase tracking-widest">Liquidity Event Confirmed</div>
                        </div>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div><div className="text-[10px] text-slate-500 uppercase font-bold">Gross Proceeds</div><div className="text-2xl font-black text-white">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(receipt.grossProceeds)}</div></div>
                            <div className="text-right"><div className="text-[10px] text-slate-500 uppercase font-bold">Realized P&L</div><div className={`text-2xl font-black ${receipt.realizedGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>{receipt.realizedGain >= 0 ? '+' : ''}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(receipt.realizedGain)}</div></div>
                        </div>
                        
                        <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-slate-400">Exit Multiple</span><span className="text-white font-bold">{receipt.multiple}x</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-400">Cost Basis (Sold Portion)</span><span className="text-slate-300 font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(receipt.costBasis)}</span></div>
                            <div className="flex justify-between text-sm border-t border-white/10 pt-2"><span className="text-slate-400">Remaining Shares</span><span className="text-[var(--brand-color)] font-bold">{receipt.newRemaining}</span></div>
                        </div>

                        <button onClick={handleCloseFinal} className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all">Close & Refresh Portfolio</button>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: INPUT MODE (Existing Form) ---
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]">
            <div className="bg-[#0a0f1e] w-full max-w-2xl border border-[var(--brand-color)] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-black/40 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Execute Liquidity Event</h2>
                        <div className="text-xs text-[var(--brand-color)] uppercase tracking-wider mt-1">{investment.round_name || investment.fundingRound} • {investment.asset_class || investment.assetClass}</div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Event Type</label><select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none"><option value="Secondary_Sale">Secondary Sale (Partial)</option><option value="Acquisition">Acquisition (M&A)</option><option value="IPO">IPO Sale</option><option value="Buyback">Company Buyback</option><option value="Write_Off">Write Off (Loss)</option></select></div>
                        <div className="space-y-2"><label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Date</label><input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none" /></div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Units Sold</label>
                            <input type="number" value={quantitySold} onChange={(e) => setQuantitySold(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-white font-mono focus:border-[var(--brand-color)] focus:outline-none" />
                            <div className="text-[10px] text-slate-500 text-right">Max: {investment.remaining_quantity || investment.quantity}</div>
                        </div>
                        <div className="space-y-2"><label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Price / Share</label><input type="number" value={pricePerShare} onChange={(e) => setPricePerShare(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-white font-mono focus:border-[var(--brand-color)] focus:outline-none" placeholder="₹" /></div>
                        <div className="space-y-2"><label className="text-xs text-[var(--brand-color)] font-bold uppercase tracking-widest">Total Payout</label><div className="w-full bg-[var(--brand-color)]/10 border border-[var(--brand-color)]/30 rounded-lg p-3 text-[var(--brand-color)] font-mono font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPayout)}</div></div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-lg text-sm font-bold text-slate-400 hover:text-white transition-all">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-[var(--brand-color)] text-black font-bold rounded-lg shadow-[0_0_20px_var(--brand-glow)] hover:brightness-110 transition-all disabled:opacity-50">{isSubmitting ? 'Processing...' : 'CONFIRM EXIT'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LiquidityModal;