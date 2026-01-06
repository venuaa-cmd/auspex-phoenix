import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient'; 
import { storage } from '../../lib/firebase'; 
import { fetchPredictiveProjection, runAIAnalysis } from '../../lib/aiService';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';

// --- MODULAR COMPONENT IMPORTS ---
import CompanyTopHeader from './company/CompanyTopHeader';
import CompanyPerformanceTiles from './company/CompanyPerformanceTiles';
import InvestmentRoundModal from './company/InvestmentRoundModal'; 

// --- DETAIL VIEW IMPORTS ---
import StartupDetail from './StartupDetail';
import GoldDetail from './GoldDetail';
import RealEstateDetail from './RealEstateDetail';
import StockDetail from './StockDetail';
import CryptoDetail from './CryptoDetail'; 

// --- SHARED UTILS & MODALS ---
import LiquidityModal from '../LiquidityModal'; 
import { formatCurrency } from './company/IntelUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// --- CONFIGURATION ---
const PROXY_BASE_URL = "https://auspex-phoenix.vercel.app";

const ASSET_THEMES = {
    'startup': { color: '#3b82f6', bg: 'bg-blue-600', border: 'border-blue-500', icon: 'fa-rocket', label: 'Startup Equity' },
    'real_estate': { color: '#10b981', bg: 'bg-emerald-600', border: 'border-emerald-500', icon: 'fa-building', label: 'Real Estate' },
    'gold': { color: '#f59e0b', bg: 'bg-amber-600', border: 'border-amber-500', icon: 'fa-coins', label: 'Bullion' },
    'stock': { color: '#8b5cf6', bg: 'bg-violet-500', border: 'border-violet-500', icon: 'fa-chart-line', label: 'Public Stock' },    
    'crypto': { color: '#a855f7', bg: 'bg-purple-600', border: 'border-purple-500', icon: 'fa-bitcoin', label: 'Crypto Token' },
};

const getAssetType = (company) => {
    if (!company) return 'startup';
    const d = (company.domainName || company.industry || '').toLowerCase();
    const t = (company.type || '').toLowerCase();    
    if (t === 'stock' || t === 'public_equity' || d.includes('public stock')) return 'stock';
    if (d.includes('crypto') || t === 'crypto') return 'crypto';
    if (d.includes('gold') || t === 'gold') return 'gold';
    if (d.includes('real estate') || t === 'real_estate') return 'real_estate';
    return 'startup';
};

const CompanyDetailView = ({ company, onBack, allInvestments, fundManagers, userRole, domains = [], refreshData, currentUserEmail }) => {
    const [localCompany, setLocalCompany] = useState(company);
    const [investments, setInvestments] = useState([]);
    const [isEditingDNA, setIsEditingDNA] = useState(false);
    const [modalState, setModalState] = useState({ type: null, data: null, mode: 'buy' });
    const [activeTab, setActiveTab] = useState('Overview');
    const [fileLinks, setFileLinks] = useState(company.files || []);
    const [uploading, setUploading] = useState(false);
    const [livePrice, setLivePrice] = useState(0);

    const isSuperAdmin = userRole === 'admin' || userRole === 'super_admin';
    const assetType = getAssetType(localCompany);
    const theme = ASSET_THEMES[assetType] || ASSET_THEMES['startup'];

    // --- DATA SYNC ---
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                if (assetType === 'stock') {
                    const res = await fetch(`${PROXY_BASE_URL}/api/stock?name=${encodeURIComponent(localCompany.ticker || localCompany.companyName)}`);
                    const json = await res.json();
                    // Handling nested IndianAPI format
                    setLivePrice(parseFloat(json?.price?.NSE || json?.price || 0));
                } else if (assetType === 'gold') {
                    const res = await fetch(`${PROXY_BASE_URL}/api/gold`);
                    const data = await res.json();
                    setLivePrice(data.pricePerGram || 0);
                } else if (assetType === 'crypto') {
                    const ticker = (localCompany.ticker || 'BTC').toLowerCase();
                    const res = await fetch(`${PROXY_BASE_URL}/api/crypto?id=${ticker}`);
                    const data = await res.json();
                    setLivePrice(data.price || 0);
                }
            } catch (e) { console.warn("Forensic Price Sync Failure:", e); }
        };
        fetchPrice();
    }, [assetType, localCompany]);

    useEffect(() => { 
        setLocalCompany(company); 
        setFileLinks(company.files || []);
        const relevant = allInvestments.filter(i => String(i.company_id || i.companyId) === String(company.id));
        setInvestments(relevant.sort((a,b) => new Date(b.investment_date || b.investmentDate) - new Date(a.investment_date || a.investmentDate)));
    }, [company, allInvestments]);

    // --- HANDLERS ---
    const handleLocalUpdate = (field, value) => {
        if (!isSuperAdmin) return;
        setLocalCompany(prev => ({ ...prev, [field]: value }));
    };

    // DATABASE BRIDGE: This handles actual persistence to the 'companies' table
    const handleDirectUpdate = async (field, value) => { 
        if (!isSuperAdmin) return;
        handleLocalUpdate(field, value); 
        const { error } = await supabase.from('companies').update({ [field]: value }).eq('id', company.id); 
        if (error) console.error("Vault Save Error:", error.message);
    };

    const handleSaveProfile = async () => { 
        if (!isSuperAdmin) return;
        try { 
            const { error } = await supabase.from('companies').update(localCompany).eq('id', company.id);
            if (error) throw error;
            setIsEditingDNA(false); 
            if(refreshData) refreshData(); 
            alert("Sovereign Profile Updated");
        } catch(e) { alert("Save Error: " + e.message); } 
    };

    // ROUND HANDLERS
    const handleSaveRound = async (data) => {
        if (!isSuperAdmin) return;
        const { error } = await supabase.from('investments').upsert({ ...data, company_id: company.id });
        if (!error) { setModalState({ type: null }); if(refreshData) refreshData(); }
    };

    const handleUpdateRound = async (id, payload) => {
        if (!isSuperAdmin) return;
        setInvestments(prev => prev.map(inv => inv.id === id ? { ...inv, ...payload } : inv));
        await supabase.from('investments').update(payload).eq('id', id);
    };

    const handleDeleteRound = async (id) => { 
        if (!isSuperAdmin || !window.confirm("Delete transaction?")) return;
        await supabase.from('investments').delete().eq('id', id);
        setInvestments(prev => prev.filter(i => i.id !== id));
        if(refreshData) refreshData();
    };

    // FILE HANDLERS
    const handleFileUpload = async (e) => { 
        if (!isSuperAdmin) return;
        const file = e.target.files[0]; if (!file) return; setUploading(true); 
        try { 
            const fileRef = storage.ref().child(`company_docs/${company.id}/${Date.now()}_${file.name}`); 
            await fileRef.put(file); 
            const url = await fileRef.getDownloadURL(); 
            const updated = [...fileLinks, url]; 
            setFileLinks(updated); 
            await supabase.from('companies').update({ files: updated }).eq('id', company.id); 
        } catch (err) { alert("Vault Breach: " + err.message); } setUploading(false); 
    };

    const handleDeleteFile = async (idx) => { 
        if (!isSuperAdmin) return;
        const updated = fileLinks.filter((_, i) => i !== idx); 
        setFileLinks(updated); 
        await supabase.from('companies').update({ files: updated }).eq('id', company.id); 
    };

    // --- CALCULATIONS ---
    const stats = useMemo(() => {
        const totalInvested = investments.reduce((sum, i) => sum + (Number(i.amount_invested || i.fundingAmount)||0), 0);
        let currentVal = 0;

        if (['stock', 'crypto', 'gold'].includes(assetType) && livePrice > 0) {
            const totalQty = investments.reduce((sum, i) => sum + (Number(i.quantity || i.units || 0)), 0);
            currentVal = totalQty * livePrice;
        } else if (assetType === 'real_estate') {
            currentVal = (Number(localCompany.total_area) || 0) * (Number(localCompany.market_rate) || 0);
        } else {
            currentVal = investments.reduce((sum, i) => sum + (Number(i.current_valuation || i.amount_invested)||0), 0);
        }

        if (currentVal === 0 && totalInvested > 0) currentVal = totalInvested;
        
        return { 
            totalInvested, 
            currentVal, 
            profit: currentVal - totalInvested, 
            moic: totalInvested > 0 ? (currentVal / totalInvested).toFixed(2) : '1.00' 
        };
    }, [investments, livePrice, assetType, localCompany]);

    const runway = useMemo(() => {
        const cash = Number(localCompany.cash_balance) || 0;
        const burn = Number(localCompany.monthly_burn) || 0;
        const months = burn > 0 ? (cash / burn).toFixed(1) : '∞';
        return { months, color: months < 6 ? 'text-red-500' : months < 12 ? 'text-yellow-500' : 'text-green-400', status: months < 6 ? 'CRITICAL' : 'STABLE' };
    }, [localCompany]);

    return (
        <div className="animate-[fadeIn_0.3s_ease] pb-10 font-manrope relative">
            <CompanyTopHeader 
                company={localCompany} theme={theme} correctedAssetLabel={theme.label} 
                onBack={onBack} isSuperAdmin={isSuperAdmin} isEditingDNA={isEditingDNA} 
                setIsEditingDNA={setIsEditingDNA} handleSaveProfile={handleSaveProfile} 
                setModalState={setModalState} assetType={assetType} isStock={assetType === 'stock'} 
            />
            
            <CompanyPerformanceTiles stats={stats} formatCurrency={formatCurrency} />

            <div className="flex flex-col gap-8">
                {/* TAB CONTROLS */}
                <div className="flex border-b border-white/10 mb-2 gap-8">
                    {['Overview', 'Performance', 'Transactions', 'Vault'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-2 bg-transparent ${activeTab === tab ? 'text-white border-[var(--brand-color)] shadow-[0_4px_10px_-5px_var(--brand-glow)]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>{tab}</button>
                    ))}
                </div>

                {/* --- TAB CONTENT ROUTER --- */}
                <div className="mt-4">
                    {assetType === 'crypto' ? ( 
                        <CryptoDetail company={localCompany} investments={investments} setModalState={setModalState} onUpdate={handleDirectUpdate} isEditing={isEditingDNA} activeTab={activeTab} fileLinks={fileLinks} handleFileUpload={handleFileUpload} handleDeleteFile={handleDeleteFile} uploading={uploading} currentUserEmail={currentUserEmail} /> 
                    ) : assetType === 'gold' ? ( 
                        <GoldDetail company={localCompany} isEditing={isEditingDNA} onUpdate={handleDirectUpdate} activeTab={activeTab} investments={investments} stats={stats} setModalState={setModalState} handleDeleteRound={handleDeleteRound} livePrice={livePrice} fileLinks={fileLinks} handleDeleteFile={handleDeleteFile} fundManagers={fundManagers} currentUserEmail={currentUserEmail} /> 
                    ) : assetType === 'real_estate' ? ( 
                        <RealEstateDetail company={localCompany} isEditing={isEditingDNA} onUpdate={handleDirectUpdate} activeTab={activeTab} investments={investments} stats={stats} fundManagers={fundManagers} setModalState={setModalState} handleDeleteRound={handleDeleteRound} fileLinks={fileLinks} handleDeleteFile={handleDeleteFile} currentUserEmail={currentUserEmail} /> 
                    ) : assetType === 'stock' ? ( 
                        <StockDetail company={localCompany} isEditing={isEditingDNA} onUpdate={handleDirectUpdate} activeTab={activeTab} stats={stats} investments={investments} livePrice={livePrice} setModalState={setModalState} handleDeleteRound={handleDeleteRound} fileLinks={fileLinks} handleDeleteFile={handleDeleteFile} currentUserEmail={currentUserEmail} /> 
                    ) : ( 
                        <StartupDetail company={localCompany} isEditing={isEditingDNA} onUpdate={handleDirectUpdate} activeTab={activeTab} investments={investments} isSuperAdmin={isSuperAdmin} stats={stats} runway={runway} domains={domains} setModalState={setModalState} handleDeleteRound={handleDeleteRound} fileLinks={fileLinks} handleFileUpload={handleFileUpload} handleDeleteFile={handleDeleteFile} onUpdateRound={handleUpdateRound} fundManagers={fundManagers} currentUserEmail={currentUserEmail} /> 
                    )}
                </div>
            </div>

            {/* --- MODALS --- */}
            {modalState.type && (
                <InvestmentRoundModal companyName={localCompany.companyName} assetType={assetType} managers={fundManagers} allInvestments={allInvestments} onClose={() => setModalState({ type: null })} onSave={handleSaveRound} currentPrice={livePrice} mode={modalState.mode} existingRound={modalState.data} />
            )}
            {modalState.type === 'exit_transaction' && <LiquidityModal investment={modalState.data} companyName={localCompany.companyName} onClose={() => setModalState({ type: null })} onSuccess={(msg) => alert(msg)} />}
        </div>
    );
};

export default CompanyDetailView;