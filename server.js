const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS CONFIGURATION ---
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- 1. STOCK API (IndianAPI.in) ---
app.get('/api/stock', async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'Stock ticker required' });

    // Clean ticker: IndianAPI usually expects "TATASTEEL" not "TATASTEEL.NS"
    // We strip common suffixes to be safe
    const cleanTicker = name.replace('.NS', '').replace('.BO', '').trim();

    try {
        // IndianAPI Endpoint Structure
        const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent("query")}`;
        
        const response = await axios.get(url, {
            headers: {
                'X-Api-Key': process.env.STOCK_API_KEY // Ensure this Env Var is set
            }
        });

        const data = response.data;
        
        // Normalize Data for Frontend
        // Assuming IndianAPI returns { currentPrice: 150, ... }
        res.json({
            symbol: cleanTicker,
            companyName: data.companyName || cleanTicker,
            price: data.currentPrice || data.price,
            currency: "INR",
            change: data.change || 0,
            percentChange: data.percentChange || 0,
            marketCap: data.marketCap || "N/A",
            peRatio: data.peRatio || "N/A",
            exchange: "NSE"
        });

    } catch (error) {
        console.error("Stock API Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch stock data', details: error.message });
    }
});

// --- 2. NEWS API (NewsAPI.org) ---
app.get('/api/news', async (req, res) => {
    const { query } = req.query;
    const searchTerm = query || 'India Startup Funding';
    
    try {
        const url = `https://newsapi.org/v2/everything`;
        const response = await axios.get(url, {
            params: {
                q: searchTerm,
                sortBy: 'publishedAt',
                language: 'en',
                apiKey: process.env.NEWS_API_KEY // Ensure this Env Var is set
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error("News API Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch news', details: error.message });
    }
});

// --- 3. GOLD API (GoldAPI.io) ---
app.get('/api/gold', async (req, res) => {
    try {
        const url = `https://www.goldapi.io/api/XAU/INR`;
        
        const response = await axios.get(url, {
            headers: {
                'x-access-token': process.env.GOLD_API_KEY, // Ensure this Env Var is set
                'Content-Type': 'application/json'
            }
        });

        // GoldAPI returns price per Ounce. Convert to Grams (1 Ounce = 31.1035 Grams)
        const pricePerOunce = response.data.price;
        const pricePerGram = (pricePerOunce / 31.1035).toFixed(2);

        res.json({
            symbol: 'Gold (24K)',
            price: pricePerGram,
            currency: 'INR',
            raw_response: response.data
        });

    } catch (error) {
        console.error("Gold API Error:", error.message);
        res.status(500).json({ error: 'Gold fetch failed', details: error.message });
    }
});

// Health Check
app.get('/', (req, res) => res.send('Auspex Finance Engine: Active'));

module.exports = app;
