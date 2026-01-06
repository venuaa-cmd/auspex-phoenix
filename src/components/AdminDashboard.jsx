import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Core } from './CoreManifest'; 
import { auth, db } from '../lib/firebase';
import { supabase } from '../lib/supabaseClient';
import { v5 as uuidv5 } from 'uuid';
import { Chart as ChartJS } from 'chart.js/auto';

const APP_NAMESPACE = 'a90a210f-13a8-445a-8b09-771146607062';

const AdminDashboard = ({ userRole, currentUserId }) => {
    // --- CORE STATION STATE ---
    const [view, setView] = useState('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [domains, setDomains] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [fundManagers, setFundManagers] = useState([]);
    const [pitchSubmissions, setPitchSubmissions] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [userList, setUserList] = useState([]);
    const [liquidityEvents, setLiquidityEvents] = useState([]); 
    const [selectedCompanyId, setSelectedCompanyId] = useState(null); 

    // --- IDENTITY & SECURITY MATRIX ---
    const currentUserEmail = auth.currentUser?.email;
    const currentUserProfile = useMemo(() => userList.find(u => u.id === currentUserId), [userList, currentUserId]);
    const displayUserName = currentUserProfile?.fullName || (currentUserEmail || "Admin").split('@')[0];
    
    // SYNCED SECURITY CHECK
    const isSuperAdmin = currentUserEmail?.toLowerCase().trim() === 'venu.ananda@auspexinvestments.com';
    const canAccessERP = currentUserProfile?.erpAccess === true || isSuperAdmin;

    // --- TACTICAL DATA SYNC (SUPABASE) ---
    const fetchSupabaseData = useCallback(async () => {
        try {
            const { data: dData } = await supabase.from('domains').select('*'); if (dData) setDomains(dData);
            const { data: cData } = await supabase.from('companies').select('*'); if (cData) setCompanies(cData);
            const { data: iData } = await supabase.from('investments').select('*'); if (iData) setInvestments(iData);
            const { data: mData } = await supabase.from('fund_managers').select('*'); if (mData) setFundManagers(mData);
            const { data: lData } = await supabase.from('liquidity_events').select('*'); if (lData) setLiquidityEvents(lData);
        } catch (err) { console.error("CRITICAL_SYNC_FAILURE:", err); }
    }, []);

    // --- REAL-TIME FEED (FIREBASE) ---
    useEffect(() => {
        fetchSupabaseData();
        const unsub = db.collection("Employee_Login").onSnapshot(s => {
            setUserList(s.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        });
        const unsubP = db.collection("pitch_submissions").onSnapshot(s => setPitchSubmissions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsub(); unsubP(); };
    }, [fetchSupabaseData]);

    // --- ACTION HANDLERS ---
    const handleUpdateUserRole = useCallback(async (uid, role, linkedManagerId, erpAccess) => {
        try {
            await db.collection("Employee_Login").doc(uid).update({ role, linkedManagerId, erpAccess });
            alert("SECURITY_PROTOCOL: Role successfully synchronized.");
        } catch (err) {
            console.error("PROTOCOL_BREACH:", err);
            alert("Update Failed: " + err.message);
        }
    }, []);

    // --- QUANTITATIVE HELPERS ---
    const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
    const toWords = (n) => (Math.abs(n || 0) >= 10000000 ? `₹ ${(Math.abs(n) / 10000000).toFixed(2)} Cr` : formatCurrency(n));

    // --- SYSTEM NAVIGATION ---
    const navItems = [
        { id: 'overview', label: 'Overview 🏠' },
        { id: 'pitches', label: 'Pitch Flow ⚡' },
        { id: 'm_o_r_a_i', label: 'M.O.R.A.I Tasks 🧠' },
        { id: 'management', label: 'Managers 👥' },
        { id: 'budget', label: 'Budget Allocation 🏦' },
        { id: 'domains', label: 'Domains 🌐' },
        { id: 'portfolio', label: 'Full Portfolio 💼' },
        { id: 'simple_calendar', label: 'Tactical Ops 📅' },
        { id: 'market', label: 'Live Market 📈' },
        { id: 'intelligence', label: 'Intel Node 🛰️' },
        { id: 'research', label: 'AI Query 🔬' },
        { id: 'angels', label: 'Angel Investors 👼' },
        { id: 'deals', label: 'Deal Flow 📊' }
    ];
    if (isSuperAdmin) navItems.push({ id: 'visual_editor', label: 'Visual Editor ✒️' });
    if (canAccessERP) navItems.push({ id: 'ERP_NEXUS', label: 'Ops NEXUS 🛡️' });

    if (isLoading) return <div className="text-[#FFD700] font-black p-40 text-center animate-pulse tracking-[0.5em] uppercase">Securing Command Node...</div>;

    return (
        // FIX: Removed overflow-x-hidden to allow sticky children to function properly
        <div className="w-full min-h-screen bg-[#020617] p-8 text-slate-200 selection:bg-[#FFD700] selection:text-black">
            
            {/* MASTER HEADER */}
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-[#FFD700]/10">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Auspex <span className="text-[#FFD700]">Intel Core</span></h1>
                    <p className="text-[10px] font-black text-[#FFD700] uppercase mt-2 tracking-[0.4em] opacity-60">Sovereign Management OS</p>
                </div>
                <div className="flex items-center gap-10">
                    <div className="text-right border-r border-white/10 pr-10">
                        <p className="text-sm font-black text-white uppercase tracking-tighter">{displayUserName}</p>
                        <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest mt-1">Authorized Strategist</p>
                    </div>
                    <button onClick={() => auth.signOut()} className="bg-red-500/10 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Sign Out</button>
                </div>
            </div>

            {/* GILDED NAVIGATION TAPE */}
            <div className="flex overflow-x-auto gap-2 mb-10 p-2 bg-black/60 rounded-2xl border border-[#FFD700]/10  top-4 backdrop-blur-2xl no-scrollbar shadow-2xl">
                {navItems.map(item => (
                    <button 
                        key={item.id} 
                        onClick={() => { setView(item.id); setSelectedCompanyId(null); }} 
                        className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border whitespace-nowrap ${
                            view === item.id 
                            ? 'bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.2)] scale-105' 
                            : 'bg-transparent text-slate-500 border-transparent hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* STATION ROUTER ENGINE */}
            {/* FIX: Removed zoom-in-95 animation as transform traps sticky positioning */}
            <div className="w-full pb-32 animate-[fadeIn_0.7s_ease]">
                
                {view === 'overview' && <Core.SoverignOverview investments={investments} domains={domains} pitchSubmissions={pitchSubmissions} toWords={toWords} formatCurrency={formatCurrency} />}
                
                {view === 'pitches' && (
                    <Core.PitchCommandCenter 
                        pitches={pitchSubmissions} 
                        managers={fundManagers} 
                        domains={domains} 
                        investments={investments} 
                        refreshData={fetchSupabaseData} 
                        isSuperAdmin={isSuperAdmin} 
                        formatCurrency={formatCurrency} 
                        generateDeterministicUUID={(id) => uuidv5(id, APP_NAMESPACE)} 
                    />
                )}
                
                {view === 'm_o_r_a_i' && (
                    <Core.MORAI_TaskTableView 
                        companies={companies} 
                        investments={investments}
                        users={userList}
                        managers={fundManagers}
                        onSelectCompany={(company) => { setSelectedCompanyId(company.id); setView('portfolio'); }} 
                        onSelectPitch={() => setView('pitches')} 
			currentUserId={currentUserId}
			isSuperAdmin={isSuperAdmin}
			refreshData={fetchSupabaseData}
                    />
                )}
                
                {view === 'management' && (
                    <div className="w-full">
                        <Core.ManagerManagementView 
                            fundManagers={fundManagers} 
                            investments={investments} 
                            liquidityEvents={liquidityEvents} 
                            domains={domains} 
                            userRole={userRole} 
                            userList={userList}
                            companies={companies}
                            refreshData={fetchSupabaseData} 
                            formatCurrency={formatCurrency}
                            onUpdateUserRole={handleUpdateUserRole} 
                            currentUserId={currentUserId}
                            isSuperAdmin={isSuperAdmin}
                        />
                    </div>
                )}
                
                {view === 'budget' && <Core.DomainBudgetManagement domains={domains} toWords={toWords} formatCurrency={formatCurrency} isSuperAdmin={isSuperAdmin} />}
                
                {view === 'domains' && <Core.DomainManager domains={domains} refreshData={fetchSupabaseData} isSuperAdmin={isSuperAdmin} userRole={userRole} />}
                
                {view === 'portfolio' && (
                    <Core.PortfolioManager 
                        investments={investments} 
                        companies={companies} 
                        domains={domains} 
                        selectedCompanyId={selectedCompanyId}
                        fundManagers={fundManagers}
                        onSelectCompany={(id) => setSelectedCompanyId(id)} 
                        isSuperAdmin={isSuperAdmin}
                        currentUserEmail={currentUserEmail}
                        refreshData={fetchSupabaseData}
                    />
                )}
                
                {view === 'simple_calendar' && <Core.TacticalCalendar companies={companies} pitches={pitchSubmissions} users={userList} />}
                
                {view === 'market' && <Core.StockTracker />}
                
                {view === 'intelligence' && <Core.NewsWidget />}
                
                {view === 'research' && <Core.ResearchQueryWidget />}
                
		{view === 'angels' && <Core.AngelInvestorDirectory userRole={isSuperAdmin ? 'super_admin' : 'viewer'} />}
                
                {view === 'deals' && <Core.DealFlowWidget userRole={isSuperAdmin ? 'admin' : 'viewer'} />}
                
                {view === 'visual_editor' && isSuperAdmin && <Core.VisualEditor />}
                
                {view === 'ERP_NEXUS' && canAccessERP && <Core.ErpVaultGate />}
            </div>
        </div>
    );
};

export default AdminDashboard;