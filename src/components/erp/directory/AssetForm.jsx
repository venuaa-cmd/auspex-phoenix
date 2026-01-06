import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { UI } from '../../../lib/uiTheme';

const AssetForm = ({ isOpen, onClose, onAdd, selectedType, initialData }) => {
    if (!isOpen) return null;

    const [saving, setSaving] = useState(false);
    const [domainOptions, setDomainOptions] = useState([]); 
    const [loadingDomains, setLoadingDomains] = useState(false);
    
    // 1. DETERMINE ASSET TYPE
    const assetType = initialData?.category || selectedType;
    
    // 2. TYPE FLAGS
    const isStartup = assetType === 'STARTUP_EQUITY';
    const isRealEstate = assetType === 'REAL_ESTATE';
    const isPublicStock = assetType === 'PUBLIC_STOCK';
    const isCrypto = assetType === 'CRYPTO';
    const isBullion = assetType === 'BULLION';

    // Public Stock is the ONLY one without a Domain Dropdown
    const showDomainDropdown = !isPublicStock; 
    
    // Ticker is for Stocks and Crypto
    const showTicker = isPublicStock || isCrypto;

    const [formData, setFormData] = useState({
        asset_name: '', ticker: '', sector: '', 
        status: 'ACTIVE', notes: '', 
        founder_name: '', hq_location: '', website_url: '', 
        contact_email: '', contact_phone: '', tax_id: ''
    });

    // 3. LOAD DATA (Edit Mode)
    useEffect(() => {
        if (initialData) {
            setFormData({
                asset_name: initialData.name || '',
                ticker: initialData.ticker || '',
                sector: initialData.sector || '',
                status: initialData.status || 'ACTIVE',
                notes: initialData.notes || '',
                founder_name: initialData.founder_name || '',
                hq_location: initialData.hq_location || '',
                website_url: initialData.website_url || '',
                contact_email: initialData.contact_email || '',
                contact_phone: initialData.contact_phone || '',
                tax_id: initialData.tax_id || ''
            });
        } else {
            setFormData({
                asset_name: '', ticker: '', sector: '', 
                status: 'ACTIVE', notes: '', 
                founder_name: '', hq_location: '', website_url: '', 
                contact_email: '', contact_phone: '', tax_id: ''
            });
        }
    }, [initialData, isOpen]);

    // 4. FETCH DOMAINS (Filtered by Asset Class)
    useEffect(() => {
        const fetchDomains = async () => {
            if (!showDomainDropdown) return; // Skip for Public Stocks

            setLoadingDomains(true);
            const { data } = await supabase
                .from('domains')
                .select('name')
                .eq('asset_class', assetType) // <--- CRITICAL FIX: Filter by Type
                .order('name');
            
            if (data) setDomainOptions(data);
            setLoadingDomains(false);
        };
        fetchDomains();
    }, [assetType, showDomainDropdown]);

    const handleSubmit = async () => {
        if (!formData.asset_name) return alert("Asset Name is required");
        setSaving(true);

        const payload = {
            asset_name: formData.asset_name,
            asset_type: assetType,
            ticker: formData.ticker,
            sector: formData.sector,
            status: formData.status,
            notes: formData.notes,
            founder_name: formData.founder_name,
            hq_location: formData.hq_location,
            website_url: formData.website_url,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            tax_id: formData.tax_id
        };

        let error;
        if (initialData) {
            const { error: err } = await supabase.from('erp_portfolio_assets').update(payload).eq('id', initialData.id);
            error = err;
        } else {
            const { error: err } = await supabase.from('erp_portfolio_assets').insert([payload]);
            error = err;
        }

        setSaving(false);
        if (error) alert("Error: " + error.message);
        else {
            onAdd();
            onClose();
        }
    };

    // DYNAMIC LABELS
    const getDomainLabel = () => {
        if (isRealEstate) return "Property Type";
        if (isCrypto) return "Token Type";
        if (isBullion) return "Metal Type";
        return "Sector / Domain";
    };

    const getNameLabel = () => {
        if (isRealEstate) return "Property Name / ID";
        if (isCrypto) return "Token Name";
        return "Asset Name";
    };

    return (
        <div className={UI.form.modalOverlay}>
            <div className={UI.form.modalBox}>
                
                {/* HEADER */}
                <div className={UI.form.modalHeader}>
                    <div>
                        <h3 className={UI.form.modalTitle}>
                            {initialData ? 'Edit Asset DNA' : 'Add New Asset'}
                        </h3>
                        <div className="text-[10px] text-blue-600 font-bold mt-0.5">{assetType?.replace(/_/g, ' ')}</div>
                    </div>
                    <button onClick={onClose} className={UI.form.modalCloseBtn}><i className="fa-solid fa-times"></i></button>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={UI.form.label}>{getNameLabel()}</label>
                            <input 
                                className={UI.form.input} 
                                placeholder={isRealEstate ? "e.g. Prestige Lakeside" : "e.g. Bitcoin"} 
                                value={formData.asset_name} 
                                onChange={e => setFormData({...formData, asset_name: e.target.value})} 
                            />
                        </div>
                        
                        {/* DOMAIN DROPDOWN (Hidden for Public Stocks) */}
                        {showDomainDropdown && (
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className={UI.form.label}>{getDomainLabel()}</label>
                                    {loadingDomains && <span className="text-[8px] text-slate-400">Loading...</span>}
                                </div>
                                <select 
                                    className={UI.form.input} 
                                    value={formData.sector} 
                                    onChange={e => setFormData({...formData, sector: e.target.value})}
                                >
                                    <option value="">-- Select --</option>
                                    {domainOptions.length > 0 ? (
                                        domainOptions.map(d => <option key={d.name} value={d.name}>{d.name}</option>)
                                    ) : (
                                        <option disabled>No options found in DB</option>
                                    )}
                                </select>
                            </div>
                        )}

                        {/* STATUS is always visible */}
                        <div className={!showDomainDropdown ? "col-span-2" : ""}>
                            <label className={UI.form.label}>Status</label>
                            <select className={UI.form.input} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                <option value="ACTIVE">Active</option>
                                <option value="WATCHLIST">Watchlist</option>
                                <option value="SOLD">Sold / Exited</option>
                            </select>
                        </div>
                    </div>

                    {/* --- A. REAL ESTATE SPECIFIC FIELDS --- */}
                    {isRealEstate && (
                        <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-4">
                            <div className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-200 pb-1 mb-2">Property Details</div>
                            
                            <div>
                                <label className={UI.form.label}>Property Address</label>
                                <textarea 
                                    className={UI.form.input} 
                                    rows="2" 
                                    value={formData.hq_location} // Mapped to hq_location
                                    onChange={e => setFormData({...formData, hq_location: e.target.value})} 
                                    placeholder="#123, Street Name..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={UI.form.label}>Contact Person</label>
                                    <input 
                                        className={UI.form.input} 
                                        value={formData.founder_name} // Mapped to founder_name
                                        onChange={e => setFormData({...formData, founder_name: e.target.value})} 
                                        placeholder="Agent / Owner"
                                    />
                                </div>
                                <div>
                                    <label className={UI.form.label}>Contact Phone</label>
                                    <input className={UI.form.input} value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} />
                                </div>
                            </div>
                            
                            <div>
                                <label className={UI.form.label}>Contact Email</label>
                                <input className={UI.form.input} value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} />
                            </div>
                        </div>
                    )}

                    {/* --- B. STARTUP DNA --- */}
                    {isStartup && (
                        <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-4">
                            <div className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-200 pb-1 mb-2">Startup DNA</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={UI.form.label}>Founder Name</label><input className={UI.form.input} value={formData.founder_name} onChange={e => setFormData({...formData, founder_name: e.target.value})} /></div>
                                <div><label className={UI.form.label}>HQ Location</label><input className={UI.form.input} value={formData.hq_location} onChange={e => setFormData({...formData, hq_location: e.target.value})} /></div>
                            </div>
                            <div><label className={UI.form.label}>Website URL</label><input className={UI.form.input} value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={UI.form.label}>Contact Email</label><input className={UI.form.input} value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} /></div>
                                <div><label className={UI.form.label}>Contact Phone</label><input className={UI.form.input} value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} /></div>
                            </div>
                            <div><label className={UI.form.label}>GST / Tax ID</label><input className={UI.form.input} value={formData.tax_id} onChange={e => setFormData({...formData, tax_id: e.target.value})} /></div>
                        </div>
                    )}

                    {/* --- C. TICKER (Stock & Crypto) --- */}
                    {showTicker && (
                        <div>
                            <label className={UI.form.label}>Ticker Symbol</label>
                            <input 
                                className={UI.form.input} 
                                placeholder={isCrypto ? "e.g. BTC / ETH" : "e.g. AAPL / RELIANCE"} 
                                value={formData.ticker} 
                                onChange={e => setFormData({...formData, ticker: e.target.value})} 
                            />
                        </div>
                    )}

                    <div>
                        <label className={UI.form.label}>Thesis / Notes</label>
                        <textarea className={UI.form.input} rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Strategic Investment Thesis..." />
                    </div>

                    <button onClick={handleSubmit} disabled={saving} className={UI.btn.primary}>
                        {saving ? 'Saving...' : 'Save Asset Profile'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssetForm;