import React from 'react';

const CompanyDocumentVault = ({ fileLinks, isSuperAdmin, uploading, onUpload, onDelete }) => {
    return (
        <div className="bg-[#0f172a] border border-white/10 rounded-[60px] p-16 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[120px] pointer-events-none"></div>
            <h3 className="text-4xl font-bold text-white uppercase tracking-tighter mb-14 underline decoration-blue-500/30 decoration-8 underline-offset-[20px]">Document Intelligence Vault</h3>
            
            {isSuperAdmin && (
                <div className="mb-16">
                    <label className="w-full h-48 bg-black/40 border-2 border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center gap-5 cursor-pointer hover:bg-white/5 hover:border-[var(--brand-color)]/50 transition-all group shadow-inner">
                        <i className="fa-solid fa-cloud-arrow-up text-6xl text-slate-700 group-hover:text-[var(--brand-color)] transition-colors"></i>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.5em] group-hover:text-white font-bold">Deploy Term Sheet / Legal Asset</span>
                        <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
                    </label>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {fileLinks.map((link, idx) => (
                    <div key={idx} className="flex justify-between items-center p-8 bg-black/40 rounded-[35px] border border-white/5 hover:border-white/20 transition-all group shadow-2xl">
                        <div className="flex items-center gap-6 min-w-0">
                            <div className="w-16 h-16 rounded-[22px] bg-red-500/10 flex items-center justify-center text-red-500/50 shadow-inner"><i className="fa-solid fa-file-pdf text-2xl"></i></div>
                            <div className="min-w-0">
                                <a href={link} target="_blank" rel="noreferrer" className="text-white text-[13px] font-bold uppercase tracking-widest hover:text-[var(--brand-color)] truncate block">
                                    {link.split('/').pop().substring(0, 35)}...
                                </a>
                                <div className="text-[10px] text-slate-600 font-bold uppercase mt-1 tracking-[0.1em]">Validated Governance Asset</div>
                            </div>
                        </div>
                        {isSuperAdmin && (
                            <button onClick={() => onDelete(idx)} className="w-12 h-12 rounded-[18px] bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all shadow-2xl flex items-center justify-center">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CompanyDocumentVault;