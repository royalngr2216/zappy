# Zappy Lite — Discord Music Bot

A lightweight Discord music bot. Prefix: `z.`

## Commands

| Command | Description |
|---|---|
| `z.play <song name or link>` | Joins your VC and plays/queues the song |
| `z.search <song name>` | Shows top 10 results, pick one from the dropdown to play |
| `z.skip` | Skips the current track |
| `z.stop` | Stops playback and leaves the VC |
| `z.pause` / `z.resume` | Pause / resume playback |
| `z.queue` | Shows what's currently playing and up next |
| `z.nowplaying` | Shows the current track |
| `z.volume <0-150>` | Sets playback volume |

## How it works

This bot uses **Riffy**, a wrapper around **Lavalink**. Lavalink is a separate
audio server that actually downloads/streams and processes the audio — your bot
just tells it what to play. This means Render never needs ffmpeg installed;
your Node app only sends small commands over a websocket.

The Lavalink node(s) it connects to are configured in `lavalinkNodes.js`. The
defaults are **free public nodes** meant for testing — read the comment at the
top of that file if music suddenly stops working (it's almost always a dead
public node, not your code).

## 1. Discord Developer Portal setup

1. Go to https://discord.com/developers/applications → **New Application**
2. Go to **Bot** → **Reset Token** → copy it (you'll need this as `DISCORD_TOKEN`)
3. Under **Bot**, turn ON:
   - `Presence Intent` (optional)
   - `Server Members Intent` (optional)
   - `Message Content Intent` (**required** — the bot reads `z.` commands from message text)
4. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Read Message History`, `Connect`, `Speak`, `Use Embedded Activities` (Connect + Speak are required to join VC)
   - Copy the generated URL, open it, and invite the bot to your server

## 2. Push this code to GitHub (mobile-friendly way)

Since you're on mobile, the easiest way is the GitHub app or the github.com
mobile web upload:

1. Create a new repo on GitHub (keep it **private** if you'll ever accidentally
   put a token in a file — though with this setup your token never goes into
   the repo, see below).
2. Use "Add file → Upload files" on github.com (works fine from a phone
   browser) and upload every file **except** `.env` (there isn't one — you'll
   set the token directly in Render's dashboard, not in a file).
3. Make sure `.gitignore` (included) is uploaded too, so `node_modules` and
   any real `.env` never get committed.

## 3. Deploy on Render

1. Go to https://render.com → **New → Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free is fine to start
4. Under **Environment**, add:
   - `DISCORD_TOKEN` = (paste your bot token here — never in the code/repo)
5. Deploy. Once live, Render gives you a URL like `https://your-app.onrender.com`
   — that's your keep-alive endpoint.

## 4. Keep it alive with UptimeRobot

Render's free tier spins down after 15 minutes of no HTTP traffic. To stop that:

1. Go to https://uptimerobot.com → **Add New Monitor**
2. Monitor Type: `HTTP(s)`
3. URL: your Render URL (e.g. `https://your-app.onrender.com`)
4. Monitoring Interval: 5 minutes
5. Save

UptimeRobot will now ping your bot every 5 minutes so Render keeps it awake.

## Local testing (optional)

```bash
npm install
cp .env.example .env   # then paste your token into .env
npm start
```

## Notes / things to know

- If `z.play` or `z.search` returns nothing, the Lavalink node is very likely
  down — swap in a fresh one from `lavalinkNodes.js`'s linked sources.
- `z.search` results and the dropdown expire after 30 seconds.
- The bot auto-leaves the VC when the queue finishes.
