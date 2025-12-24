# 🚀 Deploy to Fly.io (Free, No Sleep, Simple)

## Why Fly.io?
- ✅ **Doesn't sleep** (unlike Render)
- ✅ **Free tier** (3 shared VMs)
- ✅ **Simple CLI deployment**
- ✅ **Background tasks work!**

## Quick Deploy (5 minutes):

### Step 1: Install Fly CLI
```bash
npm install -g @fly/cli
```

### Step 2: Login
```bash
fly auth login
```

### Step 3: Launch
```bash
fly launch
```
Follow prompts:
- App name: `kingshot-giftcode-automation` (or any name)
- Region: Choose closest
- PostgreSQL: No (we use SQLite)
- Redis: No

### Step 4: Deploy
```bash
fly deploy
```

### Step 5: Setup Background Tasks
Fly.io supports cron via `fly.toml`:

```toml
[[services]]
  [[services.http_checks]]
    grace_period = "10s"
    interval = "30s"
    timeout = "5s"

[[processes]]
  [processes.app]
    cmd = ["node", "server.js"]
  
  [processes.cron]
    cmd = ["node", "-e", "setInterval(() => require('./netlify/functions/check-expired-codes').handler({httpMethod:'POST',headers:{'x-netlify-trigger':'scheduled'},body:'{}'},{}), 3600000)"]
```

Or use external cron service: https://cron-job.org

## Done! 🎉

Your app runs 24/7, no sleep, background tasks work.

