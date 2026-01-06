import { v5 as uuidv5 } from 'uuid';

const APP_NAMESPACE = 'a90a210f-13a8-445a-8b09-771146607062';

export const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

export const calculateMetrics = (invested, current, status, date) => {
    const safeInv = Number(invested) || 1;
    const safeCur = Number(current) || 0;
    const moic = (safeCur / safeInv).toFixed(2);
    
    const years = (new Date() - new Date(date || new Date())) / (1000 * 60 * 60 * 24 * 365);
    const safeYears = years < 1 ? 1 : years;
    const irr = (((safeCur / safeInv) ** (1 / safeYears)) - 1) * 100;

    return { 
        moic, 
        profit: safeCur - safeInv, 
        irr: irr.toFixed(1), 
        tvpi: moic, 
        dpi: status === 'Exited' ? moic : '0.00',
        isDistressed: parseFloat(moic) < 1.0
    };
};