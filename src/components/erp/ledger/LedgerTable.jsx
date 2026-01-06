import React from 'react';

const LedgerTable = ({ data, loading, onDelete }) => {
    
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Financial Ledger</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{data.length} Records</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500 bg-white">
                            <th className="p-3 font-bold w-24">Date</th>
                            <th className="p-3 font-bold">Description</th>
                            <th className="p-3 font-bold">Category</th>
                            <th className="p-3 font-bold w-20 text-center">Type</th>
                            <th className="p-3 font-bold text-right">Amount</th>
                            <th className="p-3 font-bold w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                        {loading ? <tr><td colSpan="6" className="p-4 text-center italic text-slate-400">Syncing Ledger...</td></tr> : data.map(txn => (
                            <tr key={txn.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-3 font-mono text-slate-500">{txn.transaction_date}</td>
                                <td className="p-3 font-medium">{txn.description}</td>
                                <td className="p-3">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase border border-slate-200">
                                        {txn.category}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${txn.transaction_type === 'CREDIT' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                        {txn.transaction_type === 'CREDIT' ? 'CR' : 'DR'}
                                    </span>
                                </td>
                                <td className={`p-3 text-right font-mono font-bold ${txn.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                    {txn.transaction_type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                                </td>
                                <td className="p-3 text-right">
                                    <button 
                                        onClick={() => onDelete(txn.id)}
                                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Transaction"
                                    >
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && !loading && (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-400">No transactions found. Start recording.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LedgerTable;