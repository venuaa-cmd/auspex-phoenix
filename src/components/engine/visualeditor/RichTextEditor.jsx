import React from 'react';

// A lightweight wrapper around a textarea that adds HTML tags
const RichTextEditor = ({ value, onChange, label, height = "h-32" }) => {
    
    // Helper to inject tags at cursor position
    const insertTag = (tag) => {
        const textarea = document.getElementById(`rte-${label}`);
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        let newText = '';
        if (tag === 'b') newText = `${before}<b>${selection}</b>${after}`;
        else if (tag === 'i') newText = `${before}<i>${selection}</i>${after}`;
        else if (tag === 'h3') newText = `${before}<h3>${selection}</h3>${after}`;
        else if (tag === 'br') newText = `${before}<br/>${after}`; // Line break

        // Update parent state
        // We create a fake "event" object so it matches standard input behavior
        onChange({ target: { value: newText } });
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-slate-400 uppercase">{label}</label>
                
                {/* TOOLBAR */}
                <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
                    <button type="button" onClick={() => insertTag('b')} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-slate-300 font-bold text-xs" title="Bold">B</button>
                    <button type="button" onClick={() => insertTag('i')} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-slate-300 italic text-xs font-serif" title="Italic">I</button>
                    <button type="button" onClick={() => insertTag('h3')} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-slate-300 text-[10px] font-bold" title="Header">H3</button>
                    <div className="w-[1px] bg-white/10 mx-1"></div>
                    <button type="button" onClick={() => insertTag('br')} className="px-2 h-6 flex items-center justify-center rounded hover:bg-white/10 text-slate-300 text-[10px] font-mono" title="New Line">BR</button>
                </div>
            </div>
            
            <textarea
                id={`rte-${label}`}
                className={`w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none ${height} text-sm font-mono`}
                value={value}
                onChange={onChange}
                placeholder="Type here... Use toolbar for formatting."
            />
            <p className="text-[10px] text-slate-600">*HTML tags will be rendered visually on the live site.</p>
        </div>
    );
};

export default RichTextEditor;