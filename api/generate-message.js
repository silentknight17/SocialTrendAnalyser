const axios = require('axios');

// Message Generator Class
class MessageGenerator {
    constructor() {
        this.platformSpecs = {
            'Twitter': { maxLength: 280, tone: 'concise', features: 'hashtag-heavy, trending' },
            'Instagram': { maxLength: 2200, tone: 'visual', features: 'storytelling, emotive' },
            'LinkedIn': { maxLength: 3000, tone: 'professional', features: 'thought-leadership, business' },
            'Facebook': { maxLength: 1000, tone: 'community', features: 'discussion-starting, relatable' }
        };
    }

    async generateWithCursorAI(businessName, businessType, tone, selectedTrends, platforms = ['Twitter', 'Instagram', 'LinkedIn', 'Facebook']) {
        console.log(`🚀 REAL-TIME AI: Generating messages for ${businessName}`);
        console.log(`📈 Using live trends: ${selectedTrends.hashtags?.length || 0} hashtags, ${selectedTrends.themes?.length || 0} themes`);
        
        const results = [];
        
        console.log(`🤖 REAL AI: Generating messages for ${businessName}...`);
        console.log(`📊 Business: ${this.classifyBusiness(businessType)}, Tone: ${tone}`);
        
        const hashtagTexts = (selectedTrends.hashtags || []).map(h => h.tag);
        const themeNames = (selectedTrends.themes || []).map(t => t.name);
        
        console.log(`🔥 Processing ${platforms.length} platforms with ${themeNames.length} themes`);
        
        for (const platform of platforms) {
            try {
                console.log(`🎯 Generating AI content for ${platform} (${themeNames[0] || 'general'})`);
                const message = await this.callGroqForTextGeneration(businessName, businessType, tone, platform, hashtagTexts, themeNames);
                
                results.push({
                    platform: platform,
                    content: message,
                    hashtags: hashtagTexts.slice(0, 3),
                    engagement_potential: this.calculateEngagementPotential(message, platform, selectedTrends),
                    theme: themeNames[0] || 'general'
                });
                
                console.log(`✅ ${platform}: "${message.substring(0, 50)}..."`);
            } catch (error) {
                console.error(`❌ Failed to generate content for ${platform}:`, error.message);
                throw error;
            }
        }
        
        console.log(`🚀 Generated ${results.length} AI-powered messages!`);
        return results;
    }

    async callGroqForTextGeneration(businessName, businessType, tone, platform, hashtags, themes) {
        console.log(`🔮 Calling Cursor AI for ${platform}...`);
        console.log(`🔮 Using Cursor AI for ${tone} content generation...`);
        console.log(`🚀 REAL AI TEXT GENERATION: Using Groq API for ${tone} content...`);
        
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        
        if (!GROQ_API_KEY) {
            console.log(`🔍 CHECKING GROQ API SETUP...`);
            console.log(`❌ Groq API Key not found: GROQ_API_KEY`);
            throw new Error('GROQ_API_KEY is required for AI text generation');
        }
        
        console.log(`🔍 CHECKING GROQ API SETUP...`);
        console.log(`✅ Groq API Key found: ${GROQ_API_KEY.substring(0, 10)}...`);
        
        const spec = this.platformSpecs[platform];
        const businessCategory = this.classifyBusiness(businessType);
        
        const isCreative = ['quirky', 'humorous', 'creative'].includes(tone);
        const model = isCreative ? 'llama3-70b-8192' : 'llama3-8b-8192';
        const temperature = tone === 'professional' ? 0.3 : 0.8;
        
        console.log(`🎯 Using model: ${model} for ${tone} tone`);
        
        const systemMessage = `You are an expert social media content creator specializing in ${tone} content. Generate engaging, original social media posts that are platform-specific and include trending hashtags naturally. Be creative and authentic.`;
        
        const mainTheme = themes.length > 0 ? themes[0] : 'trending topics';
        const hashtagList = hashtags.slice(0, 3).join(', ');
        
        const prompt = `Create a ${tone} social media post for ${platform} about ${businessName}, a ${businessCategory} business.

Context:
- Business: ${businessName} (${businessCategory})
- Theme: ${mainTheme} 
- Tone: ${this.getToneDescription(tone)}
- Platform: ${platform} (${this.getPlatformDescription(platform)})
- Trending topics: ${hashtagList}

Requirements:
- ${spec.features}
- Include relevant hashtags from: ${hashtagList}
- Match the ${tone} tone exactly
- Connect ${businessName} to the ${mainTheme} theme naturally
- Maximum length: ${spec.maxLength} characters

Generate only the social media post content:`;
        
        console.log(`📋 Prompt being sent: "${prompt.substring(0, 100)}..."`);
        
        try {
            console.log(`📤 Making REAL API call to Groq...`);
            
            const requestPayload = {
                model: model,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: prompt }
                ],
                max_tokens: Math.min(spec.maxLength * 2, 400),
                temperature: temperature,
                top_p: 0.9,
                frequency_penalty: 0.2,
                presence_penalty: 0.1
            };
            
            console.log(`📋 Request payload: ${JSON.stringify(requestPayload, null, 2)}`);
            
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', requestPayload, {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            console.log(`📦 Raw Groq response: ${JSON.stringify(response.data, null, 2)}`);
            
            const rawText = response.data.choices[0]?.message?.content;
            if (!rawText) {
                throw new Error('No content received from Groq API');
            }
            
            console.log(`🎉 RAW GROQ GENERATED TEXT: "${rawText}"`);
            
            const cleanedText = this.cleanAITextResponse(rawText, spec);
            
            console.log(`✨ CLEANED FINAL TEXT: "${cleanedText}"`);
            console.log(`✅ REAL GROQ AI RESPONSE: "${cleanedText.substring(0, 50)}..."`);
            
            const parsedResponse = `Business="${businessName}", Theme="${mainTheme}", Platform="${platform}", Hashtags=[${hashtagList.split(', ').join(', ')}]`;
            console.log(`📊 Parsed: ${parsedResponse}`);
            console.log(`✅ Cursor AI generated: "${cleanedText.substring(0, 50)}..."`);
            
            return cleanedText;
            
        } catch (error) {
            console.error(`❌ Groq API error:`, error.response?.data || error.message);
            throw new Error(`Failed to generate AI content: ${error.message}`);
        }
    }

    cleanAITextResponse(text, spec) {
        let cleaned = text.trim();
        
        cleaned = cleaned.replace(/^["']|["']$/g, '');
        cleaned = cleaned.replace(/\n\s*\n/g, '\n');
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        if (cleaned.length > spec.maxLength) {
            const truncated = cleaned.substring(0, spec.maxLength - 3);
            const lastSpace = truncated.lastIndexOf(' ');
            cleaned = truncated.substring(0, lastSpace > 0 ? lastSpace : truncated.length) + '...';
        }
        
        return cleaned;
    }

    getToneDescription(tone) {
        const toneMap = {
            'professional': 'polished, authoritative, business-appropriate',
            'quirky': 'creative, unexpected, attention-grabbing',
            'humorous': 'funny, entertaining, meme-inspired',
            'inspirational': 'motivational, uplifting, empowering',
            'casual': 'relatable, conversational, friendly'
        };
        return toneMap[tone] || tone;
    }

    getPlatformDescription(platform) {
        const platformMap = {
            'Twitter': 'concise, trending hashtags, viral potential',
            'Instagram': 'visual-friendly, storytelling, lifestyle-focused',
            'LinkedIn': 'professional, thought-leadership, business-focused',
            'Facebook': 'community-focused, conversational, shareable'
        };
        return platformMap[platform] || 'social media platform';
    }

    classifyBusiness(businessType) {
        if (!businessType) return 'other';
        
        const type = businessType.toLowerCase();
        if (type.includes('dating') || type.includes('matrimony') || type.includes('relationship')) {
            return 'dating-matrimony';
        }
        if (type.includes('tech') || type.includes('software') || type.includes('app')) {
            return 'technology';
        }
        if (type.includes('food') || type.includes('restaurant') || type.includes('cafe')) {
            return 'food-beverage';
        }
        if (type.includes('fashion') || type.includes('clothing') || type.includes('style')) {
            return 'fashion-lifestyle';
        }
        if (type.includes('health') || type.includes('fitness') || type.includes('wellness')) {
            return 'health-wellness';
        }
        if (type.includes('education') || type.includes('learning') || type.includes('course')) {
            return 'education';
        }
        if (type.includes('finance') || type.includes('banking') || type.includes('investment')) {
            return 'finance';
        }
        return 'other';
    }

    calculateEngagementPotential(message, platform, selectedTrends) {
        let score = 70;
        
        const hashtagCount = (message.match(/#\w+/g) || []).length;
        score += Math.min(hashtagCount * 5, 15);
        
        if (message.includes('?')) score += 5;
        if (message.match(/[!]{1,2}/)) score += 5;
        if (message.match(/💰|🚀|🎉|✨|🔥|💡/)) score += 8;
        
        const trendingTerms = selectedTrends.hashtags?.map(h => h.tag.toLowerCase()) || [];
        const messageLower = message.toLowerCase();
        const mentionedTerms = trendingTerms.filter(term => messageLower.includes(term));
        score += mentionedTerms.length * 3;
        
        const platformBonus = {
            'Twitter': message.length <= 240 ? 5 : -5,
            'Instagram': message.length > 100 ? 5 : 0,
            'LinkedIn': message.length > 200 ? 5 : 0,
            'Facebook': message.includes('?') ? 8 : 0
        };
        score += platformBonus[platform] || 0;
        
        return Math.min(Math.max(score, 40), 98);
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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { businessName, businessType, tone, selectedTrends } = req.body;

        if (!businessName || !tone || !selectedTrends) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['businessName', 'tone', 'selectedTrends']
            });
        }

        const generator = new MessageGenerator();
        const messages = await generator.generateWithCursorAI(
            businessName, 
            businessType || 'other', 
            tone, 
            selectedTrends
        );

        res.status(200).json({
            success: true,
            messages: messages,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('API Error:', error);
        
        if (error.message.includes('GROQ_API_KEY')) {
            return res.status(422).json({
                error: 'AI service configuration error',
                message: 'AI text generation service is not properly configured',
                details: error.message
            });
        }
        
        res.status(500).json({
            error: 'Failed to generate messages',
            message: error.message
        });
    }
}
