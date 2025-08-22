// Simple health check endpoint for Vercel
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'SocialTrend AI API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
};
