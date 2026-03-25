# ⚡ Nootro Affiliate Leaderboard Bot

Discord bot that posts a daily TikTok Shop affiliate leaderboard to your Discord server.

**Current mode:** Google Sheets → Discord (manual data entry)
**Future mode:** TikTok Shop API → Discord (automatic, once scopes are approved)

---

## Quick Start

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → name it "Nootro Affiliate Bot"
3. Go to **Bot** tab → click **Reset Token** → copy the token
4. Under **Privileged Gateway Intents**, you don't need any special intents
5. Go to **OAuth2 > URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Mention Everyone`
6. Copy the generated URL and paste it in your browser to invite the bot to your server

### 2. Set Up Google Sheets (current data source)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Sheets API**
4. Go to **Credentials** → Create **Service Account**
5. Download the JSON key file
6. Create a Google Sheet with this layout:

| A (Handle)       | B (GMV)   | C (Purchases) | D (Top Product)       |
| ---------------- | --------- | -------------- | --------------------- |
| @pouchwithpete   | 3140.00   | 84             | Mint 3-Pack           |
| @dailydosedylan  | 1980.00   | 53             | Berry Blast 5-Pack    |
| @gymrat.grace    | 1470.00   | 39             | Mint 3-Pack           |

7. **Share the sheet** with your service account email (the `client_email` from the JSON key)

### 3. Configure Environment

```bash
cp .env.example .env
```

Fill in your `.env`:
- `DISCORD_TOKEN` — from step 1
- `LEADERBOARD_CHANNEL_ID` — right-click your #affiliate-leaderboard channel → Copy Channel ID
- `GOOGLE_SHEET_ID` — from the sheet URL: `docs.google.com/spreadsheets/d/THIS_PART/edit`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — from the JSON key file
- `GOOGLE_PRIVATE_KEY` — from the JSON key file (keep the quotes and \n)

### 4. Install & Run

```bash
npm install
npm start
```

---

## Usage

### Slash Commands
| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `/leaderboard`         | Post the leaderboard on demand           |
| `/leaderboard-refresh` | Refresh data and post updated leaderboard |

Both commands require **Manage Messages** permission.

### Daily Auto-Post
The bot posts to your configured channel every day at 9:00 AM EST by default.
Change the schedule in `.env` with any valid cron expression:

```
CRON_SCHEDULE=0 9 * * *     # 9 AM daily
CRON_SCHEDULE=0 9 * * 1     # 9 AM every Monday
CRON_SCHEDULE=0 9,17 * * *  # 9 AM and 5 PM daily
```

---

## Data Sources

Switch between data sources by changing `DATA_SOURCE` in `.env`:

| Value        | Description                                      |
| ------------ | ------------------------------------------------ |
| `mock`       | Hardcoded test data (default, no setup needed)   |
| `sheets`     | Google Sheets (manual entry, current mode)       |
| `tiktok_api` | TikTok Shop API (once scopes are approved)       |

### Switching to TikTok Shop API

Once your `seller.authorization.info` and `data.shop_analytics.public.read` scopes are approved:

1. Get your access token via TikTok OAuth flow
2. Fill in the TikTok fields in `.env`:
   ```
   DATA_SOURCE=tiktok_api
   TIKTOK_APP_KEY=6jdqlj8mrp7ss
   TIKTOK_APP_SECRET=your_secret
   TIKTOK_ACCESS_TOKEN=your_token
   ```
3. Implement the API calls in `src/providers/tiktok.js` (endpoint stubs are already there)
4. Restart the bot

---

## Hosting

For always-on hosting, deploy to any of these:
- **Railway** (easiest, free tier) — connect your GitHub repo
- **Render** — free background worker tier
- **VPS** (DigitalOcean, etc.) — use `pm2` process manager:
  ```bash
  npm install -g pm2
  pm2 start src/index.js --name nootro-bot
  pm2 save
  ```

---

## Project Structure

```
nootro-affiliate-bot/
├── .env.example          # Environment config template
├── package.json
├── README.md
└── src/
    ├── index.js           # Bot entry point, cron, commands
    ├── embed.js           # Discord embed builder
    └── providers/
        ├── mock.js        # Test data
        ├── sheets.js      # Google Sheets reader
        └── tiktok.js      # TikTok Shop API (stub)
```
