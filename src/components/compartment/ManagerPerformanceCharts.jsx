// components/ManagerPerformanceCharts.jsx
import React from 'react';
import { Bar } from 'react-chartjs-2';

export const ManagerPortfolioChart = ({ portfolio }) => {
    const data = {
        labels: portfolio.map(p => p.domain.replace('(India)', '')),
        datasets: [
            {
                label: 'Allocated (Cr)',
                data: portfolio.map(p => p.current_allocated),
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: '#475569',
                borderWidth: 1,
            },
            {
                label: 'Spent (Cr)',
                data: portfolio.map(p => p.current_spent),
                backgroundColor: portfolio.map(p => p.utilization >= 60 ? '#10b981' : '#f43f5e'),
                borderRadius: 5,
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
            x: { grid: { display: false }, ticks: { color: '#64748b' } }
        }
    };

    return <Bar data={data} options={options} />;
};