import React from 'react';

const MORAI_ScenarioSimulator = ({ companies, onRun }) => (
    <div className="bg-gradient-to-br from-[#FFD700]/10 to-transparent border border-[#FFD700]/10 p-12 rounded-[3rem] shadow-2xl">
        <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4">Strategic Alpha Simulator</h3>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">Test hypothetical unit prices to calculate total exposure impact.</p>
        <div className="flex flex-col md:flex-row gap-4 items-center">
            <select id="sim-asset" className="flex-1 bg-black/60 border border-white/10 rounded-xl p-4 text-[10px] text-white uppercase outline-none focus:border-[#FFD700]">
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input id="sim-price" type="number" placeholder="Unit Price" className="w-full md:w-48 bg-black/60 border border-white/10 rounded-xl p-4 text-[10px] text-white outline-none focus:border-[#FFD700]" />
            <button 
                onClick={() => onRun(document.getElementById('sim-price').value, document.getElementById('sim-asset').value)}
                className="w-full md:w-auto bg-[#FFD700] text-black px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
                Execute Analysis
            </button>
        </div>
    </div>
);

export default MORAI_ScenarioSimulator;