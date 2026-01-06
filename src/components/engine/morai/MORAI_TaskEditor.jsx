import React, { useState } from 'react';
import { db } from '../../../lib/firebase';

const MORAI_TaskEditor = ({ task, onClose }) => {
    const [msg, setMsg] = useState(task.msg || '');
    const [severity, setSeverity] = useState(task.severity || 'MEDIUM');
    const [type, setType] = useState(task.type || 'RISK');
    const [status, setStatus] = useState(task.status || 'active');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await db.collection("ai_triggers").doc(task.id).update({
                msg,
                severity,
                type,
                status,
                updatedAt: new Date().toISOString()
            });
            onClose();
        } catch (err) {
            console.error("Security Breach: Update Blocked", err);
            alert("Update Failed: Verify Master Permissions.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Permanent Deletion Authorized?")) return;
        try {
            await db.collection("ai_triggers").doc(task.id).delete();
            onClose();
        } catch (err) {
            console.error("Delete Blocked", err);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-6">
            <div className="w-full max-w-xl bg-[#020617] border border-[#FFD700]/20 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* MODAL HEADER */}
                <div className="p-10 border-b border-white/5 bg-gradient-to-r from-[#FFD700]/5 to-transparent flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Modify Intelligence Node</h3>
                        <p className="text-[9px] font-bold text-[#FFD700] uppercase tracking-[0.4em] mt-1">Manual Override Active</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div className="p-10 space-y-8">
                    {/* MESSAGE OVERRIDE */}
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Intelligence Directive</label>
                        <textarea 
                            value={msg}
                            onChange={(e) => setMsg(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white uppercase tracking-tight h-32 outline-none focus:border-[#FFD700] transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* SEVERITY CONTROL */}
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Severity Level</label>
                            <select 
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[10px] font-black text-white uppercase outline-none focus:border-[#FFD700]"
                            >
                                <option value="CRITICAL">Critical Strike</option>
                                <option value="HIGH">High Priority</option>
                                <option value="MEDIUM">Standard Watch</option>
                            </select>
                        </div>

                        {/* TYPE CONTROL */}
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Analysis Type</label>
                            <select 
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[10px] font-black text-white uppercase outline-none focus:border-[#FFD700]"
                            >
                                <option value="RISK">Risk Containment</option>
                                <option value="OPPORTUNITY">Strategic Alpha</option>
                                <option value="MAINTENANCE">Operational Pulse</option>
                            </select>
                        </div>
                    </div>

                    {/* STATUS TOGGLE */}
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Deployment Status</label>
                        <div className="flex gap-4">
                            {['active', 'resolved', 'archived'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${
                                        status === s 
                                        ? 'bg-[#FFD700] text-black border-[#FFD700]' 
                                        : 'bg-white/5 text-slate-500 border-transparent hover:border-white/10'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="p-10 bg-black/40 border-t border-white/5 flex justify-between items-center">
                    <button 
                        onClick={handleDelete}
                        className="text-red-500/50 hover:text-red-500 text-[9px] font-black uppercase tracking-widest transition-colors"
                    >
                        Purge Node
                    </button>
                    <div className="flex gap-4">
                        <button 
                            onClick={onClose}
                            className="text-slate-500 text-[9px] font-black uppercase tracking-widest px-6 py-3"
                        >
                            Abort
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-white text-black px-10 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-[#FFD700] transition-all disabled:opacity-50"
                        >
                            {isSaving ? 'Syncing...' : 'Commit Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MORAI_TaskEditor;