import React, { useState } from 'react';
import { db } from '../../lib/firebase';

const SECTOR_DATA = {
    'DeepTech': {
        'Pre-seed': { min: 42000000, max: 126000000, label: '₹4.2 Cr - ₹12.6 Cr' },
        'Seed': { min: 168000000, max: 588000000, label: '₹16.8 Cr - ₹58.8 Cr (Jumbo Seed)' },
        'Pre-A': { min: 252000000, max: 672000000, label: '₹25 Cr - ₹67 Cr' },
        'Series A': { min: 840000000, max: 1680000000, label: '₹84 Cr - ₹168 Cr' },
        'Series B': { min: 1680000000, max: 4200000000, label: '₹168 Cr - ₹420 Cr' },
        'Series C': { min: 4200000000, max: 12600000000, label: '₹420 Cr - ₹1260 Cr' }
    },
    'SaaS': {
        'Pre-seed': { min: 42000000, max: 126000000, label: '₹4.2 Cr - ₹12.6 Cr' },
        'Seed': { min: 126000000, max: 336000000, label: '₹12.6 Cr - ₹33.6 Cr' },
        'Series A': { min: 672000000, max: 1680000000, label: '₹67 Cr - ₹168 Cr' },
        'Series B': { min: 1680000000, max: 3780000000, label: '₹168 Cr - ₹378 Cr' },
        'Series C': { min: 3360000000, max: 6720000000, label: '₹336 Cr - ₹672 Cr' }
    },
    'Real Estate': { // PropTech
        'Pre-seed': { min: 25000000, max: 42000000, label: '₹2.5 Cr - ₹4.2 Cr' },
        'Seed': { min: 126000000, max: 210000000, label: '₹12.6 Cr - ₹21 Cr' },
        'Pre-A': { min: 252000000, max: 420000000, label: '₹25 Cr - ₹42 Cr' },
        'Series A': { min: 420000000, max: 840000000, label: '₹42 Cr - ₹84 Cr' },
        'Series B': { min: 1260000000, max: 2520000000, label: '₹126 Cr - ₹252 Cr' }
    },
    'EV': { // 2-Wheeler / Components
        'Seed': { min: 42000000, max: 126000000, label: '₹4.2 Cr - ₹12.6 Cr' },
        'Series A': { min: 420000000, max: 1008000000, label: '₹42 Cr - ₹100 Cr' },
        'Series B': { min: 1260000000, max: 3360000000, label: '₹126 Cr - ₹336 Cr' }
    },
    'Consumer': { // D2C / Fashion / Food
        'Pre-seed': { min: 25000000, max: 67000000, label: '₹2.5 Cr - ₹6.7 Cr' },
        'Seed': { min: 42000000, max: 126000000, label: '₹4.2 Cr - ₹12.6 Cr' },
        'Pre-A': { min: 84000000, max: 252000000, label: '₹8.4 Cr - ₹25 Cr' },
        'Series A': { min: 252000000, max: 672000000, label: '₹25 Cr - ₹67 Cr' },
        'Series B': { min: 840000000, max: 2100000000, label: '₹84 Cr - ₹210 Cr' }
    },
    'EdTech': {
        'Pre-seed': { min: 16000000, max: 42000000, label: '₹1.6 Cr - ₹4.2 Cr' },
        'Seed': { min: 42000000, max: 336000000, label: '₹4.2 Cr - ₹33.6 Cr' },
        'Pre-A': { min: 168000000, max: 336000000, label: '₹16.8 Cr - ₹33.6 Cr' },
        'Series A': { min: 420000000, max: 1260000000, label: '₹42 Cr - ₹126 Cr' }
    },
    'General': { // Fallback
        'Pre-seed': { min: 10000000, max: 60000000, label: '₹1 Cr - ₹6 Cr' },
        'Seed': { min: 30000000, max: 160000000, label: '₹3 Cr - ₹16 Cr' },
        'Pre-A': { min: 80000000, max: 300000000, label: '₹8 Cr - ₹30 Cr' },
        'Series A': { min: 250000000, max: 1000000000, label: '₹25 Cr - ₹100 Cr+' },
        'Series B': { min: 1000000000, max: 5000000000, label: '₹100 Cr - ₹500 Cr+' },
        'Other': { min: 0, max: 99999999999, label: 'Custom Range' },
    }
};

const BenchmarkSeeder = () => {
    const [status, setStatus] = useState("Ready");

    const seed = async () => {
        setStatus("Seeding...");
        const batch = db.batch();
        
        Object.entries(SECTOR_DATA).forEach(([sector, rounds]) => {
            const ref = db.collection('funding_benchmarks').doc(sector);
            batch.set(ref, { rounds, lastUpdated: new Date().toISOString() });
        });

        await batch.commit();
        setStatus("Done! Database Populated.");
    };

    return (
        <div className="p-4 bg-white/10 rounded-xl border border-white/10 text-white">
            <h3 className="font-bold mb-2">Admin Tool: Seed Market Data</h3>
            <button onClick={seed} className="bg-green-600 px-4 py-2 rounded font-bold">
                {status}
            </button>
        </div>
    );
};

export default BenchmarkSeeder;