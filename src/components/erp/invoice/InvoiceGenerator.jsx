import React, { useState, useEffect } from 'react';
import { UI } from '../../../lib/uiTheme';

const InvoiceGenerator = ({ data, companyDetails, onClose }) => {
    const [isEmailing, setIsEmailing] = useState(false);
    const [emailStatus, setEmailStatus] = useState('IDLE'); // IDLE, SENDING, SENT

    // --- NEW: EDITABLE EMAIL STATE ---
    const [emailForm, setEmailForm] = useState({
        to: '',
        subject: '',
        message: ''
    });

    // LOAD INITIAL DATA WHEN MODAL OPENS
    useEffect(() => {
        if (data) {
            setEmailForm({
                to: data.payee_email || 'client@example.com',
                subject: `Invoice #${data.invoice_no} from ${companyDetails.name}`,
                message: `Hi ${data.payee_name},\n\nPlease find attached the invoice #${data.invoice_no} for recent services.\n\nRegards,\n${companyDetails.name}`
            });
        }
    }, [data, companyDetails]);

    const handlePrint = () => {
        window.print();
    };

    const handleEmail = () => {
        setIsEmailing(true);
    };

    const sendEmail = () => {
        setEmailStatus('SENDING');
        
        // --- HERE IS WHERE THE REAL EMAIL LOGIC GOES ---
        // For now, we simulate it, but we log the EDITED data to prove it works.
        console.log("SENDING EMAIL PAYLOAD:", {
            to: emailForm.to,
            subject: emailForm.subject,
            body: emailForm.message,
            attachment: `invoice_${data.invoice_no}.pdf`
        });

        // SIMULATED API CALL
        setTimeout(() => {
            setEmailStatus('SENT');
            setTimeout(() => {
                setIsEmailing(false);
                setEmailStatus('IDLE');
            }, 1500);
        }, 1500);
    };

    // Derived Data for PDF
    const subtotal = data.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const tax = subtotal * 0.18; 
    const total = subtotal + tax;

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex justify-center overflow-y-auto">
            
            {/* --- ACTION BAR --- */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-full flex gap-2 shadow-2xl print:hidden animate-slideUp z-50">
                <button onClick={handlePrint} className="bg-white text-slate-900 px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-50 transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-download"></i> Download PDF
                </button>
                <button onClick={handleEmail} className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-500 transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-paper-plane"></i> Email Client
                </button>
                <button onClick={onClose} className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                    <i className="fa-solid fa-times"></i>
                </button>
            </div>

            {/* --- DOCUMENT PREVIEW (A4) --- */}
            <div className="bg-white w-[210mm] min-h-[297mm] my-20 p-12 shadow-2xl text-slate-800 print:m-0 print:shadow-none print:w-full animate-scaleIn relative">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                    <div>
                        <div className="text-3xl font-black uppercase tracking-tight text-slate-900">{companyDetails.name}</div>
                        <div className="text-xs text-slate-500 mt-2 max-w-[200px]">{companyDetails.address}</div>
                        <div className="text-xs text-slate-500 mt-1">GSTIN: {companyDetails.gstin}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-slate-200 uppercase tracking-widest">Invoice</div>
                        <div className="text-sm font-bold mt-2">#{data.invoice_no}</div>
                        <div className="text-xs text-slate-500 mt-1">Date: {data.issue_date}</div>
                        <div className="text-xs text-slate-500 mt-1">Due: {data.due_date}</div>
                    </div>
                </div>

                {/* Bill To */}
                <div className="mb-12">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Bill To</div>
                    <div className="text-xl font-bold text-slate-900">{data.payee_name}</div>
                    {data.payee_type === 'TEAM' && <div className="text-sm text-slate-500">Employee ID: {data.payee_id.split('-')[0]}</div>}
                    {data.payee_email && <div className="text-sm text-slate-500">{data.payee_email}</div>}
                </div>

                {/* Table */}
                <table className="w-full mb-12">
                    <thead>
                        <tr className="border-b-2 border-slate-900 text-xs font-black uppercase tracking-wider text-slate-900">
                            <th className="py-3 text-left">Description</th>
                            <th className="py-3 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {data.items.map((item, i) => (
                            <tr key={i} className="border-b border-slate-100">
                                <td className="py-4 font-medium text-slate-700">{item.description}</td>
                                <td className="py-4 text-right font-mono font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Subtotal</span>
                            <span className="font-mono font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Tax (18%)</span>
                            <span className="font-mono font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tax)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-black border-t-2 border-slate-900 pt-3">
                            <span>Total</span>
                            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(total)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-12 left-12 right-12 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-8">
                    <div className="font-bold text-slate-900 mb-1">Payment Instructions</div>
                    <div>Bank: HDFC Bank | A/C: 99281928291 | IFSC: HDFC0001</div>
                    <div className="mt-2">Thank you for your business.</div>
                </div>
            </div>

            {/* --- EMAIL EDITOR (NOW EDITABLE) --- */}
            {isEmailing && (
                <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <div className="font-bold text-sm uppercase flex items-center gap-2"><i className="fa-solid fa-envelope"></i> Compose Invoice Email</div>
                            <button onClick={() => setIsEmailing(false)}><i className="fa-solid fa-times"></i></button>
                        </div>
                        
                        {emailStatus === 'SENT' ? (
                            <div className="p-8 text-center">
                                <i className="fa-solid fa-check-circle text-5xl text-emerald-500 mb-4 animate-bounce"></i>
                                <h3 className="text-lg font-bold text-slate-800">Sent Successfully!</h3>
                                <p className="text-xs text-slate-500 mt-2">The client will receive it shortly.</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className={UI.form.label}>To</label>
                                    <input 
                                        className={UI.form.input} 
                                        value={emailForm.to} 
                                        onChange={e => setEmailForm({...emailForm, to: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className={UI.form.label}>Subject</label>
                                    <input 
                                        className={UI.form.input} 
                                        value={emailForm.subject} 
                                        onChange={e => setEmailForm({...emailForm, subject: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className={UI.form.label}>Message</label>
                                    <textarea 
                                        className={UI.form.input} 
                                        rows="6" 
                                        value={emailForm.message} 
                                        onChange={e => setEmailForm({...emailForm, message: e.target.value})} 
                                    />
                                </div>
                                <button onClick={sendEmail} disabled={emailStatus === 'SENDING'} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg">
                                    {emailStatus === 'SENDING' ? 'Sending...' : 'Send Invoice Now'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceGenerator;