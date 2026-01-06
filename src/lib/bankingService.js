import { supabase } from './supabaseClient';

/**
 * ATOMIC BANK UPDATE
 * Prevents the "Ledger-Bank Delink"
 */
export const updateBankBalance = async (accountId, delta) => {
    if (!accountId) throw new Error("BANK_ID_MISSING");
    
    // Calls a Supabase RPC to increment/decrement the 'current_balance' column
    const { data, error } = await supabase.rpc('increment_bank_balance', {
        account_id: accountId,
        amount_to_add: delta
    });

    if (error) {
        console.error("BANK_SYNC_CRITICAL_FAILURE:", error);
        throw error;
    }
    return data;
};

export const fetchTreasuryPulse = async () => {
    const { data } = await supabase.from('erp_bank_accounts').select('current_balance');
    return data?.reduce((sum, b) => sum + Number(b.current_balance), 0) || 0;
};