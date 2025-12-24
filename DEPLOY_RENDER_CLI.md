# 🚀 Deploy to Render via CLI

Yes! Render has a CLI. Here's how to use it:

## Step 1: Install Render CLI
```bash
npm install -g render-cli
```

Or with Homebrew (macOS):
```bash
brew install render
```

## Step 2: Login
```bash
render login
```
This will open your browser to authenticate.

## Step 3: Initialize Project
```bash
render init
```
Follow the prompts to create a new service.

## Step 4: Deploy
```bash
render deploy
```

## Alternative: Manual Setup via Dashboard

If CLI doesn't work, use the web dashboard:
1. Go to https://render.com
2. Sign up/login
3. New + → Web Service
4. Connect GitHub repo
5. Configure:
   - Build: `npm install && npm run build`
   - Start: `npm start`
6. Add environment variables
7. Deploy!

## That's it!

The CLI is simpler, but the dashboard works great too.

