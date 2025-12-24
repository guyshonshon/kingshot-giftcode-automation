# ChatGPT Consultation Prompt - Hosting Solution

Copy and paste this entire prompt to ChatGPT:

---

I need help choosing the best free hosting solution for my web application. Here's exactly what my app does and what it needs:

## Application Overview

**Type:** Full-stack web application
- **Frontend:** React (Vite build, static files in `/dist`)
- **Backend:** Express.js server with 15+ API endpoints
- **Database:** SQLite (better-sqlite3) - single file database
- **Language:** Node.js

## Technical Stack

**Frontend:**
- React 18.2.0
- Vite build system
- Static files served from `/dist` directory
- Client-side state management (React hooks)

**Backend:**
- Express.js server
- 15+ API endpoints (originally Netlify Functions, now wrapped in Express routes)
- All routes under `/.netlify/functions/*` for compatibility

**Database & Storage:**
- **SQLite** (better-sqlite3) - single `data.db` file
- Stores: players data, audit logs
- No external database services currently
- File system storage for: claims tracking, recent codes (in `/tmp` directory)

**External API Calls:**
- Makes HTTPS requests to `kingshot-giftcode.centurygame.com` (Kingshot game API)
- Calls: `/api/player` (login), `/api/gift_code` (redeem codes)
- Scrapes HTML from `kingshot.net/gift-codes` (web scraping)

**Background Tasks:**
- **Critical:** Need to run `check-expired-codes` function every hour
- This function scrapes gift codes and checks expiration dates
- Must run reliably even when app has no traffic

## Current Architecture

**File Structure:**
```
/
├── dist/                    # React build output (static files)
├── netlify/functions/       # 15+ API endpoint functions
│   ├── add-player.js
│   ├── remove-player.js
│   ├── get-players.js
│   ├── claim-single-code.js
│   ├── claim-for-self.js
│   ├── auto-claim.js
│   ├── check-expired-codes.js  # Background task
│   ├── get-codes-with-claims.js
│   ├── redeem-giftcode.js
│   └── utils/
│       ├── simple-storage.js    # SQLite operations
│       └── simple-audit.js     # Audit logging
├── db.js                   # SQLite database initialization
├── server.js               # Express server (routes + serves static)
└── package.json
```

**How It Works:**
1. Express server serves React app from `/dist`
2. All API calls go to `/.netlify/functions/*` routes
3. Express routes map to Netlify function handlers
4. Functions use SQLite for data persistence
5. Background task needs to run hourly (currently no solution)

## Requirements

**Must Have:**
- ✅ Free tier (or very cheap)
- ✅ No function/endpoint limits (have 15+ endpoints)
- ✅ Persistent storage (SQLite file must persist)
- ✅ Background tasks/cron jobs (hourly scheduled task)
- ✅ Node.js runtime support
- ✅ HTTPS/SSL
- ✅ Simple deployment (prefer CLI or GitHub integration)

**Nice to Have:**
- Unlimited bandwidth
- Doesn't sleep after inactivity
- Automatic deployments from GitHub
- Global CDN

**Current Issues:**
- ❌ Tried Netlify: Hit usage limits, site paused
- ❌ Tried Vercel: 12 function limit (have 15+)
- ❌ Tried Render: Free tier sleeps → background tasks don't run

## What I've Tried

1. **Netlify** - Worked but hit bandwidth limits, site paused
2. **Vercel** - Free tier only allows 12 serverless functions, I have 15+
3. **Render** - Free tier puts service to sleep after inactivity, cron jobs don't run
4. **Cloudflare Pages** - Considered but seems complex (Workers format conversion)

## Current Solution Attempt

- Express server wrapping all functions
- SQLite database (no external DB needed)
- External cron service for background tasks (cron-job.org)
- But need hosting that doesn't sleep

## Questions for You

1. **What's the best free/cheap hosting that:**
   - Doesn't sleep (so background tasks work)?
   - Supports Node.js Express server?
   - Allows persistent file storage (SQLite)?
   - Has no function/endpoint limits?

2. **Should I:**
   - Keep SQLite or switch to a free database service?
   - Use external cron service or built-in cron?
   - Split into separate services (web + worker)?

3. **Specific Recommendations:**
   - Railway? (free $5 credit, doesn't sleep?)
   - Fly.io? (free tier, doesn't sleep?)
   - Other options?

4. **Background Tasks:**
   - Best way to run hourly tasks on free tier?
   - External cron service acceptable?
   - Or use a service with built-in cron?

Please recommend the **simplest solution** that actually works. I'm tired of complex setups that don't work. Just want something that:
- Deploys easily
- Runs 24/7
- Background tasks work
- Free or very cheap

---

