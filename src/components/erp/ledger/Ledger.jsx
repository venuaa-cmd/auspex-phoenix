import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { UI } from '../../../lib/uiTheme';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import LedgerExecutionModal from './LedgerExecutionModal';

ChartJS.register(ArcElement, Tooltip, Legend);

const Ledger = () => {
    // --- 1. STATE MANAGEMENT ---
    const [history, setHistory] = useState([]);
    const [pendingQueue, setPendingQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // UI CONTROLS
    const [viewMode, setViewMode] = useState('DEBIT'); // DEBIT (Payables) | CREDIT (Receivables)
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isExecutionOpen, setIsExecutionOpen] = useState(false);
    const [isReadOnlyMode, setIsReadOnlyMode] = useState(false); 
    
    const [isGraphOpen, setIsGraphOpen] = useState(true); // Accordion
    
    // FILTERS & SORTING
    const [filterType, setFilterType] = useState('ALL'); 
    const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'desc' });

    // --- 2. DATA SYNCHRONIZATION ---
    const refreshData = async () => {
        setLoading(true);
        // A. HISTORY (Physical Ledger Table)
        const { data: ledgerData } = await supabase.from('erp_ledger').select('*').order('transaction_date', { ascending: false });
        if (ledgerData) setHistory(ledgerData);

        // B. PENDING (Internal Accruals & Invoices)
        const targetType = viewMode === 'DEBIT' ? 'PAYABLE' : 'RECEIVABLE';
        const { data: invoiceData } = await supabase
            .from('erp_invoices')
            .select(`
                *, 
                erp_entities!entity_id (name), 
                erp_portfolio_assets!asset_id (asset_name, asset_type), 
                erp_employees!employee_id (full_name)
            `)
            .in('status', ['PENDING', 'PARTIAL']) 
            .eq('type', targetType)
            .order('due_date', { ascending: true });

        if (invoiceData) setPendingQueue(invoiceData);
        setLoading(false);
    };

    useEffect(() => { refreshData(); }, [viewMode]);

    // --- 3. FORENSIC PROCESSING (Sorting & Filtering) ---
    const processedHistory = useMemo(() => {
        let data = [...history];

        // Filter by Mode
        data = data.filter(t => t.type === viewMode);

        // Filter by Category
        if (filterType !== 'ALL') {
            data = data.filter(t => (t.category || 'Uncategorized') === filterType);
        }

        // Institutional Sorting Engine
        if (sortConfig.key) {
            data.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'vendor') {
                    aVal = a.metadata?.vendor_name || a.vendor;
                    bVal = b.metadata?.vendor_name || b.vendor;
                }
                if (sortConfig.key === 'amount') {
                    aVal = Number(aVal);
                    bVal = Number(bVal);
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [history, viewMode, sortConfig, filterType]);

    // Extract unique categories for filter dropdown
    const availableCategories = useMemo(() => {
        const cats = new Set(history.filter(t => t.type === viewMode).map(t => t.category || 'Uncategorized'));
        return Array.from(cats).sort();
    }, [history, viewMode]);

    // --- 4. CAPITAL ANALYTICS ---
    const metrics = useMemo(() => {
        const totalPaid = history
            .filter(t => t.type === viewMode && t.status === 'REALIZED')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalPending = pendingQueue.reduce((sum, inv) => sum + Number(inv.amount_total), 0);

        const catMap = {};
        pendingQueue.forEach(inv => {
            const cat = inv.category || 'Uncategorized';
            catMap[cat] = (catMap[cat] || 0) + Number(inv.amount_total);
        });

        return {
            totalPaid,
            totalPending,
            totalVolume: totalPaid + totalPending,
            labels: Object.keys(catMap),
            data: Object.values(catMap),
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']
        };
    }, [history, pendingQueue, viewMode]);

    const chartData = {
        labels: metrics.labels,
        datasets: [{
            data: metrics.data,
            backgroundColor: metrics.colors,
            borderWidth: 0,
            cutout: '85%', 
        }]
    };

    // --- 5. AUDIT HANDLERS ---
    
    // A. AUTHORIZE PAYMENT
    const handleSelectForExecution = (item) => {
        setSelectedRequest(item);
        setIsReadOnlyMode(false);
        setIsExecutionOpen(true);
    };

    // B. VIEW SETTLEMENT RECEIPT (READ ONLY)
    const handleViewTransaction = (txn) => {
        const viewData = {
            id: txn.linked_invoice_id,
            amount_total: txn.amount, 
            category: txn.category,
            transaction_date: txn.transaction_date,
            description: txn.description,
            amount: txn.amount, 
            metadata: txn.metadata,
            ...txn 
        };
        
        setSelectedRequest(viewData);
        setIsReadOnlyMode(true);
        setIsExecutionOpen(true);
    };

    const handleExecutionComplete = () => { 
        setIsExecutionOpen(false); 
        setSelectedRequest(null); 
        refreshData(); 
    };
    
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    // --- 6. FORMATTERS ---
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        maximumFractionDigits: 0 
    }).format(val);
    
    const formatCompact = (val) => {
        const num = Math.abs(Number(val));
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) return <i className="fa-solid fa-sort text-slate-300 ml-1 text-[10px]"></i>;
        return sortConfig.direction === 'asc' 
            ? <i className="fa-solid fa-sort-up text-slate-600 ml-1 text-[10px]"></i> 
            : <i className="fa-solid fa-sort-down text-slate-600 ml-1 text-[10px]"></i>;
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F1F5F9] font-sans text-slate-900 antialiased">
            
            {/* I. CONTROL TOWER HEADER */}
            <div className="bg-white border-b border-slate-200 px-10 py-6 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Financial Control Tower</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-1">Institutional Audit Hub</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-sm">
                    <button onClick={() => setViewMode('DEBIT')} className={`px-8 py-2.5 text-[10px] font-black uppercase rounded-sm transition-all flex items-center gap-2 ${viewMode === 'DEBIT' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                        <i className="fa-solid fa-arrow-up"></i> Outflow (DR)
                    </button>
                    <button onClick={() => setViewMode('CREDIT')} className={`px-8 py-2.5 text-[10px] font-black uppercase rounded-sm transition-all flex items-center gap-2 ${viewMode === 'CREDIT' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                        <i className="fa-solid fa-arrow-down"></i> Inflow (CR)
                    </button>
                </div>
            </div>

            {/* II. FINANCIAL SNAPSHOT (Sticky Accordion) */}
            <div className="px-10 pt-8 pb-4">
                <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden transition-all duration-300">
                    <div 
                        onClick={() => setIsGraphOpen(!isGraphOpen)} 
                        className="p-5 flex justify-between items-center cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
                    >
                        <div className="flex items-center gap-3">
                            <i className="fa-solid fa-chart-pie text-slate-400 text-lg"></i>
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Global Portfolio Liquidity Snapshot</span>
                        </div>
                        <i className={`fa-solid fa-chevron-down text-slate-400 transition-transform duration-300 ${isGraphOpen ? 'rotate-180' : ''}`}></i>
                    </div>

                    {isGraphOpen && (
                        <div className="p-10 flex flex-col lg:flex-row items-center gap-16 animate-in slide-in-from-top-4 duration-300">
                            {/* Donut Analysis */}
                            <div className="relative w-56 h-56 shrink-0">
                                {metrics.totalPending > 0 ? (
                                    <Doughnut data={chartData} options={{ plugins: { legend: { display: false }, tooltip: { enabled: true } } }} />
                                ) : (
                                    <div className="w-full h-full rounded-full border-8 border-slate-50 flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest">No Dues Detected</div>
                                )}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pending</span>
                                    <span className={`text-2xl font-black tabular-nums tracking-tighter ${viewMode === 'DEBIT' ? 'text-slate-900' : 'text-emerald-600'}`}>
                                        {formatCompact(metrics.totalPending)}
                                    </span>
                                </div>
                            </div>

                            {/* Logic Breakdown */}
                            <div className="flex-1">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Category Concentration</h4>
                                <div className="flex flex-wrap gap-4">
                                    {metrics.labels.map((label, idx) => (
                                        <div key={label} className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-sm">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: metrics.colors[idx % metrics.colors.length] }}></div>
                                            <div>
                                                <div className="text-[9px] font-black text-slate-500 uppercase leading-none mb-1">{label}</div>
                                                <div className="text-sm font-black text-slate-900 tabular-nums leading-none">{formatCompact(metrics.data[idx])}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {metrics.labels.length === 0 && <div className="text-xs text-slate-400 italic">Financial queue is currently clear.</div>}
                                </div>
                            </div>

                            {/* Performance Metrics */}
                            <div className="w-full lg:w-72 border-l border-slate-100 pl-10 flex flex-col gap-8">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Total {viewMode === 'DEBIT' ? 'Authorized' : 'Received'}</div>
                                    <div className="text-2xl font-black text-emerald-600 tabular-nums tracking-tighter">{formatCompact(metrics.totalPaid)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Accrued Liabilities</div>
                                    <div className="text-2xl font-black text-amber-500 tabular-nums tracking-tighter">{formatCompact(metrics.totalPending)}</div>
                                </div>
                                <div className="border-t border-slate-900 pt-6 mt-2">
                                    <div className="text-[11px] font-black text-slate-900 uppercase mb-2 tracking-widest">Global Gross Volume</div>
                                    <div className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter">{formatCompact(metrics.totalVolume)}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* III. MAIN WORKSPACE (EXPANDED FORENSIC VIEW) */}
            {/* Fixed the tiny scroll by removing fixed 'h-' classes and enabling long-view container */}
            <div className="px-10 pb-20 max-w-[1800px] mx-auto w-full flex flex-col lg:flex-row gap-10 mt-6 min-h-[800px]">
                
                {/* LEFT: PENDING (Action Items Queue) */}
                <div className="w-full lg:w-[400px] shrink-0">
                    <div className="sticky top-[140px] space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Action_Queue</h3>
                            <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-sm shadow-lg">
                                {pendingQueue.length} PENDING
                            </span>
                        </div>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-3">
                            {pendingQueue.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-sm bg-white/50">
                                    <i className="fa-solid fa-shield-check text-4xl mb-4 opacity-20"></i>
                                    <span className="text-[10px] font-black uppercase tracking-widest">No Authorized Dues</span>
                                </div>
                            ) : (
                                pendingQueue.map(item => {
                                    const isAsset = !!item.asset_id;
                                    const name = item.erp_portfolio_assets?.asset_name || item.erp_entities?.name || item.erp_employees?.full_name || 'Internal Node';
                                    const typeLabel = item.erp_portfolio_assets?.asset_type?.replace(/_/g, ' ') || (item.employee_id ? 'Payroll' : 'Vendor');

                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => handleSelectForExecution(item)} 
                                            className={`group p-6 rounded-sm border cursor-pointer transition-all hover:shadow-xl hover:border-indigo-500 relative overflow-hidden bg-white shadow-sm`}
                                        >
                                            <div className="absolute top-0 right-0 p-3">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest border ${item.status === 'PARTIAL' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <div className="mb-6">
                                                <div className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{typeLabel}</div>
                                                <div className="text-[15px] font-black text-slate-900 uppercase tracking-tighter leading-tight truncate">{name}</div>
                                            </div>
                                            <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                                                <div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Due Date</div>
                                                    <div className="text-[10px] font-bold text-slate-900"><i className="fa-regular fa-clock mr-1.5"></i> {item.due_date || 'IMMEDIATE'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-black text-slate-900 tabular-nums">{formatCurrency(item.amount_total)}</div>
                                                    <button className="text-[9px] font-black text-indigo-600 uppercase border-b-2 border-indigo-50 group-hover:border-indigo-600 transition-all mt-1">Settle Node</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: TRANSACTION LOG (LONG-VIEW FORENSIC TABLE) */}
                <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <i className="fa-solid fa-list-ul text-slate-400"></i>
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Institutional Transaction Registry</h3>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Filter:</span>
                            <select 
                                className="text-[10px] font-black bg-white border border-slate-200 rounded-sm px-4 py-2 outline-none text-slate-800 focus:border-indigo-500 shadow-sm"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="ALL">ALL CATEGORIES</option>
                                {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    {/* TABLE REGISTRY - Enabled natural vertical expansion */}
                    <div className="w-full overflow-x-auto overflow-y-visible">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-[10] shadow-sm">
                                <tr className="border-b border-slate-200">
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('transaction_date')}>Date {getSortIcon('transaction_date')}</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('vendor')}>Entity {getSortIcon('vendor')}</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('sub_category')}>Classification {getSortIcon('sub_category')}</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('amount')}>Settled Value {getSortIcon('amount')}</th>
                                    <th className="p-6 text-center w-24 text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {processedHistory.map(txn => {
                                    const name = txn.metadata?.vendor_name || txn.vendor || 'UNSPECIFIED';
                                    const sub = txn.metadata?.sub_category || txn.category || 'GENERAL';
                                    
                                    return (
                                        <tr key={txn.id} onClick={() => handleViewTransaction(txn)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                                            <td className="p-6 font-black text-[12px] text-slate-500 tabular-nums uppercase whitespace-nowrap">{txn.transaction_date}</td>
                                            <td className="p-6">
                                                <div className="text-[14px] font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-wide">{txn.description.slice(0, 50)}...</div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-sm text-[8px] font-black uppercase border transition-all ${
                                                    sub === 'Asset Acquisition' 
                                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}>
                                                    {sub}
                                                </span>
                                            </td>
                                            <td className={`p-6 text-right font-black text-[16px] tabular-nums ${viewMode === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {viewMode === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount).replace('₹', '')}
                                            </td>
                                            <td className="p-6 text-center">
                                                <i className="fa-solid fa-circle-check text-emerald-400 text-lg opacity-40 group-hover:opacity-100 transition-opacity"></i>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {processedHistory.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-40 text-center flex-col items-center">
                                            <i className="fa-solid fa-box-archive text-5xl text-slate-100 mb-6"></i>
                                            <div className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Registry_Empty</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Registry Footer Monitoring */}
                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center opacity-40">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">All Transactions Reconciled via Auspex Genesis Node</span>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">System Synchronized</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL LAYER */}
            {isExecutionOpen && selectedRequest && (
                <LedgerExecutionModal 
                    isOpen={isExecutionOpen} 
                    onClose={() => setIsExecutionOpen(false)} 
                    onConfirm={handleExecutionComplete} 
                    request={selectedRequest} 
                    mode={viewMode} 
                    readOnly={isReadOnlyMode} 
                />
            )}
        </div>
    );
};

export default Ledger;