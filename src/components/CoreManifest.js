// --- CORE DATABASE & AUTH ---
import { supabase } from '../lib/supabaseClient';
import { db, auth } from '../lib/firebase';
import { v5 as uuidv5 } from 'uuid';

// --- MODULAR STATIONS (Admin Folder) ---
import PitchCommandCenter from './compartment/PitchCommandCenter';
import UserRolesView from './compartment/UserRolesView';
import ManagerManagementView from './compartment/ManagerManagementView';
import DomainBudgetManagement from './compartment/DomainBudgetManagement';
import SoverignOverview from './compartment/SoverignOverview';

// --- ENGINE & INTELLIGENCE WIDGETS ---
import PortfolioManager from './engine/PortfolioManager';
import StockTracker from './engine/MarketWatch';
import NewsWidget from './engine/NewsWidget';
import DealFlowWidget from './engine/DealFlowWidget';
import RiskScannerWidget from './engine/RiskScannerWidget';
import VisualEditor from './VisualEditor';
import ErpVaultGate from './erp/ErpVaultGate';
import TacticalCalendar from './engine/TacticalCalendar';
import MORAI_TaskTableView from './engine/MORAI_TaskTableView';
import AngelInvestorDirectory from './engine/AngelInvestorDirectory';
import DomainManager from './engine/DomainManager';
import ResearchQueryWidget from './engine/ResearchQueryWidget';

export const Core = {
    supabase, db, auth, uuidv5,
    PitchCommandCenter, UserRolesView, ManagerManagementView, DomainBudgetManagement, SoverignOverview, 
    PortfolioManager, StockTracker, NewsWidget, DealFlowWidget, RiskScannerWidget,
    VisualEditor, ErpVaultGate, TacticalCalendar, MORAI_TaskTableView,
    AngelInvestorDirectory, DomainManager, ResearchQueryWidget
};