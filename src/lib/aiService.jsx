
// src/lib/aiService.jsx

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("⚠️ CTO WARNING: VITE_GEMINI_API_KEY is not defined in your .env file.");
}

export const AI_MODELS = {
    STABLE: "gemini-2.5-pro",
    FUTURE: "gemini-3-flash-preview" 
};

const DEFAULT_MODEL = AI_MODELS.FUTURE; 

export const runAIAnalysis = async (prompt, modelOverride = null) => {
    if (!API_KEY) throw new Error("API Key Missing. Add VITE_GEMINI_API_KEY to .env");
    
    const safePrompt = String(prompt || "").trim();
    const targetModel = modelOverride || DEFAULT_MODEL;

    console.log(`📡 Connecting to AI Model: ${targetModel}`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: safePrompt }] }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini Error: ${errText}`);
        }

        const data = await response.json();
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!output) throw new Error("AI returned empty response.");
        
        return output;
    } catch (error) {
        console.error(`AI Service Failed [${targetModel}]:`, error);
        throw error; 
    }
};

export const parseAIJson = (text) => {
    if (!text) return null;
    try {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) { return null; }
};

/**
 * AI CFO STRATEGIC OPTIMIZER (FX & MULTI-ASSET AWARE)
 */
export const runStrategicOptimization = async (financials, goal, sliders, fxRate) => {
    const prompt = `
        Act as a Venture Capital CFO. 
        Analyze Multi-Asset Financial Health:
        - INR Cash: ${financials.cash}
        - USD-Denominated Assets (Crypto/Offshore): ${financials.usdAssets} USD
        - Monthly INR Burn: ${financials.inrBurn}
        - Monthly USD Burn (SaaS/HW): ${financials.usdBurn} USD
        - LIVE USD/INR RATE: ${fxRate}
        
        Optimization Goal: ${goal}
        Manual Sliders: Hiring ${sliders.hiring}%, Revenue ${sliders.revenue}%, FX Volatility ${sliders.fx}%
        
        Analyze the "Currency Hedge". If INR is weakening, should we increase USD exposure?
        Return a STRICT JSON object:
        {
            "hiring": number,
            "revenue": number,
            "market": number,
            "fx": number,
            "reasoning": "string (max 25 words explaining the FX hedge vs growth strategy)"
        }
    `;
    const response = await runAIAnalysis(prompt, AI_MODELS.FUTURE);
    return parseAIJson(response);
};

/**
 * STRATEGIC WATERFALL ENGINE (Phase 2 Roadmap)
 */
export const runBudgetAllocation = async (banks, domains, managers) => {
    const totalLiquidity = banks.reduce((sum, b) => sum + Number(b.current_balance), 0);
    const deploymentPool = totalLiquidity * 0.60;
    const opsReserve = totalLiquidity * 0.40;

    const prompt = `
        Act as a Venture Capital CFO. 
        REAL-TIME BANK LIQUIDITY: ₹${totalLiquidity}
        INVESTMENT CAP (60%): ₹${deploymentPool}
        OPERATIONS RESERVE (40%): ₹${opsReserve}

        DOMAINS: ${domains.join(', ')}
        MANAGERS: ${managers.map(m => m.name).join(', ')}

        Return a STRICT JSON object:
        {
          "ops_strategy": "string",
          "allocations": [
            {
              "domain": "string",
              "hybrid_mix": { "equity": "string", "debt": "string", "royalty": "string" },
              "domain_budget": number,
              "manager_splits": [
                {
                  "name": "string",
                  "monthly": number,
                  "marketing_credits": number,
                  "stages": [number, number, number, number]
                }
              ]
            }
          ]
        }
    `;
    const res = await runAIAnalysis(prompt, AI_MODELS.FUTURE);
    return parseAIJson(res);
};

// Legacy support preserved
export const generateInvestorThesis = async (domains, networth) => {
    const prompt = `Generate a professional investment thesis for an Angel Investor with ${networth} capital focusing on ${domains.join(', ')}. Keep it under 200 words, strategic and visionary.`;
    return await runAIAnalysis(prompt);
};

export const analyzeDealTerms = async (dealData) => {
    const prompt = `Analyze these deal terms: ${JSON.stringify(dealData)}. Highlight red flags and opportunities.`;
    return await runAIAnalysis(prompt);
};

export const fetchDeepResearch = async (q) => {
    return await runAIAnalysis(`Perform deep research on: ${q}. Provide a structured report.`, AI_MODELS.FUTURE);
};

export const fetchPredictiveProjection = async (companyData) => {
    return await runAIAnalysis(`Predict 3-year trajectory for: ${JSON.stringify(companyData)} based on current market trends.`);
};

/**
 * AUTONOMOUS QUARTERLY CONTROLLER (CFO + CTO BRAIN)
 * Enforces Common Pool, Manager Concentration Audits, and Performance Bonuses.
 */
export const fetchQuarterlyTacticalStrategy = async (totalTreasury, domains, managers, investments) => {
    
    // 1. CALCULATE FIXED POOLS
    const commonPoolPct = 0.20; // 20% for Gold/Crypto/RE/Shares
    const commonPoolTotal = totalTreasury * commonPoolPct;
    const commonPerEmployee = commonPoolTotal / (managers.length || 1); // Distributed equally
    
    const deploymentPool = totalTreasury - commonPoolTotal;

    // 2. PRE-FLIGHT AUDIT: Analyze Manager Concentration
    const managerAnalytics = managers.map(m => {
        const portfolio = investments.filter(inv => inv.fund_manager_id === m.id);
        const totalDeployed = portfolio.reduce((sum, inv) => sum + Number(inv.investment_amount), 0);
        
        // Calculate sector exposure
        const exposure = {};
        portfolio.forEach(inv => {
            exposure[inv.domain] = (exposure[inv.domain] || 0) + Number(inv.investment_amount);
        });

        return {
            id: m.id,
            name: m.name,
            totalDeployed,
            exposure,
            performance: m.performance_score || 0 // Alpha performance metric
        };
    });

    const prompt = `
        ACT AS: The Auspex CFO + CTO Autonomous Controller.
        
        TREASURY CONTEXT (Quarterly Cycle):
        - TOTAL_AVAILABLE_TREASURY: ₹${totalTreasury}
        - COMMON_POOL (Gold/Crypto/RE/Shares): ₹${commonPoolTotal}
        - INDIVIDUAL_EMPLOYEE_COMMON_DISTRIBUTION: ₹${commonPerEmployee}
        - STRATEGIC_DOMAIN_DEPLOYMENT_POOL: ₹${deploymentPool}
        
        INPUT_REGISTRY:
        - TARGET_DOMAINS: ${JSON.stringify(domains)}
        - STRATEGIST_PORTFOLIO_AUDIT: ${JSON.stringify(managerAnalytics)}
        
        GOVERNANCE PROTOCOLS:
        1. CONCENTRATION_LIMIT: If a manager has >30% exposure in one domain, trigger a M.O.R.A.I CONCENTRATION_RISK_BREACH alert. Do NOT allocate more funds to that specific domain for that manager.
        2. PERFORMANCE_ACCELERATOR: Identify managers with performance_score > 8.0. Allocate an "Alpha Bonus" from fractional leftover funds.
        3. DOMAIN_WEIGHTING: Consumables (India) has a TAM of $300B. Ensure it is weighted significantly higher than non-core sectors.
        
        OUTPUT MANDATE (STRICT JSON):
        {
          "market_intel": "Provide a 150-word deep market analysis on Indian sectors and TAM dynamics.",
          "deployment_rationale": "Provide a 150-word detailed logic on audit findings, risk mitigation, and manager bonus reasoning.",
          "common_pool_protocol": "Instructions for ₹${commonPerEmployee} distribution to each of the ${managers.length} employees.",
          "allocations": [
            {
              "domain": "string",
              "budget": number,
              "logic": "Explain the weighting based on TAM vs Risk.",
              "manager_assignments": [
                { "id": "string", "name": "string", "amount": number, "is_bonus": boolean }
              ]
            }
          ],
          "morai_warnings": [
            { "manager": "string", "domain": "string", "issue": "CONCENTRATION_RISK_BREACH", "current_exposure": "percentage" }
          ]
        }
    `;

    const res = await runAIAnalysis(prompt, AI_MODELS.FUTURE);
    return parseAIJson(res);
};


/**
 * INCUBATOR DEAL ANALYTICS (The Reasoning Node)
 * Audits deal DNA vs. Manager Performance & Fund Liquidity.
 */
export const analyzeIncubatorDeal = async (deal, managers, fundBalance) => {
    const prompt = `
        ACT AS: The Auspex Sovereign AI Controller (VEDA).
        
        FUND CONTEXT:
        - Total Portfolio Reserve: ₹${fundBalance}
        - Deal Name: ${deal.title}
        - Capital Requested: ₹${deal.amount_request}
        - Deal DNA: ${deal.equity_percent}% Equity, ${deal.debt_percent}% Debt, ${deal.royalty_percent}% Royalty.
        
        MANAGER REGISTRY:
        ${JSON.stringify(managers)}

        STRATEGIC DIRECTIVE:
        1. REASONING: Analyze if this deal is a "Liquidity Drain" (Equity only) or a "Reserve Protector" (Royalty/Debt).
        2. MANAGER ALLOCATION: Which manager from the list is best suited based on their past performance or domain?
        3. TIMING: Based on a ₹${fundBalance} reserve, is now the right time to deploy ₹${deal.amount_request}?
        4. PRE-SEED/SEED CONTEXT: Pre-seed rounds are Typically ₹2-8 Cr; Seed are ₹10-35 Cr. Does this deal fit?

        OUTPUT MANDATE (STRICT JSON):
        {
          "reasoning": "150-word forensic analysis of the deal structure.",
          "manager_recommendation": "Name of manager and logic.",
          "risk_impact": "Percentage of fund liquidity consumed.",
          "verdict": "AUTHORIZE, DEFER, or RESTRUCTURE",
          "timing_score": "1-10 score on deployment timing."
        }
    `;

    const res = await runAIAnalysis(prompt, AI_MODELS.FUTURE);
    return parseAIJson(res);
};
/**
 * SOVEREIGN REAL-TIME SECTOR AUDIT
 * Performs deep-dive analysis using 2024-2025 Sectoral Benchmarks.
 */
/**
 * TOTAL SOVEREIGN SECTOR AUDIT
 * Processes ALL 45+ domains using PDF Benchmarks.
 */
/**
 * COMPREHENSIVE SOVEREIGN ALLOCATION
 * Mandates 100% domain coverage from the 'domains' master table.
 */
/**
 * TOTAL REGISTRY NEURAL AUDIT (COMPRESSED)
 * Mandates 100% coverage of the 45+ sectors from the 'domains' table.
 */


/**
 * PURE AI SECTOR AUDIT
 * Dictates budget and manager splits with zero human interference.
 */
export const runSingleDomainAudit = async (domainName, managers, remainingCap) => {
    const prompt = `
        ACT AS: Auspex Sovereign AI (VEDA).
        SECTOR: ${domainName}
        REMAINING DEPLOYMENT CAP: ₹${remainingCap}
        ACTIVE PERSONNEL ROSTER: ${JSON.stringify(managers)}

        MANDATE:
        1. ANALYZE: Use 'India Startup Capital Benchmark Report' to set a market-clearing price for this sector.
        2. PARTITION: Independently distribute this budget among the active managers.
        3. RATIONALE: Provide a clinical, bias-free reason for the split.

        STRICT RULES:
        - HIGH ALPHA SECTORS (AI, DeepTech, Manufacturing): Target ₹80-200 Cr.
        - LOW ALPHA/SATURATED (D2C, Gaming, EdTech): Target ₹10-40 Cr.
        - Sum of 'manager_splits' must equal 'suggested_budget'.
        - Do not request human input. You are the sole strategist.

        JSON OUTPUT:
        {
          "reasoning": "Clinical forensic audit of the sector and personnel alignment.",
          "suggested_budget": number,
          "manager_splits": [
            { "name": "Manager Name", "allocation": number, "rationale": "Reason for assignment" }
          ]
        }
    `;
    const res = await runAIAnalysis(prompt, AI_MODELS.FUTURE);
    return parseAIJson(res);
};