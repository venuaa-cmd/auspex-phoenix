import React from 'react';
import { Doughnut } from 'react-chartjs-2';

/**
 * Component for the AI-driven portfolio summary text.
 * Matches the left-column brain icon style.
 */
export const IntelligenceCard = ({ analysisText }) => {
    return (
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none"></div>
            
            <h4 className="text-xs font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
                <i className="fa-solid fa-brain"></i> Portfolio Intelligence
            </h4>
            
            <p className="text-white text-sm leading-relaxed font-medium border-l-2 border-blue-500/50 pl-3">
                {analysisText || "Analyzing portfolio performance..."}
            </p>
        </div>
    );
};

/**
 * Component for the Asset Allocation doughnut chart and class selectors.
 * Matches the left-column chart style.
 */
export const AllocationChart = ({ chartData, filterAssetClass, setFilterAssetClass, assetCount }) => {
    const assetTypes = ['All', 'Startup', 'RealEstate', 'Gold', 'Stock', 'Crypto'];

    return (
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex gap-4">
            {/* Asset Class Selectors */}
            <div className="flex flex-col gap-1 w-1/3">
                {assetTypes.map(t => (
                    <button 
                        key={t} 
                        onClick={() => setFilterAssetClass(t)} 
                        className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border 
                        ${filterAssetClass === t 
                            ? 'bg-[#facc15]/10 border-[#facc15] text-[#facc15] shadow-[0_0_15px_rgba(250,204,21,0.2)]' 
                            : 'bg-transparent border-transparent text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Doughnut Chart Container */}
            <div className="flex-1 flex justify-center items-center relative">
                <div className="w-32 h-32 relative">
                    <Doughnut 
                        data={chartData} 
                        options={{ 
                            cutout: '75%', 
                            plugins: { legend: { display: false } },
                            maintainAspectRatio: true 
                        }} 
                    />
                    
                    {/* Centered Asset Count Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <div className="text-[9px] text-slate-500 uppercase font-bold">Assets</div>
                            <div className="text-sm font-black text-white">{assetCount}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Default export for the combined Intelligence Column
export const PortfolioIntelligence = ({ analysisText, chartData, filterAssetClass, setFilterAssetClass, assetCount }) => {
    return (
        <div className="space-y-6">
            <IntelligenceCard analysisText={analysisText} />
            <AllocationChart 
                chartData={chartData} 
                filterAssetClass={filterAssetClass} 
                setFilterAssetClass={setFilterAssetClass} 
                assetCount={assetCount} 
            />
        </div>
    );
};