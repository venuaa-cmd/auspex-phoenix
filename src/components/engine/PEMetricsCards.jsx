import React, { useMemo } from 'react';

// Helper: Format Currency
const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
};

const calculatePE_Metrics = (inv) => {
    const PIC = Number(inv.fundingAmount) || 0; 
    let RV = 0; 
    let DC = 0; 

    if (inv.status === 'Exited') {
        DC = Number(inv.exitValue) || 0;
    } else {
        if (inv.currentValuation > 0 && inv.equityPct > 0) {
            RV = inv.currentValuation * (inv.equityPct / 100);
        } else {
            RV = PIC; 
        }
    }
    
    if (PIC <= 0) return { DPI: 0, RVPI: 0, TVPI: 0 };
    
    const DPI = (DC / PIC).toFixed(2);
    const RVPI = (RV / PIC).toFixed(2);
    const TVPI = ((DC + RV) / PIC).toFixed(2);
    
    return { DPI, RVPI, TVPI };
};

const PEMetricsCards = ({ investments }) => {
    const totalStats = useMemo(() => {
        let totalPIC = 0;
        let totalValue = 0;

        investments.forEach(inv => {
            const PIC = Number(inv.fundingAmount) || 0;
            totalPIC += PIC;
            
            if (inv.status === 'Exited') {
                totalValue += Number(inv.exitValue) || 0;
            } else if (inv.currentValuation > 0 && inv.equityPct > 0) {
                totalValue += (inv.currentValuation * (inv.equityPct / 100));
            } else {
                totalValue += PIC;
            }
        });

        const globalMOIC = totalPIC > 0 ? (totalValue / totalPIC).toFixed(2) + 'x' : 'N/A';
        return { totalPIC, totalValue, globalMOIC };
    }, [investments]);

    return (
        <div className="space-y-6 animate-[fadeIn_0.4s_ease]">
            {/* High Level Summary - FIXED: Flex-col to prevent overlap, Truncate for long numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                <div className="bg-[var(--brand-color)]/10 border border-[var(--brand-color)] p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden group h-32">
                    <div className="absolute -right-4 -bottom-4 opacity-10 text-[var(--brand-color)] text-8xl font-black group-hover:scale-110 transition-transform">₹</div>
                    <h4 className="text-[var(--brand-color)] text-xs font-bold uppercase tracking-widest mb-2">Total Deployed</h4>
                    <p className="text-3xl font-black text-white truncate" title={formatCurrency(totalStats.totalPIC)}>{formatCurrency(totalStats.totalPIC)}</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden group h-32">
                    <div className="absolute -right-4 -bottom-4 opacity-10 text-purple-500 text-8xl font-black group-hover:scale-110 transition-transform">TV</div>
                    <h4 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-2">Current Value (TV)</h4>
                    <p className="text-3xl font-black text-white truncate" title={formatCurrency(totalStats.totalValue)}>{formatCurrency(totalStats.totalValue)}</p>
                </div>
                <div className="bg-green-500/10 border border-green-500 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden group h-32">
                    <div className="absolute -right-4 -bottom-4 opacity-10 text-green-500 text-8xl font-black group-hover:scale-110 transition-transform">%</div>
                    <h4 className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">Portfolio MOIC</h4>
                    <p className="text-3xl font-black text-white">{totalStats.globalMOIC}</p>
                </div>
            </div>

            {/* Individual Deal Cards - FIXED: Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {investments.map(inv => {
                    const metrics = calculatePE_Metrics(inv);
                    return (
                        <div key={inv.id} className="bg-[#0f172a] border border-white/10 rounded-xl p-5 hover:border-[var(--brand-color)]/50 transition-all flex flex-col gap-4 shadow-lg relative group">
                            
                            {/* Header: Name & Status */}
                            <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1 pr-2">
                                    <h3 className="font-bold text-white text-lg leading-tight truncate" title={inv.companyName}>{inv.companyName}</h3>
                                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide ${
                                        inv.status === 'Active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                                        inv.status === 'Exited' ? 'bg-slate-700 text-slate-300 border border-slate-600' : 
                                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    }`}>
                                        {inv.status}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Invested</div>
                                    <div className="font-mono text-sm text-white font-bold bg-white/5 px-2 py-1 rounded border border-white/5 whitespace-nowrap">
                                        {formatCurrency(inv.fundingAmount)}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Metrics Grid */}
                            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
                                <div className="flex flex-col items-center p-2 rounded bg-white/5 border border-white/5">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">TVPI</div>
                                    <div className="text-base font-bold text-[var(--brand-color)]">{metrics.TVPI}x</div>
                                </div>
                                <div className="flex flex-col items-center p-2 rounded bg-white/5 border border-white/5">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">DPI</div>
                                    <div className="text-base font-bold text-white">{metrics.DPI}x</div>
                                </div>
                                <div className="flex flex-col items-center p-2 rounded bg-white/5 border border-white/5">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">RVPI</div>
                                    <div className="text-base font-bold text-slate-300">{metrics.RVPI}x</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PEMetricsCards;