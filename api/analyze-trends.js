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
                apiPromises.push(
                    this.fetchRedditTrends()
                        .then(result => {
                            console.log(`✅ Reddit API success: ${result.hashtags.length} hashtags`);
                            return result;
                        })
                        .catch(error => {
                            console.error('❌ Reddit API error:', error.message);
                            return { hashtags: [], themes: [] };
                        })
                );
            }

            if (platforms.includes('hackernews')) {
                console.log('Fetching Hacker News trends...');
                apiPromises.push(
                    this.fetchHackerNewsTrends()
                        .then(result => {
                            console.log(`✅ Hacker News API success: ${result.hashtags.length} hashtags`);
                            return result;
                        })
                        .catch(error => {
                            console.error('❌ Hacker News API error:', error.message);
                            return { hashtags: [], themes: [] };
                        })
                );
            }

            if (platforms.includes('youtube')) {
                console.log('Fetching YouTube trends...');
                apiPromises.push(
                    this.fetchYouTubeTrends()
                        .then(result => {
                            console.log(`✅ YouTube API success: ${result.hashtags.length} hashtags`);
                            return result;
                        })
                        .catch(error => {
                            console.error('❌ YouTube API error:', error.message);
                            return { hashtags: [], themes: [] };
                        })
                );
            }

            if (platforms.includes('news')) {
                console.log('Fetching News trends...');
                apiPromises.push(
                    this.fetchNewsTrends()
                        .then(result => {
                            console.log(`✅ News API success: ${result.hashtags.length} hashtags`);
                            return result;
                        })
                        .catch(error => {
                            console.error('❌ News API error:', error.message);
                            return { hashtags: [], themes: [] };
                        })
                );
            }

            console.log(`🚀 Starting ${apiPromises.length} API calls in parallel...`);
            const results = await Promise.allSettled(apiPromises);
            console.log(`📊 API calls completed: ${results.length} results`);

            const validResults = results
                .map((result, index) => {
                    if (result.status === 'fulfilled') {
                        console.log(`✅ Result ${index}: ${result.value.hashtags?.length || 0} hashtags`);
                        return result.value;
                    } else {
                        console.error(`❌ Result ${index} failed:`, result.reason?.message || 'Unknown error');
                        return { hashtags: [], themes: [] };
                    }
                })
                .filter(value => value !== null);

            console.log(`🔍 Processing ${validResults.length} valid results...`);

            const combinedHashtags = [];
            const combinedThemes = [];

            validResults.forEach((result, index) => {
                console.log(`📝 Processing result ${index}: ${result.hashtags?.length || 0} hashtags, ${result.themes?.length || 0} themes`);
                if (result.hashtags) combinedHashtags.push(...result.hashtags);
                if (result.themes) combinedThemes.push(...result.themes);
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
        const uniqueHashtags = this.consolidateHashtags(hashtags);
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} Reddit hashtags...`);

        // If no GROQ API key, return basic hashtags without AI context
        if (!process.env.GROQ_API_KEY) {
            console.log(`⚠️ No GROQ API key found, returning basic hashtags without AI context`);
            return uniqueHashtags.map(hashtag => ({
                ...hashtag,
                context: `#${hashtag.tag} is currently trending on Reddit with ${hashtag.engagement} engagement points.`,
                usage: `Use #${hashtag.tag} when creating content related to current Reddit discussions and trends.`,
                description: `📊 ${hashtag.tag} Trending on Reddit`
            }));
        }

        const aiContextService = new AIContextService();
        const hashtagPromises = uniqueHashtags.map(async (hashtag) => {
            console.log(`🤖 Analyzing Reddit hashtag: #${hashtag.tag}`);
            
            try {
                const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'Reddit');
                console.log(`✅ AI context received for #${hashtag.tag}`);
                
                return {
                    ...hashtag,
                    context: aiAnalysis.context,
                    usage: aiAnalysis.usage,
                    description: aiAnalysis.description
                };
            } catch (error) {
                console.log(`❌ AI failed for #${hashtag.tag}, using fallback: ${error.message}`);
                
                // Return basic hashtag with fallback content instead of throwing
                return {
                    ...hashtag,
                    context: `#${hashtag.tag} is currently trending on Reddit with ${hashtag.engagement} engagement points.`,
                    usage: `Use #${hashtag.tag} when creating content related to current Reddit discussions and trends.`,
                    description: `📊 ${hashtag.tag} Trending on Reddit`
                };
            }
        });

        try {
            const results = await Promise.allSettled(hashtagPromises);
            const processedHashtags = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
            
            console.log(`✅ Processed ${processedHashtags.length} Reddit hashtags`);
            return processedHashtags;
        } catch (error) {
            console.error('❌ Error analyzing Reddit hashtags:', error);
            // Return basic hashtags as fallback
            return uniqueHashtags.map(hashtag => ({
                ...hashtag,
                context: `#${hashtag.tag} is currently trending on Reddit.`,
                usage: `Use #${hashtag.tag} for current Reddit trends.`,
                description: `📊 ${hashtag.tag} Trending`
            }));
        }
    }

    async analyzeHackerNewsData(hashtags) {
        const uniqueHashtags = this.consolidateHashtags(hashtags);
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} Hacker News hashtags...`);

        // If no GROQ API key, return basic hashtags without AI context
        if (!process.env.GROQ_API_KEY) {
            console.log(`⚠️ No GROQ API key found, returning basic hashtags without AI context`);
            return uniqueHashtags.map(hashtag => ({
                ...hashtag,
                context: `#${hashtag.tag} is currently trending on Hacker News with ${hashtag.engagement} engagement points.`,
                usage: `Use #${hashtag.tag} when creating tech content related to current Hacker News discussions.`,
                description: `💻 ${hashtag.tag} Trending on Hacker News`
            }));
        }

        const aiContextService = new AIContextService();
        const hashtagPromises = uniqueHashtags.map(async (hashtag) => {
            console.log(`🤖 Analyzing Hacker News hashtag: #${hashtag.tag}`);
            
            try {
                const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'Hacker News');
                console.log(`✅ AI context received for #${hashtag.tag}`);
                
                return {
                    ...hashtag,
                    context: aiAnalysis.context,
                    usage: aiAnalysis.usage,
                    description: aiAnalysis.description
                };
            } catch (error) {
                console.log(`❌ AI failed for #${hashtag.tag}, using fallback: ${error.message}`);
                
                return {
                    ...hashtag,
                    context: `#${hashtag.tag} is currently trending on Hacker News with ${hashtag.engagement} engagement points.`,
                    usage: `Use #${hashtag.tag} when creating tech content related to current Hacker News discussions.`,
                    description: `💻 ${hashtag.tag} Trending on Hacker News`
                };
            }
        });

        try {
            const results = await Promise.allSettled(hashtagPromises);
            const processedHashtags = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
            
            console.log(`✅ Processed ${processedHashtags.length} Hacker News hashtags`);
            return processedHashtags;
        } catch (error) {
            console.error('❌ Error analyzing Hacker News hashtags:', error);
            return uniqueHashtags.map(hashtag => ({
                ...hashtag,
                context: `#${hashtag.tag} is trending on Hacker News.`,
                usage: `Use #${hashtag.tag} for tech trends.`,
                description: `💻 ${hashtag.tag} Tech Trending`
            }));
        }
    }

    async analyzeYouTubeData(hashtags) {
        const uniqueHashtags = this.consolidateHashtags(hashtags);
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} YouTube hashtags...`);

        if (!process.env.GROQ_API_KEY) {
            console.log(`⚠️ No GROQ API key found, returning basic hashtags without AI context`);
            return uniqueHashtags.map(hashtag => ({
                ...hashtag,
                context: `#${hashtag.tag} is currently trending on YouTube with ${hashtag.engagement} views.`,
                usage: `Use #${hashtag.tag} when creating video content related to current YouTube trends.`,
                description: `🎬 ${hashtag.tag} Trending on YouTube`
            }));
        }

        const aiContextService = new AIContextService();
        const hashtagPromises = uniqueHashtags.map(async (hashtag) => {
            console.log(`🤖 Analyzing YouTube hashtag: #${hashtag.tag}`);
            
            try {
                const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'YouTube');
                console.log(`✅ AI context received for #${hashtag.tag}`);
                
                return {
                    ...hashtag,
                    context: aiAnalysis.context,
                    usage: aiAnalysis.usage,
                    description: aiAnalysis.description
                };
            } catch (error) {
                console.log(`❌ AI failed for #${hashtag.tag}, using fallback: ${error.message}`);
                
                return {
                    ...hashtag,
                    context: `#${hashtag.tag} is currently trending on YouTube with ${hashtag.engagement} views.`,
                    usage: `Use #${hashtag.tag} when creating video content related to current YouTube trends.`,
                    description: `🎬 ${hashtag.tag} Trending on YouTube`
                };
            }
        });

        try {
            const results = await Promise.allSettled(hashtagPromises);
            const processedHashtags = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
            
            console.log(`✅ Processed ${processedHashtags.length} YouTube hashtags`);
            return processedHashtags;
        } catch (error) {
            console.error('❌ Error analyzing YouTube hashtags:', error);
            return uniqueHashtags.map(hashtag => ({
                ...hashtag,
                context: `#${hashtag.tag} is trending on YouTube.`,
                usage: `Use #${hashtag.tag} for video content.`,
                description: `🎬 ${hashtag.tag} Video Trending`
            }));
        }
    }

    async analyzeNewsHashtags(hashtags) {
        const uniqueHashtags = this.consolidateHashtags(hashtags);
        console.log(`🚀 Generating AI context for ${uniqueHashtags.length} News hashtags...`);

        if (!process.env.GROQ_API_KEY) {
            console.log(`⚠️ No GROQ API key found, returning basic hashtags without AI context`);
            return uniqueHashtags.map(hashtag => ({
                ...hashtag,
                context: `#${hashtag.tag} is currently in the news with ${hashtag.engagement} engagement.`,
                usage: `Use #${hashtag.tag} when creating content related to current news topics.`,
                description: `📰 ${hashtag.tag} Trending in News`
            }));
        }

        const aiContextService = new AIContextService();
        const hashtagPromises = uniqueHashtags.map(async (hashtag) => {
            console.log(`🤖 Analyzing News hashtag: #${hashtag.tag}`);
            
            try {
                const aiAnalysis = await aiContextService.analyzeHashtagWithRealAI(hashtag.tag, 'Indian News');
                console.log(`✅ AI context received for #${hashtag.tag}`);
                
                return {
                    ...hashtag,
                    context: aiAnalysis.context,
                    usage: aiAnalysis.usage,
                    description: aiAnalysis.description
                };
            } catch (error) {
                console.log(`❌ AI failed for #${hashtag.tag}, using fallback: ${error.message}`);
                
                return {
                    ...hashtag,
                    context: `#${hashtag.tag} is currently in the news with ${hashtag.engagement} engagement.`,
                    usage: `Use #${hashtag.tag} when creating content related to current news topics.`,
                    description: `📰 ${hashtag.tag} Trending in News`
                };
            }
        });

        try {
            const results = await Promise.allSettled(hashtagPromises);
            const processedHashtags = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
            
            console.log(`✅ Processed ${processedHashtags.length} News hashtags`);
            return processedHashtags;
        } catch (error) {
            console.error('❌ Error analyzing News hashtags:', error);
            return uniqueHashtags.map(hashtag => ({
                ...hashtag,
                context: `#${hashtag.tag} is trending in news.`,
                usage: `Use #${hashtag.tag} for news content.`,
                description: `📰 ${hashtag.tag} News Trending`
            }));
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
