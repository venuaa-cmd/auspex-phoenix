import React, { useState, useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction'; 
import { db } from '../../lib/firebase';

// --- HELPER: Gmail Link ---
const getGmailLink = (title, desc, attendees = []) => {
    const subject = encodeURIComponent(`Ref: ${title}`);
    const body = encodeURIComponent(`Team,\n\nRegarding: ${title}\n\nNotes:\n${desc}\n\n- Sent via Auspex OS`);
    const emails = attendees.map(a => a.email).join(',');
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${emails}&su=${subject}&body=${body}`;
};

// --- CONFIG: EVENT TYPES & COLORS ---
const EVENT_TYPES = [
    { id: 'Meeting', color: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-100' },
    { id: 'Task', color: 'bg-emerald-600', border: 'border-emerald-500', text: 'text-emerald-100' },
    { id: 'Deadline', color: 'bg-rose-600', border: 'border-rose-500', text: 'text-rose-100' },
    { id: 'Reminder', color: 'bg-amber-600', border: 'border-amber-500', text: 'text-amber-100' },
    { id: 'Note', color: 'bg-violet-600', border: 'border-violet-500', text: 'text-violet-100' },
];

// --- MODAL: ADD / EDIT EVENT ---
const EventModal = ({ isOpen, onClose, onSave, onDelete, initialData, date, users = [], linkOptions = { pitches: [], portfolio: [] } }) => {
    const [formData, setFormData] = useState({
        title: '', type: 'Meeting', date: '', time: '09:00', desc: '', link: '', attendees: [], completed: false
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // EDIT MODE
                setFormData({
                    id: initialData.id,
                    title: initialData.title || '',
                    type: initialData.type || 'Meeting',
                    date: initialData.date || new Date().toISOString().split('T')[0],
                    time: initialData.time || '09:00',
                    desc: initialData.desc || '',
                    link: initialData.link || '',
                    attendees: initialData.attendees || [],
                    completed: initialData.completed || false
                });
            } else {
                // ADD MODE
                setFormData({
                    title: '', type: 'Meeting', 
                    date: date || new Date().toISOString().split('T')[0], 
                    time: '09:00', desc: '', link: '', attendees: [], completed: false
                });
            }
        }
    }, [isOpen, initialData, date]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title) return;
        onSave(formData);
    };

    const toggleAttendee = (u) => {
        setFormData(prev => {
            const exists = prev.attendees.find(a => a.id === u.id);
            return {
                ...prev,
                attendees: exists ? prev.attendees.filter(a => a.id !== u.id) : [...prev.attendees, { id: u.id, name: u.fullName || u.email, email: u.email }]
            };
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease]">
            <div className="bg-[#0f172a] border border-[var(--brand-color)]/40 w-full max-w-lg rounded-2xl shadow-[0_0_60px_rgba(24,184,185,0.1)] flex flex-col max-h-[85vh] overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5 flex-none">
                    <h3 className="text-white font-bold text-xl">{initialData ? 'Edit Entry' : 'New Entry'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-lg"></i></button>
                </div>

                {/* Scrollable Form */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <form id="eventForm" onSubmit={handleSubmit} className="space-y-6">
                        
                        <input 
                            className="w-full bg-transparent border-b-2 border-white/20 pb-2 text-white text-2xl font-bold focus:border-[var(--brand-color)] focus:outline-none placeholder-slate-600" 
                            placeholder="Add Title" 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})} 
                            autoFocus 
                        />
                        
                        <div className="flex gap-2 flex-wrap">
                            {EVENT_TYPES.map(t => (
                                <button 
                                    key={t.id} 
                                    type="button" 
                                    onClick={() => setFormData({...formData, type: t.id})} 
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                                        formData.type === t.id 
                                        ? `${t.color} text-white border-transparent shadow-lg scale-105` 
                                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    {t.id}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex flex-col">
                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1">Date</label>
                                <input 
                                    type="date" 
                                    value={formData.date} 
                                    onChange={e => setFormData({...formData, date: e.target.value})} 
                                    className="bg-transparent text-white text-sm font-mono focus:outline-none [color-scheme:dark]" 
                                />
                            </div>
                            <div className="w-1/3 bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex flex-col">
                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1">Time</label>
                                <input 
                                    type="time" 
                                    value={formData.time} 
                                    onChange={e => setFormData({...formData, time: e.target.value})} 
                                    className="bg-transparent text-white text-sm font-mono focus:outline-none [color-scheme:dark]" 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-[var(--brand-color)] uppercase block mb-2">
                                <i className="fa-solid fa-link mr-2"></i>Link Context (Optional)
                            </label>
                            <select 
                                value={formData.link} 
                                onChange={e => setFormData({...formData, link: e.target.value})} 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[var(--brand-color)] focus:outline-none appearance-none"
                            >
                                <option value="">-- Independent Note --</option>
                                <optgroup label="Active Portfolio">
                                    {linkOptions.portfolio?.map(p => <option key={p.id} value={p.id}>🏢 {p.name}</option>)}
                                </optgroup>
                                <optgroup label="Pitch Pipeline">
                                    {linkOptions.pitches?.map(p => <option key={p.id} value={p.id}>⚡ {p.startupName}</option>)}
                                </optgroup>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Participants</label>
                            <div className="flex flex-wrap gap-2 bg-black/20 p-3 rounded-xl border border-white/5 min-h-[50px]">
                                {users.length === 0 && <span className="text-slate-600 text-xs italic">No staff found.</span>}
                                {users.map(u => {
                                    const isSelected = formData.attendees.find(a => a.id === u.id);
                                    return (
                                        <button 
                                            key={u.id} 
                                            type="button" 
                                            onClick={() => toggleAttendee(u)} 
                                            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all ${isSelected ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-black/40 border-white/10 text-slate-500 hover:border-white/30'}`}
                                        >
                                            {isSelected && <i className="fa-solid fa-check text-[10px]"></i>}
                                            {u.fullName || u.email.split('@')[0]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <textarea 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-[var(--brand-color)] focus:outline-none text-sm placeholder-slate-600 resize-none h-24" 
                            placeholder="Details, Agenda, or Sticky Note..." 
                            value={formData.desc} 
                            onChange={e => setFormData({...formData, desc: e.target.value})} 
                        />
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-black/20 flex justify-between items-center flex-none">
                    {initialData ? (
                        <button type="button" onClick={() => onDelete(formData.id)} className="text-red-500 hover:text-red-400 text-sm font-bold flex items-center gap-2 px-3 py-2 rounded hover:bg-red-500/10 transition-all">
                            <i className="fa-regular fa-trash-can"></i> Delete
                        </button>
                    ) : (
                        <div></div> 
                    )}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs transition-all">Cancel</button>
                        <button onClick={handleSubmit} className="px-8 py-2.5 bg-[var(--brand-color)] text-black rounded-xl font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_0_15px_var(--brand-glow)] transition-all">Save Entry</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- POPOVER: EVENT DETAILS ---
const EventPopover = ({ event, x, y, onClose, onEdit, onDelete, onNavigate, onComplete }) => {
    const isSystem = event.extendedProps.type === 'system';
    const attendees = event.extendedProps.attendees || [];
    const link = event.extendedProps.link;
    const type = event.extendedProps.typeProp || 'Meeting';
    const isCompleted = event.extendedProps.completed;

    const style = EVENT_TYPES.find(t => t.id === type) || EVENT_TYPES[0];
    const adjustedLeft = window.innerWidth - x < 350 ? x - 320 : x;

    return (
        <div 
            className="absolute z-[80] w-80 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-[scaleIn_0.1s_ease]" 
            style={{ top: y, left: adjustedLeft }} 
            onClick={e => e.stopPropagation()}
        >
            <div className={`h-1.5 w-full ${isSystem ? 'bg-gradient-to-r from-[var(--brand-color)] to-emerald-500' : style.color}`}></div>
            
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${isSystem ? 'bg-white/10 text-white border-white/20' : `${style.color} bg-opacity-20 ${style.text} ${style.border} border-opacity-30`}`}>
                            {isSystem ? 'System Event' : type}
                        </span>
                        <h4 className={`mt-2 font-bold text-lg leading-tight ${isCompleted ? 'text-slate-500 line-through decoration-2' : 'text-white'}`}>
                            {event.title}
                        </h4>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4 bg-black/20 p-2 rounded-lg">
                    <div className="flex items-center gap-2"><i className="fa-regular fa-clock"></i> {event.extendedProps.time || 'All Day'}</div>
                    <div className="flex items-center gap-2"><i className="fa-regular fa-calendar"></i> {event.start?.toLocaleDateString()}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    {(link || isSystem) && (
                        <button 
                            onClick={() => onNavigate({ companyId: link || event.extendedProps.companyId })} 
                            className="col-span-2 bg-[var(--brand-color)]/10 text-[var(--brand-color)] text-xs py-2 rounded-lg border border-[var(--brand-color)]/30 hover:bg-[var(--brand-color)]/20 font-bold flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-link"></i> {isSystem ? 'View Asset' : 'Open Asset'}
                        </button>
                    )}
                    
                    {attendees.length > 0 && (
                        <a href={getGmailLink(event.title, event.extendedProps.desc, attendees)} target="_blank" rel="noopener noreferrer" className="bg-white/5 text-white text-xs py-2 rounded-lg border border-white/10 hover:bg-white/10 font-bold flex items-center justify-center gap-2">
                            <i className="fa-solid fa-envelope"></i> Email
                        </a>
                    )}
                    
                    {!isSystem && (
                        <button onClick={() => onComplete(event)} className={`col-span-1 text-xs py-2 rounded-lg border font-bold flex items-center justify-center gap-2 transition-all ${isCompleted ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/50'}`}>
                            <i className={`fa-solid ${isCompleted ? 'fa-check-circle' : 'fa-circle-check'}`}></i>
                            {isCompleted ? 'Done' : 'Mark Done'}
                        </button>
                    )}
                </div>

                {event.extendedProps.desc && <p className="text-sm text-slate-300 mb-4 bg-white/5 p-3 rounded-lg border border-white/5 italic">"{event.extendedProps.desc}"</p>}

                {!isSystem && (
                    <div className="flex gap-2 pt-3 border-t border-white/10">
                        <button onClick={() => onEdit(event)} className="flex-1 text-slate-400 hover:text-white text-xs font-bold py-1.5 hover:bg-white/5 rounded"><i className="fa-solid fa-pen mr-1"></i> Edit</button>
                        <button onClick={() => onDelete(event.id)} className="w-8 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded"><i className="fa-solid fa-trash"></i></button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const PortfolioCalendar = ({ investments, companies, pitches, onSelectCompany }) => {
    const calendarRef = useRef(null);
    const containerRef = useRef(null);
    const [notes, setNotes] = useState([]);
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [popover, setPopover] = useState(null);

    useEffect(() => {
        const unsubNotes = db.collection('calendar_notes').onSnapshot(snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubUsers = db.collection('Employee_Login').onSnapshot(snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsubNotes(); unsubUsers(); };
    }, []);

    const linkOptions = useMemo(() => ({
        portfolio: companies.map(c => ({ id: c.id, name: c.companyName })),
        pitches: (pitches || []).map(p => ({ id: p.id, startupName: p.startupName }))
    }), [companies, pitches]);

    // --- HANDLERS ---
    
    // FIX: Using handleDeleteEvent internally, passing as onDelete prop
    const handleDeleteEvent = async (id) => {
        if (window.confirm("Delete this event?")) {
            await db.collection('calendar_notes').doc(id).delete();
            setIsModalOpen(false);
            setPopover(null);
        }
    };

    const handleSaveEvent = async (data) => {
        try {
            if (data.id) {
                await db.collection('calendar_notes').doc(data.id).update(data);
            } else {
                await db.collection('calendar_notes').add({ ...data, createdAt: new Date().toISOString() });
            }
            setIsModalOpen(false); setEditingEvent(null); setPopover(null); 
        } catch (e) { alert(e.message); }
    };

    const handleComplete = async (event) => {
        try { await db.collection('calendar_notes').doc(event.id).update({ completed: !event.extendedProps.completed }); setPopover(null); } catch(e) { console.error(e); }
    };

    const handleDateSelect = (selectInfo) => {
        setPopover(null);
        setSelectedDate(selectInfo.startStr);
        setEditingEvent(null);
        setIsModalOpen(true);
    };

    const handleDateClick = (info) => {
        setPopover(null);
        setSelectedDate(info.dateStr);
        setEditingEvent(null);
        setIsModalOpen(true);
    };

    const handleEventClick = (info) => {
        const rect = info.el.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        let x = rect.left - containerRect.left + rect.width + 10;
        let y = rect.top - containerRect.top;
        if (x + 320 > containerRect.width) x = rect.left - containerRect.left - 320;
        setPopover({ event: info.event, x, y });
    };

    const handleEditClick = (event) => {
        setPopover(null);
        setEditingEvent({
            id: event.id,
            title: event.title,
            date: event.startStr ? event.startStr.split('T')[0] : event.start.toISOString().split('T')[0],
            // MAP EXTENDED PROPS TO FORM DATA
            type: event.extendedProps.typeProp, 
            time: event.extendedProps.time,
            desc: event.extendedProps.desc,
            link: event.extendedProps.link,
            attendees: event.extendedProps.attendees,
            completed: event.extendedProps.completed
        });
        setIsModalOpen(true);
    };

    const events = useMemo(() => {
        const systemEvents = [
            ...investments.map(inv => ({
                id: inv.id, title: `💰 ${inv.companyName}`, start: inv.investmentDate,
                backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981', textColor: '#10b981',
                extendedProps: { type: 'system', companyId: inv.companyId, desc: `Investment: ${inv.fundingRound}` }
            })),
            ...companies.filter(c => c.nextMilestoneDate).map(c => ({
                id: c.id + '_milestone', title: `🚩 ${c.companyName}`, start: c.nextMilestoneDate,
                backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: '#8b5cf6', textColor: '#8b5cf6',
                extendedProps: { type: 'system', companyId: c.id, desc: c.nextMilestoneDescription }
            }))
        ];
        const manualEvents = notes.map(n => {
            const style = EVENT_TYPES.find(t => t.id === n.type) || EVENT_TYPES[0];
            return {
                id: n.id, title: n.title, start: n.date,
                backgroundColor: n.completed ? 'rgba(255,255,255,0.05)' : style.color.replace('bg-', 'bg-opacity-20 ').replace('600', '500'),
                borderColor: n.completed ? '#64748b' : style.border.replace('border-', '#'),
                textColor: n.completed ? '#64748b' : 'white',
                classNames: [n.completed ? 'opacity-50 line-through grayscale' : '', `fc-event-${n.type}`],
                extendedProps: { ...n, typeProp: n.type, type: 'manual' } // Pass 'typeProp' for edit mapping
            };
        });
        return [...systemEvents, ...manualEvents];
    }, [investments, companies, notes]);

    const css = `
        .fc { font-family: 'Manrope', sans-serif; --fc-border-color: rgba(255,255,255,0.08); }
        .fc-col-header-cell { background: rgba(0,0,0,0.3); padding: 12px 0 !important; }
        .fc-day-today { background: rgba(24, 184, 185, 0.05) !important; }
        .fc-event { border: none; border-left-width: 3px; border-left-style: solid; border-radius: 4px; padding: 2px 4px; font-size: 10px; font-weight: 600; cursor: pointer; margin-bottom: 2px; }
        
        .fc-event-Meeting { border-left-color: #2563eb !important; background: rgba(37, 99, 235, 0.2); }
        .fc-event-Task { border-left-color: #10b981 !important; background: rgba(16, 185, 129, 0.2); }
        .fc-event-Deadline { border-left-color: #e11d48 !important; background: rgba(225, 29, 72, 0.2); }
        .fc-event-Reminder { border-left-color: #d97706 !important; background: rgba(217, 119, 6, 0.2); }
        .fc-event-Note { border-left-color: #7c3aed !important; background: rgba(124, 58, 237, 0.2); }
        
        .fc-toolbar-title { font-size: 1.5rem; font-weight: 800; color: white; }
        .fc-button { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .fc-button-active { background: var(--brand-color) !important; color: black !important; }
    `;

    return (
        <div className="space-y-6 animate-[fadeIn_0.4s_ease]" onClick={() => setPopover(null)}>
            <style>{css}</style>
            <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl h-[85vh] flex flex-col" ref={containerRef}>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
                    editable={true}
                    selectable={true}
                    events={events}
                    select={handleDateSelect}
                    dateClick={handleDateClick} 
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop} // Now defined
                    height="100%"
                />
                
                {popover && (
                    <EventPopover 
                        {...popover} 
                        onClose={() => setPopover(null)} 
                        onEdit={() => handleEditClick(popover.event)} 
                        onDelete={() => handleDeleteEvent(popover.event.id)} // Fixed Reference
                        onComplete={() => handleComplete(popover.event)}
                        onNavigate={(props) => {
                            if (onSelectCompany && props.companyId) onSelectCompany({ id: props.companyId, companyName: props.companyName });
                        }}
                    />
                )}
            </div>

            <EventModal 
                isOpen={isModalOpen} 
                initialData={editingEvent} 
                date={selectedDate} 
                users={users} 
                linkOptions={linkOptions} 
                onClose={() => { setIsModalOpen(false); setEditingEvent(null); }} 
                onSave={handleSaveEvent} 
                onDelete={handleDeleteEvent} // Fixed Reference
            />
        </div>
    );
};

export default PortfolioCalendar;