const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Mock Social Media Data - Simulating real-time trends
class MockSocialMediaAPI {
    constructor() {
        this.generateMockData();
        // Update mock data every 30 minutes to simulate real-time trends
        setInterval(() => this.generateMockData(), 30 * 60 * 1000);
    }

    generateMockData() {
        this.trendingData = {
            twitter: this.generatePlatformTrends('twitter'),
            threads: this.generatePlatformTrends('threads'),
            instagram: this.generatePlatformTrends('instagram'),
            youtube: this.generatePlatformTrends('youtube')
        };
    }

    generatePlatformTrends(platform) {
        const currentEvents = [
            'AI', 'Technology', 'Sustainability', 'HealthTech', 'Remote Work',
            'Crypto', 'NFT', 'Metaverse', 'ClimateChange', 'Innovation',
            'StartupLife', 'DigitalHealth', 'EdTech', 'FinTech', 'Gaming',
            'SocialMedia', 'Productivity', 'Mindfulness', 'Fitness', 'Travel'
        ];

        const trendingHashtags = [];
        const themes = [];
        
        // Generate 10-15 trending hashtags per platform
        const hashtagCount = 10 + Math.floor(Math.random() * 6);
        for (let i = 0; i < hashtagCount; i++) {
            const baseEngagement = this.getPlatformBaseEngagement(platform);
            trendingHashtags.push({
                tag: currentEvents[i % currentEvents.length] + (i > currentEvents.length - 1 ? Math.floor(i/currentEvents.length) : ''),
                engagement: baseEngagement + Math.floor(Math.random() * baseEngagement),
                growthRate: 50 + Math.floor(Math.random() * 200), // 50-250% growth
                platform: platform,
                category: this.getCategoryForTag(currentEvents[i % currentEvents.length])
            });
        }

        // Generate themes based on hashtags
        const themeCategories = ['Technology', 'Lifestyle', 'Business', 'Entertainment', 'Health', 'Education'];
        themeCategories.forEach(category => {
            themes.push({
                name: category,
                popularity: 60 + Math.floor(Math.random() * 40), // 60-100%
                relatedHashtags: trendingHashtags.filter(h => h.category === category).slice(0, 3),
                growthTrend: Math.random() > 0.3 ? 'rising' : 'stable'
            });
        });

        return {
            hashtags: trendingHashtags.sort((a, b) => b.engagement - a.engagement),
            themes: themes.sort((a, b) => b.popularity - a.popularity),
            totalEngagement: trendingHashtags.reduce((sum, h) => sum + h.engagement, 0),
            timestamp: new Date().toISOString()
        };
    }

    getPlatformBaseEngagement(platform) {
        const bases = {
            twitter: 50000,
            threads: 25000,
            instagram: 75000,
            youtube: 100000
        };
        return bases[platform] || 30000;
    }

    getCategoryForTag(tag) {
        const categories = {
            'AI': 'Technology', 'Technology': 'Technology', 'Crypto': 'Technology',
            'HealthTech': 'Health', 'DigitalHealth': 'Health', 'Fitness': 'Health',
            'StartupLife': 'Business', 'FinTech': 'Business', 'Remote Work': 'Business',
            'Travel': 'Lifestyle', 'Mindfulness': 'Lifestyle', 'Sustainability': 'Lifestyle',
            'Gaming': 'Entertainment', 'NFT': 'Entertainment', 'Metaverse': 'Entertainment',
            'EdTech': 'Education', 'Productivity': 'Education'
        };
        return categories[tag] || 'Lifestyle';
    }

    getTrendsForPlatforms(platforms) {
        const combinedTrends = {
            hashtags: [],
            themes: [],
            totalEngagement: 0,
            averageGrowth: 0,
            viralityScore: 0,
            platformCount: platforms.length
        };

        let totalGrowth = 0;
        let hashtagCount = 0;

        platforms.forEach(platform => {
            if (this.trendingData[platform]) {
                const platformData = this.trendingData[platform];
                combinedTrends.hashtags.push(...platformData.hashtags);
                combinedTrends.totalEngagement += platformData.totalEngagement;
                
                platformData.hashtags.forEach(h => {
                    totalGrowth += h.growthRate;
                    hashtagCount++;
                });
            }
        });

        // Remove duplicates and sort by engagement
        const uniqueHashtags = [];
        const seenTags = new Set();
        
        combinedTrends.hashtags.forEach(hashtag => {
            if (!seenTags.has(hashtag.tag)) {
                seenTags.add(hashtag.tag);
                uniqueHashtags.push(hashtag);
            }
        });

        combinedTrends.hashtags = uniqueHashtags
            .sort((a, b) => b.engagement - a.engagement)
            .slice(0, 12); // Top 12 hashtags

        // Combine themes
        const themeMap = new Map();
        platforms.forEach(platform => {
            if (this.trendingData[platform]) {
                this.trendingData[platform].themes.forEach(theme => {
                    if (themeMap.has(theme.name)) {
                        const existing = themeMap.get(theme.name);
                        existing.popularity = Math.max(existing.popularity, theme.popularity);
                    } else {
                        themeMap.set(theme.name, { ...theme });
                    }
                });
            }
        });

        combinedTrends.themes = Array.from(themeMap.values())
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, 6);

        // Calculate metrics
        combinedTrends.averageGrowth = Math.round(totalGrowth / hashtagCount);
        combinedTrends.viralityScore = Math.round(
            (combinedTrends.averageGrowth / 10) + 
            (combinedTrends.totalEngagement / 100000)
        );

        return combinedTrends;
    }
}

// AI Message Generator using mock AI responses
class AIMessageGenerator {
    constructor() {
        this.messageTemplates = {
            quirky: [
                "Who says {business} can't join the {theme} party? 🎉 {message} {hashtags}",
                "Plot twist: {business} is now trending in {theme}! {message} {hashtags}",
                "Breaking news: {business} just became the main character in {theme} 📰 {message} {hashtags}",
                "{theme} called, they want {business} on their team! {message} {hashtags}"
            ],
            professional: [
                "At {business}, we recognize the importance of {theme}. {message} {hashtags}",
                "Leading the way in {theme}, {business} continues to innovate. {message} {hashtags}",
                "{business} is proud to be part of the {theme} conversation. {message} {hashtags}",
                "Excellence in {theme} starts with {business}. {message} {hashtags}"
            ],
            casual: [
                "Hey everyone! {business} is loving this whole {theme} thing 😊 {message} {hashtags}",
                "Just {business} things in the world of {theme} ✨ {message} {hashtags}",
                "Casually joining the {theme} conversation - {business} style! {message} {hashtags}",
                "{business} + {theme} = perfect match! {message} {hashtags}"
            ],
            humorous: [
                "When {theme} meets {business}, magic happens (or chaos, we're not sure yet) 😂 {message} {hashtags}",
                "{business} trying to understand {theme} be like... 🤔 {message} {hashtags}",
                "Me: I don't need {theme}. Also me: *{business} joins {theme}* 😅 {message} {hashtags}",
                "Plot armor: {business} surviving another {theme} trend! {message} {hashtags}"
            ],
            inspirational: [
                "Every great {theme} story starts with a single step. At {business}, we're taking ours. {message} {hashtags}",
                "In a world of {theme}, be the {business} that makes a difference. {message} {hashtags}",
                "Dreams don't work unless you do. {business} + {theme} = unstoppable! {message} {hashtags}",
                "The future of {theme} is bright, especially with {business} leading the way. {message} {hashtags}"
            ]
        };

        this.businessContexts = {
            'dating-matrimony': {
                keywords: ['love', 'relationships', 'connections', 'soulmate', 'partner'],
                actions: ['finding your perfect match', 'creating lasting bonds', 'bringing hearts together']
            },
            'food-beverage': {
                keywords: ['delicious', 'tasty', 'flavor', 'culinary', 'dining'],
                actions: ['satisfying your cravings', 'creating memorable meals', 'bringing people together over food']
            },
            'fashion-lifestyle': {
                keywords: ['style', 'trendy', 'fashionable', 'elegant', 'chic'],
                actions: ['expressing your unique style', 'staying ahead of trends', 'making a statement']
            },
            'technology': {
                keywords: ['innovative', 'cutting-edge', 'digital', 'smart', 'advanced'],
                actions: ['revolutionizing the industry', 'simplifying complex solutions', 'empowering users']
            },
            'healthcare': {
                keywords: ['wellness', 'health', 'care', 'healing', 'wellbeing'],
                actions: ['improving lives', 'providing quality care', 'promoting wellness']
            }
        };
    }

    generateMessages(businessName, businessType, tone, trends) {
        const messages = [];
        const platforms = ['Twitter', 'Instagram', 'LinkedIn', 'Facebook'];
        
        const topThemes = trends.themes.slice(0, 3);
        const topHashtags = trends.hashtags.slice(0, 8);
        
        platforms.forEach((platform, index) => {
            const theme = topThemes[index % topThemes.length];
            const template = this.getRandomTemplate(tone);
            const businessContext = this.businessContexts[businessType] || this.businessContexts['other'] || {
                keywords: ['innovative', 'quality', 'customer-focused'],
                actions: ['serving our customers', 'making a difference', 'exceeding expectations']
            };

            // Generate contextual message
            const contextMessage = this.generateContextMessage(businessName, businessType, theme, businessContext);
            
            // Select relevant hashtags
            const selectedHashtags = this.selectRelevantHashtags(topHashtags, theme, businessType).slice(0, 4);
            
            const message = template
                .replace('{business}', businessName)
                .replace('{theme}', theme.name)
                .replace('{message}', contextMessage)
                .replace('{hashtags}', selectedHashtags.map(h => `#${h.tag}`).join(' '));

            messages.push({
                platform: platform,
                content: message,
                hashtags: selectedHashtags.map(h => h.tag),
                engagement_potential: this.calculateEngagementPotential(selectedHashtags),
                theme: theme.name
            });
        });

        return messages;
    }

    generateContextMessage(businessName, businessType, theme, businessContext) {
        const messages = [
            `We're ${businessContext.actions[Math.floor(Math.random() * businessContext.actions.length)]} in the ${theme.name.toLowerCase()} space.`,
            `Join us as we explore how ${businessContext.keywords[Math.floor(Math.random() * businessContext.keywords.length)]} solutions can transform ${theme.name.toLowerCase()}.`,
            `Excited to see how ${theme.name.toLowerCase()} aligns with our mission of ${businessContext.actions[Math.floor(Math.random() * businessContext.actions.length)]}.`,
            `Our ${businessContext.keywords[Math.floor(Math.random() * businessContext.keywords.length)]} approach to ${theme.name.toLowerCase()} is just getting started!`
        ];
        
        return messages[Math.floor(Math.random() * messages.length)];
    }

    getRandomTemplate(tone) {
        const templates = this.messageTemplates[tone] || this.messageTemplates.casual;
        return templates[Math.floor(Math.random() * templates.length)];
    }

    selectRelevantHashtags(hashtags, theme, businessType) {
        // Score hashtags based on relevance to theme and business type
        return hashtags
            .map(hashtag => ({
                ...hashtag,
                relevanceScore: this.calculateRelevance(hashtag, theme, businessType)
            }))
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    calculateRelevance(hashtag, theme, businessType) {
        let score = hashtag.engagement / 10000; // Base engagement score
        
        // Theme relevance
        if (hashtag.category === theme.name) score += 50;
        
        // Business type relevance
        const businessKeywords = this.businessContexts[businessType]?.keywords || [];
        if (businessKeywords.some(keyword => hashtag.tag.toLowerCase().includes(keyword.toLowerCase()))) {
            score += 30;
        }
        
        return score;
    }

    calculateEngagementPotential(hashtags) {
        return hashtags.reduce((total, h) => total + h.engagement, 0) / hashtags.length;
    }
}

// Initialize services
const mockAPI = new MockSocialMediaAPI();
const aiGenerator = new AIMessageGenerator();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to analyze trends
app.post('/api/analyze-trends', async (req, res) => {
    try {
        const { platforms } = req.body;
        
        if (!platforms || platforms.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No platforms selected'
            });
        }

        // Simulate API delay for realistic experience
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        const trends = mockAPI.getTrendsForPlatforms(platforms);
        
        res.json({
            success: true,
            trends: trends,
            timestamp: new Date().toISOString(),
            platforms_analyzed: platforms
        });
        
    } catch (error) {
        console.error('Error analyzing trends:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// API endpoint to generate AI messages
app.post('/api/generate-message', async (req, res) => {
    try {
        const { businessName, businessType, tone, trends } = req.body;
        
        if (!businessName || !trends) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }

        // Simulate AI processing time
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1500));

        const messages = aiGenerator.generateMessages(businessName, businessType, tone, trends);
        
        res.json({
            success: true,
            messages: messages,
            business_name: businessName,
            tone_used: tone,
            generated_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error generating messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate messages'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SocialTrend AI Server running on http://localhost:${PORT}`);
    console.log(`📊 Mock data initialized with trending topics`);
    console.log(`🤖 AI message generator ready`);
});

module.exports = app;

