// /api/stock.js
export default async function handler(req, res) {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Missing name parameter" });

    const cleanTicker = name.split('.')[0].trim().toUpperCase();
    const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent(cleanTicker)}`;

    try {
        const response = await fetch(url, {
            headers: { 
                'x-api-key': process.env.STOCK_API_KEY,
                'Accept': 'application/json'
            }
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            return res.status(500).json({ error: "Oracle Response Parsing Failed", raw: text });
        }

        // CORRECT MAPPING FOR INDIANAPI.IN
        // Key fix: Mapping 'currentPrice', 'pChange', and '52WeekHigh'
        const price = data.currentPrice || data.price?.NSE || data.price?.BSE || data.price || 0;
        const changePct = data.pChange || data.percentChange || 0;
        const high52 = data['52WeekHigh'] || data.fiftyTwoWeekHigh || 0;
        const low52 = data['52WeekLow'] || data.fiftyTwoWeekLow || 0;

        res.status(200).json({
            symbol: cleanTicker,
            companyName: data.stockName || data.companyName || cleanTicker,
            price: price, 
            previousClose: data.previousClose || price,
            change: data.change || 0,
            percentChange: changePct,
            fiftyTwoWeekHigh: high52,
            fiftyTwoWeekLow: low52,
            peRatio: data.peRatio || 0,
            marketCap: data.marketCap || 0
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stock', details: error.message });
    }
}
