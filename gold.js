// /api/gold.js (Deploy this to Vercel)
export default async function handler(req, res) {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=inr&include_24hr_change=true');
    const data = await response.json();
    
    const priceOz = data['pax-gold'].inr;
    const pricePerGram = priceOz / 31.1035; // Convert Troy Oz to Gram
    
    res.status(200).json({
      pricePerGram,
      change24h: data['pax-gold'].inr_24h_change,
      raw: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}