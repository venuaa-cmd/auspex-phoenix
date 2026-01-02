// /api/stock.js
export default async function handler(req, res) {
    const { name } = req.query;
    
    if (!name) {
        return res.status(400).json({ error: "Missing 'name' query parameter." });
    }

    // Clean the ticker (remove .NS or whitespace)
    const cleanTicker = name.split('.')[0].trim().toUpperCase();
    const targetUrl = `https://stock.indianapi.in/stock?name=${encodeURIComponent(cleanTicker)}`;

    try {
        const response = await fetch(targetUrl);
        const data = await response.json();

        // RE-INTEGRATING YOUR SERVER.JS FALLBACK LOGIC
        let pricePayload;
        if (data.price && typeof data.price === 'object') {
            // Priority: NSE > BSE > 0
            pricePayload = data.price.NSE || data.price.BSE || 0;
        } else {
            pricePayload = data.price || data.lastPrice || data.ltp || data.close || 0;
        }

        // Return standardized payload for StockDetail.jsx
        res.status(200).json({
            symbol: cleanTicker,
            companyName: data.companyName || cleanTicker,
            price: pricePayload, 
            previousClose: data.previousClose || pricePayload,
            change: data.change || 0,
            percentChange: data.pChange || data.percentChange || 0,
            marketCap: data.marketCap || 0,
            peRatio: data.peRatio || 0,
            fiftyTwoWeekHigh: data.yearHigh || data.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: data.yearLow || data.fiftyTwoWeekLow || 0,
            exchange: data.exchange || "NSE",
            debug_raw: data 
        });

    } catch (error) {
        console.error("Stock Oracle Error:", error.message);
        res.status(500).json({ 
            error: 'Failed to fetch stock', 
            details: error.message 
        });
    }
}
