import React, { useState, useMemo } from 'react';

const WhiteboardTable = ({ data, loading, onUpdate, onAddToCalendar }) => {
    const [editingId, setEditingId] = useState(null);
    
    // Edit States
    const [editStatus, setEditStatus] = useState('');
    const [editPercent, setEditPercent] = useState('');
    const [editObjective, setEditObjective] = useState(''); // NEW: Edit text

    // Sort States
    const [sortConfig, setSortConfig] = useState({ key: 'log_date', direction: 'descending' });

    // --- SORTING LOGIC ---
    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // --- HANDLERS ---
    const startEdit = (log) => {
        setEditingId(log.id);
        setEditStatus(log.achieved_status);
        setEditPercent(log.completion_percent);
        setEditObjective(log.daily_goal); // Pre-fill text
    };

    const handleSave = () => {
        onUpdate(editingId, { 
            achieved_status: editStatus, 
            completion_percent: editPercent,
            daily_goal: editObjective // Save text
        });
        setEditingId(null);
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'ACHIEVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'PARTIAL': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'MISSED': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-white text-slate-500 border-slate-200'; 
        }
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <i className="fa-solid fa-sort text-slate-300 ml-1"></i>;
        return sortConfig.direction === 'ascending' 
            ? <i className="fa-solid fa-sort-up text-blue-600 ml-1"></i> 
            : <i className="fa-solid fa-sort-down text-blue-600 ml-1"></i>;
    };

    return (
        <div className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-blue-100 bg-blue-50/30 flex justify-between items-center shrink-0">
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">Tactical Log</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{data.length} Entries</span>
            </div>
            
            <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-white shadow-sm">
                        <tr className="border-b border-blue-100 text-[10px] uppercase text-slate-500 cursor-pointer select-none">
                            <th className="p-4 font-bold tracking-wider w-24 hover:bg-slate-50" onClick={() => requestSort('log_date')}>
                                Date <SortIcon column="log_date"/>
                            </th>
                            <th className="p-4 font-bold tracking-wider w-28 hover:bg-slate-50" onClick={() => requestSort('module_category')}>
                                Module <SortIcon column="module_category"/>
                            </th>
                            <th className="p-4 font-bold tracking-wider hover:bg-slate-50" onClick={() => requestSort('daily_goal')}>
                                Objective <SortIcon column="daily_goal"/>
                            </th>
                            <th className="p-4 font-bold tracking-wider text-center w-28 hover:bg-slate-50" onClick={() => requestSort('achieved_status')}>
                                Status <SortIcon column="achieved_status"/>
                            </th>
                            <th className="p-4 font-bold tracking-wider w-24 hover:bg-slate-50" onClick={() => requestSort('completion_percent')}>
                                Progress <SortIcon column="completion_percent"/>
                            </th>
                            <th className="p-4 font-bold tracking-wider text-right w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan="6" className="p-10 text-center text-blue-900 font-bold animate-pulse">Loading Logs...</td></tr>
                        ) : sortedData.map((log) => {
                            const isEditing = editingId === log.id;
                            return (
                                <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                                    {/* 1. DATE */}
                                    <td className="p-4 font-mono text-slate-500 font-bold">{log.log_date}</td>
                                    
                                    {/* 2. MODULE */}
                                    <td className="p-4">
                                        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 font-bold uppercase truncate max-w-[80px] block text-center">
                                            {log.module_category || 'General'}
                                        </span>
                                    </td>

                                    {/* 3. OBJECTIVE (EDITABLE) */}
                                    <td className="p-4">
                                        {isEditing ? (
                                            <input 
                                                type="text" 
                                                value={editObjective} 
                                                onChange={e => setEditObjective(e.target.value)} 
                                                className="w-full p-2 border border-blue-300 rounded text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        ) : (
                                            <div>
                                                <div className="font-bold text-slate-800">{log.daily_goal}</div>
                                                {log.blockers_analysis && (
                                                    <div className="text-[10px] text-slate-400 mt-1 italic truncate max-w-xs">
                                                        <i className="fa-solid fa-circle-info mr-1"></i> {log.blockers_analysis}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    
                                    {/* 4. STATUS (EDITABLE) */}
                                    <td className="p-4 text-center">
                                        {isEditing ? (
                                            <select 
                                                value={editStatus} 
                                                onChange={e => setEditStatus(e.target.value)} 
                                                className="w-full p-2 border border-blue-200 bg-white text-slate-900 rounded text-xs font-bold outline-none"
                                            >
                                                <option value="PENDING">Pending</option>
                                                <option value="ACHIEVED">Achieved</option>
                                                <option value="PARTIAL">Partial</option>
                                                <option value="MISSED">Missed</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${getStatusStyle(log.achieved_status)}`}>
                                                {log.achieved_status}
                                            </span>
                                        )}
                                    </td>

                                    {/* 5. PROGRESS (EDITABLE) */}
                                    <td className="p-4">
                                        {isEditing ? (
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={editPercent} 
                                                    onChange={e => setEditPercent(e.target.value)} 
                                                    className="w-full p-2 border border-blue-200 bg-white text-slate-900 rounded text-right font-bold outline-none pr-6"
                                                />
                                                <span className="absolute right-2 top-2 text-slate-400 font-bold">%</span>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${log.completion_percent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                                        style={{ width: `${log.completion_percent}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-[9px] text-right font-bold text-slate-400 mt-1">{log.completion_percent}%</div>
                                            </div>
                                        )}
                                    </td>

                                    {/* 6. ACTIONS (CALENDAR + EDIT) */}
                                    <td className="p-4 text-right">
                                        {isEditing ? (
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={handleSave} className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-sm"><i className="fa-solid fa-check"></i></button>
                                                <button onClick={() => setEditingId(null)} className="w-6 h-6 rounded bg-red-100 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all shadow-sm"><i className="fa-solid fa-times"></i></button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => onAddToCalendar(log)} 
                                                    className="text-slate-300 hover:text-indigo-600 transition-colors"
                                                    title="Add to Calendar"
                                                >
                                                    <i className="fa-solid fa-calendar-plus"></i>
                                                </button>
                                                <button 
                                                    onClick={() => startEdit(log)} 
                                                    className="text-slate-300 hover:text-blue-600 transition-colors"
                                                    title="Edit Entry"
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {data.length === 0 && !loading && (
                            <tr><td colSpan="6" className="p-10 text-center text-slate-400 italic">No logs found. Start the mission.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WhiteboardTable;