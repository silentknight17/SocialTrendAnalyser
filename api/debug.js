// Debug endpoint for troubleshooting Vercel deployment issues
const axios = require('axios');

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            platform: process.platform,
            nodeVersion: process.version,
            envVars: {
                GROQ_API_KEY: !!process.env.GROQ_API_KEY,
                YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY,
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: !!process.env.VERCEL,
                VERCEL_ENV: process.env.VERCEL_ENV
            },
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            tests: {}
        };

        // Test basic HTTP request
        try {
            console.log('🧪 Testing basic HTTP request...');
            const testResponse = await axios.get('https://httpbin.org/json', { 
                timeout: 5000,
                headers: {
                    'User-Agent': 'SocialTrendAI-Debug/1.0'
                }
            });
            debugInfo.tests.httpTest = {
                success: true,
                status: testResponse.status,
                responseSize: JSON.stringify(testResponse.data).length
            };
            console.log('✅ HTTP test passed');
        } catch (error) {
            console.log('❌ HTTP test failed:', error.message);
            debugInfo.tests.httpTest = {
                success: false,
                error: error.message,
                code: error.code
            };
        }

        // Test Reddit API
        try {
            console.log('🧪 Testing Reddit API...');
            const redditResponse = await axios.get('https://www.reddit.com/r/all/hot.json?limit=1', {
                timeout: 8000,
                headers: { 'User-Agent': 'TrendAnalyzer/1.0' }
            });
            debugInfo.tests.redditTest = {
                success: true,
                status: redditResponse.status,
                postsCount: redditResponse.data?.data?.children?.length || 0
            };
            console.log('✅ Reddit test passed');
        } catch (error) {
            console.log('❌ Reddit test failed:', error.message);
            debugInfo.tests.redditTest = {
                success: false,
                error: error.message,
                code: error.code
            };
        }

        // Test Hacker News API
        try {
            console.log('🧪 Testing Hacker News API...');
            const hnResponse = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json', {
                timeout: 8000
            });
            debugInfo.tests.hackerNewsTest = {
                success: true,
                status: hnResponse.status,
                storiesCount: Array.isArray(hnResponse.data) ? hnResponse.data.length : 0
            };
            console.log('✅ Hacker News test passed');
        } catch (error) {
            console.log('❌ Hacker News test failed:', error.message);
            debugInfo.tests.hackerNewsTest = {
                success: false,
                error: error.message,
                code: error.code
            };
        }

        // Test YouTube API (if key available)
        if (process.env.YOUTUBE_API_KEY) {
            try {
                console.log('🧪 Testing YouTube API...');
                const youtubeResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                    params: {
                        part: 'snippet',
                        chart: 'mostPopular',
                        regionCode: 'IN',
                        maxResults: 1,
                        key: process.env.YOUTUBE_API_KEY
                    },
                    timeout: 8000
                });
                debugInfo.tests.youtubeTest = {
                    success: true,
                    status: youtubeResponse.status,
                    videosCount: youtubeResponse.data?.items?.length || 0
                };
                console.log('✅ YouTube test passed');
            } catch (error) {
                console.log('❌ YouTube test failed:', error.message);
                debugInfo.tests.youtubeTest = {
                    success: false,
                    error: error.message,
                    code: error.code
                };
            }
        } else {
            debugInfo.tests.youtubeTest = {
                success: false,
                error: 'No YOUTUBE_API_KEY environment variable'
            };
        }

        // Test Groq API (if key available)
        if (process.env.GROQ_API_KEY) {
            try {
                console.log('🧪 Testing Groq API...');
                const groqResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: 'llama3-8b-8192',
                    messages: [{ role: 'user', content: 'Hello, test message' }],
                    max_tokens: 10
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                });
                debugInfo.tests.groqTest = {
                    success: true,
                    status: groqResponse.status,
                    hasResponse: !!groqResponse.data?.choices?.[0]?.message?.content
                };
                console.log('✅ Groq test passed');
            } catch (error) {
                console.log('❌ Groq test failed:', error.message);
                debugInfo.tests.groqTest = {
                    success: false,
                    error: error.message,
                    code: error.code,
                    status: error.response?.status
                };
            }
        } else {
            debugInfo.tests.groqTest = {
                success: false,
                error: 'No GROQ_API_KEY environment variable'
            };
        }

        console.log('🔍 Debug info collected:', JSON.stringify(debugInfo, null, 2));

        res.status(200).json({
            success: true,
            debug: debugInfo
        });
    } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Debug endpoint failed',
            message: error.message 
        });
    }
};
