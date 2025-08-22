const axios = require('axios');
const sentiment = require('sentiment');
const natural = require('natural');

// Production Configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Create shared AI service for hashtag context analysis
class AIContextService {
    async analyzeHashtagWithRealAI(hashtag, platform = 'social media') {
        console.log(`🔥 REAL AI ANALYSIS: Calling AI to analyze #${hashtag}...`);
        
        const prompt = `You are a social media trend analyst. Analyze the hashtag "#${hashtag}" which is currently trending on ${platform}.

Please explain:
1. Why is "#${hashtag}" trending right now? What current events, topics, or phenomena are driving its popularity?
2. What does this hashtag represent or relate to?
3. How should businesses effectively use this hashtag in their social media content?

Provide a concise but informative analysis that helps someone understand when and how to use this trending hashtag.`;

        try {
            return await this.callGroqAPIWithRetry(prompt, hashtag);
        } catch (error) {
            console.error(`❌ REAL AI FAILED for #${hashtag}:`, error.message);
            console.log(`❌ NO FALLBACKS AVAILABLE - As requested by user`);
            throw new Error(`Real AI hashtag analysis failed for #${hashtag}: ${error.message}. No fallback mechanisms available.`);
        }
    }

    async callGroqAPIWithRetry(prompt, hashtag, maxRetries = 3) {
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        
        if (!GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is required for hashtag context analysis');
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🤖 Calling Groq API for #${hashtag} (attempt ${attempt}/${maxRetries})...`);
                
                const currentDate = new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric'
                });
                
                const freshPrompt = `Current date: ${currentDate}

${prompt}

Important: Focus on why this hashtag is trending RIGHT NOW in the past 24-48 hours. Provide current, fresh analysis based on recent events and current social media phenomena.`;

                const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: 'llama3-8b-8192',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a real-time social media trend analyst. Provide current, fresh analysis of why hashtags are trending RIGHT NOW. Focus on recent events, breaking news, viral content, and current social media phenomena. Be specific about timing and current context.'
                        },
                        {
                            role: 'user',
                            content: freshPrompt
                        }
                    ],
                    max_tokens: 250,
                    temperature: 0.8
                }, {
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });

                const analysis = response.data.choices[0]?.message?.content;
                if (!analysis) {
                    throw new Error('No analysis content received from Groq API');
                }

                console.log(`✅ REAL GROQ AI RESPONSE received for #${hashtag}`);
                return {
                    context: analysis,
                    usage: `Use #${hashtag} when your content relates to current trending topics. Perfect for engagement during peak discussion periods.`,
                    description: `Currently trending on ${platform}`
                };
            } catch (error) {
                if (error.response?.status === 429) {
                    const waitTime = Math.min(Math.pow(2, attempt) * 1000, 30000);
                    console.log(`⏱️ Rate limit hit. Waiting ${waitTime/1000}s before retry ${attempt}/${maxRetries}...`);
                    
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                }
                
                if (attempt === maxRetries) {
                    throw new Error(`Groq API failed after ${maxRetries} retries: ${error.message}`);
                }
                
                console.log(`❌ Groq API error (attempt ${attempt}): ${error.message}`);
            }
        }
    }
}

// Real API Integration Class
class RealSocialMediaAPI {
    constructor() {
        this.cache = new Map();
        this.sentimentAnalyzer = new sentiment();
        this.tokenizer = new natural.WordTokenizer();
    }

    async getTrendsForPlatforms(platforms = ['reddit', 'hackernews']) {
        console.log(`📊 Analyzing real trends from: ${JSON.stringify(platforms)}`);
        
        const cacheKey = platforms.sort().join(',');
        const effectiveCacheTimeout = platforms.includes('news') ? 2 * 60 * 1000 : 15 * 60 * 1000;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            const cacheAge = Date.now() - cached.timestamp;
            
            if (cacheAge < effectiveCacheTimeout) {
                console.log('Returning cached trends');
                return cached.data;
            }
        }

        try {
            console.log('Fetching fresh trends from APIs...');
            const apiPromises = [];

            if (platforms.includes('reddit')) {
                console.log('Fetching Reddit trends...');
                apiPromises.push(this.fetchRedditTrends().catch(error => {
                    console.error('Reddit API error:', error.message);
                    return { hashtags: [], themes: [] };
                }));
            }

            if (platforms.includes('hackernews')) {
                console.log('Fetching Hacker News trends...');
                apiPromises.push(this.fetchHackerNewsTrends().catch(error => {
                    console.error('Hacker News API error:', error.message);
                    return { hashtags: [], themes: [] };
                }));
            }

            if (platforms.includes('youtube')) {
                console.log('Fetching YouTube trends...');
                apiPromises.push(this.fetchYouTubeTrends().catch(error => {
                    console.error('YouTube API error:', error.message);
                    return { hashtags: [], themes: [] };
                }));
            }

            if (platforms.includes('news')) {
                console.log('Fetching News trends...');
                apiPromises.push(this.fetchNewsTrends().catch(error => {
                    console.error('News API error:', error.message);
                    return { hashtags: [], themes: [] };
                }));
            }

            const results = await Promise.allSettled(apiPromises);
            const validResults = results
                .map(result => result.status === 'fulfilled' ? result.value : null)
                .filter(value => value !== null);

            const combinedHashtags = [];
            const combinedThemes = [];

            validResults.forEach(result => {
                if (result.hashtags) combinedHashtags.push(...result.hashtags);
                if (result.themes) combinedThemes.push(...result.themes);
            });

            const trends = {
                hashtags: combinedHashtags,
                themes: combinedThemes,
                totalEngagement: combinedHashtags.reduce((sum, h) => sum + (h.engagement || 0), 0),
                platformCount: platforms.length
            };

            this.cache.set(cacheKey, {
                data: trends,
                timestamp: Date.now()
            });

            return trends;
        } catch (error) {
            console.error('Error fetching trends:', error);
            throw error;
        }
    }

    async fetchRedditTrends() {
        const subreddits = ['all', 'popular', 'AskReddit', 'worldnews', 'technology'];
        const hashtags = [];

        for (const subreddit of subreddits.slice(0, 2)) {
            try {
                const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`, {
                    headers: { 'User-Agent': 'TrendAnalyzer/1.0' },
                    timeout: 10000
                });

                const posts = response.data?.data?.children || [];
                
                for (const post of posts) {
                    const title = post.data?.title || '';
                    const score = post.data?.score || 0;
                    
                    const words = this.tokenizer.tokenize(title.toLowerCase()) || [];
                    const meaningfulWords = words
                        .filter(word => word && word.length > 3 && !/^\d+$/.test(word))
                        .slice(0, 2);

                    for (const word of meaningfulWords) {
                        if (word) {
                            hashtags.push({
                                tag: word,
                                engagement: score,
                                platform: 'reddit',
                                category: 'General'
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn(`Reddit API error for ${subreddit}:`, error.message);
            }
        }

        const processedHashtags = await this.analyzeRedditData(hashtags);
        console.log(`Fetched ${processedHashtags.length} Reddit trends`);
        
        return {
            hashtags: processedHashtags,
            themes: this.extractThemes(processedHashtags, 'reddit')
        };
    }

    async fetchHackerNewsTrends() {
        try {
            const response = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json', {
                timeout: 10000
            });
            
            const topIds = response.data?.slice(0, 10) || [];
            const hashtags = [];

            for (const id of topIds.slice(0, 5)) {
                try {
                    const storyResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
                        timeout: 5000
                    });
                    
                    const story = storyResponse.data;
                    if (story?.title) {
                        const words = this.tokenizer.tokenize(story.title.toLowerCase()) || [];
                        const techWords = words
                            .filter(word => word && word.length > 2 && 
                                ['ai', 'data', 'tech', 'app', 'web', 'code', 'dev', 'api', 'ml', 'crypto', 'blockchain'].includes(word))
                            .slice(0, 1);

                        for (const word of techWords) {
                            hashtags.push({
                                tag: word,
                                engagement: story.score || 0,
                                platform: 'hackernews',
                                category: 'Technology'
                            });
                        }
                    }
                } catch (itemError) {
                    console.warn(`HN item error for ${id}:`, itemError.message);
                }
            }

            const processedHashtags = await this.analyzeHackerNewsData(hashtags);
            console.log(`Fetched ${processedHashtags.length} Hacker News trends`);
            
            return {
                hashtags: processedHashtags,
                themes: this.extractThemes(processedHashtags, 'hackernews')
            };
        } catch (error) {
            console.error('Hacker News API error:', error);
            return { hashtags: [], themes: [] };
        }
    }

    async fetchYouTubeTrends() {
        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
        
        if (!YOUTUBE_API_KEY) {
            console.warn('YouTube API key not found');
            return { hashtags: [], themes: [] };
        }

        try {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'snippet,statistics',
                    chart: 'mostPopular',
                    regionCode: 'IN',
                    maxResults: 10,
                    key: YOUTUBE_API_KEY
                },
                timeout: 10000
            });

            const videos = response.data?.items || [];
            const hashtags = [];

            for (const video of videos) {
                const title = video.snippet?.title || '';
                const viewCount = parseInt(video.statistics?.viewCount) || 0;
                const words = this.tokenizer.tokenize(title.toLowerCase()) || [];
                const meaningfulWords = words
                    .filter(word => word && word.length > 3 && !/^\d+$/.test(word))
                    .slice(0, 2);

                for (const word of meaningfulWords) {
                    hashtags.push({
                        tag: word,
                        engagement: Math.floor(viewCount / 1000),
                        platform: 'youtube',
                        category: 'Entertainment'
                    });
                }
            }

            const processedHashtags = await this.analyzeYouTubeData(hashtags);
            console.log(`Fetched ${processedHashtags.length} YouTube trends`);
            
            return {
                hashtags: processedHashtags,
                themes: this.extractThemes(processedHashtags, 'youtube')
            };
        } catch (error) {
            console.error('YouTube API error:', error);
            return { hashtags: [], themes: [] };
        }
    }

    async fetchNewsTrends() {
        const newsFeeds = [
            'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
            'https://www.thehindu.com/news/national/feeder/default.rss',
            'https://www.hindustantimes.com/feeds/rss/news/rssfeed.xml',
            'https://feeds.feedburner.com/ndtvnews-top-stories'
        ];

        const allArticles = [];

        for (const feedUrl of newsFeeds.slice(0, 2)) {
            try {
                const response = await axios.get(feedUrl, {
                    timeout: 8000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; TrendAnalyzer/1.0)'
                    }
                });

                const articles = this.parseRSSFeed(response.data);
                allArticles.push(...articles.slice(0, 3));
            } catch (error) {
                console.warn(`News feed error for ${feedUrl}:`, error.message);
            }
        }

        if (allArticles.length === 0) {
            console.log('Fetched 0 News trends');
            return { hashtags: [], themes: [] };
        }

        const processedData = await this.analyzeNewsData(allArticles);
        console.log(`Fetched ${processedData.hashtags.length} News trends`);
        
        return processedData;
    }

    parseRSSFeed(xmlContent) {
        const articles = [];
        
        try {
            const items = xmlContent.match(/<item[\s\S]*?<\/item>/gi) || [];
            
            for (const item of items.slice(0, 5)) {
                const title = this.extractXMLContent(item, 'title');
                const pubDate = this.extractXMLContent(item, 'pubDate');
                
                if (title) {
                    const articleAge = pubDate ? (Date.now() - new Date(pubDate).getTime()) / (1000 * 60 * 60) : 1;
                    
                    articles.push({
                        title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
                        publishedAt: pubDate,
                        ageInHours: articleAge
                    });
                }
            }
        } catch (error) {
            console.warn('RSS parsing error:', error.message);
        }
        
        return articles;
    }

    extractXMLContent(xml, tag) {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const match = xml.match(regex);
        return match ? match[1].trim() : '';
    }

    async analyzeNewsData(articles) {
        const hashtags = [];
        
        for (const article of articles) {
            const words = this.tokenizer.tokenize(article.title.toLowerCase()) || [];
            const indianKeywords = words.filter(word => 
                ['india', 'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'modi', 'bjp', 'congress', 
                 'bollywood', 'cricket', 'ipl', 'startup', 'tech', 'election', 'government', 'health', 
                 'education', 'economy', 'business', 'finance'].includes(word)
            );

            const engagementScore = Math.max(50, Math.floor(200 / Math.max(1, article.ageInHours)));

            for (const keyword of indianKeywords.slice(0, 2)) {
                hashtags.push({
                    tag: keyword,
                    engagement: engagementScore,
                    platform: 'news',
                    category: 'News',
                    articleTitle: article.title,
                    ageInHours: article.ageInHours
                });
            }
        }

        const processedHashtags = await this.analyzeNewsHashtags(hashtags);
        
        return {
            hashtags: processedHashtags,
            themes: this.extractThemes(processedHashtags, 'news')
        };
    }

    async analyzeRedditData(hashtags) {
        const aiContextService = new AIContextService();
        
        const uniqueHashtags = this.consolidateHashtags(hashtags);
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} Reddit hashtags in parallel...`);

        const hashtagPromises = uniqueHashtags.map(async (hashtag) => {
            console.log(`🤖 Analyzing Reddit hashtag: #${hashtag.tag}`);
            console.log(`🔥 REAL AI CALL: Requesting analysis for hashtag #${hashtag.tag}`);
            
            try {
                const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'Reddit');
                console.log(`✅ REAL AI RESPONSE received for #${hashtag.tag}`);
                
                return {
                    ...hashtag,
                    context: aiAnalysis.context,
                    usage: aiAnalysis.usage,
                    description: aiAnalysis.description
                };
            } catch (error) {
                console.log(`🚨 REAL AI ANALYSIS FAILED for #${hashtag.tag}: ${error.message}`);
                console.log(`❌ AI context failed for Reddit #${hashtag.tag}: ${error.message}`);
                
                throw new Error(`Real AI analysis failed for hashtag: ${hashtag.tag}`);
            }
        });

        try {
            const results = await Promise.allSettled(hashtagPromises);
            return results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
        } catch (error) {
            console.error('Error analyzing Reddit hashtags:', error);
            return [];
        }
    }

    async analyzeHackerNewsData(hashtags) {
        const aiContextService = new AIContextService();
        
        const uniqueHashtags = this.consolidateHashtags(hashtags);
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} Hacker News hashtags in parallel...`);

        const hashtagPromises = uniqueHashtags.map(async (hashtag) => {
            console.log(`🤖 Analyzing Hacker News hashtag: #${hashtag.tag}`);
            console.log(`🔥 REAL AI CALL: Requesting analysis for hashtag #${hashtag.tag}`);
            
            try {
                const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'Hacker News');
                console.log(`✅ REAL AI RESPONSE received for #${hashtag.tag}`);
                
                return {
                    ...hashtag,
                    context: aiAnalysis.context,
                    usage: aiAnalysis.usage,
                    description: aiAnalysis.description
                };
            } catch (error) {
                console.log(`🚨 REAL AI ANALYSIS FAILED for #${hashtag.tag}: ${error.message}`);
                console.log(`❌ AI context failed for Hacker News #${hashtag.tag}: ${error.message}`);
                
                throw new Error(`Real AI analysis failed for hashtag: ${hashtag.tag}`);
            }
        });

        try {
            const results = await Promise.allSettled(hashtagPromises);
            return results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
        } catch (error) {
            console.error('Error analyzing Hacker News hashtags:', error);
            return [];
        }
    }

    async analyzeYouTubeData(hashtags) {
        const aiContextService = new AIContextService();
        
        const uniqueHashtags = this.consolidateHashtags(hashtags);
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} YouTube hashtags in parallel...`);

        const hashtagPromises = uniqueHashtags.map(async (hashtag) => {
            console.log(`🤖 Analyzing YouTube hashtag: #${hashtag.tag}`);
            console.log(`🔥 REAL AI CALL: Requesting analysis for hashtag #${hashtag.tag}`);
            
            try {
                const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'YouTube');
                console.log(`✅ REAL AI RESPONSE received for #${hashtag.tag}`);
                
                return {
                    ...hashtag,
                    context: aiAnalysis.context,
                    usage: aiAnalysis.usage,
                    description: aiAnalysis.description
                };
            } catch (error) {
                console.log(`🚨 REAL AI ANALYSIS FAILED for #${hashtag.tag}: ${error.message}`);
                console.log(`❌ AI context failed for YouTube #${hashtag.tag}: ${error.message}`);
                
                throw new Error(`Real AI analysis failed for hashtag: ${hashtag.tag}`);
            }
        });

        try {
            const results = await Promise.allSettled(hashtagPromises);
            return results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
        } catch (error) {
            console.error('Error analyzing YouTube hashtags:', error);
            return [];
        }
    }

    async analyzeNewsHashtags(hashtags) {
        const aiContextService = new AIContextService();
        
        const uniqueHashtags = this.consolidateHashtags(hashtags);
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} News hashtags in parallel...`);

        const hashtagPromises = uniqueHashtags.map(async (hashtag) => {
            console.log(`🤖 Analyzing News hashtag: #${hashtag.tag}`);
            console.log(`🔥 REAL AI CALL: Requesting analysis for hashtag #${hashtag.tag}`);
            
            try {
                const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'Indian News');
                console.log(`✅ REAL AI RESPONSE received for #${hashtag.tag}`);
                
                return {
                    ...hashtag,
                    context: aiAnalysis.context,
                    usage: aiAnalysis.usage,
                    description: aiAnalysis.description
                };
            } catch (error) {
                console.log(`🚨 REAL AI ANALYSIS FAILED for #${hashtag.tag}: ${error.message}`);
                console.log(`❌ AI context failed for News #${hashtag.tag}: ${error.message}`);
                
                throw new Error(`Real AI analysis failed for hashtag: ${hashtag.tag}`);
            }
        });

        try {
            const results = await Promise.allSettled(hashtagPromises);
            return results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
        } catch (error) {
            console.error('Error analyzing News hashtags:', error);
            return [];
        }
    }

    consolidateHashtags(hashtags) {
        const hashtagMap = new Map();
        
        for (const hashtag of hashtags) {
            const key = hashtag.tag.toLowerCase();
            if (hashtagMap.has(key)) {
                const existing = hashtagMap.get(key);
                existing.engagement += hashtag.engagement;
            } else {
                hashtagMap.set(key, { ...hashtag });
            }
        }
        
        return Array.from(hashtagMap.values())
            .sort((a, b) => b.engagement - a.engagement)
            .slice(0, 12);
    }

    extractThemes(hashtags, platform) {
        const themes = {};
        
        hashtags.forEach(hashtag => {
            const category = hashtag.category || 'General';
            if (!themes[category]) {
                themes[category] = {
                    name: category,
                    weight: 0,
                    platforms: []
                };
            }
            themes[category].weight += hashtag.engagement;
            if (!themes[category].platforms.includes(platform)) {
                themes[category].platforms.push(platform);
            }
        });
        
        return Object.values(themes)
            .map(theme => ({
                ...theme,
                weight: Math.min(theme.weight / 1000, 1)
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 5);
    }
}

// Main handler function for Vercel
module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let selectedPlatforms;
        
        if (req.method === 'POST') {
            // For POST requests, get platforms from request body
            selectedPlatforms = req.body?.platforms || ['reddit', 'hackernews'];
        } else {
            // For GET requests, get platforms from query parameters
            selectedPlatforms = req.query.platforms 
                ? req.query.platforms.split(',') 
                : ['reddit', 'hackernews'];
        }

        const api = new RealSocialMediaAPI();
        const trends = await api.getTrendsForPlatforms(selectedPlatforms);

        res.status(200).json({
            success: true,
            trends: trends,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to analyze trends',
            message: error.message 
        });
    }
}
