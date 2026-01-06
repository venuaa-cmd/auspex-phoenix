import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

// MODULES
import VendorList from './VendorList';
import VendorDashboard from './VendorDashboard';
import EntityForm from './EntityForm';
import AssetTypeSelector from './AssetTypeSelector';
import AssetForm from './AssetForm';

const VendorManager = () => { 
    const TABS = [
        { id: 'ASSETS', label: 'Assets' },
        { id: 'VENDORS', label: 'Vendors' },
        { id: 'BROKERS', label: 'Brokers' },
        { id: 'CLIENTS', label: 'Clients' },
        { id: 'TEAM', label: 'Team' }
    ];

    const [activeTab, setActiveTab] = useState('ASSETS');
    const [entities, setEntities] = useState([]);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [loading, setLoading] = useState(true);

    // MODAL STATES
    const [isEntityFormOpen, setIsEntityFormOpen] = useState(false);
    const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
    const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
    
    // SELECTION STATE
    const [editingEntity, setEditingEntity] = useState(null);
    const [selectedAssetType, setSelectedAssetType] = useState(null);

    // --- 1. THE UNIFIED FETCH LOGIC ---
    const fetchEntities = async () => {
        setLoading(true);
        let data = [];
        
        try {
            // A. ASSETS (Reads from erp_portfolio_assets)
            if (activeTab === 'ASSETS') {
                const { data: assetData, error: err } = await supabase
                    .from('erp_portfolio_assets')
                    .select('*')
                    .order('asset_name', { ascending: true });
                
                if (err) throw err;
                
                // MAPPING FIX: Connect DB columns to App Properties
                data = (assetData || []).map(a => ({
                    id: a.id,
                    name: a.asset_name, 
                    type: 'ASSET',
                    category: a.asset_type,
                    status: a.status,
                    
                    // Core Data
                    ticker: a.ticker,
                    sector: a.sector,
                    invested_amount: a.invested_amount,
                    current_valuation: a.current_valuation,
                    notes: a.notes,
                    
                    // STARTUP DNA (The Missing Links)
                    founder_name: a.founder_name,
                    hq_location: a.hq_location,
                    website_url: a.website_url,
                    
                    // Map to standard Dashboard fields
                    email: a.contact_email, 
                    phone: a.contact_phone,
                    tax_id: a.tax_id,
                    
                    table_source: 'erp_portfolio_assets'
                }));
            }
            
            // B. TEAM (Reads from erp_employees)
            else if (activeTab === 'TEAM') {
                const { data: teamData, error: err } = await supabase
                    .from('erp_employees')
                    .select('id, full_name, role, email, phone, status, photo_url') 
                    .neq('status', 'EXITED') 
                    .order('full_name', { ascending: true });

                if (err) throw err;

                data = (teamData || []).map(t => ({
                    id: t.id,
                    name: t.full_name, 
                    type: 'TEAM',
                    category: t.role, 
                    status: t.status,
                    email: t.email,
                    phone: t.phone,
                    photo_url: t.photo_url, 
                    table_source: 'erp_employees'
                }));
            }

            // C. VENDORS / BROKERS / CLIENTS (Reads from erp_entities)
            else {
                const typeMap = { 'VENDORS': 'VENDOR', 'BROKERS': 'BROKER', 'CLIENTS': 'CLIENT' };
                const targetType = typeMap[activeTab];

                const { data: entityData, error: err } = await supabase
                    .from('erp_entities')
                    .select('*')
                    .eq('type', targetType)
                    .order('name', { ascending: true });
                
                if (err) throw err;

                data = (entityData || []).map(e => ({
                    ...e,
                    table_source: 'erp_entities'
                }));
            }

            setEntities(data);
            
            // Live update selection if still valid
            if (selectedEntity) {
                const updated = data.find(d => d.id === selectedEntity.id);
                if (updated) setSelectedEntity(updated);
            }

        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEntities(); }, [activeTab]);

    // --- 2. HANDLERS ---
    
    const handleAddClick = () => {
        setEditingEntity(null);
        if (activeTab === 'ASSETS') {
            setIsAssetSelectorOpen(true);
        } else {
            setIsEntityFormOpen(true);
        }
    };

    const handleEditClick = (entity) => {
        if (entity.type === 'TEAM') return;

        setEditingEntity(entity);
        if (activeTab === 'ASSETS') {
            setSelectedAssetType(entity.category);
            setIsAssetFormOpen(true);
        } else {
            setIsEntityFormOpen(true);
        }
    };

    const handleAssetSelect = (typeId) => {
        setSelectedAssetType(typeId);
        setIsAssetSelectorOpen(false);
        setIsAssetFormOpen(true);
    };

    const handleSaveComplete = () => {
        fetchEntities();
        setIsEntityFormOpen(false);
        setIsAssetFormOpen(false);
        setIsAssetSelectorOpen(false);
    };

    return (
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)] animate-[fadeIn_0.3s_ease]">
            <VendorList 
                tabs={TABS}
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                entities={entities} 
                selectedEntity={selectedEntity} 
                onSelect={setSelectedEntity} 
                onAddClick={handleAddClick}
                loading={loading}
            />

            <VendorDashboard 
                entity={selectedEntity} 
                onEdit={() => handleEditClick(selectedEntity)}
            />

            <EntityForm 
                isOpen={isEntityFormOpen} 
                onClose={() => setIsEntityFormOpen(false)} 
                onSave={handleSaveComplete} 
                type={activeTab.slice(0, -1)}
                initialData={editingEntity} 
            />

            <AssetTypeSelector 
                isOpen={isAssetSelectorOpen}
                onClose={() => setIsAssetSelectorOpen(false)} 
                onSelect={handleAssetSelect}
            />

            <AssetForm
                isOpen={isAssetFormOpen}
                onClose={() => setIsAssetFormOpen(false)}
                onAdd={handleSaveComplete}
                selectedType={selectedAssetType}
                initialData={editingEntity}
            />
        </div>
    );
};

export default VendorManager;