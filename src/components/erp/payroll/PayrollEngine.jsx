/**
 * INDIAN PAYROLL CALCULATOR (FY 2024-25)
 * Includes Automatic TDS Calculation based on New Tax Regime.
 */

const calculateAnnualTaxNewRegime = (annualGross) => {
    // 1. Apply Standard Deduction (Increased to 75k in July 2024 Budget)
    const standardDeduction = 75000;
    
    // Taxable Income cannot be negative
    let taxableIncome = Math.max(0, annualGross - standardDeduction);

    // 2. Check for Rebate u/s 87A
    // If Taxable Income is up to ₹7 Lakhs, Tax is ZERO.
    if (taxableIncome <= 700000) {
        return 0;
    }

    // 3. Apply Slabs (New Regime FY 24-25)
    let tax = 0;

    // Slab: 3L to 7L (5%)
    if (taxableIncome > 300000) {
        // Income within this slab (Max 4L width)
        let slabIncome = Math.min(taxableIncome, 700000) - 300000;
        tax += slabIncome * 0.05;
    }

    // Slab: 7L to 10L (10%)
    if (taxableIncome > 700000) {
        let slabIncome = Math.min(taxableIncome, 1000000) - 700000;
        tax += slabIncome * 0.10;
    }

    // Slab: 10L to 12L (15%)
    if (taxableIncome > 1000000) {
        let slabIncome = Math.min(taxableIncome, 1200000) - 1000000;
        tax += slabIncome * 0.15;
    }

    // Slab: 12L to 15L (20%)
    if (taxableIncome > 1200000) {
        let slabIncome = Math.min(taxableIncome, 1500000) - 1200000;
        tax += slabIncome * 0.20;
    }

    // Slab: Above 15L (30%)
    if (taxableIncome > 1500000) {
        let slabIncome = taxableIncome - 1500000;
        tax += slabIncome * 0.30;
    }

    // 4. Add Health & Education Cess (4%)
    const cess = tax * 0.04;
    const totalTax = tax + cess;

    return totalTax;
};

export const calculateSalaryStructure = (monthlyGross, manualTdsOverride = 0) => {
    const gross = parseFloat(monthlyGross) || 0;
    
    // --- 1. EARNINGS BREAKDOWN ---
    // Basic is 50% of Gross
    const basic = Math.round(gross * 0.50);
    // HRA is 40% of Basic (Non-Metro standard, safe default)
    const hra = Math.round(basic * 0.40);
    // Fixed Standards
    const medical = 1250; 
    const conveyance = 1600;

    // Special Allowance (Balancer)
    let specialAllowance = gross - (basic + hra + medical + conveyance);
    if (specialAllowance < 0) specialAllowance = 0;


    // --- 2. DEDUCTIONS ---
    
    // PF (Provident Fund)
    // Rule: 12% of Basic. 
    // Cap: Often capped on 15k basic (₹1800), but for high earners usually actual 12%. 
    // We will use flat 12% of Basic here.
    const pf = Math.round(basic * 0.12);

    // PT (Professional Tax)
    // Maharashtra Rule: ₹200 flat (₹300 in Feb). We'll stick to 200 avg.
    const pt = (gross > 7500) ? 200 : 0;

    // --- 3. AUTOMATIC TAX CALCULATION (TDS) ---
    let tds = 0;
    
    if (manualTdsOverride > 0) {
        // Use the manual override if user typed something specific
        tds = parseFloat(manualTdsOverride);
    } else {
        // Auto-Calculate based on Annual Projection
        const annualGross = gross * 12;
        const annualTax = calculateAnnualTaxNewRegime(annualGross);
        tds = Math.round(annualTax / 12); // Monthly TDS
    }

    const totalDeductions = pf + pt + tds;

    // --- 4. NET PAY ---
    const netPay = gross - totalDeductions;

    return {
        earnings: {
            basic,
            hra,
            specialAllowance,
            medical,
            conveyance,
            grossTotal: gross
        },
        deductions: {
            pf,
            pt,
            tds,
            totalDeductions
        },
        netPay
    };
};