import React from 'react';
import { Line } from 'react-chartjs-2';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    Title, 
    Tooltip, 
    Legend, 
    Filler 
} from 'chart.js';
import { formatCurrency } from './IntelUtils';

// Register ChartJS locally to this component
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/**
 * AUSPEX INTEL CORE - PERFORMANCE ANALYTICS
 * Visualizes capital deployment vs. equity appreciation.
 */
const PerformanceAnalytics = ({ investments = [] }) => {
    return (
        <div className="space-y-8 animate-[fadeIn_0.3s_ease]">
            {/* --- CAPITAL APPRECIATION CURVE (CHART) --- */}
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-[120px] pointer-events-none"></div>
                <h3 className="text-3xl font-bold text-white tracking-tighter uppercase mb-12 underline decoration-green-500/30 decoration-8 underline-offset-[16px]">
                    Capital appreciation curve
                </h3>
                <div className="h-[450px] w-full relative z-10">
                    <Line 
                        data={{ 
                            labels: investments.map(i => i.fundingRound || i.round_name || 'Seed'), 
                            datasets: [
                                { 
                                    label: 'Equity Stake Value (INR)', 
                                    data: investments.map(i => {
                                        const val = Number(i.currentValuation || i.currentValue) || 0;
                                        const pct = Number(i.equityPct || i.equity_pct) || 0;
                                        return val > 0 ? (val * (pct/100)) : (Number(i.amount_invested || i.fundingAmount) || 0);
                                    }), 
                                    borderColor: '#10b981', 
                                    backgroundColor: (context) => {
                                        const ctx = context.chart.ctx;
                                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)'); 
                                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)'); 
                                        return gradient;
                                    },
                                    borderWidth: 4, pointBackgroundColor: '#0f172a', pointBorderColor: '#10b981', pointBorderWidth: 3, pointRadius: 8, pointHoverRadius: 10, fill: true, tension: 0.4 
                                },
                                { 
                                    label: 'Capital Deployed', 
                                    data: investments.map(i => Number(i.amount_invested || i.fundingAmount) || 0), 
                                    borderColor: '#3b82f6', borderDash: [8, 8], backgroundColor: 'transparent', borderWidth: 2, pointRadius: 5, tension: 0.4
                                }
                            ] 
                        }} 
                        options={{ 
                            responsive: true, 
                            maintainAspectRatio: false, 
                            plugins: { 
                                legend: { 
                                    display: true, position: 'top', align: 'end', 
                                    labels: { color: '#64748b', font: { family: 'Manrope', size: 10, weight: 'bold' }, usePointStyle: true, boxWidth: 6 } 
                                }, 
                                tooltip: { backgroundColor: '#0f172a', padding: 15, titleFont: { size: 14, weight: 'bold' }, bodyFont: { size: 12, family: 'Manrope' }, displayColors: false } 
                            }, 
                            scales: { 
                                x: { grid: { display: false }, ticks: { color: '#64748b', font: { weight: 'bold' } } }, 
                                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', callback: (val) => `₹${val/10000000}Cr` }, beginAtZero: true } 
                            } 
                        }} 
                    />
                </div>
            </div>

            {/* --- ROUND PERFORMANCE MATRIX --- */}
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <h3 className="text-white font-bold text-[10px] uppercase tracking-[0.4em]">Round Performance Matrix</h3>
                </div>
                <div className="divide-y divide-white/5">
                    {investments.map((inv, idx) => {
                        const invested = Number(inv.amount || inv.amount_invested || inv.fundingAmount) || 0;
                        const eq = Number(inv.equityPct || inv.equity_pct) || 0;
                        const current = Number(inv.currentValuation || inv.currentValue) ? (Number(inv.currentValuation || inv.currentValue) * (eq/100)) : invested;
                        const moic = invested > 0 ? (current / invested).toFixed(2) : '1.00';
                        return (
                            <div key={inv.id || idx} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-6 w-1/4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center font-bold text-slate-400 text-sm border border-white/10 shadow-inner uppercase">
                                        {inv.fundingRound ? inv.fundingRound.substring(0,3).toUpperCase() : (inv.round_name ? inv.round_name.substring(0,3).toUpperCase() : 'RND')}
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-lg uppercase tracking-tighter">{inv.fundingRound || inv.round_name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono font-bold mt-1 uppercase tracking-widest">{new Date(inv.investmentDate || inv.investment_date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-3 gap-8">
                                    <div><div className="text-[9px] text-slate-500 uppercase font-bold mb-1 opacity-60">Deployed Basis</div><div className="text-slate-300 font-mono text-sm font-bold tracking-tighter">{formatCurrency(invested)}</div></div>
                                    <div><div className="text-[9px] text-slate-500 uppercase font-bold mb-1 opacity-60">Equity Stake Value</div><div className="text-white font-mono text-sm font-bold tracking-tighter">{formatCurrency(current)}</div></div>
                                    <div><div className="text-[9px] text-slate-500 uppercase font-bold mb-1 opacity-60">Exit Multiple</div><div className="text-[var(--brand-color)] font-mono text-sm font-bold tracking-tighter">{moic}x</div></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PerformanceAnalytics;