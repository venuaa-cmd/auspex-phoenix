import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// --- STRATEGIC & ANALYTICS ---
import AnalyticsDashboard from './dashboard/AnalyticsDashboard';
import AllocationEngine from './banking/AllocationEngine';
import IdeaVault from './strategy/IdeaVault';
import BankRegistry from './banking/BankRegistry';
import Passbook from './banking/Passbook';
import AgencyHUD from './marketing/AgencyHUD'; 
import ManagerPerformance from './employee/ManagerPerformance'; 
import PayrollHub from './payroll/PayrollHub'; 
// --- OPERATIONAL MODULES ---
import CapTable from './ledger/CapTable';
import PortfolioManager from './assets/PortfolioManager';
import Ledger from './ledger/Ledger';
import InvoiceManager from './invoice/InvoiceManager';
import HrManager from './employee/HrManager';
import WhiteboardManager from './dashboard/WhiteboardManager';
import LedgerSentinel from './LedgerSentinel'; 
import Calendar from './calendar/Calendar';
import DealFlowKanban from './kanban/DealFlowKanban'; // [NEW: Deal Flow Integration]

const OperationsNexus = () => {
    // --- 1. CORE NAVIGATION STATE ---
    const [activeModule, setActiveModule] = useState('HORIZON');
    const [selectedBankId, setSelectedBankId] = useState(null);

    // --- 2. LIVE TREASURY PULSE ---
    const [treasuryBalance, setTreasuryBalance] = useState(0);
    
    // --- APPENDED: SOVEREIGN COMMAND STATES ---
    const [employees, setEmployees] = useState([]);
    const [ledger, setLedger] = useState([]);

    useEffect(() => {
        const fetchLiveTreasury = async () => {
            const { data: credits } = await supabase.from('erp_ledger').select('amount').eq('type', 'CREDIT');
            const { data: debits } = await supabase.from('erp_ledger').select('amount').eq('type', 'DEBIT');
            
            const total = (credits?.reduce((a, b) => a + Number(b.amount), 0) || 0) - 
                          (debits?.reduce((a, b) => a + Number(b.amount), 0) || 0);
            setTreasuryBalance(total);
        };

        // --- APPENDED: FORENSIC DATA FETCH ---
        const fetchCommandData = async () => {
            // A. Fetch Active Strategists with full identity fields
            const { data: eData } = await supabase
                .from('erp_employees')
                .select('id, full_name, role, status, photo_url')
                .eq('status', 'ACTIVE');
            if (eData) setEmployees(eData);

            // B. Fetch Global Ledger for AUM Forensics (Advaya AI, Bitcoin, etc.)
            const { data: lData } = await supabase.from('erp_ledger').select('*');
            if (lData) setLedger(lData);
        };

        fetchLiveTreasury();
        fetchCommandData();
    }, [activeModule]); // Re-sync on module switch for clinical accuracy

    // --- 3. THE STRATEGIC VAULT (MULTI-THREADED SCRATCHPAD) ---
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [isVaultOpen, setIsVaultOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false); // [NEW: State added]

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        const { data, error } = await supabase.from('erp_global_scratchpad')
            .select('*')
            .order('updated_at', { ascending: false });
        if (data && data.length > 0) {
            setNotes(data);
            if (!activeNoteId) setActiveNoteId(data[0].id);
        }
    };

    const createNote = async () => {
        const { data, error } = await supabase.from('erp_global_scratchpad').insert([{ 
            title: 'New Strategic Thread', 
            content: '', 
            color_theme: 'bg-slate-900',
            is_todo_list: false 
        }]).select();
        
        if (data) {
            setNotes([data[0], ...notes]);
            setActiveNoteId(data[0].id);
            setIsMinimized(false);
        }
    };

    const updateNote = async (id, updates) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
        setIsSyncing(true);
        
        if (updates.reminder_date) {
            const active = notes.find(n => n.id === id);
            await supabase.from('erp_project_whiteboard').insert([{
                project_name: `REMINDER: ${active.title}`,
                daily_goal: active.content || 'Strategic Follow-up Required',
                deadline_date: updates.reminder_date,
                module_category: 'COMMAND'
            }]);
        }

        await supabase.from('erp_global_scratchpad').update(updates).eq('id', id);
        setTimeout(() => setIsSyncing(false), 800);
    };

    const deleteNote = async (id, e) => {
        e.stopPropagation();
        const { error } = await supabase.from('erp_global_scratchpad').delete().eq('id', id);
        if (!error) {
            const remaining = notes.filter(n => n.id !== id);
            setNotes(remaining);
            if (activeNoteId === id) setActiveNoteId(remaining[0]?.id || null);
        }
    };

    // --- [NEW: VAULT LOGIC ADDED] ---
    const toggleTodoItem = (index) => {
        const active = notes.find(n => n.id === activeNoteId);
        const lines = active.content.split('\n');
        const line = lines[index];
        if (line.startsWith('- [ ] ')) lines[index] = line.replace('- [ ] ', '- [x] ');
        else if (line.startsWith('- [x] ')) lines[index] = line.replace('- [x] ', '- [ ] ');
        else lines[index] = `- [ ] ${line}`;
        updateNote(active.id, { content: lines.join('\n') });
    };

    const handleVaultImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingImage(true);
        const fileName = `vault_${activeNoteId}_${Date.now()}`;
        const { data } = await supabase.storage.from('vault_evidence').upload(fileName, file);
        if (data) {
            const { data: urlData } = supabase.storage.from('vault_evidence').getPublicUrl(fileName);
            const active = notes.find(n => n.id === activeNoteId);
            updateNote(active.id, { content: active.content + `\n![Evidence](${urlData.publicUrl})` });
        }
        setUploadingImage(false);
    };

    const activeNote = notes.find(n => n.id === activeNoteId);

    const TABS = [
        { group: 'COMMAND', items: [
            { id: 'HORIZON', label: 'Horizon', icon: 'fa-gauge-high' },
            { id: 'DEALS', label: 'Deals', icon: 'fa-layer-group' }, // [NEW: Tab for Ingestion Pipeline]
            { id: 'INCUBATOR', label: 'Incubator', icon: 'fa-flask-vial' },
            { id: 'WATERFALL', label: 'Waterfall', icon: 'fa-faucet-drip' },
            { id: 'PERFORMANCE', label: 'Audit', icon: 'fa-user-shield' },
        ]},
        { group: 'TREASURY', items: [
            { id: 'VAULT', label: 'Vault', icon: 'fa-vault' },
            { id: 'LEDGER', label: 'Ledger', icon: 'fa-book' },
            { id: 'PAYROLL', label: 'Payroll', icon: 'fa-money-check-dollar' },
            { id: 'AGENCY', label: 'Agency', icon: 'fa-bullhorn' },
            { id: 'INVOICES', label: 'Invoices', icon: 'fa-file-invoice' },
        ]},
        { group: 'OPS', items: [
            { id: 'TEAM', label: 'Team', icon: 'fa-users' },
            { id: 'ASSETS', label: 'Portfolio', icon: 'fa-briefcase' },
            { id: 'CALENDAR', label: 'Calendar', icon: 'fa-calendar-days' }, // [FIXED: Icon typo]
            { id: 'BOARD', label: 'Strategy', icon: 'fa-chess-board' },
        ]}
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased flex flex-col relative overflow-hidden">
            
            {/* --- I. GLOBAL MASTER HEADER (Midnight High-Alert) --- */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-[1000] h-20 shadow-xl shrink-0">
                <div className="max-w-[1900px] mx-auto px-8 h-full flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-4 pr-12 border-r border-white/5">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">A</div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black tracking-tighter uppercase leading-none text-white">Auspex Strategic</span>
                                <span className="text-[9px] font-bold text-indigo-400 uppercase mt-1 tracking-widest">Command OS v10.0</span>
                            </div>
                        </div>

                        <div className="hidden xl:flex items-center gap-4 pl-4 bg-white/5 px-6 py-2 rounded-2xl border border-white/5">
                            <LedgerSentinel onAlertCountChange={() => {}} />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Security Node</span>
                                <span className="text-[10px] font-black text-emerald-400 uppercase mt-1 tracking-tight">Active Monitoring</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-right border-r border-white/5 pr-8">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none mb-1">Portfolio Liquidity</span>
                            <span className="text-lg font-black text-white tracking-tighter font-mono">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(treasuryBalance)}
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-indigo-600 border-2 border-white shadow-md flex items-center justify-center text-white cursor-pointer">
                            <i className="fa-solid fa-user-shield text-xs"></i>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- II. CLINICAL NAVIGATION TAPE --- */}
            <nav className="bg-white border-b border-slate-200 sticky top-20 z-[999] overflow-x-auto no-scrollbar shrink-0">
                <div className="max-w-[1900px] mx-auto px-6 flex items-center gap-1">
                    {TABS.map(group => (
                        <div key={group.group} className="flex items-center gap-1 pr-4 mr-4 border-r border-slate-100 last:border-0 py-2">
                            <span className="text-[8px] font-black text-slate-300 uppercase vertical-text origin-center -rotate-90 h-10 flex items-center tracking-widest">{group.group}</span>
                            {group.items.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveModule(tab.id); setSelectedBankId(null); }}
                                    className={`px-5 py-4 flex items-center gap-3 transition-all border-b-2 whitespace-nowrap ${
                                        activeModule === tab.id 
                                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30 font-black' 
                                        : 'border-transparent text-slate-400 hover:text-slate-900 font-bold'
                                    }`}
                                >
                                    <i className={`fa-solid ${tab.icon} text-xs`}></i>
                                    <span className="text-[10px] uppercase tracking-widest">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </nav>

            {/* --- III. MAIN WORKSPACE (Prop Passing + Deals Render) --- */}
            <main className="flex-1 w-full max-w-[1900px] mx-auto p-8 overflow-y-auto no-scrollbar pb-40">
                {activeModule === 'HORIZON' && <AnalyticsDashboard />}
                {activeModule === 'DEALS' && <DealFlowKanban />} {/* [NEW RENDER: Deals pipeline] */}
                {activeModule === 'INCUBATOR' && <IdeaVault />}
                
                {/* Waterfall now receives live ledger for math */}
                {activeModule === 'WATERFALL' && <AllocationEngine ledger={ledger} />}
                
                {/* Audit now receives real-time strategist and portfolio data */}
                {activeModule === 'PERFORMANCE' && <ManagerPerformance employees={employees} ledger={ledger} />}
                
                {activeModule === 'PAYROLL' && <PayrollHub />}
                {activeModule === 'VAULT' && !selectedBankId && <BankRegistry onSelectBank={setSelectedBankId} />}
                {activeModule === 'VAULT' && selectedBankId && (
                    <div className="space-y-6">
                        <button onClick={() => setSelectedBankId(null)} className="text-[9px] font-bold text-indigo-600 uppercase px-4 py-2 border border-indigo-100 rounded-lg bg-white">← Back to Vault</button>
                        <Passbook bankId={selectedBankId} />
                    </div>
                )}

                {activeModule === 'AGENCY' && <AgencyHUD />}
                {activeModule === 'LEDGER' && <Ledger />}
                {activeModule === 'CAP_TABLE' && <CapTable />}
                {activeModule === 'INVOICES' && <InvoiceManager />}
                {activeModule === 'TEAM' && <HrManager />}
                {activeModule === 'ASSETS' && <PortfolioManager />}
                {activeModule === 'BOARD' && <WhiteboardManager />}
                {activeModule === 'CALENDAR' && <Calendar />}
            </main>

            {/* --- IV. STRATEGIC VAULT (UPGRADED VERSION) --- */}
            <div 
                className={`fixed bottom-8 right-8 z-[10000] transition-all duration-500 ease-in-out flex flex-col items-end ${
                    !isVaultOpen ? 'w-14 h-14' : 
                    isMinimized ? 'w-80 h-16' : 'w-[850px] h-[580px]'
                }`}
            >
                {isVaultOpen ? (
                    <div className="w-full h-full bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 flex overflow-hidden animate-in zoom-in-95">
                        
                        {!isMinimized && (
                            <div className="w-60 border-r border-white/5 bg-black/30 flex flex-col shrink-0">
                                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inbox</span>
                                    <button onClick={createNote} className="text-indigo-400 hover:text-white transition-all"><i className="fa-solid fa-plus-circle text-sm"></i></button>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar">
                                    {notes.map(n => (
                                        <div 
                                            key={n.id} onClick={() => { setActiveNoteId(n.id); setIsMinimized(false); }} 
                                            className={`p-4 border-b border-white/5 cursor-pointer group relative ${activeNoteId === n.id ? 'bg-indigo-600/20 border-l-2 border-l-indigo-500' : 'hover:bg-white/5'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${n.color_theme || 'bg-slate-500'}`}></div>
                                                <div className={`text-[10px] font-bold truncate ${activeNoteId === n.id ? 'text-white' : 'text-slate-400'}`}>{n.title || 'Untitled'}</div>
                                            </div>
                                            <button onClick={(e) => deleteNote(n.id, e)} className="absolute right-3 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all"><i className="fa-solid fa-trash-alt text-[9px]"></i></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={`flex-1 flex flex-col transition-all duration-500 ${activeNote?.color_theme || 'bg-slate-900'}`}>
                            
                            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md">
                                <div className="flex items-center gap-4">
                                    {!isMinimized && (
                                        <>
                                            <input 
                                                value={activeNote?.title || ''}
                                                onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                                                className="bg-transparent text-xs font-black text-white uppercase tracking-widest outline-none w-48 focus:border-b border-indigo-500"
                                            />
                                            <div className="flex gap-1.5 ml-4">
                                                {['bg-slate-900', 'bg-[#0F172A]', 'bg-[#064E3B]', 'bg-[#450A0A]', 'bg-[#3B0764]'].map(c => (
                                                    <button key={c} onClick={() => updateNote(activeNote.id, { color_theme: c })} className={`w-3 h-3 rounded-full border border-white/20 ${c} ${activeNote?.color_theme === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`} />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {isMinimized && <span className="text-[10px] font-black text-white uppercase tracking-widest truncate w-48">{activeNote?.title || 'Active Thought'}</span>}
                                </div>
                                <div className="flex items-center gap-4">
                                    {isSyncing && !isMinimized && <span className="text-[8px] font-black text-emerald-400 animate-pulse uppercase tracking-widest">Telemetry Synced</span>}
                                    <button onClick={() => setIsMinimized(!isMinimized)} className="text-slate-400 hover:text-white"><i className={`fa-solid ${isMinimized ? 'fa-up-right-and-down-left-from-center' : 'fa-down-left-and-up-right-to-center'} text-xs`}></i></button>
                                    <button onClick={() => { setIsVaultOpen(false); setIsMinimized(false); }} className="text-slate-400 hover:text-white"><i className="fa-solid fa-times text-xs"></i></button>
                                </div>
                            </div>

                            {!isMinimized && activeNote && (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    {activeNote.is_todo_list ? (
                                        // RENDER: SMART LIST
                                        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar space-y-3">
                                            {activeNote.content.split('\n').map((line, idx) => (
                                                <div key={idx} onClick={() => toggleTodoItem(idx)} className="flex items-start gap-4 group cursor-pointer">
                                                    <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-all ${line.startsWith('- [x] ') ? 'bg-indigo-500 border-indigo-500' : 'border-white/30 group-hover:border-indigo-400'}`}>
                                                        {line.startsWith('- [x] ') && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                                                    </div>
                                                    <span className={`text-sm font-medium ${line.startsWith('- [x] ') ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                                        {line.replace('- [ ] ', '').replace('- [x] ', '') || 'New Task Item...'}
                                                    </span>
                                                </div>
                                            ))}
                                            <button onClick={() => updateNote(activeNote.id, { content: activeNote.content + '\n- [ ] ' })} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-6 hover:text-white">+ Add Mission Parameter</button>
                                        </div>
                                    ) : (
                                        <textarea 
                                            value={activeNote.content}
                                            onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                                            className="flex-1 bg-transparent p-10 text-[13px] text-slate-200 font-medium leading-relaxed outline-none resize-none custom-scrollbar"
                                            placeholder="Paste strategic directives..."
                                        />
                                    )}

                                    <div className="p-4 border-t border-white/5 flex items-center justify-between px-10 bg-black/10">
                                        <div className="flex gap-8 items-center">
                                            <button onClick={() => updateNote(activeNote.id, { is_todo_list: !activeNote.is_todo_list })} className={`text-xs ${activeNote.is_todo_list ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}><i className="fa-solid fa-list-check"></i></button>
                                            <label className="cursor-pointer text-slate-500 hover:text-indigo-400 transition-all">
                                                <i className={`fa-solid ${uploadingImage ? 'fa-circle-notch fa-spin' : 'fa-image'}`}></i>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleVaultImage} />
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <i className="fa-solid fa-calendar-day text-[10px] text-slate-500"></i>
                                                <input 
                                                    type="date" 
                                                    className="bg-transparent text-[9px] font-black text-indigo-400 uppercase outline-none cursor-pointer"
                                                    value={activeNote.reminder_date?.split('T')[0] || ''}
                                                    onChange={(e) => updateNote(activeNote.id, { reminder_date: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Auspex Cryptographic Layer Active</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setIsVaultOpen(true)} className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-indigo-600 transition-all border-4 border-white group">
                        <i className="fa-solid fa-brain group-hover:scale-110"></i>
                    </button>
                )}
            </div>
        </div>
    );
};

export default OperationsNexus;