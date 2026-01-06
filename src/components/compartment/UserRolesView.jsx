import React from 'react';

const UserRolesView = ({ userList, fundManagers, onUpdateUserRole, currentUserId, isSuperAdmin }) => {
    // SECURITY: Only the SuperAdmin (verified by DB Role) can see this station
    if (!isSuperAdmin) return null;
    
    const activeManagers = fundManagers.filter(m => (m.status || 'Active') !== 'Inactive');
    
    return (
        <div className="animate-[fadeIn_0.4s_ease]">
            <div className="mb-6 border-b border-[#FFD700]/20 pb-6 flex justify-between items-center">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Identity & Security Matrix</h2>
                <div className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest bg-[#FFD700]/10 px-4 py-2 rounded-xl border border-[#FFD700]/20 shadow-lg">Master Admin Access</div>
            </div>
            <div className="bg-black/40 border border-[#FFD700]/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
                <table className="w-full text-left">
                    <thead className="bg-[#0f172a] text-[#FFD700] text-[9px] font-black uppercase tracking-[0.2em] border-b border-[#FFD700]/10">
                        <tr>
                            <th className="p-6">Identity</th>
                            <th className="p-6">Auth Level</th>
                            <th className="p-6">Linked Strategist</th>
                            <th className="p-6 text-center">ERP</th>
                            <th className="p-6 text-right">Commit</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px] text-slate-300 divide-y divide-white/5">
                        {userList.map(user => (
                            <tr key={user.id} className="hover:bg-white/5 transition-all group">
                                <td className="p-6">
                                    <div className="font-black text-white uppercase group-hover:text-[#FFD700] transition-colors">{user.fullName || 'User'}</div>
                                    <div className="font-mono text-[9px] text-slate-600 uppercase mt-1">{user.email}</div>
                                </td>
                                <td className="p-6">
                                    <select 
                                        defaultValue={user.role || 'user'} 
                                        id={`role-${user.id}`} 
                                        className="bg-black/60 border border-white/10 rounded-xl p-2 text-[9px] font-black uppercase text-white outline-none focus:border-[#FFD700]"
                                        disabled={user.id === currentUserId}
                                    >
                                        <option value="user">Staff Member</option>
                                        <option value="admin">System Admin</option>
                                        <option value="superadmin">Super Admin</option>
                                    </select>
                                </td>
                                <td className="p-6">
                                    <select 
                                        defaultValue={user.linkedManagerId || ''} 
                                        id={`manager-${user.id}`} 
                                        className="bg-black/60 border border-white/10 rounded-xl p-2 text-white text-[9px] font-black uppercase w-full outline-none focus:border-[#FFD700]"
                                    >
                                        <option value="">-- No Link --</option>
                                        {activeManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </td>
                                <td className="p-6 text-center">
                                    <input 
                                        type="checkbox" 
                                        id={`erp-${user.id}`} 
                                        defaultChecked={user.erpAccess === true} 
                                        className="w-4 h-4 rounded border-white/10 accent-[#FFD700] bg-black cursor-pointer" 
                                    />
                                </td>
                                <td className="p-6 text-right">
                                    <button 
                                        className="bg-gradient-to-r from-[#B8860B] to-[#FFD700] text-black px-5 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
                                        onClick={() => onUpdateUserRole(user.id, document.getElementById(`role-${user.id}`).value, document.getElementById(`manager-${user.id}`).value, document.getElementById(`erp-${user.id}`).checked)}
                                    >
                                        Commit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserRolesView;