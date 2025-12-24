# 🚀 SIMPLE Deployment - No Bullshit

## What Changed:
- ✅ **SQLite database** (single file, no external services)
- ✅ **Built-in cron jobs** (background tasks run in Express server)
- ✅ **No Supabase, no Blobs, no external DB needed**
- ✅ **Just works**

## Deploy to Render (2 minutes):

### Step 1: Push to GitHub
```bash
git add -A
git commit -m "Simplify to SQLite + built-in cron"
git push
```

### Step 2: Deploy on Render
1. Go to: https://render.com
2. New + → Web Service
3. Connect GitHub repo
4. Settings:
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
   - **Plan:** Free
5. Click "Create Web Service"

**DONE!** That's it. No database setup, no external services.

## How It Works:
- **Database:** SQLite file (`data.db`) - created automatically
- **Background tasks:** Run in Express server using `node-cron`
- **Storage:** Everything in one SQLite file
- **No limits:** Works on free tier

## Environment Variables (Optional):
- `RECAPTCHA_SECRET_KEY` (if using reCAPTCHA)
- `VITE_RECAPTCHA_SITE_KEY` (if using reCAPTCHA)
- `VERIFICATION_CODE` (default: 670069)
- `DATABASE_PATH` (default: `./data.db`)

## That's It!

No Supabase, no Blobs, no external services. Just SQLite + Express + cron.

