import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

// --- SUB-COMPONENTS ---
import WarRoom from '../simulation/WarRoom'; // THE WARZONE
import DashboardOverview from './DashboardOverview';
import CapitalEfficiency from './CapitalEfficiency';
import Projections from './Projections';
import IncomeAnalysis from './IncomeAnalysis';
import ExpenseDeepDive from './ExpenseDeepDive';
import InvestmentDeepDive from './InvestmentDeepDive';
import CapitalForm from '../ledger/CapitalForm';
import MarketWatcher from '../market/MarketWatcher'; // [NEW: Intelligence Pulse Integration]

const AnalyticsDashboard = () => {
    const [activeTab, setActiveTab] = useState('WARZONE'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isCapitalFormOpen, setIsCapitalFormOpen] = useState(false);

    const [data, setData] = useState({
        ledger: [],
        assets: [],
        employees: [],
        loans: [],
        equityRounds: []
    });

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [lRes, aRes, eRes, loanRes, eqRes] = await Promise.all([
                supabase.from('erp_ledger').select('*').order('transaction_date', { ascending: false }),
                supabase.from('erp_portfolio_assets').select('*').eq('status', 'ACTIVE'),
                supabase.from('erp_employees').select('*').eq('status', 'ACTIVE'),
                supabase.from('erp_loans').select('*').eq('status', 'ACTIVE'),
                supabase.from('erp_equity_rounds').select('*')
            ]);

            setData({
                ledger: lRes.data || [],
                assets: aRes.data || [],
                employees: eRes.data || [],
                loans: loanRes.data || [],
                equityRounds: eqRes.data || []
            });
        } catch (error) {
            console.error("Critical System Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border border-slate-100">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-4">Calibrating Analytics...</p>
        </div>
    );

    const tabBase = "px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap";
    const activeClass = "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100";
    const inactiveClass = "bg-white text-slate-500 border-slate-200 hover:text-indigo-600 hover:bg-indigo-50/50";

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* SUB-NAVBAR & SEARCH ACTION BAR */}
            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-6 sticky top-0 z-40">
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('WARZONE')}
                        className={`${tabBase} ${activeTab === 'WARZONE' ? activeClass : inactiveClass}`}
                    >
                        <i className="fa-solid fa-crosshairs mr-2"></i> Warzone
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    {['OVERVIEW', 'PERFORMANCE', 'PROJECTIONS', 'INCOME', 'EXPENSES', 'ASSETS'].map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            className={`${tabBase} ${activeTab === tab ? activeClass : inactiveClass}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="relative flex-1 xl:w-64">
                        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                        <input 
                            type="text" 
                            placeholder={`Search ${activeTab.toLowerCase()}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-900 outline-none focus:border-indigo-600 transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => setIsCapitalFormOpen(true)}
                        className="px-6 py-2.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg shadow-lg shadow-emerald-100 flex items-center gap-2"
                    >
                        <i className="fa-solid fa-plus"></i> Add Funds
                    </button>
                </div>
            </div>

            {/* DYNAMIC CONTENT CONTAINER */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-4 xl:p-10 shadow-sm min-h-[600px]">
                {activeTab === 'WARZONE' && <WarRoom ledger={data.ledger} assets={data.assets} employees={data.employees} />}
                {activeTab === 'OVERVIEW' && <DashboardOverview ledger={data.ledger} assets={data.assets} />}
                {activeTab === 'PERFORMANCE' && <CapitalEfficiency assets={data.assets} loans={data.loans} equityRounds={data.equityRounds} />}
                {activeTab === 'PROJECTIONS' && <Projections ledger={data.ledger} assets={data.assets} employees={data.employees} />}
                {activeTab === 'INCOME' && <IncomeAnalysis ledger={data.ledger} />}
                {activeTab === 'EXPENSES' && <ExpenseDeepDive ledger={data.ledger} employees={data.employees} searchTerm={searchTerm} />}
                
                {/* --- RESOLVED ASSETS VIEW: CONTROLLER + VIEWER --- */}
                {activeTab === 'ASSETS' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4">

			{/* THE CONTROLLER: Triggers a global refresh on sync */}
                        <MarketWatcher onSyncComplete={fetchAll} />
                        
                        {/* THE VIEWER: Displays the clean data */}
                        <InvestmentDeepDive assets={data.assets} searchTerm={searchTerm} />
                    </div>
                )}
            </div>

            <CapitalForm isOpen={isCapitalFormOpen} onClose={() => setIsCapitalFormOpen(false)} onSave={fetchAll} />
        </div>
    );
};

export default AnalyticsDashboard;