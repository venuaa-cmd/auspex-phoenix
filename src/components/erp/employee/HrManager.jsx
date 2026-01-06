import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import EmployeeForm from '../payroll/EmployeeForm'; 

const HrManager = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [viewMode, setViewMode] = useState('DETAILS'); // 'DETAILS' or 'EDIT'
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });

    // --- FETCH DATA (PRESERVED) ---
    const fetchEmployees = async () => {
        const { data } = await supabase.from('erp_employees').select('*').order('full_name');
        if (data) {
            setEmployees(data);
            if (!selectedId && data.length > 0) setSelectedId(data[0].id);
        }
    };
    useEffect(() => { fetchEmployees(); }, []);

    // --- PAYROLL ENGINE (NEW ADDITION) ---
    const handleRunPayroll = async () => {
        const activeStaff = employees.filter(e => e.status === 'ACTIVE');
        if (activeStaff.length === 0) return alert("No active employees to pay.");

        const totalPayroll = activeStaff.reduce((sum, e) => sum + Number(e.net_payable_monthly || e.monthly_salary), 0);
        const headcount = activeStaff.length;

        if (!confirm(`CONFIRM PAYROLL RUN?\n\nStaff Count: ${headcount}\nTotal Debit: ₹${totalPayroll.toLocaleString()}\n\nThis will be deducted from the Ledger.`)) return;

        try {
            const { error } = await supabase.from('erp_ledger').insert([{
                transaction_date: new Date().toISOString().split('T')[0],
                type: 'DEBIT',
                category: 'Payroll',
                sub_category: 'Salaries',
                amount: totalPayroll,
                vendor: 'Auspex HR',
                description: `Monthly Payroll for ${headcount} Employees`,
                status: 'REALIZED'
            }]);

            if (error) throw error;
            alert(`✅ Payroll Processed! ₹${totalPayroll.toLocaleString()} debited.`);
        } catch (err) {
            alert("Payroll Error: " + err.message);
        }
    };

    // --- COMPUTED DATA (PRESERVED) ---
    const activeEmployee = employees.find(e => e.id === selectedId);

    const filteredEmployees = useMemo(() => {
        let sorted = [...employees];
        if (searchTerm) sorted = sorted.filter(e => e.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        sorted.sort((a, b) => {
            const valA = a[sortConfig.key] || '';
            const valB = b[sortConfig.key] || '';
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [employees, searchTerm, sortConfig]);

    const totalPayroll = employees
        .filter(e => e.status === 'ACTIVE')
        .reduce((sum, e) => sum + (Number(e.net_payable_monthly) || 0), 0);

    // --- HANDLERS (PRESERVED) ---
    const handleSave = async (payload) => {
        if (activeEmployee && viewMode === 'EDIT') {
            const { error } = await supabase.from('erp_employees').update(payload).eq('id', activeEmployee.id);
            if (!error) { 
                alert('Employee Record Updated!'); 
                fetchEmployees(); 
                setViewMode('DETAILS'); 
            } else {
                alert('Update Failed: ' + error.message);
            }
        } else {
            const { error } = await supabase.from('erp_employees').insert([payload]);
            if (!error) { 
                alert('Employee Added Successfully!'); 
                fetchEmployees(); 
                setIsAddModalOpen(false); 
            } else {
                alert('Creation Failed: ' + error.message);
            }
        }
    };

    const handleMarkExit = async () => {
        if (!window.confirm("Are you sure you want to mark this employee as EXITED?")) return;
        await supabase.from('erp_employees').update({ status: 'EXITED' }).eq('id', selectedId);
        fetchEmployees();
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col bg-white border border-blue-100 rounded-xl shadow-sm animate-[fadeIn_0.3s_ease] overflow-hidden">
            
            {/* TOP BAR (UPGRADED TO BLUE THEME + PAYROLL BUTTON) */}
            <div className="bg-white p-4 border-b border-blue-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-900 text-white w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-md">
                        <i className="fa-solid fa-users"></i>
                    </div>
                    <div>
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Net Payroll</h2>
                        <div className="text-2xl font-black text-slate-900">{formatCurrency(totalPayroll)}</div>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button onClick={handleRunPayroll} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2">
                        <i className="fa-solid fa-money-check-dollar"></i> Run Payroll
                    </button>

                    <button 
                        onClick={() => setIsAddModalOpen(true)} 
                        className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2"
                    >
                        <i className="fa-solid fa-plus"></i> Add Talent
                    </button>
                </div>
            </div>

            {/* SPLIT VIEW CONTAINER (PRESERVED) */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT PANE: LIST */}
                <div className="w-80 bg-white border-r border-slate-100 flex flex-col">
                    <div className="p-3 border-b border-slate-100 flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Search team..." 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs outline-none focus:border-blue-600 font-bold text-slate-700" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                        <button onClick={() => setSortConfig({ key: 'full_name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="p-1.5 text-slate-400 hover:text-blue-600">
                            <i className="fa-solid fa-arrow-down-a-z"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredEmployees.map(emp => (
                            <div 
                                key={emp.id} 
                                onClick={() => { setSelectedId(emp.id); setViewMode('DETAILS'); }} 
                                className={`p-4 border-b border-slate-50 cursor-pointer flex items-center gap-3 hover:bg-blue-50/50 transition-colors ${selectedId === emp.id ? 'bg-blue-50 border-l-4 border-l-blue-900' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
                                    {emp.photo_url ? <img src={emp.photo_url} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-slate-400"><i className="fa-solid fa-user"></i></div>}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-slate-800 truncate">{emp.full_name}</h4>
                                    <p className="text-[10px] text-slate-500 truncate uppercase font-bold">{emp.role}</p>
                                </div>
                                {emp.status === 'EXITED' && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded font-bold">EXIT</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT PANE: DETAIL OR EDIT */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30 relative">
                    {activeEmployee ? (
                        viewMode === 'DETAILS' ? (
                            // --- VIEW DOSSIER (PRESERVED) ---
                            <div className="flex-1 overflow-y-auto p-8">
                                {/* HEADER */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 flex justify-between items-start relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-900"></div>
                                    <div className="flex gap-6">
                                        <div className="w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shadow-inner">
                                            {activeEmployee.photo_url ? <img src={activeEmployee.photo_url} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><i className="fa-solid fa-user text-3xl"></i></div>}
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-black text-slate-900 uppercase">{activeEmployee.full_name}</h1>
                                            <div className="text-sm font-bold text-blue-600 mb-2">{activeEmployee.employee_id} • {activeEmployee.role}</div>
                                            <div className="flex gap-4 text-xs text-slate-500 mb-3 font-medium">
                                                <span><i className="fa-solid fa-envelope mr-1"></i> {activeEmployee.email}</span>
                                                <span><i className="fa-solid fa-phone mr-1"></i> {activeEmployee.phone}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase">{activeEmployee.employment_type}</span>
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase">{activeEmployee.department}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setViewMode('EDIT')} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase rounded hover:bg-slate-50 shadow-sm"><i className="fa-solid fa-pen mr-1"></i> Edit</button>
                                        <button onClick={handleMarkExit} className="px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-bold uppercase rounded hover:bg-red-50 shadow-sm"><i className="fa-solid fa-ban mr-1"></i> Exit</button>
                                    </div>
                                </div>

                                {/* CAREER HISTORY */}
                                {activeEmployee.prior_experience && activeEmployee.prior_experience.length > 0 && (
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                        <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-100 pb-3 mb-4">Career History</h3>
                                        <div className="space-y-4">
                                            {activeEmployee.prior_experience.map((exp, i) => (
                                                <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                                                    <div>
                                                        <div className="font-bold text-slate-800">{exp.company}</div>
                                                        <div className="text-xs text-slate-500 font-bold">{exp.designation}</div>
                                                    </div>
                                                    <div className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded">
                                                        {exp.from} <span className="mx-1 text-slate-300">→</span> {exp.to || 'Present'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* STATS */}
                                <div className="grid grid-cols-3 gap-6 mb-6">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Gross CTC</span>
                                        <div className="text-xl font-black text-slate-900">{formatCurrency(activeEmployee.base_salary_monthly)}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Net Pay</span>
                                        <div className="text-xl font-black text-emerald-600">{formatCurrency(activeEmployee.net_payable_monthly)}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Bonus Target</span>
                                        <div className="text-sm font-bold text-blue-600 mt-1">{activeEmployee.compensation_config?.bonus_percent || 0}%</div>
                                    </div>
                                </div>
                                
                                {/* DETAILED GRID */}
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-100 pb-3 mb-4">Statutory & Bank</h3>
                                        <div className="space-y-3">
                                            <DetailRow label="PAN" value={activeEmployee.pan_number} />
                                            <DetailRow label="Aadhar" value={activeEmployee.aadhar_number} />
                                            <DetailRow label="UAN (PF)" value={activeEmployee.uan_number} />
                                            <DetailRow label="Bank" value={activeEmployee.bank_details?.bankName} />
                                            <DetailRow label="Account" value={activeEmployee.bank_details?.accountNo} />
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-100 pb-3 mb-4">Emergency & Health</h3>
                                        <div className="mb-4 bg-red-50 p-3 rounded border border-red-100">
                                            <span className="text-[9px] font-bold text-red-400 uppercase block mb-1">Emergency Contact</span>
                                            <div className="text-sm font-bold text-red-900">{activeEmployee.emergency_contact?.name || 'Not Provided'}</div>
                                            <div className="text-xs text-red-700 font-bold">{activeEmployee.emergency_contact?.relation} • {activeEmployee.emergency_contact?.phone}</div>
                                        </div>
                                        <div className="space-y-3">
                                            <DetailRow label="Blood Group" value={activeEmployee.blood_group} />
                                            <DetailRow label="Insurance" value={activeEmployee.medical_profile?.insurance_provider} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // --- EDIT MODE (PRESERVED) ---
                            <div className="flex flex-col h-full bg-white relative">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center">
                                        <i className="fa-solid fa-pen-to-square mr-2 text-blue-600"></i>
                                        Editing: {activeEmployee.full_name}
                                    </h3>
                                    <button onClick={() => setViewMode('DETAILS')} className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase">Cancel</button>
                                </div>
                                <div className="flex-1 overflow-hidden relative">
                                    <EmployeeForm 
                                        mode="EMBEDDED"
                                        initialData={activeEmployee}
                                        onAdd={handleSave} 
                                    />
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                            <i className="fa-solid fa-users-viewfinder text-4xl mb-4 opacity-20"></i>
                            <p className="text-xs font-bold uppercase">Select an employee to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL FOR NEW EMPLOYEE */}
            <EmployeeForm 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onAdd={handleSave} 
                mode="MODAL"
            />
        </div>
    );
};

const DetailRow = ({ label, value }) => (
    <div className="border-b border-slate-100 pb-2">
        <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1">{label}</span>
        <span className="text-sm font-bold text-slate-800">{value || '-'}</span>
    </div>
);

export default HrManager;