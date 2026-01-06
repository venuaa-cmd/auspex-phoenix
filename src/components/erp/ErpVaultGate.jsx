import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperationsNexus from './OperationsNexus';

const ErpVaultGate = () => {
    const [session, setSession] = useState(null);
    const [initialCheckDone, setInitialCheckDone] = useState(false); // <--- FIX FOR THE LOOP
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- SECURITY CONFIG: AUTO-LOGOUT ---
    const TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes
    const activityTimer = useRef(null);

    // --- 1. SESSION MANAGEMENT (STABILIZED) ---
    useEffect(() => {
        // A. Check active session on load
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setInitialCheckDone(true); // <--- Only show UI after check is complete
        });

        // B. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setInitialCheckDone(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    // --- 2. IDLE TIMER ENGINE ---
    const handleLogout = async () => {
        console.warn("🔒 Security Timeout: Auto-locking ERP Vault.");
        await supabase.auth.signOut();
        setSession(null);
        alert("Session Expired: Vault locked due to inactivity.");
    };

    const resetTimer = () => {
        if (activityTimer.current) clearTimeout(activityTimer.current);
        if (session) {
            activityTimer.current = setTimeout(handleLogout, TIMEOUT_MS);
        }
    };

    // --- 3. ACTIVITY LISTENERS ---
    useEffect(() => {
        if (session) {
            resetTimer();
            window.addEventListener('mousemove', resetTimer);
            window.addEventListener('keydown', resetTimer);
            window.addEventListener('click', resetTimer);
            window.addEventListener('scroll', resetTimer);

            return () => {
                if (activityTimer.current) clearTimeout(activityTimer.current);
                window.removeEventListener('mousemove', resetTimer);
                window.removeEventListener('keydown', resetTimer);
                window.removeEventListener('click', resetTimer);
                window.removeEventListener('scroll', resetTimer);
            };
        }
    }, [session]);

    // --- 4. LOGIN HANDLER ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) setError(error.message);
        setLoading(false);
    };

    // --- VIEW 0: INITIALIZING (PREVENT FLASH) ---
    if (!initialCheckDone) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-[var(--brand-color)] animate-pulse font-mono text-sm uppercase tracking-widest">
                    <i className="fa-solid fa-satellite-dish fa-spin mr-2"></i> Establishing Secure Link...
                </div>
            </div>
        );
    }

    // --- VIEW 1: THE VAULT (UNLOCKED) ---
    if (session) {
        return <OperationsNexus />;
    }

    // --- VIEW 2: THE GATE (LOCKED) ---
    return (
        <div className="flex items-center justify-center min-h-[80vh] bg-[#0f172a] animate-[fadeIn_0.5s_ease]">
            <div className="w-full max-w-md bg-black border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden group">
                
                {/* Visual Flair: "Locked" indicator bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_15px_#dc2626]"></div>
                
                <div className="text-center mb-8 relative z-10">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 group-hover:border-red-500/50 transition-colors">
                        <i className="fa-solid fa-user-lock text-3xl text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]"></i>
                    </div>
                    <h2 className="text-xl font-black text-white tracking-[0.2em] uppercase">Restricted Access</h2>
                    <p className="text-slate-500 text-xs mt-2 font-mono uppercase">Auspex Operations Nexus // Level 5 Security</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Commander ID</label>
                        <div className="relative">
                            <i className="fa-solid fa-envelope absolute left-3 top-3.5 text-slate-600 text-xs"></i>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-9 pr-3 text-white focus:border-red-500 focus:bg-black outline-none transition-all placeholder:text-slate-700 font-mono text-sm"
                                placeholder="authorized.user@auspex.com"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Passcode</label>
                        <div className="relative">
                            <i className="fa-solid fa-key absolute left-3 top-3.5 text-slate-600 text-xs"></i>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-9 pr-3 text-white focus:border-red-500 focus:bg-black outline-none transition-all placeholder:text-slate-700 font-mono text-sm"
                                placeholder="••••••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded flex items-center gap-2 animate-pulse">
                            <i className="fa-solid fa-triangle-exclamation"></i> 
                            <span className="font-bold">{error}</span>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-white text-black font-black uppercase tracking-widest py-3 rounded-lg hover:bg-slate-200 transition-all mt-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <i className="fa-solid fa-circle-notch fa-spin"></i> Verifying...
                            </span>
                        ) : 'Unlock Vault'}
                    </button>
                </form>

                {/* Background Decor */}
                <div className="absolute -bottom-10 -right-10 text-9xl text-white/5 pointer-events-none rotate-12">
                    <i className="fa-solid fa-shield-halved"></i>
                </div>
            </div>
        </div>
    );
};

export default ErpVaultGate;