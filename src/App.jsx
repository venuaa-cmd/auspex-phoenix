import React, { useState, useEffect, useRef } from 'react';
import NetworkBackground from './components/NetworkBackground';
import SidebarDock from './components/SidebarDock';
import ChatInterface from './components/ChatInterface';
import AdminDashboard from './components/AdminDashboard'; 
import PitchInterface from './components/PitchInterface'; 
import { ProfileView, TeamView, PortfolioView, ThesisView, InsightsView, ContactView, EmployeeLoginView } from './components/DataViews';
import logoImg from './assets/logo.jpg'; 
import { db, auth } from './lib/firebase'; 
import { supabase } from './lib/supabaseClient'; 

const App = () => {
    // --- STATE MANAGEMENT ---
    const [view, setView] = useState('chat');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const isInitialized = useRef(false);
    
    // Auth & Data State
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null); 
    const [pitchData, setPitchData] = useState({}); 
    const [fundManagers, setFundManagers] = useState([]);
    const [domains, setDomains] = useState([]);
    const [publicCompanies, setPublicCompanies] = useState([]);
    const [isAuthReady, setIsAuthReady] = useState(false); 

    // --- HELPER: ADD MESSAGE WITH DELAY ---
    const addAiMessage = (text, delay = 0) => {
        setTimeout(() => {
            setIsTyping(true);
            setTimeout(() => {
                setChatHistory(prev => [...prev, { type: 'ai', text: text }]);
                setIsTyping(false);
            }, 1500); 
        }, delay);
    };

    // --- FIREBASE AUTH LISTENER (FIXED REDIRECTION) ---
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setCurrentUser(user);
                db.collection('Employee_Login').doc(user.uid).onSnapshot(doc => {
                    if (doc.exists) setUserRole(doc.data().role || 'user');
                    else setUserRole('user');
                });
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setPitchData({});
                setFundManagers([]);
                setDomains([]);
                setPublicCompanies([]);
                // FIX: RETURN TO FRONT PAGE ON SIGN OUT
                setView('chat'); 
            }
            setIsAuthReady(true); 
        });
        return () => unsubscribe();
    }, []); 

    // --- GLOBAL ENGINE INITIALIZATION ---
    useEffect(() => {
        const fetchEngineData = async () => {
            try {
                const managerSnap = await db.collection("fund_managers").get();
                setFundManagers(managerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                
                const domainSnap = await db.collection("domains").get();
                setDomains(domainSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                
                // FIX: ROBUST PORTFOLIO SYNC
                // --- Inside App.jsx Initialization ---
const { data: supabaseComp } = await supabase
    .from('companies')
    .select('*')
    .eq('is_published', true) // Matches the Boolean column type
    .order('name', { ascending: true });
                const curated = (supabaseComp || []).filter(c => 
                    c.is_published === true || String(c.is_published).toLowerCase() === 'true'
                );
                setPublicCompanies(curated.sort((a, b) => a.name.localeCompare(b.name)));

            } catch(e) { console.error("Engine Init Error:", e); }
        };
        fetchEngineData();

        // --- GLOBAL VEDA HOOKS (UNWINDING PROTOCOL) ---
        window.Veda = {
            setView: (newView) => setView(newView),
            setPitchData: (data) => setPitchData(data),
            sendFinalMessage: (msg) => setChatHistory(prev => [...prev, { type: 'ai', text: msg }]),
            
            triggerPostPitchSequence: (verdict, pitchCode) => { 
                setView('chat');
                setIsTyping(true);

                // STAGE 1: IMMEDIATE EMPATHY (0s)
                setTimeout(() => {
                    setChatHistory(prev => [...prev, { 
                        type: 'ai', 
                        text: `*Veda leans back, exhaling a soft, supportive sigh.* <br/><br/>"And... breathe, Partner. I know how much soul you just poured into those fields. I've logged it all. Between us? I think it's brilliant. I'm going to 'forget' your file right on the manager's desk so they see it first thing."`
                    }]);

                    // STAGE 2: THE SECRET CODE (3s)
                    setTimeout(() => {
                        setChatHistory(prev => [...prev, { 
                            type: 'ai', 
                            text: `<div style="background: var(--brand-color); background-opacity: 0.1; border: 1px dashed var(--brand-color); padding: 20px; border-radius: 2rem; text-align: center; box-shadow: 0 0 30px var(--brand-glow);">
                                    <span style="font-size: 8px; text-transform: uppercase; letter-spacing: 3px; display: block; margin-bottom: 8px; opacity: 0.6;">Sovereign Access Token</span>
                                    <b style="color: white; font-family: monospace; letter-spacing: 2px; font-size: 1.25rem;">${pitchCode}</b>
                                    <p style="font-size: 9px; color: #64748b; margin-top: 10px; text-transform: uppercase; font-weight: 900;">Keep this safe. It's your only key to our secret file.</p>
                                   </div>`
                        }]);

                        // STAGE 3: THE UNWINDING ENGAGEMENT (7s)
                        addAiMessage(`
                            "Now, don't just sit there staring at the screen—it's bad for your eyes. While I handle the boring forensic screening, why don't you explore the rest of the office? <br/><br/>
                            Check out who else is in our <b>Portfolio</b>, meet the rest of the <b>Team</b>, or dig into our <b>Market Intel</b> for some deep-dive CAGR data. <br/><br/>
                            Or, if you're still feeling chatty, ask me anything about <b>Equity</b>, <b>Market Benchmarks</b>, or why the 'suits' are so obsessed with IRR."
                        `, 0);

                        // STAGE 4: INTERACTIVE HUD (10s)
                        setTimeout(() => {
                            addAiMessage(`
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                                    <button onclick="window.Veda.setView('portfolio')" style="padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--brand-color); color: white; border-radius: 15px; cursor: pointer; font-size: 0.7em; font-weight: 800; text-transform: uppercase; transition: all 0.3s;">Explore Portfolio</button>
                                    <button onclick="window.Veda.setView('insights')" style="padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--brand-color); color: white; border-radius: 15px; cursor: pointer; font-size: 0.7em; font-weight: 800; text-transform: uppercase; transition: all 0.3s;">The Intel Vault</button>
                                </div>
                            `, 0);
                        }, 4000);

                    }, 3000);
                }, 1000);
            }
        };
    }, []);

    // --- EXPANDED SOVEREIGN THEME ENGINE ---
    useEffect(() => {
        const themes = [
            { name: 'Obsidian Crimson', color: '#ff3366' },
            { name: 'Midnight Gold', color: '#FFD700' },
            { name: 'Cyber Emerald', color: '#10b981' },
            { name: 'Electric Cobalt', color: '#3b82f6' },
            { name: 'Imperial Violet', color: '#8b5cf6' },
            { name: 'Apex Teal', color: '#18B8B9' }
        ];

        const theme = themes[Math.floor(Math.random() * themes.length)];
        const r = document.documentElement;
        
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '24, 184, 185';
        };

        r.style.setProperty('--brand-color', theme.color);
        r.style.setProperty('--brand-rgb', hexToRgb(theme.color)); 
        r.style.setProperty('--brand-glow', theme.color + '66');
    }, []);

    const renderModalContent = () => {
        switch(view) {
            case 'profile': return <ProfileView />;
            case 'team': return <TeamView />;
            case 'portfolio': return <PortfolioView companies={publicCompanies} />;
            case 'thesis': return <ThesisView domains={domains} />;
            case 'insights': return <InsightsView />;
            case 'contact': return <ContactView />;
            case 'management': return <AdminDashboard userRole={userRole} currentUserId={currentUser?.uid} isAuthReady={isAuthReady} />;
            case 'pitch': return <PitchInterface initialData={pitchData} setView={setView} />; 
            case 'employee_gate': return <EmployeeLoginView onLoginSuccess={(u, r) => { setCurrentUser(u); setUserRole(r); setView(r === 'admin' ? 'chat' : 'management'); }} />;
            case 'news': return <InsightsView />; 
            default: return <div className="text-slate-500">Node Syncing...</div>;
        }
    };

    return (
        <div className="relative w-full h-screen overflow-hidden flex flex-col font-manrope">
            <NetworkBackground themeColor={getComputedStyle(document.documentElement).getPropertyValue('--brand-color').trim()} />
            
            {view !== 'management' && (
                <>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="fixed top-6 left-6 z-[99999] w-12 h-12 bg-black/80 backdrop-blur-xl border border-[var(--brand-color)]/50 rounded-full text-white md:hidden flex items-center justify-center shadow-[0_0_20px_black] active:scale-90 transition-all hover:bg-[var(--brand-color)] hover:text-black">
                        <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
                    </button>
                    {isMobileMenuOpen && <div className="fixed inset-0 bg-black/90 z-[9990] md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}
                    <SidebarDock activeView={view} setView={setView} userRole={userRole} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                </>
            )}

            <header className="flex-none py-8 flex flex-col items-center justify-center z-20 relative pointer-events-none">
                <div className="flex items-center gap-5 pointer-events-auto">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/20 flex items-center justify-center shadow-[0_0_30px_var(--brand-glow)] overflow-hidden backdrop-blur-sm">
                         <img src={logoImg} alt="Auspex Logo" className="w-full h-full object-cover opacity-90" />
                    </div>
                    <div className="flex flex-col items-start">
                        <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                            AUS<span className="text-[var(--brand-color)] drop-shadow-[0_0_10px_var(--brand-glow)]">PEX</span>
                        </h1>
                        <div className="flex justify-between text-[var(--brand-color)] font-mono text-xs font-bold tracking-[0.6em] opacity-90 w-full pl-1 mt-1">
                            <span>I</span><span>N</span><span>V</span><span>E</span><span>S</span><span>T</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex justify-center items-start overflow-hidden relative z-10 p-4 pb-8">
                <div className="flex w-full max-w-6xl h-full gap-4">
                    <div className="hidden md:block w-20 shrink-0"></div> 
                    <ChatInterface history={chatHistory} isTyping={isTyping} setChatHistory={setChatHistory} setIsTyping={setIsTyping} setView={setView} />
                </div>
            </main>

            {/* MODAL SYSTEM */}
            {view !== 'chat' && view !== 'employee_gate' && view !== 'management' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease]">
                    <div className="bg-[#0f172a] border border-[var(--brand-color)]/30 w-full max-w-5xl h-[85vh] rounded-[2.5rem] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                        <div className="flex items-center justify-between p-8 bg-slate-900 border-b border-white/5">
                            <h2 className="text-[var(--brand-color)] text-sm font-black tracking-[0.3em] uppercase">{view} NODE</h2>
                            <button onClick={() => setView('chat')} className="w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 transition-all duration-300 flex items-center justify-center group shadow-lg">
                                <i className="fa-solid fa-xmark text-lg group-hover:rotate-90 transition-transform duration-300"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#020617]/50">
                            {renderModalContent()}
                        </div>
                    </div>
                </div>
            )}
            
            {view === 'management' && <div className="fixed inset-0 z-50 bg-[#020617] animate-[fadeIn_0.2s_ease]"><div className="w-full h-full overflow-y-auto custom-scrollbar">{renderModalContent()}</div></div>}
            
            {view === 'employee_gate' && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 animate-[fadeIn_0.2s_ease]"><div className="relative w-full max-w-md">
                <button onClick={() => setView('chat')} className="absolute -top-12 right-0 text-red-400 hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
                {renderModalContent()}
            </div></div>}
        </div>
    );
};

export default App;