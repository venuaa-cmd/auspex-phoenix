// /api/crypto.js
export default async function handler(req, res) {
  const { id } = req.query; // Expects ticker like 'btc'
  
  // 1. GUARD CLAUSE: Prevent crash if no ID is provided (Fixes 500 Error)
  if (!id) {
    return res.status(400).json({ error: "Missing 'id' query parameter. Usage: /api/crypto?id=btc" });
  }

  // CoinGecko requires IDs (bitcoin) not Tickers (BTC)
  const tickerMap = {
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'sol': 'solana',
    'matic': 'matic-network',
    'usdt': 'tether',
    'paxg': 'pax-gold'
  };

  const geckoId = tickerMap[id.toLowerCase()] || id.toLowerCase();

  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=inr&include_24hr_change=true`);
    const data = await response.json();
    
    if (!data[geckoId]) {
        return res.status(404).json({ error: `Asset '${geckoId}' not found on CoinGecko.` });
    }

    res.status(200).json({
      price: data[geckoId].inr,
      change24h: data[geckoId].inr_24h_change,
      raw: data
    });
  } catch (error) {
    res.status(500).json({ error: "Oracle Link Failure", details: error.message });
  }
}
