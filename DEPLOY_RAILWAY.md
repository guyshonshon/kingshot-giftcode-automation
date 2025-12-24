# 🚀 Deploy to Railway (Simple, No Sleep, Free $5 Credit)

## Why Railway?
- ✅ **Doesn't sleep** (unlike Render free tier)
- ✅ **$5 free credit/month** (usually enough)
- ✅ **Simple deployment**
- ✅ **Background tasks work!**

## Quick Deploy:

### Step 1: Sign up
1. Go to: https://railway.app
2. Sign up with GitHub (free)

### Step 2: Deploy
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `kingshot-giftcode-automation`
4. Railway auto-detects Node.js and deploys!

### Step 3: Add Environment Variables (Optional)
- `RECAPTCHA_SECRET_KEY` (if using)
- `VITE_RECAPTCHA_SITE_KEY` (if using)
- `VERIFICATION_CODE` (default: 670069)

### Step 4: Setup Background Tasks
Railway doesn't have built-in cron, but you can:

**Option A: Use external cron service (FREE)**
1. Go to: https://cron-job.org (free)
2. Create job that calls: `https://your-app.railway.app/.netlify/functions/check-expired-codes`
3. Set to run every hour
4. Done!

**Option B: Use Railway Cron (if available)**
- Check Railway dashboard for cron options

## That's It!

Your app runs 24/7, background tasks work via external cron.

---

## Alternative: Fly.io (Also doesn't sleep, free tier)

1. Install: `npm install -g @fly/cli`
2. Login: `fly auth login`
3. Launch: `fly launch`
4. Deploy: `fly deploy`

Fly.io free tier doesn't sleep either!

