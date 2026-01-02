// /api/stock.js
import axios from 'axios';

export default async function handler(req, res) {
    const { name } = req.query;
    
    if (!name) {
        return res.status(400).json({ error: "Missing 'name' query parameter." });
    }

    const cleanTicker = name.split('.')[0].trim().toUpperCase();
    const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent(cleanTicker)}`;

    try {
        // IMPLEMENTING YOUR AXIOS SNIPPET
        const response = await axios.get(url, {
            headers: { 'x-api-key': process.env.STOCK_API_KEY }
        });

        const data = response.data;

        // Fallback logic for various price field names
        let pricePayload = data.price?.NSE || data.price?.BSE || data.price || data.lastPrice || 0;

        res.status(200).json({
            symbol: cleanTicker,
            companyName: data.companyName || cleanTicker,
            price: pricePayload, 
            previousClose: data.previousClose || pricePayload,
            change: data.change || 0,
            percentChange: data.pChange || data.percentChange || 0,
            fiftyTwoWeekHigh: data.yearHigh || data.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: data.yearLow || data.fiftyTwoWeekLow || 0,
            peRatio: data.peRatio || 0,
            marketCap: data.marketCap || 0
        });

    } catch (error) {
        console.error("Stock Oracle Error:", error.message);
        res.status(500).json({ 
            error: 'Failed to fetch stock', 
            details: error.response?.data || error.message 
        });
    }
}
