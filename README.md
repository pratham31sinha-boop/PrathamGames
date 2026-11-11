# 🎮 PRATHAM GAMES — Premium Online Web Gaming Platform

> **Modern, Minimalist, Fast, and 100% Ad-Free Web Gaming Experience**  
> Designed & Developed by **Pratham Sinha**

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel&style=flat-square)](https://vercel.com)
[![Render Deployment](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&style=flat-square)](https://render.com)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Mobile%20%7C%20Desktop-orange?style=flat-square)](#)
[![Games](https://img.shields.io/badge/Catalog-150%2B%20Games-emerald?style=flat-square)](#)
[![Theme](https://img.shields.io/badge/Theme-Claude%20Warm%20Terracotta-E06D53?style=flat-square)](#)

---

## ✨ Features & Highlights

- **150+ Instant Play Web Games**: Subway Surfers, Temple Run 2, Fruit Ninja, Level Devil, Retro Bowl, Planet Destruction, Stickman Hook, Monkey Mart, Drive Mad, Vectaria, Minefun, and more!
- **Claude Minimalist Design**: Premium warm ivory tone (`#faf9f5`), terracotta orange accents (`#da7756`), crisp black borders (`#18181b`), clean geometric squircle cards, and modern typography.
- **100% Mobile Compatible**: Responsive flex & grid layout optimized for smartphones (iPhone & Android), tablets, and high-DPI desktop viewports. Supports touch controls, safe-area insets, and full-screen mobile orientation.
- **Zero-Ad Verified Stream**: Ad-free gameplay stream with direct game loader bypassing third-party video ad walls and interruptions.
- **Player Onboarding & IST Activity Logs**:
  - Interactive onboarding modal asking Name & Age on initial entry (with guest skip option).
  - Automatic Indian Standard Time (IST) timestamp tracking for every gameplay session.
  - Organized player dossiers under `PrathamGames/data/{PlayerName}/{DD-Month-YYYY}.txt`.
- **Multi-Cloud Production Runtimes**:
  - **Render Ready**: Automatic 24/7 persistent container deployment via `render.yaml` or Procfile (`PORT` environment variable compatible).
  - **Vercel Serverless Ready**: In-memory bundled serverless engine (`api/games_bundle.json`) with <1ms game boot and exactly 8 serverless functions (fits Vercel Hobby limits).
  - **Docker Ready**: Universal container image ready for Render, Railway, Fly.io, or Cloud Run.
  - **Local Native**: Zero-dependency Python (`server.py`) and Node.js (`server.js`) servers.

---

## 🚀 Cloud Deployment Guides

### 1. Deploy on Render (Recommended for 24/7 Persistent Gameplay)
Render runs the application as a persistent web service with zero cold starts.

#### Option A: 1-Click Blueprint (Easiest)
1. Fork or push this repository to your GitHub account (`PrathamGames`).
2. Log in to [Render](https://dashboard.render.com).
3. Click **New +** &rarr; **Blueprint**.
4. Connect your `PrathamGames` repository. Render will automatically read [`render.yaml`](./render.yaml).
5. Click **Apply**. Your game store will be live in ~60 seconds!

#### Option B: Manual Web Service
1. On [Render Dashboard](https://dashboard.render.com), click **New +** &rarr; **Web Service**.
2. Connect your repository.
3. Select **Node** (or **Python**):
   - **Build Command**: *(leave empty)*
   - **Start Command**: `node server.js` *(or `python3 server.py`)*
4. Under **Environment Variables**, add:
   - `GITHUB_TOKEN`: *(your personal access token for cloud save tracking)*
5. Click **Deploy Web Service**!

---

### 2. Deploy on Vercel
1. Go to [Vercel](https://vercel.com/new).
2. Select **Import Git Repository** and choose **`PrathamGames`**.
3. Keep default settings (Framework Preset: **Other**, Root Directory: `./`).
4. Under **Environment Variables**, add:
   - `GITHUB_TOKEN`: *(your personal access token)*
5. Click **Deploy**. The in-memory bundle will build cleanly without serverless file limits.

---

### 3. Deploy with Docker
```bash
# Build the Docker image
docker build -t pratham-games .

# Run the container on port 8080
docker run -p 8080:8080 -e PORT=8080 pratham-games
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 💻 Local Quickstart

### Option 1: Universal Node.js Server
```bash
git clone https://github.com/pratham31sinha-boop/PrathamGames.git
cd PrathamGames
npm start
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### Option 2: Python Multi-Threaded Server
```bash
python3 server.py 8080
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 📁 Repository Structure

```
PrathamGames/
├── index.html                   # Main web application entry point
├── server.js                    # Universal Node.js HTTP server (Render / Docker)
├── server.py                    # Multi-threaded Python server & telemetry logger
├── vercel.json                  # Vercel deployment configuration & routing
├── render.yaml                  # Render 1-click Blueprint configuration
├── Procfile                     # Process file for Render, Railway & Heroku
├── Dockerfile                   # Multi-platform container definition
├── package.json                 # Project metadata & npm scripts
├── api/                         # Production serverless endpoints
│   ├── play-game.js             # High-speed game loader & proxy engine
│   ├── games_bundle.json        # Pre-packaged in-memory bundle of all 151 games
│   ├── games_cache.json         # Direct Poki CDN endpoint dictionary
│   ├── cors-proxy.js            # High-speed upstream CORS proxy
│   ├── register-player.js       # Player profile onboarding handler
│   ├── log-gameplay.js          # Gameplay score & duration logger
│   ├── player-history.js        # Daily player history fetcher
│   ├── github-telemetry.js      # Cloud telemetry event recorder
│   ├── github-config.js         # Settings & repository API
│   └── github-history.js        # Telemetry event stream API
├── package/
│   ├── assets/
│   │   ├── icons/               # Custom PRATHAM brand logo & favicons
│   │   ├── pratham-store-ui.css # Claude orange responsive design system
│   │   ├── pratham-store-ui.js  # Client state, SFX, telemetry & modal logic
│   │   ├── games-data.js        # Catalog database for 150+ games
│   │   └── thumbnails/          # High-resolution game cover thumbnails
├── loaders/v3/                  # Universal WebGL & Unity runners
├── games_html_cache/            # Standalone pre-cached game launch containers
└── PrathamGames/data/           # Daily IST player sessions & gameplay dossiers
```

---

## 🛡️ License

This project is created by **Pratham Sinha**. All game assets and trademarks belong to their respective creators and publishers.
