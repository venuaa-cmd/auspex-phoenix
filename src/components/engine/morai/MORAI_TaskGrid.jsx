import React from 'react';

const MORAI_TaskGrid = ({ alerts, onEdit }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {alerts.map(alert => (
            <div key={alert.id} className="p-8 rounded-[2.5rem] bg-black/60 border border-[#FFD700]/10 shadow-2xl relative overflow-hidden group">
                <div className={`absolute -right-10 -top-10 w-40 h-40 blur-[80px] opacity-10 ${alert.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-[#FFD700]'}`}></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <div className={`text-[8px] font-black uppercase tracking-[0.3em] mb-4 ${alert.severity === 'CRITICAL' ? 'text-red-400' : 'text-[#FFD700]'}`}>
                            {alert.type} ALERT
                        </div>
                        <p className="text-sm font-bold text-white uppercase tracking-tight leading-relaxed">{alert.msg}</p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[8px] font-black text-slate-600 uppercase">Alert ID: {alert.id.slice(-4)}</span>
                        <button onClick={() => onEdit(alert)} className="bg-white text-black px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-[#FFD700]">Manage Node</button>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export default MORAI_TaskGrid;