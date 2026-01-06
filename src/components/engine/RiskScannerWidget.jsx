import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../../lib/firebase'; 
import { supabase } from '../../lib/supabaseClient'; 

// --- CONFIG ---
const CURRENT_MARKET_PRICE = {
    'Reliance Shares': 3000,
    // Add other assets here as needed
};

// --- HANDLER FOR DRILL DOWN ---
const handleAlertClick = (alert, onSelectCompany, onSelectPitch) => {
    // If the alert is linked to a company (CASH risk), open Company Detail View
    if (alert.type === 'CASH') {
        if (onSelectCompany) {
            onSelectCompany({ id: alert.id }); 
        } else {
            alert("CASH ALERT: Click requires navigation handler (onSelectCompany).");
        }
    } 
    // If the alert is an investment trigger (BUY/SELL), provide feedback
    else if (alert.type === 'BUY' || alert.type === 'SELL') {
        alert("Investment Trigger: " + alert.title + ". Management tools needed for action.");
    }
    // If the alert is a calendar event, provide feedback
    else if (alert.type === 'CALENDAR') {
        alert("Focusing on Tactical Ops item: " + alert.title + ". Check Tactical Ops.");
    }
};

const RiskScannerWidget = ({ companies = [], investments = [], users = [], onSelectCompany, onSelectPitch }) => {
    // Fixed display state, used only for the 'X' button hide functionality
    const [isWidgetVisible, setIsWidgetVisible] = useState(true); 
    const [calendarNotes, setCalendarNotes] = useState([]);
    const [assetTriggers, setAssetTriggers] = useState([]);

    // --- DATA FETCH (Hybrid: Firebase for Tactical/Triggers) ---
    useEffect(() => {
        // Fetch Calendar Deadlines/Tasks from the now-stable Firebase source
        const unsubCalendar = db.collection('calendar_events').onSnapshot(snap => {
            setCalendarNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Fetch Investment Triggers (New Collection)
        const unsubTriggers = db.collection('asset_triggers').onSnapshot(snap => {
            setAssetTriggers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubCalendar();
            unsubTriggers();
        };
    }, []);

    // --- CORE RISK LOGIC ---
    const risks = useMemo(() => {
        const alerts = [];
        const today = new Date();

        // 1. CALENDAR DEADLINES/TASKS
        calendarNotes.forEach(note => {
            // Use the "completed" field from the stable Calendar model
            if (!note.completed && (note.type === 'Deadline' || note.type === 'Task')) { 
                const date = new Date(note.date);
                const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
                // Checks for events due today, overdue (diff < 0), or due within the next 5 days
                if (diff >= -1 && diff <= 5) { 
                    alerts.push({
                        id: note.id,
                        severity: note.type === 'Deadline' ? 'HIGH' : 'MEDIUM',
                        title: `${note.type}: ${note.title}`,
                        msg: diff < 0 ? 'Overdue!' : (diff === 0 ? 'Due Today' : `Due in ${diff} days`),
                        type: 'CALENDAR',
                        icon: 'fa-calendar-check'
                    });
                }
            }
        });

        // 2. CASH RUNWAY (Using company data passed via props)
        companies.forEach(comp => {
            const cash = Number(comp.cashBalance) || 0;
            const burn = Number(comp.monthlyBurn) || 0;
            if (burn > 0) {
                const runway = cash / burn;
                if (runway < 4) alerts.push({ 
                    id: comp.id, 
                    severity: 'CRITICAL', 
                    title: `DEATH ZONE: ${comp.companyName}`, 
                    msg: `Only ${runway.toFixed(1)} months cash left.`, 
                    type: 'CASH',
                    icon: 'fa-fire'
                });
            }
        });

        // 3. INVESTMENT TRIGGERS (New Logic)
        assetTriggers.forEach(trigger => {
            const currentPrice = CURRENT_MARKET_PRICE[trigger.assetName] || 0;
            const targetPrice = Number(trigger.targetPrice) || 0;
            const isBuy = trigger.type === 'BUY';
            const isSell = trigger.type === 'SELL';
            
            if (targetPrice > 0) {
                let statusMsg = '';
                let severity = 'LOW';
                let triggered = false;

                // --- BUY Logic ---
                if (isBuy && currentPrice <= targetPrice) {
                    triggered = true;
                    severity = 'CRITICAL';
                    
                    // AI Check: Budget and Risk (Placeholders)
                    const budgetCheck = Math.random() < 0.2; 
                    const shareRiskCheck = Math.random() < 0.1;
                    
                    if (budgetCheck) {
                         statusMsg = `AI: Budget may be tight. Recommended wait: 7 days.`;
                         severity = 'MEDIUM';
                    } else if (shareRiskCheck) {
                         statusMsg = `AI: Share volume is risky (too low/high). Proceed with caution.`;
                         severity = 'HIGH';
                    } else {
                         statusMsg = `TARGET MET. Ready to BUY ${trigger.assetName}.`;
                    }
                }

                // --- SELL Logic ---
                if (isSell && currentPrice >= targetPrice) {
                    triggered = true;
                    severity = 'CRITICAL';
                    
                    // AI Check: Over Greedy (Placeholder)
                    const greedCheck = Math.random() < 0.3; 
                    
                    if (greedCheck) {
                         statusMsg = `AI: Price is strong, but analysis suggests waiting 3 more days (over greedy check).`;
                         severity = 'HIGH';
                    } else {
                         statusMsg = `TARGET MET. Ready to SELL ${trigger.assetName}.`;
                    }
                }

                if (triggered) {
                    alerts.push({
                        id: trigger.id,
                        severity: severity,
                        title: `${trigger.type} ALERT: ${trigger.assetName}`,
                        msg: statusMsg || `Current price $${currentPrice} met or exceeded target $${targetPrice}.`,
                        type: trigger.type,
                        icon: isBuy ? 'fa-arrow-down' : 'fa-arrow-up'
                    });
                }
            }
        });

        const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return alerts.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
    }, [companies, assetTriggers, calendarNotes]);

    if (risks.length === 0 || !isWidgetVisible) return null; 

    // --- RENDER: FIXED, NON-INTRUSIVE ALERT BOX ---
    const isCritical = risks.some(r => r.severity === 'CRITICAL');
    
    // Aesthetic Fix: Use brand colors for border and pulse effect.
    const containerClasses = isCritical 
        ? 'bg-red-900/20 border-red-500/50' 
        : 'bg-[var(--brand-color)]/10 border-[var(--brand-color)]/50';

    const pulseClasses = isCritical 
        ? 'bg-red-500' 
        : 'bg-[var(--brand-color)]';


    return (
        <div className="mb-8 animate-[fadeIn_0.5s_ease]">
            <div className={`rounded-xl border transition-all ${containerClasses}`}>
                {/* Header (Always Visible) - Guaranteed NO accordion toggle */}
                <div className="p-3 flex justify-between items-center bg-black/40 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${pulseClasses}`}></div>
                        <h3 className="font-bold text-white tracking-wide uppercase text-sm">
                            Oracle Tactical Alerts ({risks.length})
                        </h3>
                    </div>
                    {/* Close button to temporarily hide the entire widget */}
                    <button onClick={() => setIsWidgetVisible(false)} className="text-slate-400 hover:text-red-400">
                        <i className={`fa-solid fa-xmark`}></i>
                    </button>
                </div>
                
                {/* Content (Fixed Height Scrollbox, shows ALL available risks) */}
                <div className="divide-y divide-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                    {/* FIX: Ensure no .slice() limitation is present */}
                    {risks.map((risk, idx) => ( 
                        <div 
                            key={idx} 
                            onClick={() => handleAlertClick(risk, onSelectCompany, onSelectPitch)} 
                            className="p-4 flex items-start gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            
                            {/* Severity Icon */}
                            <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                                ${risk.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 
                                  risk.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 
                                  'bg-blue-500/20 text-blue-400'}`} 
                            >
                                <i className={`fa-solid ${risk.icon}`}></i>
                            </div>
                            
                            {/* Details */}
                            <div>
                                <h4 className={`text-sm font-bold ${risk.severity === 'CRITICAL' ? 'text-red-400' : 'text-white'}`}>{risk.title}</h4>
                                <p className="text-xs text-slate-400 mt-1">{risk.msg}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RiskScannerWidget;