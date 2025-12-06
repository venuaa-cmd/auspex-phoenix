const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- STOCK API (Debug Mode) ---
app.get('/api/stock', async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'Ticker required' });

    // Clean ticker (e.g. "Tata Steel" -> "TATASTEEL")
    const cleanTicker = name.replace('.NS', '').replace('.BO', '').trim().toUpperCase();

    try {
        const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent(cleanTicker)}`;
        console.log(`Fetching: ${url}`);
        
        const response = await axios.get(url, {
            headers: { 'x-api-key': process.env.STOCK_API_KEY }
        });

        const data = response.data;

        // AGGRESSIVE PRICE FINDER
        let price = 0;
        // Check every possible field IndianAPI might use
        if (data.currentPrice) {
            // Sometimes it's an object { NSE: 100, BSE: 100 }
            if (typeof data.currentPrice === 'object') price = data.currentPrice.NSE || data.currentPrice.BSE;
            else price = data.currentPrice;
        } 
        else if (data.lastPrice) price = data.lastPrice;
        else if (data.price) price = data.price;
        else if (data.ltp) price = data.ltp;
        else if (data.close) price = data.close;

        // Force to number
        price = parseFloat(price) || 0;

        res.json({
            symbol: cleanTicker,
            companyName: data.companyName || cleanTicker,
            price: price, // This should now be a number
            currency: "INR",
            change: data.change || 0,
            percentChange: data.pChange || data.percentChange || 0,
            marketCap: data.marketCap || "N/A",
            peRatio: data.peRatio || "N/A",
            exchange: "NSE",
            // DEBUG FIELD: Allows us to see what IndianAPI actually sent
            debug_response: data 
        });

    } catch (error) {
        console.error("Stock Error:", error.message);
        res.status(500).json({ 
            error: 'Failed to fetch stock', 
            details: error.response?.data || error.message 
        });
    }
});

// ... (Keep your News and Gold routes here) ...

app.get('/', (req, res) => res.send('Finance Engine Active'));
module.exports = app;
