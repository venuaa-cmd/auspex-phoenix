import React, { useState } from 'react';

const DetailedInvestModal = ({ companyName, domain, onClose, fundManagers, onOpenCompany }) => {
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg p-8 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-white font-bold text-xl mb-4">Manual Investment Entry</h2>
                <p className="text-slate-400 text-sm mb-6">
                    Adding investment record for <strong>{companyName || "New Asset"}</strong> ({domain}).
                </p>
                <div className="bg-yellow-900/20 border border-yellow-500/20 p-4 rounded-lg mb-6">
                    <p className="text-yellow-500 text-xs">
                        ⚠️ Quick-Add Feature is currently forwarding to the main portfolio manager.
                        Please use the "Add Investment" button in the Portfolio tab for full functionality.
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
                    <button onClick={onClose} className="px-6 py-2 bg-[var(--brand-color)] text-black font-bold rounded-lg text-sm">Got it</button>
                </div>
            </div>
        </div>
    );
};

export default DetailedInvestModal;