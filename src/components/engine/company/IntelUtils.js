/**
 * AUSPEX INTEL CORE - FORENSIC UTILITIES
 * Centralized formatting and data sanitization engine.
 */

export const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        maximumFractionDigits: 0 
    }).format(num);
};

export const convertToWords = (num) => {
    if (!num) return '';
    const abs = Math.abs(Number(num));
    if (abs >= 10000000) return `~ ${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `~ ${(abs / 100000).toFixed(2)} L`;
    return '';
};

export const formatCurrencyInput = (value) => {
    const raw = String(value).replace(/[^0-9.]/g, '');
    if (!raw) return { raw: 0, display: '' };
    const fmt = new Intl.NumberFormat('en-IN').format(Number(raw));
    return { raw: Number(raw), display: fmt };
};

export const safeDateFormat = (dateStr) => {
    if (!dateStr) return '';
    try { 
        return new Date(dateStr).toISOString().split('T')[0]; 
    } catch (e) { 
        return ''; 
    }
};