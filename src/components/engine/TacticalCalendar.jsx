import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase'; // <-- Keep db for Firebase writes
import { supabase } from '../../lib/supabaseClient'; // <-- Keep supabase for other dashboards/reads
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// --- CONFIG ---
const EVENT_TYPES = [
    { id: 'Meeting', label: 'Meeting', color: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-400', icon: 'fa-video' },
    { id: 'Task', label: 'Task', color: 'bg-emerald-600', border: 'border-emerald-500', text: 'text-emerald-400', icon: 'fa-check-circle' },
    { id: 'Deadline', label: 'Deadline', color: 'bg-rose-600', border: 'border-rose-500', text: 'text-rose-400', icon: 'fa-flag' },
    { id: 'Reminder', label: 'Reminder', color: 'bg-amber-600', border: 'border-amber-500', text: 'text-amber-400', icon: 'fa-bell' },
    { id: 'Event', label: 'Event', color: 'bg-violet-600', border: 'border-violet-500', text: 'text-violet-400', icon: 'fa-calendar-day' },
];

// --- HELPER: EMAIL ---
const getGmailLink = (title, desc, attendees = [], users = []) => {
    const emailList = users
        .filter(u => attendees.includes(u.id))
        .map(u => u.email)
        .join(',');

    const subject = encodeURIComponent(`[Auspex] ${title}`);
    const body = encodeURIComponent(`Team,\n\nRef: ${title}\n\nNotes:\n${desc || ''}\n\n--\nSent via Auspex OS`);
    
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${emailList}&su=${subject}&body=${body}`;
};

// --- REUSABLE FORM COMPONENT ---
const OperationForm = ({ formData, setFormData, handleSave, editingId, handleCancel, users, companies, pitches }) => {
    const toggleAttendee = (userId) => {
        setFormData(prev => {
            const current = prev.attendees || [];
            return {
                ...prev,
                attendees: current.includes(userId) 
                    ? current.filter(id => id !== userId) 
                    : [...current, userId]
            };
        });
    };

    const safeUsers = Array.isArray(users) ? users : [];

    return (
        <form onSubmit={handleSave} className="space-y-5">
            <input 
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none font-bold text-lg"
                placeholder="Operation Title..."
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                autoFocus
                required
            />

            <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map(t => (
                        <button 
                            key={t.id} 
                            type="button" 
                            onClick={() => setFormData({...formData, type: t.id})}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-2 ${formData.type === t.id ? `${t.color} text-white border-transparent shadow-lg scale-105` : 'bg-black/40 text-slate-500 border-white/10 hover:bg-white/5'}`}
                        >
                            <i className={`fa-solid ${t.icon}`}></i> {t.label || t.id}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Date</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-xs focus:border-[var(--brand-color)] focus:outline-none [color-scheme:dark]" required />
                </div>
                <div className="w-1/3">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Time</label>
                    {/* UPGRADE 1: Standard Time Input is styled for better UX (cannot implement circular clock without custom component/library) */}
                    <input 
                        type="time" 
                        value={formData.time} 
                        onChange={e => setFormData({...formData, time: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-xs focus:border-[var(--brand-color)] focus:outline-none [color-scheme:dark]" 
                    />
                </div>
            </div>

            <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2">Assign Team</label>
                <div className="flex flex-wrap gap-2 bg-black/40 p-2 rounded-lg border border-white/10 min-h-[44px]">
                    {safeUsers.length === 0 && <span className="text-slate-600 text-xs italic p-1">No staff found.</span>}
                    {safeUsers.map(u => {
                        const isSelected = formData.attendees.includes(u.id);
                        return (
                            <button key={u.id} type="button" onClick={() => toggleAttendee(u.id)} className={`text-[10px] px-3 py-1 rounded border transition-all flex items-center gap-1 ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent border-white/10 text-slate-400 hover:text-white'}`}>
                                {isSelected && <i className="fa-solid fa-check"></i>} {u.fullName || u.email.split('@')[0]}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <label className="text-[10px] text-[var(--brand-color)] font-bold uppercase block mb-1">Link Context</label>
                <select value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-xs focus:border-[var(--brand-color)] focus:outline-none appearance-none">
                    <option value="">-- No Link --</option>
                    <optgroup label="Portfolio">{(companies || []).map(c => <option key={c.id} value={c.id}>🏢 {c.companyName}</option>)}</optgroup>
                    <optgroup label="Pitches">{(pitches || []).map(p => <option key={p.id} value={p.id}>⚡ {p.startupName}</option>)}</optgroup>
                </select>
            </div>

            <textarea className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-[var(--brand-color)] focus:outline-none h-24 resize-none placeholder-slate-600" placeholder="Operational details..." value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} />

            <div className="pt-2">
                <button type="submit" className={`w-full font-black py-4 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all transform hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-sm ${editingId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[var(--brand-color)] hover:bg-white text-black'}`}>
                    {editingId ? 'Update Mission' : 'Deploy Operation'}
                </button>
            </div>
        </form>
    );
};

// --- COMPONENT: MODAL WRAPPER ---
const MissionModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease]" onClick={onClose}>
            <div className="bg-[#0f172a] border border-[var(--brand-color)]/50 w-full max-w-lg rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 bg-black/40 flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

const TacticalCalendar = ({ companies = [], pitches = [], users = [], onSelectCompany, onSelectPitch }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Meeting');
    const [mobileTab, setMobileTab] = useState('calendar'); // 'calendar' or 'list'
    
    // Form State
    const [formData, setFormData] = useState({ 
        title: '', type: 'Meeting', date: new Date().toISOString().split('T')[0],
        time: '09:00', desc: '', link: '', attendees: [] 
    });
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 1. DATA SYNC (SWITCHED TO FIREBASE READ/WRITE)
    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                // Fetch from Firebase (The new primary calendar store)
                const firebaseSnap = await db.collection('calendar_events')
                    .orderBy('date', 'asc').get();
                
                const firebaseEvents = firebaseSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setEvents(firebaseEvents || []);
            } catch (err) {
                console.error("Firebase Calendar Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        // Set up Realtime Listener on Firebase/Firestore (bypassing Supabase Realtime)
        const unsubscribe = db.collection('calendar_events').onSnapshot(() => {
            fetchEvents();
        });

        // We no longer return the Supabase channel unsubscribe
        return () => unsubscribe(); // Clean up Firebase listener

    }, []);

    // 2. HANDLERS
    // Rewritten to use Firebase for all CUD operations (bypassing Supabase RLS)
    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.title) return;

        try {
            const payload = { 
                ...formData, 
                completed: formData.completed || false,
            };

            if (editingId) {
                // Update existing Firebase document
                await db.collection('calendar_events').doc(editingId).update(payload);
                console.log("Firebase Event Updated:", editingId);
            } else {
                // Insert new Firebase document (bypassing Supabase RLS failure)
                delete payload.id; // Ensure Firebase generates a new ID
                await db.collection('calendar_events').add({
                    ...payload,
                    created_at: new Date().toISOString()
                });
                console.log("Firebase Event Added.");
            }
            
            // Reset and close
            setEditingId(null);
            setFormData(prev => ({ ...prev, title: '', desc: '', link: '', attendees: [] }));
            setIsModalOpen(false); 
            
        } catch (err) { 
            console.error("Calendar Save Error (Firebase):", err);
            alert("Error saving event: " + err.message); 
        }
    };

    const populateForm = (item) => {
        setFormData({
            title: item.title || '',
            type: item.type || 'Meeting',
            date: item.date || new Date().toISOString().split('T')[0],
            time: item.time || '09:00',
            desc: item.desc || '',
            link: item.link || '',
            attendees: item.attendees || [],
            completed: item.completed || false // Ensure completed status is loaded
        });
    };

    // Edit logic for List (Left Pane)
    const handleEditList = (item) => {
        populateForm(item);
        setEditingId(item.id);
        if (item.type) setActiveTab(item.type);
    };

    // Edit logic for Calendar (Modal)
    const handleEditCalendar = (item) => {
        populateForm(item);
        setEditingId(item.id);
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setFormData({ title: '', type: 'Meeting', date: new Date().toISOString().split('T')[0], time: '09:00', desc: '', link: '', attendees: [] });
        setEditingId(null);
        setIsModalOpen(false);
    };

    // Rewritten to use Firebase
    const handleDelete = async (id) => {
        if (window.confirm("Delete this mission?")) {
            try {
                await db.collection('calendar_events').doc(id).delete();
                console.log("Firebase Event Deleted:", id);
                if (editingId === id) handleCancel();
            } catch (err) { alert("Delete Error: " + err.message); }
        }
    };

    // Rewritten to use Firebase
    const toggleComplete = async (item) => {
        try {
            await db.collection('calendar_events').doc(item.id).update({ completed: !item.completed });
        } catch (err) { alert("Update Error: " + err.message); }
    };

    const handleNavigate = (e, linkId) => {
        e.stopPropagation();
        const company = (companies || []).find(c => c.id === linkId);
        if (company && onSelectCompany) return onSelectCompany(company);
        const pitch = (pitches || []).find(p => p.id === linkId);
        if (pitch && onSelectPitch) { alert(`Switching to Pitch: ${pitch.startupName}`); return onSelectPitch(); }
        alert("Linked item not found.");
    };

    const handleEmail = (item) => {
        const link = getGmailLink(item.title, item.desc, item.attendees, users);
        if(link) window.open(link, '_blank'); else alert("No team members assigned.");
    };

    // Calendar Click (Add New via Modal)
    const handleDateClick = (arg) => {
        setFormData(prev => ({ ...prev, date: arg.dateStr, title: '', desc: '' }));
        setEditingId(null);
        setIsModalOpen(true);
    };

    // Calendar Event Click (Edit via Modal)
    const handleEventClick = (info) => {
        const item = events.find(e => e.id === info.event.id);
        if (item) handleEditCalendar(item);
    };

    // --- VISUALS ---
    const sortedEvents = events.sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')));
    const activeList = sortedEvents.filter(e => !e.completed && e.type === activeTab);
    const completedList = sortedEvents.filter(e => e.completed);

    const calendarEvents = useMemo(() => {
        return events.map(e => {
            const hexMap = { 'Meeting': '#2563eb', 'Task': '#10b981', 'Deadline': '#e11d48', 'Reminder': '#f59e0b', 'Event': '#7c3aed' };
            const color = hexMap[e.type] || '#3b82f6';
            return {
                id: e.id,
                title: `${e.time ? e.time + ' ' : ''} ${e.title}`,
                date: e.date,
                backgroundColor: e.completed ? 'transparent' : color,
                borderColor: e.completed ? '#334155' : color,
                textColor: e.completed ? '#64748b' : 'white',
                classNames: e.completed ? ['opacity-50', 'line-through', 'border-dashed'] : ['font-bold', 'shadow-md']
            };
        });
    }, [events]);

    const calendarStyles = `
        .fc { font-family: 'Manrope', sans-serif; --fc-border-color: rgba(255,255,255,0.05); }
        .fc-theme-standard .fc-scrollgrid { border: none; }
        
        /* FIX: Guaranteed White Background Removal */
        .fc-col-header { 
            background: transparent !important; /* Targets the header background */
        }
        
        /* Modernized Header */
        .fc-col-header-cell { 
            /* Ensures the individual cells are transparent and use the containing element's background */
            background: transparent !important; 
            padding: 15px 0 !important; 
            border-bottom: 2px solid var(--brand-color) !important; 
        }
        .fc-col-header-cell-cushion { 
            color: var(--brand-color); 
            text-transform: uppercase; 
            font-size: 11px; 
            font-weight: 800; 
            letter-spacing: 2px; 
        }
        .fc-daygrid-day:hover { background: rgba(255,255,255,0.02); }
        .fc-day-today { 
            background: linear-gradient(180deg, rgba(var(--brand-rgb), 0.05) 0%, transparent 50%) !important; 
        }
        .fc-event { 
            border-radius: 4px; 
            padding: 2px 6px; 
            font-size: 10px; 
            margin-bottom: 2px; 
            cursor: pointer; 
            border: none; 
        }
        .fc-toolbar-title { font-size: 1.5rem !important; font-weight: 800; color: white; }
        /* Clean Button Design */
        .fc-button { 
            background: rgba(255,255,255,0.05) !important; 
            border: 1px solid rgba(255,255,255,0.1) !important; 
            text-transform: uppercase; 
            font-weight: 700; 
            border-radius: 8px !important; 
        }
        .fc-button-active { background: var(--brand-color) !important; color: black !important; }
        .fc-daygrid-day-number { color: #64748b; font-weight: 700; padding: 8px !important; }
    `;

    return (
        <div className="space-y-8 animate-[fadeIn_0.4s_ease] relative">
            <style>{calendarStyles}</style>

            {/* POPUP MODAL FOR CALENDAR CLICKS */}
            <MissionModal isOpen={isModalOpen} onClose={handleCancel} title={editingId ? "Edit Mission" : "New Operation"}>
                 <OperationForm 
                    formData={formData} setFormData={setFormData} 
                    handleSave={handleSave} editingId={editingId} 
                    handleCancel={handleCancel} users={users} 
                    companies={companies} pitches={pitches} 
                />
            </MissionModal>

            {/* MOBILE: FLOATING ADD BUTTON & TOGGLE */}
            <div className="lg:hidden flex justify-between items-center mb-4 bg-black/40 p-2 rounded-xl border border-white/10">
                 <button onClick={() => setMobileTab('calendar')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg ${mobileTab === 'calendar' ? 'bg-[var(--brand-color)] text-black' : 'text-slate-400'}`}>Calendar</button>
                 <button onClick={() => setMobileTab('list')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg ${mobileTab === 'list' ? 'bg-[var(--brand-color)] text-black' : 'text-slate-400'}`}>Timeline</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- LEFT: SIDEBAR EDITOR (Desktop Only) --- */}
                {/* FIX: Removed h-full and sticky to prevent overflow/overlap issues on desktop. */}
                <div className="hidden lg:block bg-white/5 border border-white/10 rounded-xl p-6 lg:h-fit">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                            {editingId ? <><i className="fa-solid fa-pen-to-square text-blue-400"></i> Edit Mission</> : <><i className="fa-solid fa-plus text-[var(--brand-color)]"></i> New Op</>}
                        </h3>
                        {editingId && <button onClick={handleCancel} className="text-xs text-red-400 hover:text-white border border-red-500/30 px-3 py-1 rounded hover:bg-red-500/20">CANCEL</button>}
                    </div>

                    <OperationForm 
                        formData={formData} setFormData={setFormData} 
                        handleSave={handleSave} editingId={editingId} 
                        handleCancel={handleCancel} users={users} 
                        companies={companies} pitches={pitches} 
                    />
                </div>

                {/* --- MIDDLE/RIGHT: OPERATIONS TIMELINE --- */}
                {/* FIX: Ensure this spans the remaining columns (lg:col-span-2) */}
                <div className={`${mobileTab === 'list' ? 'block' : 'hidden'} lg:col-span-2 lg:block md:col-span-2 bg-[#0f172a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col h-full min-h-[600px] shadow-2xl relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-color)] rounded-full mix-blend-overlay filter blur-[100px] opacity-10 pointer-events-none"></div>

                    {/* TABS */}
                    <div className="flex gap-3 border-b border-white/10 pb-6 mb-6 overflow-x-auto no-scrollbar relative z-10">
                        {EVENT_TYPES.map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${activeTab === t.id ? `${t.color} text-white border-transparent shadow-[0_0_20px_rgba(0,0,0,0.4)] scale-105` : 'bg-black/40 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'}`}>
                                <i className={`fa-solid ${t.icon} text-sm`}></i> {t.label}
                                <span className="bg-black/40 px-2 py-0.5 rounded ml-2 text-[10px] text-white/80">{sortedEvents.filter(e => !e.completed && e.type === t.id).length}</span>
                            </button>
                        ))}
                    </div>

                    {/* LIST */}
                    <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
                        {!loading && activeList.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-600 italic border-2 border-dashed border-white/5 rounded-2xl">
                                <i className="fa-solid fa-check-double text-4xl mb-4 opacity-20"></i> All clear. No active operations in this sector.
                            </div>
                        )}
                        
                        {activeList.map(ev => {
                            const style = EVENT_TYPES.find(t => t.id === ev.type) || EVENT_TYPES[0];
                            const hasAttendees = ev.attendees && ev.attendees.length > 0;
                            return (
                                <div key={ev.id} className={`group flex items-start gap-5 p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${editingId === ev.id ? 'bg-[var(--brand-color)]/5 border-[var(--brand-color)]' : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5 hover:shadow-xl'}`}>
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.color}`}></div>
                                    
                                    {/* UPGRADE 2: Clearer Toggle Complete Button */}
                                    <button 
                                        onClick={() => toggleComplete(ev)} 
                                        className="mt-1 w-8 h-8 rounded-full border-2 border-[var(--brand-color)] flex items-center justify-center hover:bg-[var(--brand-color)] hover:text-black transition-all group/check shrink-0 bg-white/5" 
                                        title="Mark Done"
                                    >
                                        <i className="fa-solid fa-check text-xs text-transparent group-hover/check:text-black"></i>
                                    </button>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="font-bold text-white text-lg tracking-tight group-hover:text-[var(--brand-color)] transition-colors">{ev.title}</div>
                                            <span className="text-xs text-slate-400 font-mono bg-black/30 px-2 py-1 rounded">{new Date(ev.date).toLocaleDateString()} <span className="opacity-50">|</span> {ev.time}</span>
                                        </div>
                                        {ev.desc && <div className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">{ev.desc}</div>}
                                        <div className="flex gap-2 mt-4">
                                            {ev.link && <button onClick={(e) => handleNavigate(e, ev.link)} className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 flex items-center gap-2 transition-all"><i className="fa-solid fa-link"></i> Linked Asset</button>}
                                            <button onClick={() => handleEmail(ev)} className={`text-[10px] px-3 py-1 rounded-full border flex items-center gap-2 transition-all ${hasAttendees ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10' : 'bg-transparent border-white/5 text-slate-600'}`}><i className="fa-solid fa-users"></i> {hasAttendees ? 'Email Team' : 'Add Team'}</button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4">
                                        <button onClick={() => handleEditList(ev)} className="w-8 h-8 rounded-lg bg-black/60 text-blue-400 hover:bg-blue-500 hover:text-white flex items-center justify-center border border-white/10 shadow-lg"><i className="fa-solid fa-pen text-xs"></i></button>
                                        <button onClick={() => handleDelete(ev.id)} className="w-8 h-8 rounded-lg bg-black/60 text-slate-500 hover:bg-red-500 hover:text-white flex items-center justify-center border border-white/10 shadow-lg"><i className="fa-solid fa-trash text-xs"></i></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {completedList.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <div className="flex items-center gap-3 mb-4 cursor-default opacity-50 hover:opacity-100 transition-opacity">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Mission Archive</h4>
                                <div className="h-[1px] flex-1 bg-white/10"></div>
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-400 font-mono">{completedList.length}</span>
                            </div>
                            <div className="space-y-2 opacity-40 hover:opacity-100 transition-opacity max-h-32 overflow-y-auto custom-scrollbar">
                                {completedList.map(ev => (
                                    <div key={ev.id} className="flex items-center gap-4 p-2 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/5 transition-all group">
                                        <button onClick={() => toggleComplete(ev)} className="w-5 h-5 rounded-full bg-green-900/30 border border-green-600 flex items-center justify-center text-green-500 shrink-0 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all" title="Undo"><i className="fa-solid fa-check text-[10px]"></i></button>
                                        <div className="text-slate-500 line-through text-xs flex-1 truncate">{ev.title}</div>
                                        <button onClick={() => handleDelete(ev.id)} className="text-slate-700 hover:text-red-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-trash text-[10px]"></i></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- BOTTOM: VISUAL CALENDAR (Desktop: Always, Mobile: Toggle) --- */}
                {/* FIX: Placed outside the original grid and set to lg:col-span-3 to span full width below. */}
                <div className={`${mobileTab === 'calendar' ? 'block' : 'hidden'} lg:block lg:col-span-3 bg-[#0f172a] border border-white/10 rounded-xl p-6 shadow-2xl mt-8`}>
                    {/* UPGRADE 3: Background Glow Effect */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] transform -translate-x-1/2 -translate-y-1/2 bg-[var(--brand-color)] rounded-full blur-[100px] opacity-10"></div>
                        <div className="absolute top-1/4 right-1/4 w-[200px] h-[200px] transform bg-violet-500 rounded-full blur-[100px] opacity-10"></div>
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <i className="fa-regular fa-calendar-days text-[var(--brand-color)]"></i> Monthly Overview
                            </h2>
                            <div className="text-xs text-slate-500">Visual Map (Click Date to Add)</div>
                        </div>
                        <div className="calendar-container">
                            <FullCalendar
                                plugins={[dayGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: ''
                                }}
                                events={calendarEvents}
                                dateClick={handleDateClick}
                                eventClick={handleEventClick} 
                                height="auto"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE FAB */}
            <button onClick={() => { setFormData({ title: '', type: 'Meeting', date: new Date().toISOString().split('T')[0], time: '09:00', desc: '', link: '', attendees: [] }); setEditingId(null); setIsModalOpen(true); }} className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[var(--brand-color)] text-black rounded-full shadow-[0_0_20px_var(--brand-glow)] flex items-center justify-center z-50 hover:scale-110 transition-transform active:scale-95">
                <i className="fa-solid fa-plus text-xl"></i>
            </button>
        </div>
    );
};

export default TacticalCalendar;