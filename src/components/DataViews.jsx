import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../lib/firebase'; 
import { supabase } from '../lib/supabaseClient'; // CRITICAL: Integrated for forensic Supabase metrics
// ==========================================
// 1. PROFILE VIEW (DYNAMIC)
// ==========================================
export const ProfileView = () => {
    const [data, setData] = useState(null);
    
    // Fallback content in case DB is empty or loading fails
    const defaultContent = {
        tagline: "We invest in conviction. We partner for the long term.",
        intro: "Auspex Investments is an early-stage venture firm...",
        storyTitle: "The Power of the Right Partner",
        storyContent: "The path from a great idea to a successful company..."
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const doc = await db.collection('company_profile').doc('main').get();
                if (doc.exists) {
                    setData(doc.data());
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchProfile();
    }, []);

    // Use DB data if available, otherwise default
    const content = data || defaultContent;

    return (
        <div className="space-y-6 text-slate-200 font-manrope animate-[fadeIn_0.4s_ease]">
            <div className="border-b border-white/10 pb-4 mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">About Auspex</h2>
                <h3 className="text-lg font-medium text-[var(--brand-color)]">{content.tagline}</h3>
            </div>
            
            <p className="leading-relaxed text-sm text-slate-300">
                {content.intro}
            </p>
            
            <div className="bg-white/5 p-6 rounded-xl border border-white/5">
                <h4 className="text-base font-bold text-[var(--brand-color)] mb-3">{content.storyTitle}</h4>
                
                {/* Render Rich Text safely */}
                <div 
                    className="text-sm text-slate-400 mb-4 leading-relaxed space-y-4 [&>b]:text-slate-200 [&>b]:font-bold"
                    dangerouslySetInnerHTML={{ __html: content.storyContent }} 
                />
            </div>
        </div>
    );
};

// ==========================================
// 2. TEAM VIEW (Unchanged)
// ==========================================
export const TeamView = () => {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState(null);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const snap = await db.collection('team_members').orderBy('order', 'asc').get();
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTeam(data);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchTeam();
    }, []);

    if (loading) return <div className="text-[var(--brand-color)] animate-pulse text-center p-10">Accessing Personnel Database...</div>;
    if (team.length === 0) return <div className="text-slate-500 text-center p-10">No active board members found.</div>;

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeIn_0.4s_ease] pb-6">
                {team.map(member => (
                    <div key={member.id} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center text-center hover:border-[var(--brand-color)]/50 transition-all duration-300 group relative">
                        <div className="w-28 h-28 rounded-full bg-slate-800 border-2 border-[var(--brand-color)] mb-3 flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_15px_var(--brand-glow)] overflow-hidden">
                            {member.photo_url ? (
                                <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <span>{member.name.charAt(0)}</span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                        <p className="text-[var(--brand-color)] text-xs font-bold mb-3 uppercase tracking-widest">{member.role}</p>
                        <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 mb-2">
                            {member.bio || "No biography available."}
                        </p>
                        <button 
                            onClick={() => setSelectedMember(member)}
                            className="text-[var(--brand-color)] text-[10px] font-bold uppercase border border-[var(--brand-color)] rounded-full px-4 py-1 hover:bg-[var(--brand-color)] hover:text-black transition-colors mb-1"
                        >
                            Know More
                        </button>
                        {member.domains && (
                            <div className="w-full pt-3 border-t border-white/10 mt-2">
                                <p className="text-[10px] text-slate-500 uppercase mb-2 font-mono">Areas of Focus</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {(Array.isArray(member.domains) ? member.domains : member.domains.split(',')).map((domain, i) => (
                                        <span key={i} className="px-2 py-1 rounded bg-[var(--brand-color)]/10 border border-[var(--brand-color)]/20 text-[var(--brand-color)] text-[10px] font-medium">
                                            {domain.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {selectedMember && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease]">
                    <div className="bg-[#0f172a] border border-[var(--brand-color)]/30 w-full max-w-2xl max-h-[80vh] rounded-2xl flex flex-col overflow-hidden relative p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                        <button onClick={() => setSelectedMember(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                        <div className="overflow-y-auto custom-scrollbar pr-2">
                            <div className="flex items-center gap-6 mb-6 border-b border-white/10 pb-6">
                                <div className="w-24 h-24 rounded-full border-2 border-[var(--brand-color)] overflow-hidden shrink-0 shadow-[0_0_20px_var(--brand-glow)]">
                                    {selectedMember.photo_url ? <img src={selectedMember.photo_url} className="w-full h-full object-cover" /> : null}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-1">{selectedMember.name}</h2>
                                    <p className="text-[var(--brand-color)] text-sm font-bold uppercase tracking-widest">{selectedMember.role}</p>
                                </div>
                            </div>
                            <h4 className="text-white font-bold mb-2 text-sm uppercase">Biography</h4>
                            <div className="prose prose-invert max-w-none">
                               <div 
    className="text-slate-300 text-sm leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: selectedMember.bio }}/>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ==========================================
// 3. PORTFOLIO VIEW (FILTERED FOR STARTUPS ONLY)
// ==========================================
// ==========================================
// 3. PORTFOLIO VIEW (PURE CURATED SUPABASE)
// ==========================================
// ==========================================
// 3. PORTFOLIO VIEW (RESTORED GRID + FORENSIC LOGIC)
// ==========================================
export const PortfolioView = ({ companies = [] }) => {
    // --- 1. FORENSIC STATE: Cross-reference Investments for Stats ---
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchForensicData = async () => {
            try {
                // Pull live investment records to calculate performance badges
                const { data } = await supabase.from('investments').select('*');
                setInvestments(data || []);
            } catch (err) { console.error("Oracle Sync Failure:", err); }
            finally { setLoading(false); }
        };
        fetchForensicData();
    }, []);

    const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);

    // --- 2. CARD RENDER ENGINE (The Flip Effect) ---
    const renderCard = (company) => {
        const relatedInvs = investments.filter(inv => String(inv.company_id) === String(company.id));
        const totalInvested = relatedInvs.reduce((acc, curr) => acc + (Number(curr.amount_invested) || 0), 0);
        const currentValue = relatedInvs.reduce((acc, curr) => acc + (Number(curr.current_valuation) || Number(curr.amount_invested) || 0), 0);
        const moic = totalInvested > 0 ? (currentValue / totalInvested).toFixed(2) : "1.00";
        
        // Parse visibility for curated metrics from your Visual Editor
        const metricsConfig = typeof company.web_metrics === 'string' 
            ? JSON.parse(company.web_metrics) 
            : (company.web_metrics || { moic: true, irr: true, tvpi: true, dpi: false });

        return (
            <div key={company.id} className="group h-56 w-full perspective-1000 cursor-pointer font-manrope">
                <div className="flip-card-inner">
                    {/* FRONT: BRAND IDENTITY */}
                    <div className="flip-card-front bg-[#0f172a] border border-white/10 flex flex-col p-6 rounded-2xl overflow-hidden shadow-2xl transition-all group-hover:border-[var(--brand-color)]/40">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-2 shadow-inner">
                                <img 
                                    src={company.logo_url || `https://ui-avatars.com/api/?name=${company.name}&background=020617&color=FFD700`} 
                                    className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500" 
                                    alt="" 
                                />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight group-hover:text-[var(--brand-color)] transition-colors">{company.name}</h3>
                                <span className="text-[9px] text-[var(--brand-color)] font-black uppercase tracking-widest bg-[var(--brand-color)]/10 px-2 py-0.5 rounded-md border border-[var(--brand-color)]/20">
                                    {company.web_industry || company.industry || 'STARTUP'}
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 italic opacity-80 group-hover:opacity-100">
                            "{company.web_synopsis || 'Institutional asset node briefing pending synchronization.'}"
                        </p>
                    </div>

                    {/* BACK: LIVE PERFORMANCE */}
                    <div className="flip-card-back bg-[#0f172a] border border-[var(--brand-color)] rounded-2xl p-6 shadow-[0_0_30px_var(--brand-glow)]">
                        <h4 className="text-center text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6 border-b border-white/10 pb-2">Forensic Metrics</h4>
                        <div className="space-y-4">
                            {metricsConfig.moic && (
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Unrealized MOIC</span>
                                    <span className="text-white font-mono font-black">{moic}x</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Capital Outlay</span>
                                <span className="text-white font-mono font-black">{formatCurrency(totalInvested)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Status</span>
                                <span className="text-[var(--brand-color)] font-black uppercase text-[10px] tracking-[0.2em]">{company.deal_status || 'ACTIVE'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <div className="text-[var(--brand-color)] animate-pulse text-center p-20 font-black uppercase tracking-[0.5em]">Syncing Portfolio Oracle...</div>;

    // --- 3. FILTER & DISPLAY ENGINE (User's Grid View) ---
    const publishedList = companies.filter(c => c.is_published === true);

    return (
        <div className="animate-[fadeIn_0.5s_ease] pb-10 font-manrope">
            {/* Header Identity */}
            <div className="mb-10 bg-gradient-to-r from-[var(--brand-color)]/10 to-transparent p-10 rounded-[2.5rem] border-l-4 border-[var(--brand-color)] relative overflow-hidden shadow-2xl">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 leading-none">Startup Equity Portfolio</h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl font-medium">
                    Our constellation of high-conviction bets building the infrastructure of tomorrow, synchronized directly from the Auspex Ledger.
                </p>
                <div className="absolute -right-8 -bottom-8 text-9xl opacity-[0.03] text-white pointer-events-none italic font-black select-none uppercase">PORTFOLIO</div>
            </div>

            {/* Grid engine */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 px-2">
                {publishedList.map(renderCard)}
                {publishedList.length === 0 && (
                    <div className="col-span-full py-40 border-2 border-dashed border-white/5 rounded-[4rem] text-center opacity-20">
                        <p className="text-[10px] font-black uppercase tracking-[0.6em]">Awaiting Portfolio Synchronization</p>
                    </div>
                )}
            </div>
        </div>
    );
};
// ==========================================
// 4. THESIS VIEW
// ==========================================
export const ThesisView = () => {
    const [theses, setTheses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState(null);

    useEffect(() => {
        const fetchThesis = async () => {
            try {
                const snap = await db.collection('thesis_verticals').get();
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                data.sort((a, b) => {
                    const orderA = parseInt(a.order) || 99;
                    const orderB = parseInt(b.order) || 99;
                    return orderA - orderB;
                });
                setTheses(data);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchThesis();
    }, []);

    const toggleItem = (id) => setOpenId(openId === id ? null : id);

    const formatDescription = (text) => {
        if (!text) return "";
        const parts = text.split(" ");
        const firstWord = parts[0];
        const rest = parts.slice(1).join(" ");
        return (
            <span>
                <span style={{ color: 'var(--brand-color)', fontWeight: 'bold' }}>{firstWord}</span> {rest}
            </span>
        );
    };

    if (loading) return <div className="text-[var(--brand-color)] animate-pulse text-center p-10">Loading Thesis Data...</div>;
    if (theses.length === 0) return <div className="text-slate-500 text-center p-10">No thesis data found.</div>;

    return (
        <div className="space-y-4 animate-[fadeIn_0.4s_ease] pb-6">
            {theses.map((item, idx) => {
                const isOpen = openId === item.id;
                const displayOrder = item.order ? (item.order < 10 ? `0${item.order}` : item.order) : (idx + 1 < 10 ? `0${idx + 1}` : idx + 1);
                return (
                    <div 
                        key={item.id} 
                        className="rounded-xl transition-all duration-300 overflow-hidden"
                        style={{
                            backgroundColor: '#020617',
                            border: isOpen ? '1px solid var(--brand-color)' : '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <button 
                            onClick={() => toggleItem(item.id)}
                            className="w-full flex items-center justify-between p-5 text-left group transition-colors duration-300"
                            style={{ 
                                backgroundColor: isOpen ? '#1e293b' : 'transparent', 
                                borderBottom: isOpen ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                cursor: 'pointer' 
                            }} 
                        >
                            <div className="flex items-center gap-4">
                                <span className={`font-mono text-xl font-bold transition-colors ${isOpen ? 'text-[var(--brand-color)]' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                    {displayOrder}
                                </span>
                                <h3 className={`text-lg font-bold transition-colors ${isOpen ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                                    {item.title}
                                </h3>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-white/10 transition-all duration-300 ${isOpen ? 'bg-[var(--brand-color)] text-black rotate-180' : 'text-slate-400 group-hover:bg-white/10'}`}>
                                <i className="fa-solid fa-chevron-down text-xs"></i>
                            </div>
                        </button>
                        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-5 pt-6 pb-6 pl-16 text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                                {formatDescription(item.description)}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ==========================================
// 5. INSIGHTS & INTEL VIEW (THE VAULT)
// ==========================================
export const InsightsView = () => {
    const [blogs, setBlogs] = useState([]);
    const [whitepapers, setWhitepapers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [activeFilter, setActiveFilter] = useState('ALL SYSTEMS');
    const [viewMode, setViewMode] = useState('intel'); // 'intel' (blogs) or 'vault' (whitepapers)
    
    // Viewers
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [pdfId, setPdfId] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Blogs
                const blogSnap = await db.collection('insights_blog').orderBy('timestamp', 'desc').get();
                setBlogs(blogSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                
                // 2. Fetch Whitepapers
                const wpSnap = await db.collection('whitepapers').get();
                setWhitepapers(wpSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) { console.error(error); } 
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    // --- EXTRACT UNIQUE DOMAINS FOR HUD ---
    const availableDomains = useMemo(() => {
        const set = new Set(['ALL SYSTEMS']);
        const source = viewMode === 'intel' ? blogs : whitepapers;
        
        source.forEach(item => {
            if (viewMode === 'intel' && item.category) set.add(item.category);
            if (viewMode === 'vault' && item.domain_tag) {
                if (Array.isArray(item.domain_tag)) item.domain_tag.forEach(t => set.add(t));
                else set.add(item.domain_tag);
            }
        });
        return Array.from(set).sort();
    }, [blogs, whitepapers, viewMode]);

    // --- FILTER LOGIC ---
    const filteredData = (viewMode === 'intel' ? blogs : whitepapers).filter(item => {
        if (activeFilter === 'ALL SYSTEMS') return true;
        if (viewMode === 'intel') return item.category === activeFilter;
        // Handle Array or String for Whitepapers
        if (Array.isArray(item.domain_tag)) return item.domain_tag.includes(activeFilter);
        return item.domain_tag === activeFilter;
    });

    const formatDate = (ts) => {
        if (!ts) return "";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getEmbedUrl = (id) => `https://drive.google.com/file/d/${id.trim()}/preview`;

    if (loading) return <div className="text-[var(--brand-color)] animate-pulse text-center p-10 font-mono tracking-widest">DECRYPTING ARCHIVES...</div>;

    return (
        <div className="space-y-8 animate-[fadeIn_0.4s_ease] pb-6">
            
            {/* --- TOP HUD CONTROLLER --- */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-4 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter">
                        MARKET <span className="text-[var(--brand-color)]">INTELLIGENCE</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">SECURE ARCHIVE // LEVEL 4 ACCESS</p>
                </div>
                
                {/* MODE SWITCHER */}
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                    <button 
                        onClick={() => { setViewMode('intel'); setActiveFilter('ALL SYSTEMS'); }}
                        className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${viewMode === 'intel' ? 'bg-[var(--brand-color)] text-black shadow-[0_0_15px_var(--brand-glow)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        Analysis
                    </button>
                    <button 
                        onClick={() => { setViewMode('vault'); setActiveFilter('ALL SYSTEMS'); }}
                        className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${viewMode === 'vault' ? 'bg-[var(--brand-color)] text-black shadow-[0_0_15px_var(--brand-glow)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        The Vault (PDF)
                    </button>
                </div>
            </div>

            {/* --- FILTER HUD --- */}
            <div className="flex flex-wrap gap-2">
                {availableDomains.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setActiveFilter(tag)}
                        className={`
                            px-3 py-1 text-[10px] font-mono border rounded transition-all uppercase
                            ${activeFilter === tag 
                                ? 'border-[var(--brand-color)] text-[var(--brand-color)] bg-[var(--brand-color)]/10 shadow-[0_0_10px_var(--brand-glow)]' 
                                : 'border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'}
                        `}
                    >
                        {tag === 'ALL SYSTEMS' ? '> ALL_SYSTEMS' : `[ ${tag} ]`}
                    </button>
                ))}
            </div>

            {/* ============================================================== */}
            {/* VIEW MODE: INTEL (BLOGS) - MAGAZINE STYLE */}
            {/* ============================================================== */}
            {viewMode === 'intel' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredData.map(blog => (
                        <div key={blog.id} onClick={() => setSelectedInsight(blog)} className="group cursor-pointer relative bg-[#020617] border border-white/10 rounded-2xl overflow-hidden hover:border-[var(--brand-color)]/50 transition-all duration-300">
                            <div className="aspect-video w-full relative overflow-hidden">
                                <img src={blog.image_url || "https://via.placeholder.com/800x400/000/333?text=Encrypted"} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
                                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur border border-white/10 px-2 py-1 rounded text-[10px] text-[var(--brand-color)] font-bold uppercase tracking-wider">
                                    {blog.category}
                                </div>
                            </div>
                            <div className="p-6 relative">
                                <div className="text-[10px] text-slate-500 font-mono mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[var(--brand-color)] rounded-full animate-pulse"></span>
                                    {formatDate(blog.timestamp)}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-[var(--brand-color)] transition-colors">{blog.title}</h3>
                                <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">{blog.summary}</p>
                                <div className="mt-4 flex items-center text-[var(--brand-color)] text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                                    Read Analysis <i className="fa-solid fa-arrow-right ml-2"></i>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ============================================================== */}
            {/* VIEW MODE: VAULT (WHITEPAPERS) - CYBERPUNK DATA GRID */}
            {/* ============================================================== */}
            {viewMode === 'vault' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredData.map(wp => (
                        <div 
                            key={wp.id} 
                            onClick={() => setPdfId(wp.pdf_url)}
                            className="group relative h-40 bg-[#050b14] border border-white/10 hover:border-[var(--brand-color)] transition-all cursor-pointer overflow-hidden clip-corner"
                        >
                            {/* SCANNER EFFECT (Pure CSS Animation) */}
                            <div className="absolute top-0 left-0 w-full h-[5px] bg-[var(--brand-color)] shadow-[0_0_20px_var(--brand-glow)] opacity-0 group-hover:opacity-100 animate-scan z-10"></div>
                            
                            {/* BACKGROUND GLOW */}
                            <div className="absolute inset-0 bg-[var(--brand-color)]/0 group-hover:bg-[var(--brand-color)]/5 transition-all duration-300"></div>

                            <div className="absolute top-0 right-0 p-3 opacity-30 group-hover:opacity-100 transition-opacity">
                                <i className="fa-regular fa-file-pdf text-3xl text-[var(--brand-color)]"></i>
                            </div>

                            <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black via-black/80 to-transparent">
                                <div className="flex gap-1 mb-2">
                                    {Array.isArray(wp.domain_tag) ? wp.domain_tag.map((t, i) => (
                                        <span key={i} className="text-[9px] font-mono border border-white/20 px-1.5 py-0.5 rounded text-slate-400 group-hover:text-[var(--brand-color)] group-hover:border-[var(--brand-color)]/30 transition-colors">
                                            {t}
                                        </span>
                                    )) : (
                                        <span className="text-[9px] font-mono border border-white/20 px-1.5 py-0.5 rounded text-slate-400 group-hover:text-[var(--brand-color)] group-hover:border-[var(--brand-color)]/30 transition-colors">
                                            {wp.domain_tag}
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-white font-bold text-sm leading-tight group-hover:text-[var(--brand-color)] transition-colors pr-8">
                                    {wp.title}
                                </h4>
                                <div className="mt-2 text-[10px] text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <i className="fa-solid fa-lock-open"></i> ACCESS GRANTED
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODALS (READERS) --- */}
            {selectedInsight && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease]">
                    <div className="bg-[#0f172a] border border-[var(--brand-color)]/30 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden relative shadow-2xl">
                        <button onClick={() => setSelectedInsight(null)} className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-white text-white hover:text-black rounded-full w-10 h-10 flex items-center justify-center transition-all backdrop-blur-sm border border-white/10">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                        <div className="overflow-y-auto custom-scrollbar">
                            <div className="h-64 md:h-80 w-full relative">
                                <img src={selectedInsight.image_url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-8 w-full">
                                    <h2 className="text-3xl font-bold text-white mb-2 leading-tight font-manrope">{selectedInsight.title}</h2>
                                    <p className="text-slate-400 text-xs font-mono">Published on {formatDate(selectedInsight.timestamp)}</p>
                                </div>
                            </div>
                            <div className="p-8 md:p-12 max-w-3xl mx-auto pb-24 font-manrope">
                                <div 
                                    className="text-slate-300 leading-relaxed space-y-4 text-sm font-manrope [&>h3]:text-white [&>h3]:font-bold [&>h3]:text-lg [&>h3]:mt-6 [&>h3]:mb-2 [&>b]:text-white [&>b]:font-bold"
                                    dangerouslySetInnerHTML={{ __html: selectedInsight.content }} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {pdfId && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease]">
                    <div className="bg-[#0f172a] border border-[var(--brand-color)]/30 w-full max-w-5xl h-[90vh] rounded-2xl flex flex-col overflow-hidden relative shadow-2xl">
                        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-slate-900">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2"><i className="fa-regular fa-file-pdf text-[var(--brand-color)]"></i> SECURE VIEWER</h3>
                            <button onClick={() => setPdfId(null)} className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <iframe src={getEmbedUrl(pdfId)} className="w-full h-full border-0" allow="autoplay"></iframe>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// 6. CONTACT & CAREERS VIEW (FINAL 3-BOX LAYOUT)
// ==========================================
export const ContactView = () => {
    const [contactData, setContactData] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Contact Info
                const contactDoc = await db.collection('company_profile').doc('contact').get();
                if (contactDoc.exists) setContactData(contactDoc.data());

                // 2. Fetch Active Jobs
                const jobsSnap = await db.collection('careers').orderBy('status', 'desc').get();
                setJobs(jobsSnap.docs.map(doc => doc.data()));
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const content = contactData || {
        email_pitch: "pitch@auspexinvestments.com",
        email_general: "info@auspexinvestments.com",
        phone_enquiry: "+91 00 0000 0000",
        phone_media: "+91 00 0000 0000",
        phone_update: "+91 00 0000 0000",
        address_line1: "123 Innovation Drive",
        address_line2: "Bangalore, KA, India",
        locations: "Dubai | Riyadh | Bahrain"
    };

    if (loading) return <div className="text-[var(--brand-color)] animate-pulse text-center p-10">Accessing Comm Channels...</div>;

    return (
        <div className="space-y-12 animate-[fadeIn_0.4s_ease] pb-10">
            
            {/* --- TOP SECTION: 3-COLUMN GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. EMAILS */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:border-[var(--brand-color)]/50 transition-all flex flex-col h-full">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--brand-color)]/10 flex items-center justify-center text-[var(--brand-color)]">
                            <i className="fa-solid fa-paper-plane"></i> 
                        </div>
                        Emails
                    </h3>
                    <div className="space-y-4 flex-1">
                        <div>
                            <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">For Founders</p>
                            <a href={`mailto:${content.email_pitch}`} className="text-white font-mono hover:text-[var(--brand-color)] transition-colors text-sm break-all">{content.email_pitch}</a>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">General Desk</p>
                            <a href={`mailto:${content.email_general}`} className="text-white font-mono hover:text-[var(--brand-color)] transition-colors text-sm break-all">{content.email_general}</a>
                        </div>
                    </div>
                </div>

                {/* 2. PHONES (NEW CARD) */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:border-[var(--brand-color)]/50 transition-all flex flex-col h-full">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--brand-color)]/10 flex items-center justify-center text-[var(--brand-color)]">
                            <i className="fa-solid fa-phone"></i> 
                        </div>
                        Direct Lines
                    </h3>
                    <div className="space-y-4 flex-1">
                        {content.phone_enquiry && (
                            <div>
                                <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">General Enquiry</p>
                                <a href={`tel:${content.phone_enquiry}`} className="text-white font-mono hover:text-[var(--brand-color)] transition-colors text-sm">{content.phone_enquiry}</a>
                            </div>
                        )}
                        {content.phone_media && (
                            <div>
                                <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Media / PR</p>
                                <a href={`tel:${content.phone_media}`} className="text-white font-mono hover:text-[var(--brand-color)] transition-colors text-sm">{content.phone_media}</a>
                            </div>
                        )}
                        {content.phone_update && (
                            <div>
                                <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Portfolio Updates</p>
                                <a href={`tel:${content.phone_update}`} className="text-white font-mono hover:text-[var(--brand-color)] transition-colors text-sm">{content.phone_update}</a>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. ADDRESS */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 hover:border-[var(--brand-color)]/50 transition-all flex flex-col h-full">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--brand-color)]/10 flex items-center justify-center text-[var(--brand-color)]">
                            <i className="fa-solid fa-location-dot"></i>
                        </div>
                        Headquarters
                    </h3>
                    <div className="flex-1">
                        <p className="text-slate-200 text-lg leading-relaxed mb-1">{content.address_line1}</p>
                        <p className="text-slate-400 text-base mb-6">{content.address_line2}</p>
                    </div>
                    <div className="border-t border-white/10 pt-4 mt-auto">
                        <p className="text-[var(--brand-color)] text-xs font-bold uppercase tracking-[0.2em]">{content.locations}</p>
                    </div>
                </div>
            </div>

            {/* --- DIVIDER --- */}
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <span className="relative z-10 bg-[#0f172a] px-4 text-sm font-bold text-slate-500 uppercase tracking-widest">Opportunities</span>
            </div>

            {/* --- CAREERS SECTION --- */}
            <div>
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Join the Team</h3>
                {jobs.length === 0 ? (
                    <div className="text-slate-500 text-center text-sm py-8 bg-white/5 rounded-xl border border-white/5">No active positions at this time. Check back later.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {jobs.map((job, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[var(--brand-color)]/50 transition-all group flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div><h3 className="text-lg font-bold text-white group-hover:text-[var(--brand-color)] transition-colors">{job.role}</h3><p className="text-slate-400 text-sm">{job.company}</p></div>
                                        <span className="bg-white/10 text-xs px-2 py-1 rounded text-white border border-white/5">{job.type}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-6"><i className="fa-solid fa-location-dot"></i> {job.location}</div>
                                </div>
                                <a href={job.link} target="_blank" rel="noopener noreferrer" className="block w-full py-3 bg-[var(--brand-color)] text-black font-bold text-center rounded-lg uppercase text-xs tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(24,184,185,0.2)]">Apply Now</a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
export const EmployeeLoginView = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setStatus("Authenticating...");
        
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            const userDoc = await db.collection('Employee_Login').doc(user.uid).get(); 
            
            if (userDoc.exists) {
                const role = userDoc.data().role || 'user';
                setStatus(`Welcome, ${role.toUpperCase()}.`);
                
                setTimeout(() => {
                    onLoginSuccess(user, role); 
                }, 800);
            } else {
                setStatus("Error: User profile not found.");
                auth.signOut();
            }
        } catch (err) { 
            console.error(err);
            setStatus("Access Denied: Invalid Credentials."); 
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full font-manrope animate-[fadeIn_0.4s_ease]">
            <div className="w-full max-w-md bg-black/40 border border-white/10 p-8 rounded-2xl shadow-[0_0_50px_var(--brand-glow)]">
                <h3 className="text-2xl text-white font-bold mb-6 text-center">System Access</h3>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none autofill:bg-slate-900"
                        placeholder="Employee Email (e.g., auxinv-001@)" 
                    />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none"
                        placeholder="Password"
                    />
                    <button type="submit" className="w-full bg-[var(--brand-color)] text-black font-bold py-3 rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_var(--brand-glow)]">
                        Authenticate
                    </button>
                </form>
                <div className="mt-4 text-center text-xs font-mono text-[var(--brand-color)] h-4 animate-pulse">{status}</div>
            </div>
        </div>
    );
};