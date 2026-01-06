import React from 'react';

const CompanyDNAFields = ({ company, isEditing, isSuperAdmin, onUpdate, domains }) => {
    const labelClass = "text-[10px] text-slate-500 uppercase font-black block mb-2 tracking-widest";
    const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[var(--brand-color)] outline-none shadow-inner font-bold";

    return (
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px] pointer-events-none"></div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tighter mb-6 flex items-center gap-3 underline decoration-blue-500/30 decoration-4 underline-offset-8">Startup DNA</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/5">
                <div>
                    <label className={labelClass}>Founder / Leadership</label>
                    {isEditing && isSuperAdmin ? (
                        <input className={inputClass} value={company.founders || ''} onChange={e => onUpdate('founders', e.target.value)} />
                    ) : (
                        <div className="text-white font-bold text-lg tracking-tight">{company.founders || 'N/A'}</div>
                    )}
                </div>
                <div>
                    <label className={labelClass}>Headquarters</label>
                    {isEditing && isSuperAdmin ? (
                        <input className={inputClass} value={company.reg_address || ''} onChange={e => onUpdate('reg_address', e.target.value)} />
                    ) : (
                        <div className="text-slate-300 font-bold truncate tracking-tight">{company.reg_address || 'N/A'}</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-white/5">
                <div>
                    <label className={labelClass}>Target Sector</label>
                    {isEditing && isSuperAdmin ? (
                        <select className={inputClass} value={company.domain_name || ''} onChange={e => onUpdate('domain_name', e.target.value)}>
                            {domains.map((d, i) => <option key={i} value={d.name}>{d.name}</option>)}
                        </select>
                    ) : (
                        <div className="text-[var(--brand-color)] text-[9px] font-bold uppercase tracking-widest bg-[var(--brand-color)]/10 px-3 py-1 rounded-lg border border-[var(--brand-color)]/20 inline-block">{company.domain_name || company.industry}</div>
                    )}
                </div>
                <div>
                    <label className={labelClass}>Official Email</label>
                    {isEditing && isSuperAdmin ? (
                        <input className={inputClass} value={company.email || ''} onChange={e => onUpdate('email', e.target.value)} />
                    ) : (
                        <div className="text-slate-400 text-xs font-bold truncate" title={company.email}>{company.email || '-'}</div>
                    )}
                </div>
                <div>
                    <label className={labelClass}>Registry Phone</label>
                    {isEditing && isSuperAdmin ? (
                        <input className={inputClass} value={company.mobile_no || ''} onChange={e => onUpdate('mobile_no', e.target.value)} />
                    ) : (
                        <div className="text-white text-xs font-mono font-bold">{company.mobile_no || '-'}</div>
                    )}
                </div>
                <div>
                    <label className={labelClass}>Website</label>
                    {isEditing && isSuperAdmin ? (
                        <input className={inputClass} value={company.website_url || ''} onChange={e => onUpdate('website_url', e.target.value)} />
                    ) : (
                        <a href={company.website_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs font-bold uppercase hover:underline tracking-widest">Portal</a>
                    )}
                </div>
            </div>

            <div>
                <label className={labelClass}>GST Registry ID</label>
                {isEditing && isSuperAdmin ? (
                    <input className={inputClass} value={company.gst || ''} onChange={e => onUpdate('gst', e.target.value)} />
                ) : (
                    <div className="text-slate-500 text-xs font-mono font-bold">{company.gst || 'N/A'}</div>
                )}
            </div>
        </div>
    );
};

export default CompanyDNAFields;