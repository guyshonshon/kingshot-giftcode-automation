# Deploy to Vercel - Quick Start

## Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

## Step 2: Login
```bash
vercel login
```
Follow the prompts to login with GitHub, GitLab, or email.

## Step 3: Deploy
```bash
vercel
```

First time? It will ask:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No (first time)
- **Project name?** → Press Enter (uses folder name)
- **Directory?** → Press Enter (uses current directory)
- **Override settings?** → No

## Step 4: Set Environment Variables

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

Add these (if you were using them on Netlify):
- `RECAPTCHA_SECRET_KEY` (optional)
- `VITE_RECAPTCHA_SITE_KEY` (optional) 
- `VERIFICATION_CODE` (default: 670069)

## Step 5: Redeploy
After adding environment variables, redeploy:
```bash
vercel --prod
```

Or trigger a new deployment from the Vercel dashboard.

## Done! 🎉

Your site will be live at: `your-project-name.vercel.app`

## Production Domain

To use a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS instructions

## Automatic Deployments

Vercel automatically deploys when you push to GitHub:
- `main` branch → Production
- Other branches → Preview deployments

Just push your code and it deploys automatically!

## Troubleshooting

**Functions not working?**
- Check that functions are in `/api` folder (already done)
- Check environment variables are set
- Check function logs in Vercel dashboard

**API calls failing?**
- The code auto-detects Vercel and uses `/api` path
- Check browser console for errors

## That's it!

Your app is now on Vercel with:
- ✅ 100GB bandwidth/month
- ✅ Unlimited requests
- ✅ Free SSL
- ✅ Global CDN
- ✅ Automatic deployments

