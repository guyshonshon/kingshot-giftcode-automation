# Deployment Guide

## Quick Deploy to Netlify

### Option 1: Deploy via Netlify UI

1. **Prepare your repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Netlify**:
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub account and select your repository
   - Build settings (auto-detected):
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Deploy site"

3. **Your site is live!** 🎉

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

## Important Notes

### Data Persistence

⚠️ **Current Implementation**: Data is stored in `/tmp` directory which is **ephemeral** in Netlify Functions. This means:
- Data persists during warm function invocations
- Data may be lost on cold starts
- Suitable for development and light usage

### For Production Use

For persistent data storage, consider:

1. **Netlify Blobs** (Recommended for Netlify):
   ```bash
   npm install @netlify/blobs
   ```

2. **FaunaDB** (Free tier available):
   ```bash
   npm install faunadb
   ```

3. **MongoDB Atlas** (Free tier available)

4. **Supabase** (Free tier available)

### Audit Logging

The application includes comprehensive audit logging using **Netlify Blobs** for persistent storage. All activities are logged with:
- IP addresses
- Timestamps
- User agents
- Detailed action information
- Success/failure status

**Logged Events:**
- Player added/removed
- Gift code redemptions (single and bulk)
- Auto-claim operations
- All code claim attempts with results

**Accessing Audit Logs:**
- Endpoint: `/.netlify/functions/get-audit-logs`
- Method: GET
- Query parameter: `limit` (default: 100)
- Returns: JSON array of audit log entries

### Environment Variables

**Required Environment Variables:**

1. **VERIFICATION_CODE** (Required)
   - A 4-digit code required for gift code redemption
   - Set in: Netlify Dashboard → Site settings → Environment variables
   - Example: `VERIFICATION_CODE=670069`
   - Defaults to `670069` for development (6-digit code)

**Optional Environment Variables:**

2. **RECAPTCHA_SECRET_KEY** (Optional - Recommended for production)
   - Get your secret key from [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
   - Set in: Netlify Dashboard → Site settings → Environment variables
   - **Note:** If not set, reCAPTCHA verification will be skipped. The 4-digit verification code and rate limiting still provide protection.

3. **VITE_RECAPTCHA_SITE_KEY** (Optional - Only needed if using reCAPTCHA)
   - Get your site key from [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
   - Add to your `.env` file for local development:
     ```
     VITE_RECAPTCHA_SITE_KEY=your_site_key_here
     ```
   - For production, set in Netlify Dashboard → Site settings → Environment variables
   - **Note:** If not set, reCAPTCHA widgets won't appear in the UI

**Setting Environment Variables:**
- Netlify Dashboard → Site settings → Environment variables
- Add each variable with its value
- Redeploy after adding environment variables

## Testing Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Test Netlify Functions locally
netlify dev
```

## Troubleshooting

### Functions not working?
- Check Netlify Functions logs in the dashboard
- Ensure functions are in `netlify/functions/` directory
- Verify `netlify.toml` configuration

### Build fails?
- Check Node version (should be 18+)
- Verify all dependencies are in `package.json`
- Check build logs in Netlify dashboard

### CORS issues?
- Functions already include CORS headers
- If issues persist, check browser console for errors

## New Features

### reCAPTCHA Protection (Optional)

reCAPTCHA protection is **optional** and only enabled if you configure the keys. The app works fine without it thanks to:
- 4-digit verification code requirement
- Built-in rate limiting (100 requests per code/hour)
- Netlify's infrastructure protection

If you want extra bot protection, you can enable reCAPTCHA for:
- **Add Player**: Optional reCAPTCHA verification
- **Remove Player**: Optional reCAPTCHA verification  
- **Redeem Gift Code**: Optional reCAPTCHA verification + required 4-digit verification code

**To enable reCAPTCHA:**
1. Get keys from [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
2. Set `RECAPTCHA_SECRET_KEY` and `VITE_RECAPTCHA_SITE_KEY` environment variables
3. Redeploy your site

**To skip reCAPTCHA:**
- Simply don't set the reCAPTCHA environment variables
- The app will work normally with just the 4-digit code protection

### 4-Digit Verification Code

Gift code redemption requires an additional 4-digit verification code in addition to the gift code itself. This provides an extra layer of security against spam and unauthorized use.

**To set your verification code:**
1. Go to Netlify Dashboard → Site settings → Environment variables
2. Add `VERIFICATION_CODE` with your 4-digit code (e.g., `1234`)
3. Redeploy your site

### Gift Code Scraper

The application includes a function to scrape active gift codes from [kingshot.net/gift-codes](https://kingshot.net/gift-codes).

**Endpoint:** `/.netlify/functions/scrape-giftcodes`
- Method: GET or POST
- Returns: List of active gift codes found on the website

### Auto-Claim Feature

Automatically claims gift codes for all registered players.

**Features:**
- Scrapes active codes from kingshot.net every hour (when scheduled)
- Automatically redeems codes for all players
- Tracks which codes each player has already claimed (idempotent)
- Option to force re-claim codes (bypasses claim tracking)

**Endpoint:** `/.netlify/functions/auto-claim`
- Method: POST
- Body (optional): `{ "force": true }` to force re-claiming codes
- Returns: Results of auto-claim operation

**Setting Up Scheduled Auto-Claim:**

1. **Using Netlify Scheduled Functions:**
   - Add to `netlify.toml`:
     ```toml
     [[functions]]
       node_bundler = "esbuild"
       included_files = ["netlify/functions/**"]
     
     [[plugins]]
       package = "@netlify/plugin-scheduled-functions"
     
     [functions.auto-claim]
       schedule = "0 * * * *"  # Every hour
     ```

2. **Using External Cron Service:**
   - Set up a cron job (e.g., using [cron-job.org](https://cron-job.org))
   - Call: `https://your-site.netlify.app/.netlify/functions/auto-claim`
   - Method: POST
   - Schedule: Every hour (`0 * * * *`)

**Claim Tracking:**
- The system tracks which codes each player has claimed
- Prevents duplicate redemptions (idempotent)
- Data stored in `/tmp/claims.json` (ephemeral - see Data Persistence section)
- Use `force: true` to bypass tracking and re-claim codes

### Expired Codes Check

The system includes a scheduled function that periodically checks for expired gift codes:

**Endpoint:** `/.netlify/functions/check-expired-codes`
- Method: POST (or scheduled)
- Returns: List of active and expired codes with UTC timestamps

**Features:**
- Scrapes `kingshot.net/gift-codes` to get current code status
- Uses UTC timezone for accurate expiration checking (matches kingshot.net's date format)
- Compares UTC timestamps directly for precision
- Logs all checks to audit logs

**Scheduled Execution:**
- Configured in `netlify.toml` to run every hour (UTC)
- Schedule: `0 * * * *` (at minute 0 of every hour)
- Automatically checks all codes and updates their expiration status

**Date Format:**
- Kingshot.net uses UTC timezone (Z suffix)
- Example: `2026-01-05T00:00:00.000Z` or `2025-12-24T23:59:00.000Z`
- The system compares UTC timestamps for accurate expiration detection

### Mobile-First Design

The UI has been redesigned with a mobile-first approach:
- Removed card-based layout for player management and gift code redemption
- Streamlined interface optimized for mobile devices
- Responsive design that works on all screen sizes

## Support

For issues or questions, check:
- Netlify Functions docs: https://docs.netlify.com/functions/overview/
- React docs: https://react.dev/
- Vite docs: https://vitejs.dev/
- Google reCAPTCHA docs: https://developers.google.com/recaptcha/docs/v3

