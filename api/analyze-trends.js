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
            return await this.callGroqAPIWithRetry(prompt, hashtag, platform);
        } catch (error) {
            console.error(`❌ REAL AI FAILED for #${hashtag}:`, error.message);
            console.log(`❌ NO FALLBACKS AVAILABLE - As requested by user`);
            throw new Error(`Real AI hashtag analysis failed for #${hashtag}: ${error.message}. No fallback mechanisms available.`);
        }
    }

    async callGroqAPIWithRetry(prompt, hashtag, platform = 'social media', maxRetries = 3) {
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
                    timeout: 15000
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
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🗂️ API Keys available: GROQ=${!!process.env.GROQ_API_KEY}, YOUTUBE=${!!process.env.YOUTUBE_API_KEY}`);
        
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
                apiPromises.push(this.fetchRedditTrends());
            }

            if (platforms.includes('hackernews')) {
                console.log('Fetching Hacker News trends...');
                apiPromises.push(this.fetchHackerNewsTrends());
            }

            if (platforms.includes('youtube')) {
                console.log('Fetching YouTube trends...');
                apiPromises.push(this.fetchYouTubeTrends());
            }

            if (platforms.includes('news')) {
                console.log('Fetching News trends...');
                apiPromises.push(this.fetchNewsTrends());
            }

            console.log(`🚀 Starting ${apiPromises.length} API calls in parallel...`);
            const results = await Promise.all(apiPromises);
            console.log(`📊 API calls completed: ${results.length} results`);

            const combinedHashtags = [];
            const combinedThemes = [];

            results.forEach((result, index) => {
                console.log(`📝 Processing result ${index}:`, JSON.stringify({
                    hashtagsLength: result.hashtags?.length || 0,
                    themesLength: result.themes?.length || 0,
                    hasHashtags: !!result.hashtags,
                    hasThemes: !!result.themes,
                    resultKeys: Object.keys(result || {}),
                    firstHashtag: result.hashtags?.[0]?.tag || 'none',
                    resultType: typeof result
                }, null, 2));
                
                if (result.hashtags && Array.isArray(result.hashtags)) {
                    console.log(`➕ Adding ${result.hashtags.length} hashtags from result ${index}`);
                    combinedHashtags.push(...result.hashtags);
                } else {
                    console.log(`⚠️ Result ${index} has no valid hashtags:`, typeof result.hashtags);
                }
                
                if (result.themes && Array.isArray(result.themes)) {
                    console.log(`➕ Adding ${result.themes.length} themes from result ${index}`);
                    combinedThemes.push(...result.themes);
                } else {
                    console.log(`⚠️ Result ${index} has no valid themes:`, typeof result.themes);
                }
            });

            console.log(`📊 Final results: ${combinedHashtags.length} hashtags, ${combinedThemes.length} themes`);

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

            console.log(`✅ Trends analysis complete: ${trends.hashtags.length} hashtags, ${trends.totalEngagement} engagement`);
            return trends;
        } catch (error) {
            console.error('💥 Critical error fetching trends:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    async fetchRedditTrends() {
        const subreddits = ['all', 'popular', 'AskReddit', 'worldnews', 'technology'];
        const hashtags = [];

        for (const subreddit of subreddits.slice(0, 1)) {
            try {
                // Try multiple endpoints to avoid Reddit blocking
                const endpoints = [
                    `https://www.reddit.com/r/${subreddit}/hot.json?limit=5`,
                    `https://old.reddit.com/r/${subreddit}/hot.json?limit=5`,
                    `https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=5`
                ];
                
                let response = null;
                for (const endpoint of endpoints) {
                    try {
                        console.log(`Trying Reddit endpoint: ${endpoint}`);
                        response = await axios.get(endpoint, {
                            headers: { 
                                'User-Agent': 'SocialTrendBot:1.0 (by /u/TrendAnalyzer)',
                                'Accept': 'application/json',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'Accept-Encoding': 'gzip, deflate',
                                'Connection': 'keep-alive'
                            },
                            timeout: 10000
                        });
                        console.log(`✅ Reddit endpoint success: ${endpoint}`);
                        break;
                    } catch (endpointError) {
                        console.log(`❌ Reddit endpoint failed: ${endpoint} - ${endpointError.message}`);
                        continue;
                    }
                }
                
                if (!response) {
                    console.warn(`All Reddit endpoints failed for ${subreddit}`);
                    continue;
                }

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

        console.log(`🔍 Raw Reddit hashtags collected: ${hashtags.length}`);
        console.log(`📝 Sample hashtags:`, hashtags.slice(0, 3).map(h => ({ tag: h.tag, engagement: h.engagement })));
        
        // Limit hashtags for Vercel timeout and Groq rate limit constraints
        const limitedHashtags = hashtags.slice(0, 3);
        console.log(`🤖 Starting AI analysis for ${limitedHashtags.length} Reddit hashtags (limited for rate limits)...`);
        const processedHashtags = await this.analyzeRedditData(limitedHashtags);
        console.log(`✅ AI analysis complete: ${processedHashtags.length} processed hashtags`);
        
        const themes = this.extractThemes(processedHashtags, 'reddit');
        console.log(`📊 Extracted ${themes.length} themes from Reddit data`);
        
        const result = {
            hashtags: processedHashtags,
            themes: themes
        };
        
        console.log(`🎯 Reddit final result:`, JSON.stringify({
            hashtagCount: result.hashtags.length,
            themeCount: result.themes.length,
            hasHashtags: Array.isArray(result.hashtags),
            hasThemes: Array.isArray(result.themes),
            firstHashtag: result.hashtags[0]?.tag || 'none'
        }, null, 2));
        
        return result;
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
        console.log(`🔍 Starting analyzeRedditData with ${hashtags.length} input hashtags`);
        
        const uniqueHashtags = this.consolidateHashtags(hashtags);
        console.log(`🎯 After consolidation: ${uniqueHashtags.length} unique hashtags`);
        console.log(`📝 Sample unique hashtags:`, uniqueHashtags.slice(0, 3).map(h => ({ tag: h.tag, engagement: h.engagement })));

        if (!process.env.GROQ_API_KEY) {
            console.error('❌ GROQ_API_KEY environment variable is missing!');
            throw new Error('GROQ_API_KEY environment variable is required for AI analysis');
        }
        console.log('✅ GROQ_API_KEY is available');

        const aiContextService = new AIContextService();
        console.log(`🤖 Starting AI analysis for ${uniqueHashtags.length} hashtags...`);
        
        const hashtagPromises = uniqueHashtags.map(async (hashtag, index) => {
            console.log(`🤖 [${index + 1}/${uniqueHashtags.length}] Analyzing Reddit hashtag: #${hashtag.tag}`);
            
            try {
                const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'Reddit');
                console.log(`✅ [${index + 1}/${uniqueHashtags.length}] AI context received for #${hashtag.tag}`);
                
                return {
                    ...hashtag,
                    context: aiAnalysis.context,
                    usage: aiAnalysis.usage,
                    description: aiAnalysis.description
                };
            } catch (error) {
                console.error(`❌ [${index + 1}/${uniqueHashtags.length}] AI analysis failed for #${hashtag.tag}:`, error.message);
                throw error; // Re-throw to fail fast as requested
            }
        });

        console.log(`⏳ Processing ${hashtagPromises.length} hashtags SEQUENTIALLY to avoid rate limits...`);
        const results = [];
        
        for (let i = 0; i < hashtagPromises.length; i++) {
            console.log(`🔄 Processing hashtag ${i + 1}/${hashtagPromises.length}...`);
            try {
                const result = await hashtagPromises[i];
                results.push(result);
                console.log(`✅ Hashtag ${i + 1} processed successfully`);
                
                // Add delay between API calls to avoid rate limits
                if (i < hashtagPromises.length - 1) {
                    console.log(`⏰ Waiting 2 seconds before next API call...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error(`❌ Hashtag ${i + 1} failed:`, error.message);
                throw error; // Still fail fast as requested
            }
        }
        
        console.log(`✅ Sequential AI analysis complete: ${results.length} Reddit hashtags processed successfully`);
        console.log(`📊 Sample processed hashtag:`, {
            tag: results[0]?.tag,
            engagement: results[0]?.engagement,
            hasContext: !!results[0]?.context,
            hasUsage: !!results[0]?.usage,
            hasDescription: !!results[0]?.description
        });
        
        return results;
    }

    async analyzeHackerNewsData(hashtags) {
        const uniqueHashtags = this.consolidateHashtags(hashtags).slice(0, 3); // Limit for rate limits
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} Hacker News hashtags (rate limit safe)...`);

        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY environment variable is required for AI analysis');
        }

        const aiContextService = new AIContextService();
        const results = [];
        
        for (let i = 0; i < uniqueHashtags.length; i++) {
            const hashtag = uniqueHashtags[i];
            console.log(`🤖 [${i + 1}/${uniqueHashtags.length}] Analyzing Hacker News hashtag: #${hashtag.tag}`);
            
            const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'Hacker News');
            console.log(`✅ [${i + 1}/${uniqueHashtags.length}] AI context received for #${hashtag.tag}`);
            
            results.push({
                ...hashtag,
                context: aiAnalysis.context,
                usage: aiAnalysis.usage,
                description: aiAnalysis.description
            });
            
            // Add delay between API calls
            if (i < uniqueHashtags.length - 1) {
                console.log(`⏰ Waiting 2 seconds before next API call...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log(`✅ Processed ${results.length} Hacker News hashtags with AI analysis`);
        return results;
    }

    async analyzeYouTubeData(hashtags) {
        const uniqueHashtags = this.consolidateHashtags(hashtags).slice(0, 3); // Limit for rate limits
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} YouTube hashtags (rate limit safe)...`);

        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY environment variable is required for AI analysis');
        }

        const aiContextService = new AIContextService();
        const results = [];
        
        for (let i = 0; i < uniqueHashtags.length; i++) {
            const hashtag = uniqueHashtags[i];
            console.log(`🤖 [${i + 1}/${uniqueHashtags.length}] Analyzing YouTube hashtag: #${hashtag.tag}`);
            
            const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'YouTube');
            console.log(`✅ [${i + 1}/${uniqueHashtags.length}] AI context received for #${hashtag.tag}`);
            
            results.push({
                ...hashtag,
                context: aiAnalysis.context,
                usage: aiAnalysis.usage,
                description: aiAnalysis.description
            });
            
            // Add delay between API calls
            if (i < uniqueHashtags.length - 1) {
                console.log(`⏰ Waiting 2 seconds before next API call...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log(`✅ Processed ${results.length} YouTube hashtags with AI analysis`);
        return results;
    }

    async analyzeNewsHashtags(hashtags) {
        const uniqueHashtags = this.consolidateHashtags(hashtags).slice(0, 3); // Limit for rate limits
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} News hashtags (rate limit safe)...`);

        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY environment variable is required for AI analysis');
        }

        const aiContextService = new AIContextService();
        const results = [];
        
        for (let i = 0; i < uniqueHashtags.length; i++) {
            const hashtag = uniqueHashtags[i];
            console.log(`🤖 [${i + 1}/${uniqueHashtags.length}] Analyzing News hashtag: #${hashtag.tag}`);
            
            const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'Indian News');
            console.log(`✅ [${i + 1}/${uniqueHashtags.length}] AI context received for #${hashtag.tag}`);
            
            results.push({
                ...hashtag,
                context: aiAnalysis.context,
                usage: aiAnalysis.usage,
                description: aiAnalysis.description
            });
            
            // Add delay between API calls
            if (i < uniqueHashtags.length - 1) {
                console.log(`⏰ Waiting 2 seconds before next API call...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log(`✅ Processed ${results.length} News hashtags with AI analysis`);
        return results;
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

        console.log(`🎯 API Handler: Analyzing trends for platforms: ${JSON.stringify(selectedPlatforms)}`);
        
        const api = new RealSocialMediaAPI();
        const trends = await api.getTrendsForPlatforms(selectedPlatforms);
        
        console.log(`🔍 API Handler: Trends analysis complete`);
        console.log(`📊 API Handler Final Response:`, JSON.stringify({
            success: true,
            hashtagCount: trends.hashtags?.length || 0,
            themeCount: trends.themes?.length || 0,
            totalEngagement: trends.totalEngagement,
            platformCount: trends.platformCount,
            hasHashtags: Array.isArray(trends.hashtags),
            hasThemes: Array.isArray(trends.themes),
            firstHashtag: trends.hashtags?.[0]?.tag || 'none',
            firstTheme: trends.themes?.[0] || 'none'
        }, null, 2));

        const response = {
            success: true,
            trends: trends,
            timestamp: new Date().toISOString()
        };
        
        console.log(`📤 API Handler: Sending response with ${response.trends.hashtags?.length || 0} hashtags`);
        res.status(200).json(response);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to analyze trends',
            message: error.message 
        });
    }
}
