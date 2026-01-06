import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const WhiteboardManager = () => {
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');

    // LINKING RESOURCES
    const [employees, setEmployees] = useState([]);
    const [assets, setAssets] = useState([]);
    const ERP_NODES = ['LEDGER', 'PAYROLL', 'SIMULATION', 'INVOICES', 'DIRECTORY', 'CALENDAR', 'VAULT', 'STRATEGY'];

    const [editingGoal, setEditingGoal] = useState(null);
    const [formData, setFormData] = useState({
        project_name: '', daily_goal: '', module_category: 'GENERAL',
        completion_percent: 0, achieved_status: 'PENDING',
        blockers_analysis: '', notes: '', deadline_date: '',
        assigned_strategist_id: '', linked_asset_id: '', linked_component: ''
    });

    useEffect(() => { fetchGoals(); fetchResources(); }, []);

    const fetchGoals = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('erp_project_whiteboard')
            .select('*, erp_employees(full_name), erp_portfolio_assets(asset_name)')
            .order('created_at', { ascending: false });
        if (data) setGoals(data);
        setLoading(false);
    };

    const fetchResources = async () => {
        const { data: emp } = await supabase.from('erp_employees').select('id, full_name').eq('status', 'ACTIVE');
        const { data: ast } = await supabase.from('erp_portfolio_assets').select('id, asset_name').eq('status', 'ACTIVE');
        if (emp) setEmployees(emp);
        if (ast) setAssets(ast);
    };

    const updateInline = async (id, updates) => {
        const { error } = await supabase.from('erp_project_whiteboard').update(updates).eq('id', id);
        if (!error) {
            setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
        }
    };

    const handleSave = async () => {
        if (!formData.project_name) return alert("Mandate Title Required");
        
        const payload = {
            ...formData,
            assigned_strategist_id: formData.assigned_strategist_id || null,
            linked_asset_id: formData.linked_asset_id || null,
            linked_component: formData.linked_component || null
        };

        let error;
        if (editingGoal) {
            const { error: err } = await supabase.from('erp_project_whiteboard').update(payload).eq('id', editingGoal.id);
            error = err;
        } else {
            const { error: err } = await supabase.from('erp_project_whiteboard').insert([payload]);
            error = err;
        }

        if (!error) { 
            fetchGoals(); 
            closeModal();
        } else {
            alert("Database Error: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Physical deletion of strategic mandate? This cannot be undone.")) {
            const { error } = await supabase.from('erp_project_whiteboard').delete().eq('id', id);
            if (!error) fetchGoals();
        }
    };

    const openEdit = (goal) => {
        setEditingGoal(goal);
        setFormData({
            project_name: goal.project_name,
            daily_goal: goal.daily_goal,
            module_category: goal.module_category,
            completion_percent: goal.completion_percent,
            achieved_status: goal.achieved_status,
            blockers_analysis: goal.blockers_analysis || '',
            notes: goal.notes || '',
            deadline_date: goal.deadline_date ? goal.deadline_date.split('T')[0] : '',
            assigned_strategist_id: goal.assigned_strategist_id || '',
            linked_asset_id: goal.linked_asset_id || '',
            linked_component: goal.linked_component || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingGoal(null);
        setFormData({
            project_name: '', daily_goal: '', module_category: 'GENERAL',
            completion_percent: 0, achieved_status: 'PENDING',
            blockers_analysis: '', notes: '', deadline_date: '',
            assigned_strategist_id: '', linked_asset_id: '', linked_component: ''
        });
    };

    const processedGoals = useMemo(() => {
        let list = [...goals];
        if (filter !== 'ALL') list = list.filter(g => g.achieved_status === filter);
        return list.sort((a, b) => {
            if (sortBy === 'completion-desc') return b.completion_percent - a.completion_percent;
            if (sortBy === 'completion-asc') return a.completion_percent - b.completion_percent;
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }, [goals, filter, sortBy]);

    // UI HELPERS
    const highVisInput = "w-full border border-slate-200 bg-sky-50 rounded p-3 text-xs text-slate-900 font-bold focus:ring-1 focus:ring-indigo-600 outline-none transition-all";
    const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block";

    return (
        <div className="bg-[#F1F5F9] min-h-screen font-sans text-slate-900 p-8 antialiased">
            
            {/* 1. COMMAND STRIP */}
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 mb-10 flex flex-col xl:flex-row justify-between items-center gap-6 shadow-2xl">
                <div className="flex items-center gap-10">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-white">Strategic Board</h2>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 italic">Mandate Lifecycle Command</p>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-sm border border-white/10">
                        {['ALL', 'PENDING', 'PARTIAL', 'MISSED', 'ACHIEVED'].map(s => (
                            <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all ${filter === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{s}</button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <select onChange={(e) => setSortBy(e.target.value)} className="bg-white/10 border border-white/10 p-2.5 rounded-sm text-[10px] font-bold uppercase text-white outline-none focus:border-indigo-500">
                        <option value="newest" className="bg-slate-900">Newest First</option>
                        <option value="completion-desc" className="bg-slate-900">High Completion</option>
                        <option value="completion-asc" className="bg-slate-900">Low Completion</option>
                    </select>
                    <button onClick={() => { setEditingGoal(null); closeModal(); setIsModalOpen(true); }} className="px-8 py-3 bg-indigo-600 text-white rounded-sm text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all">
                        + Define Mandate
                    </button>
                </div>
            </div>

            {/* 2. OBJECTIVE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {processedGoals.map(goal => (
                    <div key={goal.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm hover:border-indigo-400 transition-all flex flex-col group relative">
                        
                        <div className="flex justify-between items-start mb-8">
                            <select 
                                value={goal.achieved_status}
                                onChange={(e) => updateInline(goal.id, { achieved_status: e.target.value })}
                                className={`text-[10px] font-black uppercase px-4 py-2 rounded-lg border outline-none transition-colors ${
                                    goal.achieved_status === 'ACHIEVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                    goal.achieved_status === 'MISSED' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-900 border-slate-200'
                                }`}
                            >
                                <option value="PENDING">Pending</option>
                                <option value="PARTIAL">Partial</option>
                                <option value="MISSED">Missed</option>
                                <option value="ACHIEVED">Achieved</option>
                            </select>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Set Deadline</label>
                                    <input type="date" className="text-[11px] font-bold text-slate-900 bg-slate-50 border border-slate-100 rounded px-2 py-1 outline-none focus:border-indigo-600 cursor-pointer" value={goal.deadline_date ? goal.deadline_date.split('T')[0] : ''} onChange={(e) => updateInline(goal.id, { deadline_date: e.target.value })} />
                                </div>
                                {/* EDIT & DELETE OPTIONS */}
                                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(goal)} className="text-slate-300 hover:text-indigo-600 transition-colors"><i className="fa-solid fa-pen-to-square"></i></button>
                                    <button onClick={() => handleDelete(goal.id)} className="text-slate-300 hover:text-rose-600 transition-colors"><i className="fa-solid fa-trash"></i></button>
                                </div>
                            </div>
                        </div>

                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-3 leading-tight">{goal.project_name}</h4>
                        <p className="text-[13px] text-slate-500 font-medium mb-8 leading-relaxed line-clamp-3">{goal.daily_goal}</p>

                        <div className="mb-10 space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-900 tracking-widest">
                                <span>Execution Phase</span>
                                <span className="text-indigo-600 font-black">{goal.completion_percent}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={goal.completion_percent} onChange={(e) => updateInline(goal.id, { completion_percent: Number(e.target.value) })} className="w-full h-1.5 bg-slate-100 rounded-full accent-indigo-600 appearance-none cursor-pointer" />
                        </div>

                        {/* FORENSIC TEXT ANALYSERS */}
                        <div className="space-y-6 flex-1">
                            <div className="bg-rose-50/50 p-6 rounded-[1.5rem] border border-rose-100">
                                <label className="text-[9px] font-black text-rose-600 uppercase block mb-2 tracking-widest">Blockers / Friction</label>
                                <textarea className="w-full bg-transparent text-[11px] font-bold text-rose-800 outline-none resize-none h-16 placeholder:text-rose-200 leading-relaxed" defaultValue={goal.blockers_analysis} onBlur={(e) => updateInline(goal.id, { blockers_analysis: e.target.value })} placeholder="Audit friction points..." />
                            </div>
                            <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Progress Context</label>
                                <textarea className="w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none resize-none h-16 placeholder:text-slate-200 leading-relaxed" defaultValue={goal.notes} onBlur={(e) => updateInline(goal.id, { notes: e.target.value })} placeholder="Reasoning for partial status..." />
                            </div>
                        </div>

                        {/* LINKED METADATA FOOTER */}
                        <div className="mt-10 pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Strategist</span>
                                <span className="text-[11px] font-bold text-slate-900 uppercase truncate block">{goal.erp_employees?.full_name || 'UNASSIGNED'}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Node Link</span>
                                <span className="text-[11px] font-bold text-indigo-600 uppercase italic truncate block">{goal.erp_portfolio_assets?.asset_name || goal.linked_component || 'GLOBAL'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 3. AUTHORIZATION MODAL (EDIT/CREATE) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[10000] flex items-center justify-center p-6">
                    <div className="bg-white p-12 rounded-sm w-full max-w-3xl shadow-2xl border border-slate-200 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-10 border-b-2 border-slate-900 pb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{editingGoal ? 'Modify Mandate' : 'Define Mandate'}</h2>
                            <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center text-slate-900 hover:bg-slate-100 rounded-full transition-all"><i className="fa-solid fa-xmark text-2xl"></i></button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClass}>Mandate Title (Project ID)</label>
                                    <input type="text" className={highVisInput} value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})} placeholder="e.g. Advaya AI Series A" />
                                </div>
                                <div>
                                    <label className={labelClass}>Audit Deadline</label>
                                    <input type="date" className={highVisInput} value={formData.deadline_date} onChange={e => setFormData({...formData, deadline_date: e.target.value})} />
                                </div>
                                <div>
                                    <label className={labelClass}>Strategic Objective</label>
                                    <textarea rows="4" className={highVisInput + " resize-none h-32"} value={formData.daily_goal} onChange={e => setFormData({...formData, daily_goal: e.target.value})} placeholder="Define strategic parameters..." />
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* LINKING NODES */}
                                <div>
                                    <label className={labelClass}>Assign Strategist</label>
                                    <select className={highVisInput} value={formData.assigned_strategist_id} onChange={e => setFormData({...formData, assigned_strategist_id: e.target.value})}>
                                        <option value="">-- No Assignee --</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Link Portfolio Asset</label>
                                    <select className={highVisInput} value={formData.linked_asset_id} onChange={e => setFormData({...formData, linked_asset_id: e.target.value})}>
                                        <option value="">-- No Asset Link --</option>
                                        {assets.map(a => <option key={a.id} value={a.id}>{a.asset_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Link ERP Component</label>
                                    <select className={highVisInput} value={formData.linked_component} onChange={e => setFormData({...formData, linked_component: e.target.value})}>
                                        <option value="">-- Standard Node --</option>
                                        {ERP_NODES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Progress (%)</label>
                                        <input type="number" className={highVisInput} value={formData.completion_percent} onChange={e => setFormData({...formData, completion_percent: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Category</label>
                                        <select className={highVisInput} value={formData.module_category} onChange={e => setFormData({...formData, module_category: e.target.value})}>
                                            <option value="GENERAL">General</option>
                                            <option value="FINANCE">Finance</option>
                                            <option value="OPERATIONS">Ops</option>
                                            <option value="MARKETING">Growth</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-slate-100">
                            <button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-5 rounded-sm text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all">
                                {editingGoal ? 'Confirm Update Commitment' : 'Confirm Mandate Commitment'}
                            </button>
                            <button onClick={closeModal} className="flex-1 bg-slate-50 text-slate-400 py-5 rounded-sm text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Abort</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhiteboardManager;