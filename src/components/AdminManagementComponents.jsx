import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient'; 

// --- IMPORT FROM YOUR MODULAR LEDGER ---
import TreasuryLedger from './compartment/TreasuryLedger';
import DomainBudgetManagement from './compartment/DomainBudgetManagement';
import ManagerManagementView from './compartment/ManagerManagementView';
import UserRolesView from './compartment/UserRolesView';

const AdminManagementComponents = ({ 
    userList, 
    fundManagers, 
    domains, 
    investments,
    companies,
    currentUserId, 
    currentUserEmail, 
    onUpdateUserRole 
}) => {
    const [investments, setInvestments] = useState([]);

    // 1. DATA PULSE: Fetch investments once for all management calculations
    useEffect(() => {
        const fetchInvestments = async () => {
            const { data } = await supabase.from('investments').select('fund_manager_id, investment_amount');
            if (data) setInvestments(data);
        };
        fetchInvestments();
    }, []);

    // 2. THE ENGINE: Calculate Deployed Capital per Strategist
    const calculatedBudgets = useMemo(() => {
        const totals = {};
        investments.forEach(inv => {
            const mgrId = inv.fund_manager_id;
            const amount = Number(inv.investment_amount || 0);
            if (mgrId) {
                totals[mgrId] = (totals[mgrId] || 0) + amount;
            }
        });
        return { totals };
    }, [investments]);

    // 3. SECURITY GATE: SuperAdmin check for the Matrix
    const isSuperAdmin = currentUserEmail === 'venu.ananda@auspexinvestments.com';

    // 4. GLOBAL HELPERS
    const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
    const toWords = (n) => (Math.abs(n || 0) >= 10000000 ? `₹ ${(Math.abs(n) / 10000000).toFixed(2)} Cr` : formatCurrency(n));

    return (
        <div className="space-y-20 pb-20 animate-in fade-in duration-700">
            
            {/* STATION 1: TREASURY (Dry Powder) */}
            <TreasuryLedger toWords={toWords} isSuperAdmin={isSuperAdmin} />

            {/* STATION 2: SECTOR ALLOCATION (Treasury Deployment) */}
            <DomainBudgetManagement 
                domains={domains} 
                toWords={toWords} 
                formatCurrency={formatCurrency} 
                isSuperAdmin={isSuperAdmin} 
            />

            {/* STATION 3: PERSONNEL ROSTER (Strategists) */}
            <div>
                <h3 className="text-[11px] font-black text-[#FFD700] uppercase tracking-[0.4em] mb-10 opacity-50 underline underline-offset-8">Active Strategist Roster</h3>
                <ManagerManagementView 
                    fundManagers={fundManagers} 
                    formatCurrency={formatCurrency} 
                    investments={investments}
                    companies={companies}
                    toWords={toWords}
                    calculatedBudgets={calculatedBudgets} 
                    domains={domains}
                    refreshData={() => {}} // Placeholder if needed
                    /* THE FIX: PASSING THE DATA TO THE ACCORDION */
                    userList={userList}
                    onUpdateUserRole={onUpdateUserRole}
                    currentUserId={currentUserId}
                />
            </div>
        </div>
    );
};

export default AdminManagementComponents;