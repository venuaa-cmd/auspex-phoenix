import React, { useState, useEffect } from 'react';

const WhiteboardForm = ({ onAdd }) => {
    const [dailyGoal, setDailyGoal] = useState('');
    const [status, setStatus] = useState('PENDING');
    const [percent, setPercent] = useState('0');
    const [blockers, setBlockers] = useState('');
    
    // --- NEW: MODULE SELECTOR ---
    const [module, setModule] = useState('General');
    const [isCustomModule, setIsCustomModule] = useState(false);
    const [customModuleVal, setCustomModuleVal] = useState('');

    const PRESET_MODULES = ['General', 'Development', 'Marketing', 'Sales', 'Finance', 'HR', 'Legal', 'Operations'];

    // Smart Auto-Fill Logic
    useEffect(() => {
        if (status === 'ACHIEVED') setPercent('100');
        else if (status === 'PENDING') setPercent('0');
        else if (status === 'MISSED') setPercent('0');
    }, [status]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalModule = isCustomModule ? customModuleVal : module;
        
        onAdd({ dailyGoal, status, percent, blockers, module: finalModule });
        
        // Reset
        setDailyGoal(''); 
        setBlockers(''); 
        setStatus('PENDING'); 
        setPercent('0');
        setModule('General');
        setIsCustomModule(false);
        setCustomModuleVal('');
    };

    const labelClass = "block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider";
    const inputClass = "w-full border border-blue-100 rounded p-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition-all bg-white";

    return (
        <div className="bg-white border border-blue-100 rounded-xl shadow-sm p-6 sticky top-6">
            <div className="flex justify-between items-center mb-4 border-b border-blue-100 pb-3">
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-pen-nib"></i> Log Strategy
                </h3>
                <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold uppercase">New Entry</span>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* MODULE SELECTION */}
                <div>
                    <label className={labelClass}>Module / Department</label>
                    {!isCustomModule ? (
                        <div className="flex gap-2">
                            <select value={module} onChange={e => {
                                if (e.target.value === 'CUSTOM') setIsCustomModule(true);
                                else setModule(e.target.value);
                            }} className={inputClass}>
                                {PRESET_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                                <option value="CUSTOM">+ Add New Module</option>
                            </select>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                autoFocus
                                value={customModuleVal} 
                                onChange={e => setCustomModuleVal(e.target.value)} 
                                className={inputClass} 
                                placeholder="Enter Module Name..."
                            />
                            <button type="button" onClick={() => setIsCustomModule(false)} className="px-3 py-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><i className="fa-solid fa-times"></i></button>
                        </div>
                    )}
                </div>

                <div>
                    <label className={labelClass}>Daily Objective</label>
                    <input 
                        type="text" 
                        value={dailyGoal} 
                        onChange={e => setDailyGoal(e.target.value)} 
                        className={inputClass} 
                        placeholder="e.g. Close Seed Round"
                        required 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
                            <option value="PENDING">Pending</option>
                            <option value="ACHIEVED">Achieved</option>
                            <option value="PARTIAL">Partial</option>
                            <option value="MISSED">Missed</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Completion %</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={percent} 
                                onChange={e => setPercent(e.target.value)} 
                                className={`${inputClass} pr-6`}
                                min="0" max="100" 
                            />
                            <span className="absolute right-2 top-2 text-xs font-bold text-slate-400">%</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Blockers / Notes</label>
                    <textarea 
                        value={blockers} 
                        onChange={e => setBlockers(e.target.value)} 
                        className={`${inputClass} h-24 resize-none`} 
                        placeholder="Strategic analysis..."
                    />
                </div>

                <button type="submit" className="w-full bg-blue-900 text-white text-xs font-bold uppercase py-3 rounded hover:bg-blue-800 transition-all shadow-md mt-2 flex justify-center gap-2">
                    <i className="fa-solid fa-paper-plane"></i> Commit Entry
                </button>
            </form>
        </div>
    );
};

export default WhiteboardForm;