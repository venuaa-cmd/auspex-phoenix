import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MORAI_MarketPulseChart = ({ data }) => {
    return (
        <div className="bg-black/60 border border-[#FFD700]/10 p-10 rounded-[3rem] shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-1000">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Sovereign <span className="text-[#FFD700]">Market Pulse</span></h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">52-Week Tactical Performance & Volatility</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#FFD700] shadow-[0_0_10px_gold]"></div>
                        <span className="text-[8px] font-black text-white uppercase">Portfolio Alpha</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorAlpha" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#FFD700" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#475569" 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(val) => val.toUpperCase()}
                        />
                        <YAxis 
                            stroke="#475569" 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(val) => `₹${val}Cr`}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#020617', border: '1px solid #FFD70033', borderRadius: '1rem', fontSize: '10px', fontWeight: '900', color: '#fff' }}
                            itemStyle={{ color: '#FFD700' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#FFD700" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorAlpha)" 
                            animationDuration={2000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MORAI_MarketPulseChart;