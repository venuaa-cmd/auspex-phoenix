import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { calculateSalaryStructure } from './payrollEngine';

const EmployeeForm = ({ isOpen, onClose, onAdd, initialData = null, mode = 'MODAL' }) => {
    if (mode === 'MODAL' && !isOpen) return null;

    const [activeTab, setActiveTab] = useState('PROFILE');
    const [uploading, setUploading] = useState(false);

    // STATE INITIALIZATION
    const [employeeId, setEmployeeId] = useState('GENERATING...');
    const [fullName, setFullName] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('Male');
    const [maritalStatus, setMaritalStatus] = useState('Single');
    const [bloodGroup, setBloodGroup] = useState('');
    const [nationality, setNationality] = useState('Indian');
    const [personalEmail, setPersonalEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [currentAddress, setCurrentAddress] = useState('');
    const [permanentAddress, setPermanentAddress] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    
    // Emergency
    const [emName, setEmName] = useState('');
    const [emRelation, setEmRelation] = useState('');
    const [emPhone, setEmPhone] = useState('');

    const [role, setRole] = useState('');
    const [department, setDepartment] = useState('');
    const [manager, setManager] = useState('');
    const [empType, setEmpType] = useState('Full-Time');
    const [doj, setDoj] = useState(new Date().toISOString().split('T')[0]);
    const [probationDays, setProbationDays] = useState('90');
    const [noticeDays, setNoticeDays] = useState('30');
    const [email, setEmail] = useState('');
    const [linkedin, setLinkedin] = useState('');

    const [highestQual, setHighestQual] = useState('');
    const [college, setCollege] = useState('');
    const [passingYear, setPassingYear] = useState('');
    const [eduDocUrl, setEduDocUrl] = useState('');
    const [totalExp, setTotalExp] = useState('');
    const [refName, setRefName] = useState('');
    const [refContact, setRefContact] = useState('');
    const [refRelation, setRefRelation] = useState('');

    // FIX: Prior Exp State
    const [priorExp, setPriorExp] = useState([{ company: '', designation: '', from: '', to: '' }]);

    const [grossSalary, setGrossSalary] = useState('');
    const [tds, setTds] = useState('0');
    const [structure, setStructure] = useState(null);
    const [esop, setEsop] = useState('');
    const [bonusPct, setBonusPct] = useState('');
    const [bonusTarget, setBonusTarget] = useState('');
    const [incrementPct, setIncrementPct] = useState('10');

    const [pan, setPan] = useState('');
    const [aadhar, setAadhar] = useState('');
    const [uan, setUan] = useState('');
    const [pfMemberId, setPfMemberId] = useState('');
    const [esic, setEsic] = useState('');
    const [passport, setPassport] = useState('');
    const [passportExp, setPassportExp] = useState('');
    
    const [bankName, setBankName] = useState('');
    const [accountNo, setAccountNo] = useState('');
    const [ifsc, setIfsc] = useState('');

    const [insuranceProvider, setInsuranceProvider] = useState('');
    const [policyNo, setPolicyNo] = useState('');
    const [medicalHistory, setMedicalHistory] = useState('');

    // --- LOAD DATA ---
    useEffect(() => {
        if (initialData) {
            setEmployeeId(initialData.employee_id || '');
            setFullName(initialData.full_name || '');
            setDob(initialData.date_of_birth || '');
            setGender(initialData.gender || 'Male');
            setMaritalStatus(initialData.marital_status || 'Single');
            setBloodGroup(initialData.blood_group || '');
            setNationality(initialData.nationality || 'Indian');
            setPersonalEmail(initialData.personal_email || '');
            setPhone(initialData.phone || '');
            setCurrentAddress(initialData.current_address || '');
            setPermanentAddress(initialData.permanent_address || '');
            setPhotoUrl(initialData.photo_url || '');
            
            const em = initialData.emergency_contact || {};
            setEmName(em.name || ''); setEmRelation(em.relation || ''); setEmPhone(em.phone || '');

            setRole(initialData.role || '');
            setDepartment(initialData.department || '');
            setManager(initialData.reporting_manager || '');
            setEmpType(initialData.employment_type || 'Full-Time');
            setDoj(initialData.join_date || '');
            setProbationDays(initialData.probation_period_days || 90);
            setNoticeDays(initialData.notice_period_days || 30);
            setEmail(initialData.email || '');
            setLinkedin(initialData.linkedin_url || '');

            setHighestQual(initialData.education_qualification || '');
            setTotalExp(initialData.total_experience_years || '');
            setPriorExp(initialData.prior_experience || [{ company: '', designation: '', from: '', to: '' }]);

            setGrossSalary(initialData.base_salary_monthly || '');
            if (initialData.salary_structure) setStructure(initialData.salary_structure);
            
            const comp = initialData.compensation_config || {};
            setEsop(comp.esop_units || '');
            setBonusPct(comp.bonus_percent || '');
            setBonusTarget(comp.bonus_target_goals || '');
            setIncrementPct(comp.annual_increment_percent || '');

            const bank = initialData.bank_details || {};
            setBankName(bank.bankName || ''); setAccountNo(bank.accountNo || ''); setIfsc(bank.ifsc || '');

            setPan(initialData.pan_number || '');
            setAadhar(initialData.aadhar_number || '');
            setPassport(initialData.passport_number || '');
            setPassportExp(initialData.passport_expiry || '');
            setUan(initialData.uan_number || '');
            setPfMemberId(initialData.pf_member_id || '');
            setEsic(initialData.esic_number || '');

            const med = initialData.medical_profile || {};
            setInsuranceProvider(med.insurance_provider || '');
            setPolicyNo(med.policy_no || '');
            setMedicalHistory(med.medical_history || '');
        } else if (mode === 'MODAL' && isOpen) {
            const generateId = async () => {
                const { count } = await supabase.from('erp_employees').select('*', { count: 'exact', head: true });
                const nextNum = (count || 0) + 1;
                setEmployeeId(`AUS-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`);
            };
            generateId();
        }
    }, [initialData, isOpen, mode]);

    useEffect(() => {
        if (grossSalary) setStructure(calculateSalaryStructure(grossSalary, tds));
    }, [grossSalary, tds]);

    // --- ACTIONS ---
    const handleFileUpload = async (e, type) => {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;
            const filePath = `${type}_${Math.random()}.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('hr-docs').upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from('hr-docs').getPublicUrl(filePath);
            if (type === 'avatar') setPhotoUrl(data.publicUrl);
            else setEduDocUrl(data.publicUrl);
        } catch (error) { alert("Upload Failed"); } 
        finally { setUploading(false); }
    };

    const handlePriorExpChange = (index, field, value) => {
        const updated = [...priorExp];
        updated[index][field] = value;
        setPriorExp(updated);
    };

    const toNullableDate = (val) => val || null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            employee_id: employeeId,
            full_name: fullName,
            email, phone, photo_url: photoUrl, status: 'ACTIVE',
            join_date: toNullableDate(doj), date_of_birth: toNullableDate(dob),
            gender, marital_status: maritalStatus, blood_group: bloodGroup, nationality, personal_email: personalEmail,
            current_address: currentAddress, permanent_address: permanentAddress,
            emergency_contact: { name: emName, relation: emRelation, phone: emPhone },
            role, department, reporting_manager: manager, employment_type: empType,
            probation_period_days: probationDays, notice_period_days: noticeDays, linkedin_url: linkedin,
            total_experience_years: totalExp || 0, education_qualification: highestQual,
            education_details: { qualification: highestQual, college, passing_year: passingYear, doc_url: eduDocUrl },
            prior_experience: priorExp.filter(x => x.company),
            
            base_salary_monthly: structure?.earnings?.grossTotal || 0,
            net_payable_monthly: structure?.netPay || 0,
            salary_structure: structure,
            compensation_config: { esop_units: esop, bonus_percent: bonusPct, bonus_target_goals: bonusTarget, annual_increment_percent: incrementPct },
            bank_details: { bankName, accountNo, ifsc },

            pan_number: pan, aadhar_number: aadhar, passport_number: passport, passport_expiry: toNullableDate(passportExp),
            uan_number: uan, pf_member_id: pfMemberId, esic_number: esic,
            medical_profile: { insurance_provider: insuranceProvider, policy_no: policyNo, medical_history: medicalHistory }
        };

        onAdd(payload);
        if (mode === 'MODAL') onClose();
    };

    // --- STYLES ---
    const inputClass = "w-full border border-slate-300 bg-sky-50 rounded p-2 text-xs text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500 outline-none";
    const labelClass = "block text-[9px] font-bold text-slate-500 uppercase mb-1";
    
    // CONTAINER STYLES (Fixed Height for Embedded)
    const containerClass = mode === 'MODAL' 
        ? "fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" 
        : "h-full flex flex-col bg-white overflow-hidden";
    
    const wrapperClass = mode === 'MODAL'
        ? "bg-white w-full max-w-6xl h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        : "flex-1 flex flex-col overflow-hidden"; // Ensure flex-1 to fill parent

    return (
        <div className={containerClass}>
            <div className={wrapperClass}>
                {/* HEADER (Only for Modal) */}
                {mode === 'MODAL' && (
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center"><i className="fa-solid fa-user-plus text-xs"></i></div>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-widest">New Employee Record</h2>
                                <p className="text-[10px] text-slate-400">Auspex Investments HRIS • {employeeId}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><i className="fa-solid fa-times"></i></button>
                    </div>
                )}

                {/* TABS */}
                <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto">
                    {['PROFILE', 'ORG', 'CAREER', 'COMPENSATION', 'MEDICAL', 'STATUTORY'].map(tab => (
                        <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === tab ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {/* SCROLLABLE FORM */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-white">
                    {activeTab === 'PROFILE' && (
                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-3 text-center">
                                <div className="w-24 h-24 mx-auto bg-slate-50 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center overflow-hidden relative group mb-2">
                                    {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <i className="fa-solid fa-camera text-slate-300"></i>}
                                    <input type="file" onChange={(e) => handleFileUpload(e, 'avatar')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                <span className="text-[10px] font-bold text-blue-600 uppercase">Change Photo</span>
                            </div>
                            <div className="col-span-9 grid grid-cols-2 gap-4">
                                <div className="col-span-2"><label className={labelClass}>Full Name</label><input value={fullName} onChange={e=>setFullName(e.target.value)} className={inputClass} /></div>
                                <div><label className={labelClass}>Email (Personal)</label><input value={personalEmail} onChange={e=>setPersonalEmail(e.target.value)} className={inputClass} /></div>
                                <div><label className={labelClass}>Mobile</label><input value={phone} onChange={e=>setPhone(e.target.value)} className={inputClass} /></div>
                                <div><label className={labelClass}>Gender</label><select value={gender} onChange={e=>setGender(e.target.value)} className={inputClass}><option>Male</option><option>Female</option></select></div>
                                <div><label className={labelClass}>Marital Status</label><select value={maritalStatus} onChange={e=>setMaritalStatus(e.target.value)} className={inputClass}><option>Single</option><option>Married</option><option>Divorced</option></select></div>
                                <div className="col-span-2 mt-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-4">
                                    <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase">Emergency Contact</div>
                                    <div><label className={labelClass}>Name</label><input value={emName} onChange={e=>setEmName(e.target.value)} className={inputClass} /></div>
                                    <div><label className={labelClass}>Relation</label><input value={emRelation} onChange={e=>setEmRelation(e.target.value)} className={inputClass} /></div>
                                    <div><label className={labelClass}>Phone</label><input value={emPhone} onChange={e=>setEmPhone(e.target.value)} className={inputClass} /></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'ORG' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>Role</label><input value={role} onChange={e=>setRole(e.target.value)} className={inputClass} /></div>
                            <div><label className={labelClass}>Department</label><input value={department} onChange={e=>setDepartment(e.target.value)} className={inputClass} /></div>
                            <div><label className={labelClass}>Manager</label><input value={manager} onChange={e=>setManager(e.target.value)} className={inputClass} /></div>
                            <div><label className={labelClass}>Work Email</label><input value={email} onChange={e=>setEmail(e.target.value)} className={inputClass} /></div>
                            <div><label className={labelClass}>Date of Joining</label><input type="date" value={doj} onChange={e=>setDoj(e.target.value)} className={inputClass} /></div>
                        </div>
                    )}

                    {activeTab === 'CAREER' && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded border border-slate-200">
                                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Prior Experience</h4>
                                {priorExp.map((exp, i) => (
                                    <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
                                        <div className="col-span-2">
                                            <input placeholder="Company" value={exp.company} onChange={e => handlePriorExpChange(i, 'company', e.target.value)} className={inputClass} />
                                        </div>
                                        <div>
                                            <input placeholder="Role" value={exp.designation} onChange={e => handlePriorExpChange(i, 'designation', e.target.value)} className={inputClass} />
                                        </div>
                                        <div>
                                            <input type="date" value={exp.from} onChange={e => handlePriorExpChange(i, 'from', e.target.value)} className={inputClass} />
                                        </div>
                                        <div className="flex gap-1">
                                            <input type="date" value={exp.to} onChange={e => handlePriorExpChange(i, 'to', e.target.value)} className={inputClass} />
                                            {i === priorExp.length - 1 && (
                                                <button type="button" onClick={() => setPriorExp([...priorExp, { company: '', designation: '', from: '', to: '' }])} className="px-2 bg-blue-600 text-white rounded text-xs">+</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'COMPENSATION' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={labelClass}>Monthly Gross (CTC)</label><input type="number" value={grossSalary} onChange={e=>setGrossSalary(e.target.value)} className={inputClass} /></div>
                                <div><label className={labelClass}>TDS Override</label><input type="number" value={tds} onChange={e=>setTds(e.target.value)} className={inputClass} /></div>
                                <div><label className={labelClass}>Bonus Target Goals</label><input value={bonusTarget} onChange={e=>setBonusTarget(e.target.value)} className={inputClass} /></div>
                                <div><label className={labelClass}>Bonus %</label><input type="number" value={bonusPct} onChange={e=>setBonusPct(e.target.value)} className={inputClass} /></div>
                            </div>
                            <div className="bg-slate-900 p-4 rounded text-white text-xs font-mono">
                                <div className="flex justify-between mb-1"><span>Net Pay:</span><span className="font-bold text-emerald-400">₹{structure?.netPay?.toLocaleString() || 0}</span></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'STATUTORY' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>PAN (Uppercase)</label><input value={pan} onChange={e=>setPan(e.target.value.toUpperCase())} className={inputClass} /></div>
                            <div><label className={labelClass}>Aadhar</label><input value={aadhar} onChange={e=>setAadhar(e.target.value)} className={inputClass} /></div>
                            <div><label className={labelClass}>Bank Name</label><input value={bankName} onChange={e=>setBankName(e.target.value)} className={inputClass} /></div>
                            <div><label className={labelClass}>Account No</label><input value={accountNo} onChange={e=>setAccountNo(e.target.value)} className={inputClass} /></div>
                        </div>
                    )}

                    {activeTab === 'MEDICAL' && (
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className={labelClass}>Blood Group</label><input value={bloodGroup} onChange={e=>setBloodGroup(e.target.value)} className={inputClass} /></div>
                             <div><label className={labelClass}>Provider</label><input value={insuranceProvider} onChange={e=>setInsuranceProvider(e.target.value)} className={inputClass} /></div>
                        </div>
                    )}
                </form>

                {/* FOOTER */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                    {mode === 'MODAL' && <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Cancel</button>}
                    <button onClick={handleSubmit} className="px-6 py-2 bg-slate-900 text-white text-xs font-bold uppercase rounded hover:bg-black shadow-lg">
                        {initialData ? 'Update Record' : 'Create Record'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeForm;