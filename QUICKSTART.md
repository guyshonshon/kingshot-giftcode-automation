# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd kingshot-giftcode-automation
npm install
```

### Step 2: Test Locally (Optional)
```bash
npm run dev
```
Visit `http://localhost:5173` to see your app.

### Step 3: Deploy to Netlify

#### Via GitHub (Recommended):
1. Create a new GitHub repository
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
3. Go to [Netlify](https://app.netlify.com)
4. Click "New site from Git"
5. Select your repository
6. Click "Deploy site" (settings are auto-detected)

#### Via Netlify CLI:
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Step 4: Use Your App! 🎉

1. Add your Player IDs (8-10 digits each)
2. Enter a gift code
3. Click "Redeem for All Players"
4. Watch the magic happen! ✨

## 📝 Important Notes

- **Data Storage**: Currently uses `/tmp` which is ephemeral. For production, consider adding a database.
- **API Endpoints**: The gift code API endpoints are based on reverse engineering. If you encounter issues, check the browser network tab on the original site.
- **Rate Limiting**: Built-in to prevent spam (500ms delay between requests, max 100 players per code)

## 🐛 Troubleshooting

**Functions not working?**
- Check Netlify Functions logs in dashboard
- Verify functions are in `netlify/functions/`

**Build fails?**
- Ensure Node 18+ is set in Netlify
- Check build logs for errors

**CORS errors?**
- Functions include CORS headers automatically
- Check browser console for specific errors

## 📚 Next Steps

- Add persistent database storage (see DEPLOYMENT.md)
- Customize the UI theme
- Add more statistics
- Implement user authentication (optional)

Happy automating! 🎮🎁

