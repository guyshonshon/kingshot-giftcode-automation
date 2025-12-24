# Migration Guide: Netlify to Vercel

## Quick Migration Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

### 4. Set Environment Variables
In Vercel Dashboard:
- Go to your project → Settings → Environment Variables
- Add all variables from Netlify:
  - `RECAPTCHA_SECRET_KEY` (if using)
  - `VITE_RECAPTCHA_SITE_KEY` (if using)
  - `VERIFICATION_CODE` (default: 670069)

### 5. Update Function Paths (if needed)
Vercel uses `/api/*` instead of `/.netlify/functions/*`

Update in `src/App.jsx`:
```javascript
const API_BASE = process.env.NODE_ENV === 'production' 
  ? '/api'  // Vercel
  : '/.netlify/functions'  // Local dev
```

## Alternative: Cloudflare Pages (Unlimited Bandwidth)

### Setup Cloudflare Pages:
1. Push code to GitHub
2. Go to Cloudflare Dashboard → Pages
3. Connect GitHub repo
4. Build command: `npm run build`
5. Build output: `dist`

### Convert Functions to Cloudflare Workers:
- Functions need to be converted to Workers format
- Use `wrangler` CLI: `npm install -g wrangler`
- Workers use different API (Request/Response instead of event/context)

## Alternative: Render (Free Tier)

1. Sign up at render.com
2. Create new "Static Site"
3. Connect GitHub repo
4. Build command: `npm run build`
5. Publish directory: `dist`

For functions, use "Web Service" instead:
- Build: `npm install`
- Start: `node server.js` (need to create Express server)

## Recommended: Vercel
- Easiest migration (most similar to Netlify)
- Generous free tier (100GB bandwidth/month)
- No hard limits on requests
- Same serverless functions model

