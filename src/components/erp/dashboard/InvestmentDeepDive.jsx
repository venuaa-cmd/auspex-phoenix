import React from 'react';

const InvestmentDeepDive = ({ assets, searchTerm }) => {
    const filteredAssets = assets.filter(a => a.asset_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="bg-white p-10 rounded-sm border border-slate-200 shadow-sm animate-in fade-in duration-500">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Portfolio Performance Matrix</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px] border-collapse">
                    <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase border-b-2 border-slate-900">
                            <th className="pb-4 pl-4">Asset Node</th>
                            <th className="pb-4">Quantity</th>
                            <th className="pb-4 text-right">Invested Capital</th>
                            <th className="pb-4 text-right">Current FMV</th>
                            <th className="pb-4 text-right">Live Unit Price</th>
                            <th className="pb-4 text-right">Gain / Loss</th>
                            <th className="pb-4 text-right pr-4">MOIC</th>
                        </tr>
                    </thead>
                    <tbody className="text-[13px] font-bold">
                        {filteredAssets.map(a => { 
                            const invested = Number(a.invested_amount) || 0; 
                            const currentFMV = Number(a.current_valuation) || 0; 
                            const qty = Number(a.quantity) || 1; // ALIGNED TO SCHEMA
                            const unitPrice = currentFMV / qty; // UNIT PRICE DERIVATION
                            const gain = currentFMV - invested; 
                            const moic = invested > 0 ? (currentFMV / invested).toFixed(2) : '0.00'; 
                            
                            return (
                                <tr key={a.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-all">
                                    <td className="py-5 pl-4"><div className="font-black text-slate-900 uppercase">{a.asset_name}</div><div className="text-[9px] text-slate-400 font-black uppercase mt-1">{a.asset_type}</div></td>
                                    <td className="py-5 font-mono text-slate-900">{qty}</td>
                                    <td className="py-5 text-right font-mono text-slate-500 tabular-nums">{formatCurrency(invested)}</td>
                                    <td className="py-5 text-right font-mono text-slate-900 tabular-nums font-black">{formatCurrency(currentFMV)}</td>
                                    <td className="py-5 text-right font-mono text-indigo-600 font-black">{formatCurrency(unitPrice)}</td>
                                    <td className={`py-5 text-right font-black tabular-nums ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{gain > 0 ? '+' : ''}{formatCurrency(gain)}</td>
                                    <td className="py-5 text-right pr-4">
                                        <span className={`px-3 py-1 rounded-sm text-[10px] font-black ${Number(moic) >= 1 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-rose-600 text-white shadow-lg'}`}>
                                            {moic}X
                                        </span>
                                    </td>
                                </tr>
                            ); 
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InvestmentDeepDive; // FIXED: ENSURED DEFAULT EXPORT