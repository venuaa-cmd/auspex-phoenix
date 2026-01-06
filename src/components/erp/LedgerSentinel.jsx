import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';

const LedgerSentinel = ({ onAlertCountChange }) => {
    const [invoices, setInvoices] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPending = async () => {
            const { data } = await supabase
                .from('erp_invoices')
                .select('*')
                .not('status', 'in', '("PAID","CANCELLED")') 
                .order('due_date', { ascending: true });
            
            if (data) setInvoices(data);
            setLoading(false);
        };

        fetchPending();
        
        const subscription = supabase
            .channel('sentinel_triggers')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_invoices' }, fetchPending)
            .subscribe();

        return () => subscription.unsubscribe();
    }, []);

    const alerts = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const threeDaysOut = new Date();
        threeDaysOut.setDate(today.getDate() + 3);
        const triggers = [];

        invoices.forEach(inv => {
            const dueDate = new Date(inv.due_date || new Date());
            dueDate.setHours(0,0,0,0);
            const isReceivable = inv.type === 'RECEIVABLE';
            const entityName = inv.metadata?.vendor_name || inv.metadata?.customer_name || 'Unknown Entity';
            
            if (dueDate < today) {
                const diffTime = Math.abs(today - dueDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                triggers.push({
                    id: inv.id, severity: 'CRITICAL',
                    type: isReceivable ? 'COLLECTION_RISK' : 'DEFAULT_RISK',
                    message: `${isReceivable ? 'Payment Missing' : 'Overdue'} - ${entityName}`,
                    detail: `${diffDays} days overdue`, amount: inv.amount_total, action: isReceivable ? 'Remind' : 'Pay'
                });
            } else if (dueDate <= threeDaysOut) {
                const diffTime = Math.abs(dueDate - today);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                triggers.push({
                    id: inv.id, severity: 'WARNING',
                    type: 'UPCOMING',
                    message: `${isReceivable ? 'Inflow' : 'Due'} - ${entityName}`,
                    detail: `Due in ${diffDays} days`, amount: inv.amount_total, action: 'View'
                });
            }
        });
        return triggers;
    }, [invoices]);

    useEffect(() => {
        if (onAlertCountChange) onAlertCountChange(alerts.length);
    }, [alerts.length, onAlertCountChange]);

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    if (loading) return null;

    return (
        <div className="relative z-50">
            <button onClick={() => setIsOpen(!isOpen)} className={`relative p-2 rounded-lg transition-all ${isOpen ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
                <i className={`fa-solid fa-bell text-lg ${alerts.some(a => a.severity === 'CRITICAL') ? 'animate-swing' : ''}`}></i>
                {alerts.length > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-[9px] font-bold text-white rounded-full flex items-center justify-center shadow-lg border border-[#0f172a]">{alerts.length}</span>}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 top-12 w-80 bg-[#0f172a] border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50 animate-slideDown">
                        <div className="p-3 border-b border-white/10 bg-black/20 flex justify-between items-center"><h3 className="font-bold text-white uppercase text-[10px] tracking-wider">Sentinel Alerts</h3><span className="text-[9px] text-slate-500">{alerts.length} Active</span></div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {alerts.length === 0 ? <div className="p-6 text-center text-slate-500 text-xs">System Nominal.</div> : (
                                <div className="divide-y divide-white/5">
                                    {alerts.map(alert => (
                                        <div key={alert.id} className={`p-3 hover:bg-white/5 border-l-2 ${alert.severity === 'CRITICAL' ? 'border-red-500' : 'border-amber-500'}`}>
                                            <div className="flex justify-between"><span className={`text-[9px] font-bold uppercase ${alert.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>{alert.type}</span><span className="text-[10px] font-mono font-bold text-white">{formatCurrency(alert.amount)}</span></div>
                                            <div className="text-xs text-slate-200 font-bold mt-1">{alert.message}</div>
                                            <div className="text-[9px] text-slate-500 mt-1">{alert.detail}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default LedgerSentinel;