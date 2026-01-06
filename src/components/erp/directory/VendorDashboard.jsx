import React, { useState, useEffect } from 'react';

const VendorDashboard = ({ entity, onEdit }) => {
    const [imgError, setImgError] = useState(false);

    useEffect(() => { setImgError(false); }, [entity]);
    
    if (!entity) {
        return (
            <div className="col-span-8 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 h-full">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <i className="fa-solid fa-id-card text-3xl text-slate-200"></i>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider">Select an entry to view details</div>
            </div>
        );
    }

    const isInactive = entity.status === 'INACTIVE' || entity.status === 'EXITED';
    const isTeamMember = entity.type === 'TEAM';
    const isAsset = entity.type === 'ASSET';
    
    // ASSET SUB-TYPES
    const isRealEstate = isAsset && entity.category === 'REAL_ESTATE';
    const isCrypto = isAsset && entity.category === 'CRYPTO';

    // DYNAMIC LABELS
    const getLabel = (field) => {
        if (field === 'founder') return isRealEstate ? 'Contact Person' : 'Founder / Contact';
        if (field === 'hq') return isRealEstate ? 'Property Address' : 'HQ / Location';
        if (field === 'sector') return isRealEstate ? 'Property Type' : isCrypto ? 'Token Type' : 'Sector / Ticker';
        return 'Field';
    };

    return (
        <div className="col-span-8 flex flex-col gap-6 h-full animate-[fadeIn_0.2s_ease]">
            
            {/* HEADER */}
            <div className={`p-8 rounded-xl border shadow-sm flex justify-between items-start transition-all ${isInactive ? 'bg-slate-50 border-slate-200' : 'bg-white border-blue-100'}`}>
                <div className="flex gap-6 items-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-md overflow-hidden shrink-0 relative border-4 border-white ${isInactive ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                        {entity.photo_url && !imgError ? (
                            <img key={entity.id} src={entity.photo_url} alt={entity.name} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; setImgError(true); }} />
                        ) : (
                            <i className={`fa-solid ${isAsset ? (isRealEstate ? 'fa-building' : 'fa-gem') : isTeamMember ? 'fa-user' : 'fa-briefcase'}`}></i>
                        )}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{entity.name}</h2>
                        <div className="flex gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded tracking-wider border border-slate-200">{entity.type}</span>
                            
                            {/* VENDOR CATEGORY */}
                            {entity.type === 'VENDOR' && entity.default_expense_category && (
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold uppercase rounded tracking-wider border border-purple-100">{entity.default_expense_category}</span>
                            )}
                            
                            {/* ASSET CATEGORY */}
                            {entity.type !== 'VENDOR' && entity.category && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded tracking-wider border border-blue-100">{entity.category.replace(/_/g, ' ')}</span>
                            )}
                        </div>
                    </div>
                </div>

                {!isTeamMember && (
                    <button onClick={onEdit} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-200" title="Edit Details">
                        <i className="fa-solid fa-pen"></i>
                    </button>
                )}
            </div>

            {/* DETAILS GRID */}
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm flex-1 overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Entity Metadata</h3>
                
                <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                    
                    {/* --- ASSET SPECIFIC: DNA SECTION --- */}
                    {isAsset && (
                        <>
                            {/* Row 1: Contact Person & Location */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{getLabel('founder')}</label>
                                <div className="text-sm font-bold text-slate-800">{entity.founder_name || '-'}</div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{getLabel('hq')}</label>
                                <div className="text-sm font-bold text-slate-800 whitespace-pre-line">{entity.hq_location || '-'}</div>
                            </div>

                            {/* Row 2: Website (Startups only) */}
                            {entity.website_url && (
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Website</label>
                                    <a href={entity.website_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                                        {entity.website_url} <i className="fa-solid fa-external-link-alt text-[10px]"></i>
                                    </a>
                                </div>
                            )}

                            {/* Row 3: Type/Sector */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{getLabel('sector')}</label>
                                <div className="text-sm font-bold text-slate-800">{entity.ticker || entity.sector || '-'}</div>
                            </div>
                        </>
                    )}

                    {/* --- STANDARD FIELDS (Vendors/Clients/Team) --- */}
                    {!isAsset && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{isTeamMember ? 'Role / Title' : 'Legal Name'}</label>
                            <div className="text-sm font-bold text-slate-800">{isTeamMember ? entity.category : (entity.company_name || entity.name)}</div>
                        </div>
                    )}

                    {/* STATUS */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                        <div className={`text-xs font-bold px-2 py-1 rounded inline-block ${entity.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                            {entity.status || 'ACTIVE'}
                        </div>
                    </div>

                    {/* CONTACT INFO (Shared) */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contact</label>
                        <div className="text-sm text-slate-600">
                            <div className="mb-1 flex items-center gap-2"><i className="fa-solid fa-envelope w-4 text-slate-300"></i> {entity.email || '-'}</div>
                            <div className="flex items-center gap-2"><i className="fa-solid fa-phone w-4 text-slate-300"></i> {entity.phone || '-'}</div>
                        </div>
                    </div>

                    {/* NOTES */}
                    {!isTeamMember && (
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{isAsset ? 'Thesis / Notes' : 'Notes'}</label>
                            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded border border-slate-100">
                                {entity.notes || 'No notes recorded.'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VendorDashboard;