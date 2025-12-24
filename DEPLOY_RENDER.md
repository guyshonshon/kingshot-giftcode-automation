# 🚀 Deploy to Render (Free, No Function Limits!)

## Why Render?
- ✅ **No function limits** (unlike Vercel's 12 limit)
- ✅ **750 hours/month free** (enough for 24/7)
- ✅ **Automatic deployments** from GitHub
- ✅ **Free SSL**
- ✅ **Simple setup**

## Quick Deploy (5 minutes)

### Step 1: Push to GitHub
```bash
git add -A
git commit -m "Setup Render deployment"
git push
```

### Step 2: Sign up at Render
1. Go to: https://render.com
2. Sign up with GitHub (free)

### Step 3: Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select `kingshot-giftcode-automation`

### Step 4: Configure
- **Name:** `kingshot-giftcode-automation` (or any name)
- **Environment:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Plan:** Free

### Step 5: Add Environment Variables
Click **"Environment"** tab and add:
- `RECAPTCHA_SECRET_KEY` (optional)
- `VITE_RECAPTCHA_SITE_KEY` (optional)
- `VERIFICATION_CODE` (default: 670069)
- `NODE_ENV` = `production`

### Step 6: Deploy!
Click **"Create Web Service"**

**Done!** Your site will be live at: `your-app.onrender.com`

## Automatic Deployments
- Every push to `main` branch = auto-deploy
- Preview deployments for PRs

## That's It! 🎉

No function limits, free tier, and it just works!

---

## Local Testing

Test locally before deploying:
```bash
npm install
npm run build
npm start
```

Visit: http://localhost:3000

