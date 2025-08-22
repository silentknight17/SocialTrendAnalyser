# 🚀 Production Deployment Guide - Vercel

## 📋 Prerequisites

Before deploying, ensure you have:
- **Groq API Key** (for AI text generation and hashtag analysis)
- **YouTube Data API Key** (for YouTube trending data)
- **Vercel Account** (free at [vercel.com](https://vercel.com))
- **Git Repository** (GitHub, GitLab, or Bitbucket)

## 🔧 Step-by-Step Deployment

### 1. **Prepare Your Repository**

```bash
# Ensure all files are committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. **Install Vercel CLI** (Optional)

```bash
npm install -g vercel
```

### 3. **Deploy to Vercel**

#### **Method A: Via Vercel Dashboard (Recommended)**

1. **Go to [vercel.com](https://vercel.com) and sign in**
2. **Click "New Project"**
3. **Import your Git repository**
4. **Configure project settings:**
   - **Framework Preset:** Other
   - **Root Directory:** `./` (leave empty)
   - **Build Command:** `npm run build`
   - **Output Directory:** `./` (leave empty)

#### **Method B: Via CLI**

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Or preview deployment
vercel
```

### 4. **Configure Environment Variables**

In your Vercel project dashboard:

1. **Go to Settings → Environment Variables**
2. **Add these variables:**

```env
# Required API Keys
GROQ_API_KEY=your_groq_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here

# Production Configuration
NODE_ENV=production
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15
CACHE_TIMEOUT=15
NEWS_CACHE_TIMEOUT=2
ALLOWED_ORIGINS=*
```

### 5. **Verify Deployment**

After deployment, test these endpoints:

- **Main App:** `https://your-app.vercel.app/`
- **Health Check:** `https://your-app.vercel.app/api/health`
- **Trends API:** `https://your-app.vercel.app/api/analyze-trends`

## 🏗️ Project Structure for Vercel

```
social-media-trends/
├── vercel.json              # Vercel configuration
├── ai-powered-server.js     # Main server file
├── package.json             # Dependencies and scripts
├── index.html              # Frontend
├── style.css               # Styles
├── script.js               # Frontend JavaScript
├── env.example.txt         # Environment variables template
└── DEPLOYMENT_GUIDE.md     # This guide
```

## ⚙️ Configuration Files

### **vercel.json**
```json
{
  "version": 2,
  "name": "social-media-trends-ai",
  "builds": [
    {
      "src": "ai-powered-server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/ai-powered-server.js"
    }
  ],
  "functions": {
    "ai-powered-server.js": {
      "maxDuration": 30
    }
  }
}
```

## 🔒 Security Features

✅ **CORS Configuration**  
✅ **Security Headers** (X-Content-Type-Options, X-Frame-Options, etc.)  
✅ **Request Rate Limiting**  
✅ **Input Validation**  
✅ **Error Handling**  
✅ **Environment Variable Protection**  

## 🚀 Performance Optimizations

✅ **Static File Caching** (24h in production)  
✅ **API Response Caching** (15 minutes for trends, 2 minutes for news)  
✅ **Gzip Compression**  
✅ **Request Logging**  
✅ **Serverless Function Optimization**  

## 📊 Monitoring & Debugging

### **View Logs**
```bash
vercel logs your-app-url
```

### **Monitor Performance**
- Vercel Dashboard → Your Project → Functions tab
- Analytics tab for usage metrics
- Real-time logs for debugging

## 🔄 Continuous Deployment

**Automatic deployment on Git push:**
1. Connect your repository to Vercel
2. Every push to `main` branch triggers automatic deployment
3. Pull requests create preview deployments

## 🛠️ Troubleshooting

### **Common Issues:**

#### **1. Environment Variables Not Working**
- Ensure variables are set in Vercel dashboard
- Check variable names match exactly
- Redeploy after adding variables

#### **2. API Routes Not Working**
- Verify `vercel.json` routing configuration
- Check function timeout settings
- Review Vercel function logs

#### **3. Build Failures**
```bash
# Check build locally
npm run build
npm start
```

#### **4. CORS Issues**
- Update `ALLOWED_ORIGINS` environment variable
- Check CORS configuration in `ai-powered-server.js`

### **5. Rate Limiting Issues**
- Adjust `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW`
- Monitor API usage in Vercel dashboard

## 📱 Custom Domain (Optional)

1. **Go to Project Settings → Domains**
2. **Add your custom domain**
3. **Configure DNS settings as instructed**

## 🎯 Post-Deployment Checklist

- [ ] **Environment variables configured**
- [ ] **API endpoints working**
- [ ] **Frontend loading correctly**
- [ ] **AI text generation working**
- [ ] **Hashtag context analysis working**
- [ ] **Trending data fetching working**
- [ ] **Error handling working**
- [ ] **Performance monitoring setup**

## 🔥 Production URLs

After deployment, your app will be available at:
- **Production:** `https://your-app-name.vercel.app`
- **API Base:** `https://your-app-name.vercel.app/api`

## 🆘 Support

For issues:
1. Check [Vercel Documentation](https://vercel.com/docs)
2. Review function logs in Vercel dashboard
3. Test locally with `npm start`
4. Check environment variables configuration

---

**🎉 Congratulations! Your AI-powered Social Media Trends application is now production-ready and deployed on Vercel!**
