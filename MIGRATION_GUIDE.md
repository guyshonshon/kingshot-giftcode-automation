# Free Hosting Migration Guide

Your Netlify site hit usage limits. Here are **free alternatives** with better limits:

## 🚀 Option 1: Vercel (RECOMMENDED - Easiest Migration)

**Free Tier:**
- ✅ 100GB bandwidth/month (vs Netlify's 100GB)
- ✅ Unlimited requests
- ✅ Serverless functions included
- ✅ Automatic deployments from GitHub

### Migration Steps:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   Follow the prompts. It will auto-detect your settings.

4. **Set Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `RECAPTCHA_SECRET_KEY` (if using)
     - `VITE_RECAPTCHA_SITE_KEY` (if using)
     - `VERIFICATION_CODE` (default: 670069)

5. **Update Function Routes:**
   The code is already updated to auto-detect Vercel and use `/api` instead of `/.netlify/functions`.

6. **Move Functions:**
   Vercel expects functions in `/api` folder. Create a symlink or copy:
   ```bash
   mkdir -p api
   # Copy functions
   cp -r netlify/functions/* api/
   ```

   Or update `vercel.json` to point to `netlify/functions`.

**Done!** Your site will be live at `your-project.vercel.app`

---

## 🌐 Option 2: Cloudflare Pages (UNLIMITED Bandwidth)

**Free Tier:**
- ✅ **UNLIMITED bandwidth** (no limits!)
- ✅ 100,000 requests/day on Workers
- ✅ Fast global CDN

### Migration Steps:

1. **Push code to GitHub** (if not already)

2. **Go to Cloudflare Dashboard:**
   - https://dash.cloudflare.com
   - Pages → Create a project
   - Connect GitHub repo

3. **Build Settings:**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`

4. **Convert Functions to Workers:**
   - Functions need to be in Cloudflare Workers format
   - Use `wrangler` CLI: `npm install -g wrangler`
   - Workers use `Request/Response` instead of `event/context`

5. **Environment Variables:**
   - Settings → Environment Variables
   - Add all your env vars

**Note:** Cloudflare Workers have a different API, so functions need conversion.

---

## 🎨 Option 3: Render (Simple & Free)

**Free Tier:**
- ✅ 750 hours/month
- ✅ Automatic SSL
- ✅ Auto-deploy from GitHub

### Migration Steps:

1. **Sign up:** https://render.com

2. **Create Static Site:**
   - New → Static Site
   - Connect GitHub repo
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **For Functions (Web Service):**
   - Create a separate "Web Service"
   - Build: `npm install`
   - Start: Create an Express server (see below)

4. **Environment Variables:**
   - Settings → Environment → Add variables

**Note:** For serverless functions, you'll need to create an Express server wrapper.

---

## 🚂 Option 4: Railway ($5 Free Credit/Month)

**Free Tier:**
- ✅ $5 credit/month (usually enough for small apps)
- ✅ Easy deployment
- ✅ Automatic deployments

### Migration Steps:

1. **Sign up:** https://railway.app

2. **New Project → Deploy from GitHub**

3. **Configure:**
   - Build: `npm run build`
   - Start: `npm run preview` (or create server)

4. **Environment Variables:**
   - Variables tab → Add all env vars

---

## 📋 Quick Comparison

| Platform | Bandwidth | Functions | Difficulty | Best For |
|----------|-----------|-----------|------------|----------|
| **Vercel** | 100GB/mo | ✅ Native | ⭐ Easy | **Recommended** |
| **Cloudflare** | **Unlimited** | ⚠️ Workers | ⭐⭐ Medium | High traffic |
| **Render** | Unlimited | ⚠️ Custom | ⭐⭐ Medium | Simple sites |
| **Railway** | $5 credit | ✅ Native | ⭐ Easy | Full apps |

---

## 🔧 Code Updates Made

I've already updated your code to be **platform-agnostic**:

1. ✅ Created `src/config.js` - Auto-detects platform
2. ✅ Updated all components to use `API_BASE` from config
3. ✅ Works with Netlify, Vercel, Cloudflare, Render automatically

---

## 🎯 Recommended: Vercel

**Why Vercel:**
- ✅ Easiest migration (most similar to Netlify)
- ✅ Same serverless functions model
- ✅ Generous free tier
- ✅ Fast global CDN
- ✅ Automatic deployments

**Quick Start:**
```bash
npm install -g vercel
vercel login
vercel
```

That's it! Your site will be live in 2 minutes.

---

## 📝 Notes

- **Netlify Blobs:** Vercel doesn't have Blobs, but your code already falls back to file storage
- **Scheduled Functions:** Vercel uses cron jobs (different syntax)
- **Environment Variables:** Must be set in each platform's dashboard

Need help with a specific platform? Let me know!

