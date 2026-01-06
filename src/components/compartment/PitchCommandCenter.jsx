import React, { useState, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { supabase } from '../../lib/supabaseClient';
import ManualPitchForm from './ManualPitchForm';

const pitchCollection = db.collection("pitch_submissions");

const PitchCommandCenter = ({ 
    pitches, 
    managers, 
    domains, 
    refreshData, 
    isSuperAdmin, 
    formatCurrency, 
    generateDeterministicUUID 
}) => {
    const [editingId, setEditingId] = useState(null);
    const [tempStatus, setTempStatus] = useState('');
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);

    const allDomains = useMemo(() => domains.map(d => d.name), [domains]);

    const saveEdit = async (pitchId, originalStatus) => {
        try {
            await pitchCollection.doc(pitchId).update({ 
                status: tempStatus, 
                lastReviewedDate: new Date().toISOString() 
            });
            if (tempStatus === 'Interested' && originalStatus !== 'Interested') {
                const pitch = pitches.find(p => p.id === pitchId);
                const generatedUUID = generateDeterministicUUID(pitchId);
                await supabase.from('companies').upsert({ 
                    id: generatedUUID, name: pitch.startupName, industry: pitch.domain, type: 'startup', deal_status: 'WAITLIST' 
                }, { onConflict: 'id' }); 
            }
            setEditingId(null);
            if (refreshData) await refreshData();
        } catch (err) { console.error("Ledger Sync Failure:", err.message); }
    };

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
            {isManualModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4" onClick={() => setIsManualModalOpen(false)}>
                    <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <ManualPitchForm onClose={() => setIsManualModalOpen(false)} allDomains={allDomains} allRounds={['Seed', 'Series A', 'Debt']} refreshParentData={refreshData} formatCurrency={formatCurrency} />
                    </div>
                </div>
            )}

            {/* COMMAND HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-black/40 p-10 rounded-[2.5rem] border border-[#FFD700]/10 shadow-2xl backdrop-blur-xl">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Live Deal Pipeline</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Sovereign Alpha Injection Protocol</p>
                </div>
                <button 
                    onClick={() => setIsManualModalOpen(true)}
                    className="bg-gradient-to-r from-[#B8860B] to-[#FFD700] text-black px-8 py-3 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                    + Inject Manual Intelligence
                </button>
            </div>

            {/* TACTICAL CARD FEED */}
            <div className="grid grid-cols-1 gap-4">
                {pitches.map(pitch => (
                    <div 
                        key={pitch.id} 
                        className={`relative overflow-hidden group border transition-all duration-300 p-6 rounded-[2rem] bg-black/60 shadow-xl ${
                            editingId === pitch.id ? 'border-[#FFD700] bg-black/80' : 'border-white/5 hover:border-[#FFD700]/30'
                        }`}
                    >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                            
                            {/* ASSET IDENTITY */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-[8px] font-black bg-[#FFD700]/10 text-[#FFD700] px-2 py-0.5 rounded border border-[#FFD700]/20 uppercase tracking-widest">{pitch.fundingRound}</span>
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{pitch.domain}</span>
                                </div>
                                <h4 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-[#FFD700] transition-colors leading-tight">
                                    {pitch.startupName}
                                </h4>
                                <p className="text-[9px] text-slate-600 font-bold mt-1 uppercase tracking-widest">Logged: {new Date(pitch.submissionDate).toLocaleDateString()}</p>
                            </div>

                            {/* QUANTITATIVE DATA */}
                            <div className="flex flex-col lg:items-end bg-white/5 px-6 py-4 rounded-2xl border border-white/5 min-w-[180px] shadow-inner">
                                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Target Ask</span>
                                <span className="text-sm font-mono text-[#FFD700] font-black">{formatCurrency(pitch.fundingAmount)}</span>
                            </div>

                            {/* CONTROL ACTIONS */}
                            <div className="flex items-center gap-4 min-w-[210px] justify-end">
                                {editingId === pitch.id ? (
                                    <div className="flex flex-col gap-2 w-full">
                                        <select 
                                            value={tempStatus} 
                                            onChange={e => setTempStatus(e.target.value)}
                                            className="bg-black border border-[#FFD700] rounded-xl p-2 text-[9px] font-black text-white uppercase outline-none"
                                        >
                                            <option value="New">New</option>
                                            <option value="Interested">Interested</option>
                                            <option value="Rejected">Rejected</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <button onClick={() => saveEdit(pitch.id, pitch.status)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">Commit</button>
                                            <button onClick={() => setEditingId(null)} className="flex-1 bg-white/5 text-slate-500 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">Abort</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-5">
                                        <div className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                            pitch.status === 'Interested' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-900 border-white/5 text-slate-600'
                                        }`}>
                                            {pitch.status || 'New'}
                                        </div>
                                        {isSuperAdmin && (
                                            <button 
                                                onClick={() => { setEditingId(pitch.id); setTempStatus(pitch.status || 'New'); }}
                                                className="bg-white text-black px-5 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest shadow-lg hover:bg-[#FFD700] transition-all"
                                            >
                                                Modify Node
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PitchCommandCenter;