# Kingshot Gift Code Automation

Automated gift code redemption system for Kingshot game. This application allows you to manage multiple player IDs and automatically redeem gift codes for all of them.

## Features

- 🎮 **Player ID Management**: Add and remove player IDs from your list
- 🎁 **Automated Redemption**: Redeem gift codes for all players at once
- 📊 **Statistics Tracking**: Track total gifts redeemed, successes, and failures
- 📱 **Responsive Design**: Works on mobile, tablet, and desktop
- 🛡️ **Anti-Spam Protection**: Built-in rate limiting and delays
- 🎨 **Kingshot Theme**: Beautiful UI matching the game's aesthetic

## Deployment to Netlify

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy on Netlify**:
   - Go to [Netlify](https://app.netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Deploy site"

3. **Configure Functions**:
   - Netlify will automatically detect functions in `netlify/functions/`
   - No additional configuration needed

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Test Netlify Functions locally** (requires Netlify CLI):
   ```bash
   npm install -g netlify-cli
   netlify dev
   ```

## Project Structure

```
kingshot-giftcode-automation/
├── src/
│   ├── components/          # React components
│   ├── App.jsx             # Main app component
│   └── main.jsx            # Entry point
├── netlify/
│   └── functions/          # Serverless functions
│       ├── get-players.js
│       ├── add-player.js
│       ├── remove-player.js
│       ├── get-stats.js
│       ├── save-stats.js
│       └── redeem-giftcode.js
├── package.json
├── vite.config.js
└── netlify.toml
```

## API Endpoints

- `GET /.netlify/functions/get-players` - Get all player IDs
- `POST /.netlify/functions/add-player` - Add a player ID
- `POST /.netlify/functions/remove-player` - Remove a player ID
- `GET /.netlify/functions/get-stats` - Get statistics
- `POST /.netlify/functions/save-stats` - Save statistics
- `POST /.netlify/functions/redeem-giftcode` - Redeem gift code for all players

## Rate Limiting

- Maximum 100 players per gift code redemption
- 500ms delay between each player request (anti-spam)
- Rate limit resets every hour

## Notes

- Player IDs must be exactly 10 digits
- Gift codes can be up to 20 characters
- Data is stored in `/tmp` directory (ephemeral on Netlify)
- For persistent storage, consider using a database service

## License

MIT

