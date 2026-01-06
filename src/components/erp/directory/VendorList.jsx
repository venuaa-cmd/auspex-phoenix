import React from 'react';

const VendorList = ({ tabs, activeTab, setActiveTab, entities, selectedEntity, onSelect, onAddClick, loading }) => {
    return (
        <div className="col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm h-full">
            
            {/* TABS HEADER */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex flex-wrap gap-1 mb-3">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)} 
                            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded border transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                {/* CONDITIONAL BUTTON LOGIC */}
                {activeTab === 'TEAM' ? (
                    <div className="w-full py-3 bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold uppercase rounded flex items-center justify-center text-center px-4">
                        <i className="fa-solid fa-info-circle mr-2"></i> New members are managed in Team Tab
                    </div>
                ) : (
                    <button 
                        onClick={onAddClick}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-plus"></i> Add New {tabs.find(t => t.id === activeTab)?.label.slice(0, -1)}
                    </button>
                )}
            </div>

            {/* ENTITY LIST */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-10 text-slate-400 text-xs">Loading Directory...</div>
                ) : entities.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs italic">No records found.</div>
                ) : entities.map(e => {
                    const isSelected = selectedEntity?.id === e.id;
                    const isInactive = e.status === 'INACTIVE';
                    
                    return (
                        <div 
                            key={e.id} 
                            onClick={() => onSelect(e)} 
                            className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                                isSelected 
                                    ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 z-10' 
                                    : isInactive 
                                        ? 'bg-slate-50 border-slate-100 opacity-60 grayscale' 
                                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {/* AVATAR IN LIST */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border ${isSelected ? 'border-blue-200' : 'border-slate-100'} bg-slate-50`}>
                                    {e.photo_url ? (
                                        <img src={e.photo_url} alt={e.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <i className={`fa-solid ${e.type === 'ASSET' ? 'fa-gem' : e.type === 'TEAM' ? 'fa-user' : 'fa-briefcase'} text-slate-400 text-sm`}></i>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div className={`font-bold text-xs truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{e.name}</div>
                                        {isInactive && <i className="fa-solid fa-ban text-slate-300 text-xs ml-2"></i>}
                                    </div>
                                    <div className="flex gap-2 mt-0.5">
                                        {/* Tag Logic */}
                                        {e.type === 'VENDOR' ? (
                                            e.category && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide font-bold">{e.category}</span>
                                        ) : (
                                            e.category && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide font-bold truncate">{e.category.replace(/_/g, ' ')}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VendorList;