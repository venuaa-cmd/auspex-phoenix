import React, { useState, useEffect, useRef } from 'react';
import { fetchDeepResearch } from '../../lib/aiService';
import { db, auth } from '../../lib/firebase';
import jsPDF from 'jspdf';

const ResearchQueryWidget = () => {
    // --- STATE ---
    const [history, setHistory] = useState([]); 
    const [activeThread, setActiveThread] = useState(null); 
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    const scrollRef = useRef(null);
    const currentUserEmail = auth.currentUser?.email;
    const isSuperAdmin = currentUserEmail?.toLowerCase().trim() === 'venu.ananda@auspexinvestments.com';

    // 1. Fetch History Listener
    useEffect(() => {
        const unsub = db.collection('research_history').orderBy('lastUpdated', 'desc').onSnapshot(snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setHistory(data);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [activeThread, loading]);

    // --- HANDLERS ---
    const handleNewThread = () => {
        setActiveThread(null);
        setQuery('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);

        const userMsg = { role: 'user', content: query, timestamp: new Date().toISOString() };
        let currentMessages = activeThread ? [...activeThread.messages, userMsg] : [userMsg];
        
        // Optimistic display for user query
        if (activeThread) setActiveThread({ ...activeThread, messages: currentMessages });

        try {
            const aiResponseText = await fetchDeepResearch(query);
            const aiMsg = { role: 'ai', content: aiResponseText, timestamp: new Date().toISOString() };
            const updatedMessages = [...currentMessages, aiMsg];

            if (activeThread) {
                await db.collection('research_history').doc(activeThread.id).update({
                    messages: updatedMessages,
                    lastUpdated: new Date().toISOString()
                });
                setActiveThread({ ...activeThread, messages: updatedMessages });
            } else {
                const title = query.length > 40 ? query.substring(0, 40) + "..." : query;
                const docRef = await db.collection('research_history').add({
                    title: title,
                    messages: updatedMessages,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                });
                setActiveThread({ id: docRef.id, title, messages: updatedMessages });
            }
        } catch (err) {
            alert("Oracle Sync Failure: AI Offline");
        } finally {
            setQuery('');
            setLoading(false);
        }
    };

    const handleDeleteThread = async (e, id) => {
        e.stopPropagation();
        if (!isSuperAdmin) return; // Fail-safe
        if (window.confirm("⚠️ PURGE PROTOCOL: Permanently delete this research thread?")) {
            await db.collection('research_history').doc(id).delete();
            if (activeThread?.id === id) setActiveThread(null);
        }
    };

    const handleExportPDF = () => {
        if (!activeThread) return;
        const doc = new jsPDF();
        const margin = 15;
        let y = 20;
        const pageWidth = doc.internal.pageSize.getWidth() - (margin * 2);

        doc.setFontSize(16);
        doc.setTextColor(184, 134, 11); // Gilded Text
        doc.text("SOVEREIGN RESEARCH REPORT", margin, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Oracle Feed: ${activeThread.title}`, margin, y);
        y += 15;

        activeThread.messages.forEach(msg => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(11);
            if (msg.role === 'user') {
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0);
                doc.text(`Q: ${msg.content}`, margin, y);
                y += 7;
            } else {
                doc.setFont(undefined, 'normal');
                doc.setTextColor(50);
                const clean = msg.content.replace(/\*\*/g, '').replace(/##/g, '').replace(/^\* /gm, '• ');
                const lines = doc.splitTextToSize(clean, pageWidth);
                lines.forEach(line => {
                    if (y > 280) { doc.addPage(); y = 20; }
                    doc.text(line, margin, y);
                    y += 5;
                });
                y += 10; 
            }
        });
        doc.save(`Auspex_Research_${activeThread.id.slice(0,5)}.pdf`);
    };

    const filteredHistory = history.filter(h => h.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex h-[85vh] bg-[#020617] border border-[#FFD700]/10 rounded-[2.5rem] overflow-hidden shadow-2xl font-manrope">
            
            {/* --- SIDEBAR: TACTICAL HISTORY --- */}
            <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col transition-all duration-500`}>
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.3em] opacity-60">Intelligence Log</h2>
                        <button onClick={handleNewThread} className="w-8 h-8 rounded-full bg-[#FFD700] text-black flex items-center justify-center hover:scale-110 transition-all shadow-lg" title="New Intelligence Query">
                            <i className="fa-solid fa-plus text-xs"></i>
                        </button>
                    </div>
                    <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs"></i>
                        <input 
                            type="text" placeholder="Search archive..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:border-[#FFD700]/50 outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {filteredHistory.map(h => (
                        <div 
                            key={h.id} 
                            onClick={() => setActiveThread(h)}
                            className={`group p-4 rounded-2xl cursor-pointer border transition-all relative overflow-hidden ${activeThread?.id === h.id ? 'bg-[#FFD700]/10 border-[#FFD700]/30' : 'hover:bg-white/5 border-transparent'}`}
                        >
                            <div className={`truncate text-xs font-black uppercase tracking-tight ${activeThread?.id === h.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{h.title}</div>
                            <div className="text-[8px] text-slate-600 font-bold mt-1 uppercase tracking-widest">{new Date(h.lastUpdated).toLocaleDateString()}</div>
                            
                            {/* PROTECTED PURGE OPTION */}
                            {isSuperAdmin && (
                                <button onClick={(e) => handleDeleteThread(e, h.id)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all">
                                    <i className="fa-solid fa-circle-xmark text-xs"></i>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- MAIN PANE: ORACLE INTERFACE --- */}
            <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0f172a] to-[#020617] relative">
                
                {/* Header Controls */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 backdrop-blur-md">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-[#FFD700] transition-all">
                        <i className={`fa-solid ${isSidebarOpen ? 'fa-indent' : 'fa-outdent'}`}></i>
                    </button>
                    <div className="flex items-center gap-4">
                        <button onClick={handleExportPDF} disabled={!activeThread} className="bg-white/5 hover:bg-white/10 text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/5 disabled:opacity-20 transition-all">
                            <i className="fa-solid fa-file-pdf"></i> Export Briefing
                        </button>
                    </div>
                </div>

                {/* Tactical Chat Flow */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">
                    {!activeThread && !loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 rounded-[2rem] bg-[#FFD700]/5 border border-[#FFD700]/20 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,215,0,0.05)] animate-pulse">
                                <i className="fa-solid fa-brain text-4xl text-[#FFD700]"></i>
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Awaiting Intelligence Directives</h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Query the Auspex Knowledge Graph</p>
                        </div>
                    ) : (
                        activeThread?.messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.5s_ease]`}>
                                <div className="flex gap-4 max-w-[85%]">
                                    {msg.role === 'ai' && <div className="w-10 h-10 rounded-xl bg-[#FFD700] flex-shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.3)]"><i className="fa-solid fa-bolt-lightning text-black"></i></div>}
                                    
                                    <div className={`p-6 rounded-[2rem] shadow-2xl border ${
                                        msg.role === 'user' 
                                        ? 'bg-[#FFD700] text-black border-[#FFD700] rounded-tr-none' 
                                        : 'bg-[#1e293b]/50 backdrop-blur-xl border-white/5 text-slate-200 rounded-tl-none'
                                    }`}>
                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-3 opacity-40 ${msg.role === 'user' ? 'text-black' : 'text-[#FFD700]'}`}>
                                            {msg.role === 'user' ? 'Strategist Query' : 'Oracle Briefing'}
                                        </div>
                                        {msg.role === 'ai' ? (
                                            <div className="ai-report-container text-sm leading-[1.8]" dangerouslySetInnerHTML={{ 
                                                __html: msg.content
                                                    .replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-black">$1</b>') 
                                                    .replace(/^# (.*$)/gim, '<h2 class="text-lg font-black text-[#FFD700] mt-6 mb-2 uppercase">$1</h2>') 
                                                    .replace(/^## (.*$)/gim, '<h3 class="text-md font-black text-white mt-4 mb-1 uppercase">$1</h3>') 
                                                    .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc marker:text-[#FFD700] mb-2">$1</li>') 
                                                    .replace(/\n/g, '<br/>') 
                                            }} />
                                        ) : (
                                            <p className="text-sm font-bold leading-relaxed">{msg.content}</p>
                                        )}
                                        <div className={`text-[8px] font-black mt-4 uppercase opacity-40 ${msg.role === 'user' ? 'text-black' : 'text-slate-500'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>

                                    {msg.role === 'user' && <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0 flex items-center justify-center border border-white/10 text-white font-black uppercase text-[10px]">{currentUserEmail[0]}</div>}
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex justify-start animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center"><i className="fa-solid fa-wave-square text-violet-400"></i></div>
                                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] rounded-tl-none">
                                    <div className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2">Forensic Scanning...</div>
                                    <div className="h-2 w-32 bg-white/10 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {/* Input Area: Sovereign Stylus */}
                <div className="p-10">
                    <form onSubmit={handleSubmit} className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD700] to-[#B8860B] rounded-[2.5rem] blur opacity-20 group-focus-within:opacity-40 transition-opacity duration-500"></div>
                        <div className="relative flex gap-4 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-3 pl-8 shadow-2xl">
                            <textarea 
                                value={query} onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                                placeholder="Command Oracle..."
                                className="flex-1 bg-transparent border-none text-white focus:ring-0 resize-none h-14 py-4 text-sm font-bold custom-scrollbar placeholder:text-slate-600"
                            />
                            <button disabled={loading || !query.trim()} className="bg-[#FFD700] text-black w-14 h-14 rounded-full hover:scale-110 active:scale-95 flex items-center justify-center disabled:opacity-20 transition-all shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                                <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'} text-lg`}></i>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResearchQueryWidget;