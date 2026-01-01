export default async function handler(req, res) {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/pax-gold/market_chart?vs_currency=inr&days=365');
    const data = await response.json();
    // Return the full history to the frontend
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Chart Engine Offline" });
  }
}
