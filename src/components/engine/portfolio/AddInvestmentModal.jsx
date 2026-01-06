import React, { useState, useEffect } from 'react';

// --- CONFIGURATION ---
const PROXY_BASE_URL = "https://auspex-phoenix.vercel.app";

const ASSET_TYPES = [
  { id: 'startup', label: 'Startup Equity', icon: 'fa-solid fa-rocket', color: 'bg-blue-500' },
  { id: 'real_estate', label: 'Real Estate', icon: 'fa-solid fa-house', color: 'bg-emerald-500' },
  { id: 'gold', label: 'Gold / Bullion', icon: 'fa-solid fa-coins', color: 'bg-yellow-500' },
  { id: 'public_equity', label: 'Public Stock', icon: 'fa-solid fa-briefcase', color: 'bg-violet-500' },
  { id: 'crypto', label: 'Crypto / Web 3', icon: 'fa-brands fa-bitcoin', color: 'bg-purple-600' } // Fixed ID & Icon
];

// --- HELPERS ---
const formatCurrencyInput = (value) => {
    const raw = value.replace(/[^0-9.]/g, '');
    if (!raw) return { raw: 0, display: '' };
    const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(raw));
    return { raw: Number(raw), display: fmt };
};

const convertToWords = (num) => {
    if (!num) return '';
    const abs = Math.abs(Number(num));
    if (abs >= 10000000) return `~ ${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `~ ${(abs / 100000).toFixed(2)} L`;
    if (abs >= 1000) return `~ ${(abs / 1000).toFixed(2)} K`;
    return '';
};

// --- STYLES ---
const darkInputStyle = "w-full bg-[#020617] border border-white/10 rounded-lg p-3 text-white focus:border-[var(--brand-color)] focus:outline-none mt-1 appearance-none [&>option]:bg-[#020617] [color-scheme:dark]";

const AddInvestmentModal = ({ isOpen, onClose, onSave, domains = [] }) => {
  const [assetType, setAssetType] = useState('startup');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [amountInWords, setAmountInWords] = useState('');
  const [valDisplay, setValDisplay] = useState('');
  
  // LIVE PRICE STATE
  const [liveRate, setLiveRate] = useState(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    domainName: '',
    investmentDate: new Date().toISOString().split('T')[0],
    investedAmount: 0,
    // Startup
    round: 'Seed', shares: '', equityPct: '', valuation: '',
    // Real Estate
    propertyType: 'Residential', location: '', sqFt: '', rentalYield: '',
    // Gold
    weightGrams: '', purity: '24K', form: 'Physical',
    // Public Equity & Crypto
    ticker: '', quantity: '', avgBuyPrice: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- LIVE PRICE FETCHER ---
  const handleTickerBlur = async (e) => {
      const ticker = e.target.value;
      // Works for both Stock and Crypto tickers if supported by proxy
      if ((assetType === 'public_equity' || assetType === 'crypto') && ticker) {
          setFetchingPrice(true);
          try {
              const cleanTicker = ticker.replace(/\.NS/gi, '').replace(/\.BO/gi, '').trim();
              const res = await fetch(`${PROXY_BASE_URL}/api/stock?name=${encodeURIComponent(cleanTicker)}`);
              const data = await res.json();
              
              let price = 0;
              if (data.currentPrice) price = (typeof data.currentPrice === 'object') ? (data.currentPrice.NSE || data.currentPrice.BSE) : data.currentPrice;
              else if (data.price) price = data.price;

              if (typeof price === 'string') price = parseFloat(price.replace(/,/g, ''));

              if (price > 0) {
                  setLiveRate(price);
                  if (!formData.avgBuyPrice) {
                      setFormData(prev => ({ ...prev, avgBuyPrice: price }));
                  }
              }
          } catch (err) { console.warn("Price fetch failed"); }
          setFetchingPrice(false);
      }
  };

  const handleAmountChange = (e) => {
      const { raw, display } = formatCurrencyInput(e.target.value);
      setAmountDisplay(display);
      setAmountInWords(convertToWords(raw));
      setFormData(prev => ({ ...prev, investedAmount: raw }));
  };

  const handleValuationChange = (e) => {
      const { raw, display } = formatCurrencyInput(e.target.value);
      setValDisplay(display);
      setFormData(prev => ({ ...prev, valuation: raw }));
  };

  // Auto-Calc Total for Stock/Gold/Crypto
  const handleCalcTotal = (qty, price) => {
      const q = Number(qty);
      const p = Number(price);
      if (q > 0 && p > 0) {
          const total = q * p;
          setFormData(prev => ({ ...prev, investedAmount: total }));
          setAmountDisplay(new Intl.NumberFormat('en-IN').format(total));
          setAmountInWords(convertToWords(total));
      }
  };

  const handleSubmit = () => {
    if (!formData.name || (!formData.investedAmount && assetType !== 'public_equity' && assetType !== 'crypto')) return alert("Please fill required fields");
    
    let finalData = {
        name: formData.name,
        companyName: formData.name, 
        investmentDate: formData.investmentDate,
        investedAmount: formData.investedAmount,
        fundingAmount: formData.investedAmount, 
        type: assetType
    };

    if (assetType === 'gold') {
        finalData.domainName = 'Gold / Bullion';
        finalData.weightGrams = formData.weightGrams;
        finalData.purity = formData.purity;
        finalData.form = formData.form;
        finalData.propertyType = null; finalData.location = null;
        finalData.units = Number(formData.weightGrams);
        finalData.buyPrice = Number(formData.investedAmount) / Number(formData.weightGrams);
    } 
    else if (assetType === 'real_estate') {
        finalData.domainName = 'Real Estate';
        finalData.propertyType = formData.propertyType;
        finalData.location = formData.location;
        finalData.sqFt = formData.sqFt;
        finalData.rentalYield = formData.rentalYield;
    }
    else if (assetType === 'public_equity') {
        finalData.domainName = 'Public Stock';
        finalData.ticker = formData.ticker;
        finalData.quantity = Number(formData.quantity);
        finalData.avgBuyPrice = Number(formData.avgBuyPrice);
        finalData.units = Number(formData.quantity);
        finalData.buyPrice = Number(formData.avgBuyPrice);
        
        if (!finalData.investedAmount) {
            finalData.investedAmount = (Number(formData.quantity) * Number(formData.avgBuyPrice));
            finalData.fundingAmount = finalData.investedAmount;
        }
    }
    // --- FIX: ADDED CRYPTO HANDLER ---
    else if (assetType === 'crypto') {
        finalData.domainName = 'Web3 / Crypto';
        finalData.ticker = formData.ticker ? formData.ticker.toUpperCase() : '';
        finalData.quantity = Number(formData.quantity);
        finalData.avgBuyPrice = Number(formData.avgBuyPrice);
        finalData.units = Number(formData.quantity);
        finalData.buyPrice = Number(formData.avgBuyPrice);
        
        if (!finalData.investedAmount) {
            finalData.investedAmount = (Number(formData.quantity) * Number(formData.avgBuyPrice));
            finalData.fundingAmount = finalData.investedAmount;
        }
    }
    else {
        // Startup Logic (Default fallback)
        finalData.domainName = formData.domainName || 'General Tech';
        finalData.round = formData.round;
        finalData.shares = formData.shares;
        finalData.equityPct = formData.equityPct;
        finalData.valuation = formData.valuation;
    }

    onSave(finalData);
    onClose(); 
  };

  const renderDynamicFields = () => {
    switch (assetType) {
      case 'startup':
        return (
          <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease]">
            <div className="col-span-2 relative">
                <label className="text-xs text-slate-400 uppercase font-bold">Sector / Domain</label>
                <select name="domainName" value={formData.domainName} onChange={handleChange} className={darkInputStyle}>
                    <option value="">-- Select from Database --</option>
                    {(domains && domains.length > 0 ? domains : [{name: 'General Tech'}, {name: 'SaaS'}]).map((d, idx) => {
                         const val = typeof d === 'object' ? (d.name || d.domain) : d;
                         return <option key={idx} value={val}>{val}</option>;
                    })}
                </select>
            </div>
            <div><label className="text-xs text-slate-400 uppercase font-bold">Round</label><select name="round" value={formData.round} onChange={handleChange} className={darkInputStyle}><option>Pre-seed</option><option>Seed</option><option>Series A</option><option>Series B</option></select></div>
            <div><label className="text-xs text-slate-400 uppercase font-bold">Equity %</label><input name="equityPct" type="number" placeholder="e.g. 5.5" value={formData.equityPct} onChange={handleChange} className={darkInputStyle} /></div>
             <div><label className="text-xs text-slate-400 uppercase font-bold">Post-Money Val (₹)</label><input name="valuation" type="text" placeholder="e.g. 100 Cr" value={valDisplay} onChange={handleValuationChange} className={darkInputStyle} />{formData.valuation > 0 && <div className="text-[10px] text-blue-400 mt-1">{convertToWords(formData.valuation)}</div>}</div>
          </div>
        );

      case 'real_estate':
        return (
          <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease]">
             <div><label className="text-xs text-slate-400 uppercase font-bold">Type</label><select name="propertyType" value={formData.propertyType} onChange={handleChange} className={darkInputStyle}><option>Residential</option><option>Commercial</option><option>Land</option></select></div>
            <div><label className="text-xs text-slate-400 uppercase font-bold">Location</label><input name="location" type="text" placeholder="City/Area" value={formData.location} onChange={handleChange} className={darkInputStyle} /></div>
            <div><label className="text-xs text-slate-400 uppercase font-bold">Area (Sq Ft)</label><input name="sqFt" type="number" placeholder="2500" value={formData.sqFt} onChange={handleChange} className={darkInputStyle} /></div>
          </div>
        );

      case 'gold':
        return (
          <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease]">
            <div><label className="text-xs text-slate-400 uppercase font-bold">Form</label><select name="form" value={formData.form} onChange={handleChange} className={darkInputStyle}><option>Physical</option><option>SGB</option><option>Digital</option></select></div>
            <div className="col-span-2"><label className="text-xs text-slate-400 uppercase font-bold">Weight (Grams)</label><input name="weightGrams" type="number" placeholder="e.g. 100g" value={formData.weightGrams} onChange={e => { handleChange(e); handleCalcTotal(e.target.value, 1); }} className={darkInputStyle} /></div>
          </div>
        );

        case 'public_equity':
        return (
          <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease]">
            <div className="col-span-2 relative">
                <label className="text-xs text-slate-400 uppercase font-bold">Ticker / Scrip</label>
                <div className="relative">
                    <input name="ticker" type="text" placeholder="e.g. ZOMATO" value={formData.ticker} onChange={handleChange} onBlur={handleTickerBlur} className={darkInputStyle} />
                    {fetchingPrice && <span className="absolute right-3 top-3 text-[10px] text-blue-400 animate-pulse">Fetching Price...</span>}
                    {liveRate && <span className="absolute right-3 top-3 text-[10px] text-green-400 font-bold">Live: ₹{liveRate}</span>}
                </div>
            </div>
            <div><label className="text-xs text-slate-400 uppercase font-bold">Quantity</label><input name="quantity" type="number" placeholder="100" value={formData.quantity} onChange={e => { handleChange(e); handleCalcTotal(e.target.value, formData.avgBuyPrice); }} className={darkInputStyle} /></div>
             <div><label className="text-xs text-slate-400 uppercase font-bold">Buy Price</label><input name="avgBuyPrice" type="number" placeholder="₹" value={formData.avgBuyPrice} onChange={e => { handleChange(e); handleCalcTotal(formData.quantity, e.target.value); }} className={darkInputStyle} /></div>
          </div>
        );

        // --- FIX: ADDED CRYPTO CASE ---
        case 'crypto':
        return (
          <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease]">
            <div className="col-span-2 relative">
                <label className="text-xs text-purple-400 uppercase font-bold">Token Ticker</label>
                <div className="relative">
                    <input name="ticker" type="text" placeholder="e.g. SOL, BTC" value={formData.ticker} onChange={handleChange} onBlur={handleTickerBlur} className={darkInputStyle} />
                    {fetchingPrice && <span className="absolute right-3 top-3 text-[10px] text-purple-400 animate-pulse">Fetching...</span>}
                </div>
            </div>
            <div><label className="text-xs text-slate-400 uppercase font-bold">Tokens</label><input name="quantity" type="number" placeholder="e.g. 500" value={formData.quantity} onChange={e => { handleChange(e); handleCalcTotal(e.target.value, formData.avgBuyPrice); }} className={darkInputStyle} /></div>
             <div><label className="text-xs text-slate-400 uppercase font-bold">Buy Price (INR)</label><input name="avgBuyPrice" type="number" placeholder="₹" value={formData.avgBuyPrice} onChange={e => { handleChange(e); handleCalcTotal(formData.quantity, e.target.value); }} className={darkInputStyle} /></div>
          </div>
        );
        
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white">Add New Asset</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full bg-white/5 transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="mb-6">
                <label className="text-xs text-slate-400 uppercase font-bold mb-3 block">Select Asset Class</label>
                <div className="grid grid-cols-5 gap-2">
                    {ASSET_TYPES.map(type => (
                        <button key={type.id} onClick={() => setAssetType(type.id)} className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${assetType === type.id ? `${type.color} border-transparent text-white font-bold shadow-lg` : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                            <i className={`${type.icon} text-lg mb-1.5`}></i>
                            <span className="text-[9px] whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{type.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                <div><label className="text-xs text-slate-400 uppercase font-bold">Asset Name</label><input name="name" type="text" placeholder={assetType === 'crypto' ? "e.g. Solana" : "e.g. Zomato Ltd"} value={formData.name} onChange={handleChange} className={darkInputStyle} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-slate-400 uppercase font-bold">Date</label><input name="investmentDate" type="date" value={formData.investmentDate} onChange={handleChange} className={darkInputStyle} /></div>
                    <div><label className="text-xs text-slate-400 uppercase font-bold">Total Invested (₹)</label><input name="investedAmount" type="text" value={amountDisplay} onChange={handleAmountChange} placeholder="e.g. 50,00,000" className={darkInputStyle} />{amountInWords && <div className="text-[10px] text-[var(--brand-color)] mt-1 text-right">{amountInWords}</div>}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">{renderDynamicFields()}</div>
            </div>
        </div>
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0f172a] shrink-0 rounded-b-xl">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 font-bold text-sm transition-all border border-white/5">Cancel</button>
            <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-[var(--brand-color)] text-black font-bold text-sm shadow-lg hover:brightness-110">Add to Portfolio</button>
        </div>
      </div>
    </div>
  );
};

export default AddInvestmentModal;