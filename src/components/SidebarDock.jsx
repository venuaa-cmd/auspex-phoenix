import React from 'react';

const SidebarDock = ({ activeView, setView, userRole, isMobileMenuOpen, setIsMobileMenuOpen }) => {
    const menuItems = [
        { id: 'chat', icon: 'fa-solid fa-comments', label: 'Apex AI' },
        { id: 'profile', icon: 'fa-solid fa-id-card', label: 'Profile' },
        { id: 'pitch', icon: 'fa-solid fa-bolt', label: 'Pitch Deck' },
        { id: 'portfolio', icon: 'fa-solid fa-chart-pie', label: 'Portfolio' },
        { id: 'team', icon: 'fa-solid fa-users', label: 'Team' },
        { id: 'thesis', icon: 'fa-solid fa-lightbulb', label: 'Thesis' },
        { id: 'insights', icon: 'fa-solid fa-brain', label: 'Intel' },
        { id: 'contact', icon: 'fa-solid fa-envelope', label: 'Contact' },
    ];

    const gateItem = userRole === 'admin' 
        ? { id: 'management', icon: 'fa-solid fa-lock-open', label: 'Admin Core' }
        : { id: 'employee_gate', icon: 'fa-solid fa-lock', label: 'Staff Login' };

    const legacyItem = { id: 'legacy', icon: 'fa-solid fa-globe', label: 'Legacy Site', isExternal: true };
    
    const allItems = [...menuItems, gateItem, legacyItem];

    return (
        <>
            {/* --- FLOATING DOCK CONTAINER --- */}
            <div className={`
                fixed top-4 bottom-4 left-4 
                /* CRITICAL FIX: Z-Index must be higher than Overlay (9990) when open on mobile */
                ${isMobileMenuOpen ? 'z-[10000]' : 'z-[100]'}
                
                bg-[#0a0f1e]/95 backdrop-blur-2xl border border-white/10
                rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]
                transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                overflow-hidden
                flex flex-col
                
                /* WIDTH LOGIC */
                ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-[120%] w-64'}
                md:translate-x-0 md:w-20 md:hover:w-64
                group/sidebar
            `}>
                
                {/* LOGO */}
                <div className="h-24 flex items-center justify-center border-b border-white/5 shrink-0 overflow-hidden whitespace-nowrap bg-black/20">
                    <span className="text-2xl font-black text-white tracking-tighter opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100">
                        AUS<span className="text-[var(--brand-color)]">PEX</span>
                    </span>
                </div>

                {/* MENU ITEMS */}
                <div className="flex-1 overflow-y-auto no-scrollbar py-6 flex flex-col gap-3">
                    {allItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.isExternal) window.open('https://www.static.auspexinvestments.com', '_blank');
                                else {
                                    setView(item.id);
                                    setIsMobileMenuOpen(false);
                                }
                            }}
                            className={`
                                relative flex items-center h-12 mx-3 rounded-xl transition-all duration-200 group/btn overflow-hidden border
                                ${activeView === item.id 
                                    ? 'bg-[var(--brand-color)] text-black border-[var(--brand-color)] shadow-[0_0_15px_var(--brand-glow)] font-bold' 
                                    : 'bg-[#0f172a] border-white/5 text-slate-400 hover:border-[var(--brand-color)]/50 hover:text-white hover:bg-[#1e293b]'
                                }
                            `}
                        >
                            {/* ICON */}
                            <div className="absolute left-0 w-14 h-12 flex items-center justify-center shrink-0 z-10">
                                <i className={`${item.icon} text-lg ${activeView === item.id ? 'animate-pulse' : ''}`}></i>
                            </div>

                            {/* LABEL */}
                            <span className={`
                                ml-14 text-sm tracking-wide whitespace-nowrap opacity-0 
                                md:group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75
                                ${isMobileMenuOpen ? 'opacity-100' : ''} /* Force opacity on mobile */
                                z-10
                            `}>
                                {item.label}
                            </span>

                            {/* ACTIVE BAR */}
                            {activeView === item.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/20"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* FOOTER */}
                <div className="h-16 border-t border-white/5 flex items-center justify-center shrink-0 bg-black/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                    <span className="ml-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        System Online
                    </span>
                </div>
            </div>
        </>
    );
};

export default SidebarDock;