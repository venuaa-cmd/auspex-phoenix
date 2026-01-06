import React from 'react';

const editBtnStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const saveBtnStyle = { backgroundColor: '#16a34a', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };

const CompanyTopHeader = ({ 
    company, 
    theme, 
    correctedAssetLabel, 
    onBack, 
    isSuperAdmin, 
    isEditingDNA, 
    setIsEditingDNA, 
    handleSaveProfile, 
    setModalState,
    assetType,
    isStock
}) => {
    return (
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} style={editBtnStyle}>← Back</button>
                
                {isEditingDNA ? (
                    <input 
                        className="bg-black/40 border-b border-white/20 text-3xl font-black text-white focus:outline-none focus:border-[var(--brand-color)] w-96" 
                        value={company.name} 
                        onChange={e => setIsEditingDNA(e.target.value)} // Note: handeled by localUpdate in parent
                    />
                ) : (
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">
                        {company.name}
                    </h1>
                )}
                
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-black/40 text-white ${theme.border} flex items-center gap-2`}>
                    <i className={`fa-solid ${theme.icon}`}></i> {correctedAssetLabel}
                </span>
            </div>

            <div className="flex gap-2">
                {isSuperAdmin && (
                    <>
                        {isEditingDNA ? (
                            <>
                                <button onClick={() => setIsEditingDNA(false)} style={editBtnStyle} className="hover:text-white">Cancel</button>
                                <button onClick={handleSaveProfile} style={saveBtnStyle}>Save Profile</button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditingDNA(true)} style={editBtnStyle}>Edit DNA</button>
                        )}
                        {!isStock && (
                            <button 
                                onClick={() => setModalState({ type: 'add', mode: 'buy' })} 
                                className="bg-[var(--brand-color)] text-black px-6 py-2 rounded-lg font-bold hover:brightness-110 shadow-[0_0_15px_var(--brand-glow)] uppercase text-[10px] tracking-widest transition-all"
                            >
                                {assetType === 'startup' ? '+ Add Round' : '+ Transaction'}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CompanyTopHeader;