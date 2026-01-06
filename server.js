import express from 'express';
import cors from 'cors';
import axios from 'axios';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for global access as per your origin: '*' rule
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- STOCK API ---
app.get('/api/stock', async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'Ticker required' });

    // Clean ticker
    const cleanTicker = name.replace(/\.NS/gi, '').replace(/\.BO/gi, '').trim().toUpperCase();

    try {
        const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent(cleanTicker)}`;
        console.log(`Fetching: ${url}`);
        
        const response = await axios.get(url, {
            headers: { 'x-api-key': process.env.STOCK_API_KEY }
        });

        const data = response.data;

        // --- CAPTURE BOTH PRICES ---
        let pricePayload = 0;
        let exchangeLabel = "NSE";

        if (data.currentPrice) {
            pricePayload = data.currentPrice; 
            if (typeof data.currentPrice === 'object') {
                exchangeLabel = "NSE/BSE";
            }
        } else {
            pricePayload = data.price || data.lastPrice || data.ltp || data.close || 0;
        }

        res.json({
            symbol: cleanTicker,
            companyName: data.companyName || cleanTicker,
            price: pricePayload, 
            currency: "INR",
            change: data.change || 0,
            percentChange: data.pChange || data.percentChange || 0,
            marketCap: data.marketCap || "N/A",
            peRatio: data.peRatio || "N/A",
            exchange: exchangeLabel,
            debug_raw: data 
        });

    } catch (error) {
        console.error("Stock Error:", error.message);
        res.status(500).json({ 
            error: 'Failed to fetch stock', 
            details: error.response?.data || error.message 
        });
    }
});

// --- NEWS API ---
app.get('/api/news', async (req, res) => {
    const { query } = req.query;
    try {
        const response = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
                q: query || 'India Startup',
                sortBy: 'publishedAt',
                language: 'en',
                apiKey: process.env.NEWS_API_KEY
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'News Error' });
    }
});

// --- GOLD API ---
app.get('/api/gold', async (req, res) => {
    try {
        const response = await axios.get(`https://www.goldapi.io/api/XAU/INR`, {
            headers: { 'x-access-token': process.env.GOLD_API_KEY, 'Content-Type': 'application/json' }
        });
        res.json({
            symbol: 'Gold (24K)',
            price: (response.data.price / 31.1035).toFixed(2),
            currency: 'INR'
        });
    } catch (error) {
        res.status(500).json({ error: 'Gold fetch failed' });
    }
});

// Root Route
app.get('/', (req, res) => res.send('Finance Engine Active'));

/**
 * CRITICAL FOR VERCEL: 
 * We export the app as default instead of using module.exports.
 * Vercel will wrap this in a serverless function automatically.
 */
export default app;