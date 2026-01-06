import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { UI } from '../../../lib/uiTheme';

const Calendar = () => {
    const [events, setEvents] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            
            // --- 1. FUTURE DUES (Invoices) ---
            const { data: invoices } = await supabase
                .from('erp_invoices')
                .select(`
                    id, due_date, amount_total, type, category, invoice_no, status,
                    erp_entities(name),
                    erp_employees(full_name)
                `)
                .in('status', ['PENDING', 'PARTIAL']) 
                .not('due_date', 'is', null);

            // --- 2. PAST TRANSACTIONS (Ledger) ---
            const { data: ledger } = await supabase
                .from('erp_ledger')
                .select('id, transaction_date, amount, type, vendor, description')
                .order('transaction_date', { ascending: false })
                .limit(100);

            // --- 3. STRATEGY MANDATES (Whiteboard) ---
            const { data: mandates } = await supabase
                .from('erp_project_whiteboard')
                .select('id, deadline_date, project_name, daily_goal, achieved_status, completion_percent')
                .not('deadline_date', 'is', null);

            // --- MAPPING LOGIC ---
            const mappedInvoices = (invoices || []).map(i => ({
                id: `inv-${i.id}`,
                date: new Date(i.due_date),
                amount: i.amount_total,
                title: i.erp_entities?.name || i.erp_employees?.full_name || i.category || 'Payment Due',
                subtitle: i.invoice_no,
                type: i.type === 'PAYABLE' ? 'DUE_OUT' : 'DUE_IN',
                isFuture: true
            }));

            const mappedLedger = (ledger || []).map(l => ({
                id: `led-${l.id}`,
                date: new Date(l.transaction_date),
                amount: l.amount,
                title: l.vendor || l.description || 'Settlement',
                type: l.type === 'DEBIT' ? 'PAID_OUT' : 'RECEIVED',
                isFuture: false
            }));

            const mappedStrategy = (mandates || []).map(m => ({
                id: `str-${m.id}`,
                date: new Date(m.deadline_date),
                title: m.project_name,
                subtitle: `${m.completion_percent}% Complete`,
                details: m.daily_goal,
                type: 'STRATEGY_MANDATE',
                isFuture: true,
                status: m.achieved_status
            }));

            setEvents([...mappedInvoices, ...mappedLedger, ...mappedStrategy]);
            setLoading(false);
        };

        fetchEvents();
    }, []);

    // --- GRID HELPERS ---
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); 
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptySlots = Array.from({ length: firstDay }, () => null);

    const getDayEvents = (day) => {
        return events.filter(e => 
            e.date.getDate() === day && 
            e.date.getMonth() === currentDate.getMonth() && 
            e.date.getFullYear() === currentDate.getFullYear()
        );
    };

    const formatCompact = (val) => {
        const num = Math.abs(Number(val));
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        return `₹${num.toLocaleString()}`;
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F1F5F9] font-sans text-slate-900 antialiased p-8">
            
            {/* HEADER CONTROLS */}
            <div className="flex justify-between items-end mb-10 border-b-2 border-slate-200 pb-8">
                <div className="flex items-center gap-10">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Strategic Calendar</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">Cross-Module Liquidity & Mandate Sync</p>
                    </div>
                    
                    {/* Month Navigator */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-sm p-1 shadow-sm">
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all">
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                        <span className="text-xs font-black uppercase w-48 text-center text-slate-800 tracking-widest">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all">
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                {/* LEGEND */}
                <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div> Payable</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div> Receivable</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600 shadow-sm"></div> Strategy</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300 shadow-sm"></div> Settled</div>
                </div>
            </div>

            {/* CALENDAR GRID */}
            <div className="bg-slate-200 border border-slate-200 rounded-sm overflow-hidden shadow-2xl flex flex-col flex-1">
                
                <div className="grid grid-cols-7 gap-px bg-slate-200 shrink-0">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="bg-slate-50 p-4 text-center text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-px bg-slate-200 flex-1 overflow-y-auto no-scrollbar">
                    {emptySlots.map((_, i) => <div key={`empty-${i}`} className="bg-slate-50/40 min-h-[140px]"></div>)}

                    {days.map(day => {
                        const dayEvents = getDayEvents(day);
                        const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                        return (
                            <div key={day} className={`bg-white p-3 min-h-[140px] hover:bg-sky-50 transition-all group flex flex-col border-t-2 border-transparent ${isToday ? 'border-indigo-600 bg-indigo-50/30' : ''}`}>
                                
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-xs font-black ${isToday ? 'text-white bg-indigo-600 w-7 h-7 rounded-full flex items-center justify-center shadow-lg' : 'text-slate-400'}`}>
                                        {day}
                                    </span>
                                    {dayEvents.length > 0 && <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{dayEvents.length} Tasks</span>}
                                </div>

                                <div className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
                                    {dayEvents.map((evt, idx) => {
                                        // DYNAMIC COLOR CODING
                                        let styleClass = "bg-slate-50 text-slate-500 border-slate-200 opacity-70";
                                        let icon = "fa-check-double";

                                        if (evt.type === 'DUE_OUT') {
                                            styleClass = "bg-rose-50 text-rose-700 border-rose-100 shadow-sm";
                                            icon = "fa-arrow-up";
                                        } else if (evt.type === 'DUE_IN') {
                                            styleClass = "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm";
                                            icon = "fa-arrow-down";
                                        } else if (evt.type === 'STRATEGY_MANDATE') {
                                            styleClass = "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm";
                                            icon = "fa-chess-knight";
                                        } else if (evt.type === 'RECEIVED') {
                                            styleClass = "bg-green-50/40 text-green-600 border-green-100 border-dashed";
                                        } else if (evt.type === 'PAID_OUT') {
                                            styleClass = "bg-red-50/40 text-red-600 border-red-100 border-dashed";
                                        }

                                        return (
                                            <div 
                                                key={idx} 
                                                className={`text-[9px] px-2 py-2 rounded border truncate font-black cursor-help transition-all hover:translate-x-1 ${styleClass}`}
                                                title={`${evt.title}\n${evt.subtitle || ''}\n${evt.details || ''}`}
                                            >
                                                <div className="flex justify-between items-center gap-1">
                                                    <span className="truncate flex items-center gap-2 uppercase tracking-tighter">
                                                        <i className={`fa-solid ${icon} text-[8px] opacity-60`}></i>
                                                        {evt.title}
                                                    </span>
                                                    {evt.amount && <span className="font-mono tabular-nums">{formatCompact(evt.amount)}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Calendar;