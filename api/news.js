// /api/news.js
export default async function handler(req, res) {
    const { query } = req.query;
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'NEWS_API_KEY is not configured in Vercel Environment Variables.' });
    }

    // Mapping parameters from your server.js logic
    const targetUrl = new URL('https://newsapi.org/v2/everything');
    targetUrl.searchParams.append('q', query || 'India Startup');
    targetUrl.searchParams.append('sortBy', 'publishedAt');
    targetUrl.searchParams.append('language', 'en');
    targetUrl.searchParams.append('apiKey', apiKey);

    try {
        const response = await fetch(targetUrl.toString());
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.message || 'News API provider error' });
        }

        // Return standardized news payload
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Oracle Synchronization Failure', details: error.message });
    }
}
