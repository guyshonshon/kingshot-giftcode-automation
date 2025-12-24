# 🚀 Quick Deploy to Vercel

## 3 Simple Steps:

### 1. Install & Login
```bash
npm install -g vercel
vercel login
```

### 2. Deploy
```bash
vercel
```
Just press Enter for all prompts (first time).

### 3. Set Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these (if you need them):
- `RECAPTCHA_SECRET_KEY` (optional)
- `VITE_RECAPTCHA_SITE_KEY` (optional)
- `VERIFICATION_CODE` (default: 670069)

Then redeploy:
```bash
vercel --prod
```

## ✅ Done!

Your site is live at: `your-project.vercel.app`

**That's it!** Everything is already configured. Just run the commands above.

---

## What I've Done:

✅ Created `/api` folder with all functions (Vercel format)  
✅ Added platform detection (auto-uses `/api` on Vercel)  
✅ Created Vercel wrapper for function compatibility  
✅ Configured `vercel.json`  
✅ Updated all components to use platform-agnostic config  

**Everything is ready to deploy!**

