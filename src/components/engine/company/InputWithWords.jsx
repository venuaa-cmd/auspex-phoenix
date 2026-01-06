import React from 'react';
import { convertToWords } from './IntelUtils';

/**
 * AUSPEX INTEL CORE - SMART INPUT COMPONENT
 * Handles forensic currency inputs with live word conversion.
 */
const InputWithWords = ({ label, value, field, onChange, readOnly }) => (
    <div>
        <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1 tracking-widest">
            {label}
        </label>
        <input 
            className={`w-full bg-[#020617] border border-white/10 rounded p-2 text-white text-xs focus:border-[var(--brand-color)] focus:outline-none font-semibold ${
                readOnly ? 'opacity-50 cursor-not-allowed' : ''
            }`} 
            value={value} 
            onChange={e => !readOnly && onChange(field, e.target.value.replace(/[^0-9.]/g, ''))} 
            readOnly={readOnly}
        />
        <div className="text-[9px] text-[var(--brand-color)] mt-1 text-right font-bold h-3">
            {convertToWords(value)}
        </div>
    </div>
);

export default InputWithWords;