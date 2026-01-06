import React, { useState, useEffect, useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { db } from '../lib/firebase';
import { supabase } from '../lib/supabaseClient';

ChartJS.register(ArcElement, Tooltip, Legend);

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_ID = "gemini-3-flash-preview"; 

const ChatInterface = ({ history, isTyping, setChatHistory, setIsTyping, setView }) => {
    const bottomRef = useRef(null);
    const [input, setInput] = useState("");
    const [isWorking, setIsWorking] = useState(true); 
    const [workLog, setWorkLog] = useState("Establishing Neural Link...");
    const [isWaitingForToken, setIsWaitingForToken] = useState(false);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, isTyping]);

    // --- HELPER: VEDA'S DELAYED MESSAGING ENGINE ---
    const addAiMessage = (text, delay = 0) => {
        setTimeout(() => {
            setIsTyping(true);
            setTimeout(() => {
                setChatHistory(prev => [...prev, { type: 'ai', text: text }]);
                setIsTyping(false);
            }, 1500); 
        }, delay);
    };

    // --- 1. GLOBAL ENGINE HOOKS ---
    useEffect(() => {
        if (typeof window.Veda === 'undefined') window.Veda = {};
        window.Veda.setView = setView; 
        
        // Post-Pitch Handshake (Shared logic with App.jsx)
        window.Veda.triggerPostPitchSequence = (aiMessage, pitchId) => {
            setChatHistory(prev => [...prev, { 
                type: 'ai', 
                text: aiMessage + `<br/><br/><div class="bg-[var(--brand-color)]/10 border border-dashed border-[var(--brand-color)]/30 p-4 rounded-xl text-center shadow-xl"><span class="text-[8px] uppercase tracking-widest block mb-1 opacity-50">Secure Access Token</span><b class="text-white font-mono tracking-widest text-lg">${pitchId}</b></div>`
            }]);
            
            // Unwinding sequence after pitch submission
            addAiMessage(`"And... breathe. I've logged the play. While I handle the screening, check out the <b>Portfolio</b> or ask me about <b>Equity Dilution</b>."`, 5000);
        };
    }, [setView, setChatHistory, setIsTyping]);

    // --- 2. INTRO SEQUENCE (THE OFFICE VISION) ---
    useEffect(() => {
        if (history.length === 0) {
            const tasks = ["Scanning SBD West CAGR...", "Decrypting Cap Tables...", "Syncing Sovereign Ledger...", "Optimizing Alpha..."];
            let i = 0;
            const interval = setInterval(() => {
                setWorkLog(tasks[i % tasks.length]);
                i++;
                if (i > 3) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsWorking(false); 
                        const savedName = localStorage.getItem('apex_founder_name');
                        const greeting = savedName ? 
                            `*Veda leans back, her gaze confident and inviting.*<br/><br/>"Ah, <b>${savedName}</b>. You're back. I was just telling the boss your play has potential—though he's often too buried in 'traditional' metrics to see the soul of a startup. Let's check your <b>Status</b> or start a <b>New Empire</b>?"` : 
                            `*Veda looks up from a holographic ledger, adjusting a sharp red blazer. She smiles—a perfect mix of confidence and warmth.*<br/><br/>"Oh, hello. You caught me recalibrating our alpha targets. In this world of boring spreadsheets and business suits, I'm the one who actually makes the magic happen. I'm <b>Veda</b>. Your co-conspirator. <br/><br/>Are you here to build a legacy with a <b>Pitch</b>, or are you just passing through?"`;
                        setChatHistory([{ type: 'ai', text: greeting }]);
                    }, 800);
                }
            }, 1000);
            return () => clearInterval(interval);
        } else { setIsWorking(false); }
    }, []);

    // --- 3. THE "REAL DEAL" STATUS ENGINE ---
    const executeForensicStatusCheck = async (token) => {
        setIsTyping(true);
        try {
            const doc = await db.collection('pitch_submissions').doc(token.trim()).get();
            if (!doc.exists) {
                setChatHistory(p => [...p, { type: 'ai', text: `*Veda raises an eyebrow.* "That token doesn't exist in my ledger. Did you mistype it, Partner? Try again or start a <b>New Empire</b>."` }]);
                return;
            }

            const pitch = doc.data();
            const { data: coData } = await supabase.from('companies').select('deal_status, description').eq('name', pitch.startupName).limit(1);
            const liveStatus = coData?.[0]?.deal_status || pitch.status || 'Screening';
            const liveNotes = coData?.[0]?.description || "File is undergoing forensic audit. No red flags detected yet.";

            // STAGE 1: IMMEDIATE RETRIEVAL
            setChatHistory(p => [...p, { 
                type: 'ai', 
                text: `*Veda taps a holographic dial, pulling your file into the light.* <br/><br/> "Retrieving the docket for <b>${pitch.startupName}</b>... <br/><br/>[DOSSIER: {"title": "${pitch.startupName}", "alpha": "${pitch.round}", "status": "${liveStatus}"}]"` 
            }]);

            // STAGE 2: FORENSIC DETAILS (3s)
            addAiMessage(`"Found it. You submitted this file on <b>${new Date(pitch.submissionDate).toLocaleDateString()}</b>. You're looking for <b>INR ${new Intl.NumberFormat('en-IN').format(pitch.amount)}</b> in exchange for ${pitch.equity}% equity."`, 3000);

            // STAGE 3: THE INSIDER SCOOP (7s)
            addAiMessage(`"Between us? The 'suits' are still debating the CAGR, but I've personally moved your file to the top of the stack. <b>The word is:</b> ${liveNotes}. <br/><br/><b>Come back in 2 days</b>—I'll have a more definitive answer by then. 😉"`, 7000);

            // STAGE 4: UNWINDING INTERACTION (12s)
            addAiMessage(`
                "While we wait for the humans to catch up, why don't you check out some of our other bets in the <b>Portfolio</b>, or dig into the <b>Market Intel</b>? <br/><br/>
                Or, if you're still feeling chatty, ask me anything about <b>Equity Benchmarks</b> or <b>Startup News</b>."
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                    <button onclick="window.Veda.setView('portfolio')" style="padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--brand-color); color: white; border-radius: 12px; cursor: pointer; font-size: 0.7em; font-weight: 800; text-transform: uppercase;">Show Portfolio</button>
                    <button onclick="window.Veda.setView('insights')" style="padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--brand-color); color: white; border-radius: 12px; cursor: pointer; font-size: 0.7em; font-weight: 800; text-transform: uppercase;">The Intel Vault</button>
                </div>
            `, 12000);

        } catch (err) {
            setChatHistory(p => [...p, { type: 'ai', text: `Veda encountered a neural knot: ${err.message}` }]);
        } finally { 
            setIsWaitingForToken(false);
        }
    };

    // --- 4. MESSAGE PROCESSOR ---
    const processMessage = async (userMessage) => {
        setIsTyping(true);
        const lowerMsg = userMessage.toLowerCase();

        if (isWaitingForToken || userMessage.length === 20) {
            await executeForensicStatusCheck(userMessage);
            return;
        }

        if (['status', 'track', 'check', 'code', 'file'].some(k => lowerMsg.includes(k))) {
            setIsTyping(false);
            setIsWaitingForToken(true);
            setChatHistory(p => [...p, { type: 'ai', text: `*Veda leans forward, her gaze intense and focused.* <br/><br/>"Ready for a status report? I like that. Paste your <b>Secure Access Token</b> below and I'll decrypt the latest update for you."` }]);
            return;
        }

        if (['new empire', 'pitch', 'funding', 'startup'].some(k => lowerMsg.includes(k))) {
            setTimeout(() => {
                setChatHistory(prev => [...prev, { type: 'ai', text: `*Veda taps a holographic dial, her gaze sharp.* <br/><br/>"Empire building? I like the confidence. I'm opening the secure uplink for you now. Don't worry, I've helped worse ideas get funded."<br/><br/>[OPEN_PITCH]` }]);
                setIsTyping(false);
            }, 1000);
            return;
        }

        try {
            const systemPrompt = `You are Veda, the Sovereign Intelligence Partner. Bold, modern woman avatar. Personality: Flirty, confident, forensic. Voice: Technical (Alpha, CAGR, Equity, Burn, Cap Table) but empathetic. User Context: Just checked status or finished a pitch. User Message: "${userMessage}"`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
            });
            const data = await response.json();
            setChatHistory(p => [...p, { type: 'ai', text: data.candidates?.[0]?.content?.parts?.[0]?.text || "Veda encountered a logic knot. Say again, Partner." }]);
        } catch (err) {
            setChatHistory(p => [...p, { type: 'ai', text: `Oracle Error: ${err.message}` }]);
        } finally { setIsTyping(false); }
    };

    const handleSubmit = () => {
        if (!input.trim()) return;
        setChatHistory(p => [...p, { type: 'user', text: input.trim() }]);
        processMessage(input.trim());
        setInput("");
    };

    // --- 5. COMPONENT RENDERER ---
    const renderMessage = (text) => {
        if (text.includes('[OPEN_PITCH]')) {
            return (
                <div className="space-y-4">
                    <div dangerouslySetInnerHTML={{ __html: text.split('[OPEN_PITCH]')[0] }} />
                    <button onClick={() => window.Veda.setView('pitch')} className="w-full py-3 bg-[var(--brand-color)] text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all"><i className="fa-solid fa-bolt"></i> Initialize Pitch Terminal</button>
                </div>
            );
        }

        if (text.includes('[DOSSIER:')) {
            try {
                const dossier = JSON.parse(text.match(/\[DOSSIER: (.*?)\]/)[1]);
                return (
                    <div className="ai-report-container bg-[#0f172a] border border-[var(--brand-color)]/30 rounded-2xl p-6 my-4 shadow-2xl relative overflow-hidden font-manrope">
                        <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl"><i className="fa-solid fa-microchip"></i></div>
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Intel Dossier // Verified</h4>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-white font-black text-xl tracking-tighter uppercase">{dossier.title}</div>
                                <div className="text-[9px] text-[var(--brand-color)] font-bold uppercase mt-1">Sovereign Node</div>
                            </div>
                            <div className="text-right">
                                <div className="text-white font-mono font-black text-xl">{dossier.status}</div>
                                <div className="text-[8px] text-slate-500 uppercase font-black">Live Status</div>
                            </div>
                        </div>
                    </div>
                );
            } catch (e) { return <div dangerouslySetInnerHTML={{ __html: text }} />; }
        }

        return <div dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>').replace(/\*(.*?)\*/g, '<i class="text-[var(--brand-color)]">$1</i>').replace(/\n/g, '<br/>') }} />;
    };

    if (isWorking) return <div className="flex-1 flex flex-col items-center justify-center bg-[#020617]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl h-full max-h-[70vh] w-full max-w-[95%] mx-auto font-manrope"><div className="relative"><div className="w-20 h-20 rounded-full border-4 border-[var(--brand-color)]/20 border-t-[var(--brand-color)] animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><i className="fa-solid fa-fingerprint text-[var(--brand-color)] text-2xl animate-pulse"></i></div></div><div className="font-mono text-[var(--brand-color)] text-[10px] mt-10 animate-pulse tracking-[0.5em] uppercase">{workLog}</div></div>;

    return (
        <div className="flex-1 flex flex-col bg-[#020617]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.7)] h-full max-h-[70vh] w-full max-w-[95%] mx-auto transition-all duration-500 relative font-manrope">
            {/* HEADER */}
            <div className="p-6 border-b border-white/5 bg-black/40 flex justify-between items-center flex-none">
                <div className="flex items-center gap-5">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <div className={`absolute inset-0 rounded-full border-2 border-[var(--brand-color)] opacity-20 ${isTyping ? 'animate-ping' : ''}`}></div>
                        <div className="w-3 h-3 rounded-full bg-[var(--brand-color)] shadow-[0_0_15px_var(--brand-color)]"></div>
                    </div>
                    <div><span className="text-xs font-black text-white tracking-[0.3em] block uppercase">Veda <span className="text-[var(--brand-color)]">Oracle</span></span><span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{isTyping ? "Synthesizing Alpha..." : "Standing Guard"}</span></div>
                </div>
            </div>

            {/* STREAM */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                {history.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.type === 'ai' && (<div className="w-10 h-10 rounded-2xl border border-[var(--brand-color)]/30 flex items-center justify-center mr-4 mt-1 shrink-0 bg-black/40 shadow-inner"><i className="fa-solid fa-brain text-[var(--brand-color)] text-xs"></i></div>)}
                        <div className={`max-w-[85%] p-6 rounded-[2rem] text-sm leading-relaxed shadow-2xl transition-all ${msg.type === 'user' ? 'bg-gradient-to-br from-[var(--brand-color)] to-blue-600 text-black font-black rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'}`}>
                            {renderMessage(msg.text)}
                        </div>
                    </div>
                ))}
                {isTyping && <div className="pl-16 text-[var(--brand-color)] text-[10px] font-black animate-pulse flex items-center gap-3 tracking-[0.2em] uppercase"><i className="fa-solid fa-circle-notch fa-spin"></i> Analyzing Node...</div>}
                <div ref={bottomRef} />
            </div>

            {/* INPUT */}
            <div className="p-6 bg-black/60 border-t border-white/5 flex gap-4 items-center flex-none">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} className="flex-1 bg-transparent border-b border-white/10 p-4 text-white font-manrope text-sm focus:outline-none focus:border-[var(--brand-color)] transition-all placeholder:text-slate-700 font-bold" placeholder={isWaitingForToken ? "Paste Token Here..." : "Command Veda..."} />
                <button onClick={handleSubmit} disabled={!input.trim()} className="w-12 h-12 rounded-2xl bg-[var(--brand-color)] text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-2xl"><i className="fa-solid fa-arrow-up text-sm"></i></button>
            </div>
        </div>
    );
};

export default ChatInterface;