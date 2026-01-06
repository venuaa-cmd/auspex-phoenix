import React, { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';

// --- 1. API HANDLER ---
async function fetchNews(query) {
    const PROXY_SERVER_URL = "https://auspex-phoenix.vercel.app";
    const formattedQuery = encodeURIComponent(query);
    const finalUrl = `${PROXY_SERVER_URL}/api/news?query=${formattedQuery}`; 
    
    try {
        const response = await fetch(finalUrl);
        if (!response.ok) throw new Error(`News Proxy Error: ${response.statusText}`);
        const data = await response.json();
        
        if (data.status === "error") throw new Error(data.message || "NewsAPI Error");
        
        // --- CLIENT-SIDE LANGUAGE FILTER ---
        const isEnglish = (text) => /^[a-zA-Z0-9\s.,!?'"$%()-]+$/.test(text.substring(0, 10));

        return (data.articles || []).filter(article => 
            article.title && 
            article.title !== "[Removed]" && 
            article.description &&
            isEnglish(article.title) 
        ).slice(0, 20);

    } catch (error) {
        console.warn("News API failed, switching to Mock Data:", error);
        return []; 
    }
}

// --- 2. NEWS CARD COMPONENT ---
const NewsArticle = ({ article, onAddWatchlist, onBookmark, onDeleteBookmark, isAdmin, watchlist, bookmarks, isBookmarkedView }) => {
    const placeholderImage = "https://via.placeholder.com/400x200.png?text=Market+Intel";
    
    // Normalize Data
    const title = article.title;
    const description = article.description;
    const url = article.url;
    const image = article.urlToImage || article.imageUrl || placeholderImage;
    const sourceName = article.source?.name || article.source || 'Unknown';
    const date = article.publishedAt || article.savedAt;

    // --- STATE CHECKS ---
    const isOnWatchlist = watchlist && watchlist.some(w => 
        title.toLowerCase().includes(w.name.toLowerCase())
    );

    const isBookmarked = bookmarks && bookmarks.some(b => 
        b.url === url || b.title === title
    );

    const handleShare = async (e) => {
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({ title, text: description, url });
            } catch (err) { console.log('Error sharing:', err); }
        } else {
            navigator.clipboard.writeText(url);
            alert("Link copied to clipboard!");
        }
    };

    return (
        <div className="bg-[#0f172a] border border-white/10 rounded-xl overflow-hidden hover:border-[var(--brand-color)]/50 transition-all group relative shadow-lg mb-4 flex flex-col">
            <a href={url} target="_blank" rel="noopener noreferrer" className="block text-slate-300 hover:text-white flex-1">
                <div className="h-40 overflow-hidden relative">
                    <img 
                        src={image} 
                        alt={title} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                        onError={(e) => e.target.src = placeholderImage}
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
                        {sourceName}
                    </div>
                    
                    {/* WATCHLIST INDICATOR */}
                    {isOnWatchlist && (
                        <div className="absolute top-2 right-2 bg-[var(--brand-color)] text-black px-2 py-1 rounded text-[10px] font-bold uppercase shadow-lg">
                            <i className="fa-solid fa-eye mr-1"></i> Watching
                        </div>
                    )}
                </div>
                <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-[var(--brand-color)] transition-colors">
                        {title}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                        {description}
                    </p>
                    <div className="text-xs text-slate-500 font-mono">
                        {new Date(date).toLocaleDateString()}
                    </div>
                </div>
            </a>

            {/* --- ACTION BAR --- */}
            <div className="px-5 pb-5 pt-0 flex gap-2 mt-auto">
                {/* SHARE BUTTON */}
                <button 
                    onClick={handleShare}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                >
                    <i className="fa-solid fa-share-nodes"></i> Share
                </button>

                {/* BOOKMARK BUTTON (DYNAMIC STATE) */}
                {isBookmarkedView ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteBookmark(article.id); }}
                        className="flex-1 bg-red-500/10 hover:bg-red-500 border border-red-500/30 hover:text-white text-red-400 text-xs py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-trash"></i> Remove
                    </button>
                ) : (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onBookmark(article); }}
                        disabled={isBookmarked}
                        className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 border ${
                            isBookmarked 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-default' 
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                        }`}
                    >
                        {isBookmarked ? <><i className="fa-solid fa-check"></i> Saved</> : <><i className="fa-regular fa-bookmark"></i> Save</>}
                    </button>
                )}

                {/* WATCH BUTTON (DYNAMIC STATE) */}
                {isAdmin && (
                    isOnWatchlist ? (
                        <div className="w-10 bg-[var(--brand-color)]/20 text-[var(--brand-color)] border border-[var(--brand-color)]/50 text-xs py-2 rounded-lg font-bold flex items-center justify-center cursor-default">
                            <i className="fa-solid fa-check"></i>
                        </div>
                    ) : (
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation();
                                const defaultName = title.split(' ').slice(0,2).join(' ');
                                const companyName = prompt("Add to Watchlist (Enter Name):", defaultName); 
                                if(companyName) onAddWatchlist(companyName.trim()); 
                            }}
                            className="w-10 bg-[var(--brand-color)]/10 hover:bg-[var(--brand-color)] text-[var(--brand-color)] hover:text-black border border-[var(--brand-color)]/50 text-xs py-2 rounded-lg font-bold transition-all flex items-center justify-center"
                            title="Track Company"
                        >
                            <i className="fa-solid fa-plus"></i>
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

// --- 3. MAIN WIDGET COMPONENT ---
const NewsWidget = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [articles, setArticles] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [customQuery, setCustomQuery] = useState('');
    const [watchlist, setWatchlist] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            const user = auth.currentUser;
            if (user) {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists && doc.data().role === 'admin') setIsAdmin(true);
                else setIsAdmin(true); // Default true for dev
            }
        };
        checkUser();

        // Listen to Watchlist
        const unsubWatch = db.collection('watchlist').onSnapshot(snap => {
            setWatchlist(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Listen to Bookmarks
        const unsubBookmarks = db.collection('bookmarks').orderBy('savedAt', 'desc').onSnapshot(snap => {
            setBookmarks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubWatch(); unsubBookmarks(); };
    }, []);

    const loadNews = async (type = activeTab) => {
        if (type === 'bookmarks') {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setArticles([]); 
        let query = '';
        
        if (type === 'general') query = 'India Startup Funding OR Venture Capital India'; 
        else if (type === 'watchlist') {
            if (watchlist.length === 0) { setIsLoading(false); return; }
            query = watchlist.map(w => `"${w.name}"`).join(' OR ');
        } else if (type === 'custom') query = customQuery;

        if (query) {
            const data = await fetchNews(query);
            setArticles(data);
        }
        setIsLoading(false);
    };

    useEffect(() => { loadNews(activeTab); }, [activeTab]);
    useEffect(() => { if (activeTab === 'watchlist') loadNews('watchlist'); }, [watchlist]);

    // HANDLERS
    const handleAddWatchlist = async (name) => {
        try {
            await db.collection('watchlist').add({ name, addedAt: new Date().toISOString() });
            alert(`Added "${name}" to Watchlist.`);
        } catch (e) { alert(e.message); }
    };
    
    const handleRemoveWatchlist = async (id) => {
        if(window.confirm("Remove from watchlist?")) await db.collection('watchlist').doc(id).delete();
    };

    const handleBookmark = async (article) => {
        // Check if already bookmarked locally first to avoid duplicate calls
        const exists = bookmarks.some(b => b.url === article.url || b.title === article.title);
        if (exists) {
            alert("Already in bookmarks.");
            return;
        }

        try {
            await db.collection('bookmarks').add({
                title: article.title,
                url: article.url,
                source: article.source?.name || 'Unknown',
                imageUrl: article.urlToImage,
                description: article.description,
                savedAt: new Date().toISOString()
            });
            // Notification handled by button state change
        } catch (e) { alert("Error: " + e.message); }
    };

    const handleDeleteBookmark = async (id) => {
        if(window.confirm("Remove bookmark?")) await db.collection('bookmarks').doc(id).delete();
    };

    return (
        <div className="animate-[fadeIn_0.4s_ease]">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div><h2 className="text-2xl font-bold text-white">Market Intelligence</h2><p className="text-slate-400 text-sm">Live news feed & saved insights.</p></div>
                    {activeTab !== 'bookmarks' && (
                        <button onClick={() => loadNews()} className="bg-[var(--brand-color)] text-black px-4 py-2 rounded-lg font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2" disabled={isLoading}>
                            <i className={`fa-solid fa-arrows-rotate ${isLoading ? 'animate-spin' : ''}`}></i> Refresh
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 border-b border-white/10 pb-1">
                    <button onClick={() => setActiveTab('general')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all ${activeTab === 'general' ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)] border-b-2 border-[var(--brand-color)]' : 'text-slate-400 hover:text-white'}`}>General</button>
                    <button onClick={() => setActiveTab('watchlist')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all ${activeTab === 'watchlist' ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)] border-b-2 border-[var(--brand-color)]' : 'text-slate-400 hover:text-white'}`}>Watchlist ({watchlist.length})</button>
                    <button onClick={() => setActiveTab('custom')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all ${activeTab === 'custom' ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)] border-b-2 border-[var(--brand-color)]' : 'text-slate-400 hover:text-white'}`}>Search</button>
                    <button onClick={() => setActiveTab('bookmarks')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all ${activeTab === 'bookmarks' ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)] border-b-2 border-[var(--brand-color)]' : 'text-slate-400 hover:text-white'}`}>
                        <i className="fa-solid fa-bookmark mr-2"></i>Saved ({bookmarks.length})
                    </button>
                </div>
                
                <div className="mt-4">
                    {activeTab === 'custom' && (<form onSubmit={(e) => { e.preventDefault(); loadNews('custom'); }} className="flex gap-2"><input type="text" value={customQuery} onChange={(e) => setCustomQuery(e.target.value)} placeholder="Search e.g. 'Crypto Regulation India'..." className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none" /><button type="submit" className="bg-white/10 hover:bg-white/20 text-white px-6 rounded-lg font-bold">Search</button></form>)}
                    {activeTab === 'watchlist' && (<div className="flex flex-wrap gap-2">{watchlist.length === 0 ? (<span className="text-slate-500 italic text-sm">Your watchlist is empty.</span>) : (watchlist.map(w => (<div key={w.id} className="flex items-center gap-2 px-3 py-1 bg-blue-900/20 border border-blue-500/30 rounded-full text-xs text-blue-300">{w.name}{isAdmin && <button onClick={() => handleRemoveWatchlist(w.id)} className="hover:text-white">×</button>}</div>)))}</div>)}
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-20">
                    <div className="inline-block w-8 h-8 border-4 border-[var(--brand-color)] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-400 animate-pulse">Fetching latest intel...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(activeTab === 'bookmarks' ? bookmarks : articles).length > 0 ? (
                        (activeTab === 'bookmarks' ? bookmarks : articles).map((article, idx) => (
                            <NewsArticle 
                                key={article.id || idx} 
                                article={article} 
                                onAddWatchlist={handleAddWatchlist} 
                                onBookmark={handleBookmark}
                                onDeleteBookmark={handleDeleteBookmark}
                                isAdmin={isAdmin} 
                                watchlist={watchlist}
                                bookmarks={bookmarks} // PASS BOOKMARKS DOWN
                                isBookmarkedView={activeTab === 'bookmarks'}
                            />
                        ))
                    ) : (
                        <div className="col-span-2 text-center py-10 text-slate-500 border border-dashed border-white/10 rounded-xl">
                            {activeTab === 'bookmarks' ? "No saved articles yet." : "No recent articles found for this category."}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NewsWidget;