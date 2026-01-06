export const UI = {
    // --- 1. LAYOUT CONTAINERS ---
    pageContainer: "bg-white min-h-screen font-manrope text-slate-800 animate-[fadeIn_0.3s_ease]",
    contentArea: "p-4 lg:p-8 pt-4",
    
    // --- 2. PAGE HEADERS & TABS ---
    header: {
        container: "px-4 lg:px-8 py-4 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white sticky top-0 z-10 gap-4",
        tabGroup: "flex w-full lg:w-auto border-b border-slate-100 lg:border-none",
        tabActive: "flex-1 lg:flex-none pb-2 lg:pb-2 border-b-2 text-center lg:text-left transition-all font-bold",
        tabInactive: "flex-1 lg:flex-none pb-2 lg:pb-2 border-b-2 text-center lg:text-left transition-all border-transparent text-slate-400 hover:text-slate-600",
        colors: {
            blue: "text-blue-600 border-blue-600",
            emerald: "text-emerald-600 border-emerald-600"
        }
    },

    // --- 3. HUD (HEADS UP DISPLAY) ---
    hud: {
        grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 lg:p-8 lg:pb-2",
        card: "bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-center",
        label: "text-[10px] font-bold uppercase tracking-widest mb-1",
        value: "text-xl lg:text-2xl font-black text-slate-800"
    },

    // --- 4. FORMS & MODALS (FIXED) ---
    form: {
        // Overlay: Bottom alignment on Mobile, Center on Desktop
        modalOverlay: "fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-slate-900/80 backdrop-blur-sm p-0 lg:p-4 animate-[fadeIn_0.2s_ease]",
        
        // Box: Max Height logic added to fix scrolling issues
        modalBox: "bg-white w-full h-[90vh] lg:h-auto lg:max-h-[90vh] lg:max-w-lg rounded-t-2xl lg:rounded-xl shadow-2xl overflow-hidden flex flex-col animate-slideUp lg:animate-scaleIn border border-slate-200",
        
        // Header: DARK BLUE THEME (Requested Fix)
        modalHeader: "bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center shadow-md shrink-0",
        modalTitle: "text-xs font-black uppercase tracking-widest text-white",
        modalCloseBtn: "text-slate-400 hover:text-white transition-colors text-lg",
        
        // Inputs: STRICTLY WHITE BACKGROUND
        input: "w-full border border-slate-300 bg-white rounded-lg p-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300",
        label: "block text-[9px] font-bold text-slate-500 uppercase mb-1 tracking-wider",
        
        // Containers for grouping (kept light gray for contrast against white inputs)
        selectCategoryWrapper: "p-4 rounded-lg border border-slate-200 bg-slate-50",
    },

    // --- 5. ALERTS & INFO BOXES ---
    infoBox: {
        success: "mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded text-[10px] text-emerald-700 flex justify-between items-center",
        blue: "text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-wider animate-pulse"
    },

    // --- 6. TABLES ---
    table: {
        wrapper: "bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full",
        headerRow: "px-6 py-4 border-b border-slate-200 bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 shrink-0",
        scrollContainer: "overflow-x-auto flex-1 bg-white",
        element: "w-full text-left border-collapse min-w-[600px]", 
        
        // Table Headers: Light Gray to distinguish from White Content
        th: "p-4 whitespace-nowrap bg-slate-100 sticky top-0 z-10 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200",
        td: "p-4 whitespace-nowrap font-medium text-slate-600 border-b border-slate-100 group-hover:bg-slate-50 transition-colors"
    },

    // --- 7. BUTTONS ---
    btn: {
        primary: "w-full lg:w-auto bg-slate-900 text-white font-bold py-3 px-6 rounded-lg shadow-md text-xs uppercase tracking-wider flex justify-center items-center gap-2 hover:bg-slate-800 transition-all",
        success: "w-full lg:w-auto bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg shadow-md text-xs uppercase tracking-wider flex justify-center items-center gap-2 hover:bg-emerald-500 transition-all",
        icon: "text-slate-400 hover:text-red-500 px-2 transition-colors"
    }
};