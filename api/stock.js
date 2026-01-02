// /api/stock.js
export default async function handler(req, res) {
    const { name } = req.query;
    
    // 1. GUARD: Prevent crash if name is missing
    if (!name) {
        return res.status(400).json({ error: "Missing 'name' query parameter." });
    }

    const cleanTicker = name.split('.')[0].trim().toUpperCase();
    const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent(cleanTicker)}`;

    try {
        // 2. NATIVE FETCH: No 'axios' dependency required, preventing 500 errors
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'x-api-key': process.env.STOCK_API_KEY,
                'Accept': 'application/json'
            }
        });

        const text = await response.text();
        let data;

        // 3. PARSE CHECK: Handle cases where API returns "Missing API key" string instead of JSON
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Non-JSON response received:", text);
            return res.status(401).json({ 
                error: "Oracle Authorization Failed", 
                details: text.includes("API key") ? "Invalid or missing STOCK_API_KEY in Vercel environment." : "External service error." 
            });
        }

        // 4. PAYLOAD MAPPING: Supporting various price field formats
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
        res.status(500).json({ 
            error: 'Internal Server Error during fetch', 
            details: error.message 
        });
    }
}
