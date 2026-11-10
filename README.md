# 🎮 PRATHAM GAMES — Premium Online Web Gaming Platform

> **Modern, Minimalist, Fast, and 100% Ad-Free Web Gaming Experience**  
> Designed & Developed by **Pratham Sinha**

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel&style=flat-square)](https://vercel.com)
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
  - Interactive onboarding modal asking Name & Age on initial entry.
  - Automatic Indian Standard Time (IST) timestamp tracking for every gameplay session.
  - Organized player dossiers under `PrathamGames/data/{PlayerName}/{DD-Month-YYYY}.txt`.
- **Dual Runtime Support**:
  - **Local Python Server**: Multi-threaded HTTP proxy server with automatic Git commit integration.
  - **Vercel Serverless Ready**: Production serverless functions under `api/` with `vercel.json` rewrite routing.

---

## 🚀 One-Click Deploy to Vercel

1. Fork or push this repository to your GitHub account (`PrathamGames`).
2. Go to [Vercel](https://vercel.com/new).
3. Select **Import Git Repository** and choose **`PrathamGames`**.
4. Keep the default settings (Framework Preset: **Other**, Root Directory: `./`).
5. Click **Deploy**! Your games portal will be live in under 60 seconds with SSL and global CDN.

---

## 💻 Local Quickstart

### Option 1: Python Multi-Threaded Server (Recommended)
```bash
# Clone the repository
git clone https://github.com/pratham31sinha-boop/PrathamGames.git
cd PrathamGames

# Start the server on port 8080
python3 server.py 8080
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### Option 2: Node.js / Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Run local development serverless environment
vercel dev
```

---

## 📁 Repository Structure

```
PrathamGames/
├── index.html                   # Main web application entry point
├── vercel.json                  # Vercel deployment configuration & routing
├── server.py                    # Multi-threaded Python server & telemetry logger
├── package.json                 # Project metadata & npm scripts
├── manifest.json                # PWA Progressive Web App manifest
├── api/                         # Vercel serverless endpoints
│   ├── play-game.js             # Game loader & proxy engine
│   ├── cors-proxy.js            # High-speed upstream CORS proxy
│   ├── register-player.js       # Player profile onboarding handler
│   ├── log-gameplay.js          # Gameplay score & duration logger
│   ├── player-history.js        # Daily player history fetcher
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
