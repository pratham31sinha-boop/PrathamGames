/**
 * PRATHAM GAMES — COMPLETE PREMIUM ENGINE
 * Dark Navy / Radiant Orange SaaS Gaming Experience
 * Inspired by GamXe Reference Design
 */

(function () {
  'use strict';

  // --- 1. WEB AUDIO SYNTHESIS ENGINE ---
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.muted = localStorage.getItem('pratham_sfx_muted') === 'true';
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.muted = !this.muted;
      localStorage.setItem('pratham_sfx_muted', this.muted);
      return !this.muted;
    }

    play(freq, type = 'sine', duration = 0.08, gainVal = 0.05) {
      if (this.muted) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }

    hover() { this.play(340, 'sine', 0.04, 0.02); }
    click() { this.play(580, 'triangle', 0.06, 0.04); }
    launch() {
      if (this.muted) return;
      this.play(440, 'sine', 0.09, 0.05);
      setTimeout(() => this.play(660, 'sine', 0.11, 0.06), 70);
      setTimeout(() => this.play(880, 'triangle', 0.16, 0.07), 140);
    }
  }

  const sfx = new SoundFX();

  // Floating Toast Notification
  function showToast(msg) {
    let t = document.getElementById('prathamToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'prathamToast';
      t.className = 'pratham-toast';
      document.body.appendChild(t);
    }
    t.innerHTML = `<span>🎮</span><span>${msg}</span>`;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // --- 1.5 COLORFUL PALETTES & SVG PLACEHOLDER GENERATOR ---
  const CATEGORY_COLORS = {
    'Action': { c1: '#fee2e2', c2: '#fca5a5', icon: '⚔️' },
    'Adventure': { c1: '#fef3c7', c2: '#fde68a', icon: '🏃' },
    'Racing': { c1: '#ffedd5', c2: '#fed7aa', icon: '🏎️' },
    'Car': { c1: '#ffedd5', c2: '#fed7aa', icon: '🏎️' },
    'Puzzle': { c1: '#f3e8ff', c2: '#e9d5ff', icon: '🧩' },
    'Arcade': { c1: '#cffafe', c2: '#a5f3fc', icon: '🕹️' },
    'Multiplayer': { c1: '#dbeafe', c2: '#bfdbfe', icon: '👥' },
    '2 Player': { c1: '#dbeafe', c2: '#bfdbfe', icon: '👥' },
    'Sports': { c1: '#dcfce7', c2: '#bbf7d0', icon: '⚽' },
    'Simulation': { c1: '#fae8ff', c2: '#f5d0fe', icon: '🏪' },
    'Skill': { c1: '#fee4d7', c2: '#fbd5c3', icon: '🎯' },
    'Default': { c1: '#fdf5f0', c2: '#fad4c0', icon: '🎮' }
  };

  function getColoredPlaceholder(title, category) {
    const pal = CATEGORY_COLORS[category] || CATEGORY_COLORS['Default'];
    const safeTitle = (title || 'Game').replace(/[<>&"]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <defs>
        <linearGradient id="pgrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${pal.c1}"/>
          <stop offset="100%" stop-color="${pal.c2}"/>
        </linearGradient>
      </defs>
      <rect width="300" height="300" fill="url(#pgrad)"/>
      <circle cx="150" cy="115" r="48" fill="#ffffff" stroke="#18181b" stroke-width="2.5"/>
      <text x="150" y="129" font-size="38" text-anchor="middle">${pal.icon}</text>
      <text x="150" y="195" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="19" font-weight="850" fill="#18181b" text-anchor="middle">${safeTitle.slice(0, 18)}</text>
      <rect x="95" y="222" width="110" height="28" rx="14" fill="#da7756" stroke="#18181b" stroke-width="2"/>
      <text x="150" y="241" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">PLAY NOW</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  window.getColoredPlaceholder = getColoredPlaceholder;

  // --- 1.6 GITHUB TELEMETRY & ACTIVITY TRACKING ---
  function sendTelemetry(eventType, extraData = {}) {
    const payload = {
      type: eventType,
      gameTitle: extraData.gameTitle || 'Browser Session',
      slug: extraData.slug || '',
      category: extraData.category || 'Portal',
      device: `${navigator.platform || 'Web'} • ${/Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}`,
      path: window.location.pathname + window.location.search,
      timestamp: new Date().toISOString()
    };

    try {
      fetch('/api/github-telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch(e) {}
  }
  window.sendTelemetry = sendTelemetry;

  // --- 2. GAME DATABASE & STATE ---
  function getGamesDB() {
    return (window.PRATHAM_GAMES && Array.isArray(window.PRATHAM_GAMES)) ? window.PRATHAM_GAMES : [];
  }

  const state = {
    games: [],
    activeSlug: null,
    currentCategory: 'all',
    searchQuery: '',
    featuredIndex: 0,
    featuredList: [],
    loadCounter: 0,
    heroTimer: null,
    likes: JSON.parse(localStorage.getItem('pratham_likes') || '{}'),
    currentSession: null
  };

  // --- 2.5 PLAYER PROFILE & SESSION MANAGEMENT ---
  function getPlayer() {
    try {
      const raw = localStorage.getItem('pratham_player');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function setPlayer(name, age) {
    const cleanName = (name || 'Gamer').trim();
    const cleanAge = parseInt(age, 10) || 16;
    const p = { name: cleanName, age: cleanAge };
    localStorage.setItem('pratham_player', JSON.stringify(p));
    updatePlayerUI(p);
    return p;
  }

  function updatePlayerUI(player) {
    const nameEl = document.getElementById('headerPlayerName');
    if (nameEl && player) {
      nameEl.innerText = `${player.name} (${player.age})`;
    }
  }

  function finalizeGameSession() {
    if (!state.currentSession) return;
    const session = state.currentSession;
    state.currentSession = null;

    const durationSec = Math.max(1, Math.floor((Date.now() - session.startTime) / 1000));
    const durationStr = durationSec < 60 ? `${durationSec}s` : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;
    const scoreVal = `${Math.floor(durationSec * 22 + Math.random() * 30)} pts`;
    const player = getPlayer() || { name: 'Rahul', age: 16 };

    try {
      fetch('/api/log-gameplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: player.name,
          age: player.age,
          gameTitle: session.gameTitle,
          slug: session.slug,
          category: session.category,
          score: scoreVal,
          duration: durationStr
        })
      }).catch(() => {});
    } catch (e) {}
  }

  function findGame(slug) {
    if (!slug) return null;
    const s = slug.toLowerCase().trim();
    const found = state.games.find(g => g.slug.toLowerCase() === s);
    if (found) return found;

    // Fallback game object
    return {
      title: s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      slug: s,
      category: 'Arcade',
      developer: 'Verified Studio',
      rating: 4.8,
      plays: '3.5M',
      thumbnail: `https://img.poki-cdn.com/cdn-cgi/image/q=78,width=204,height=204,fit=cover,f=auto/${s}-logo.png`,
      controls: 'Use Arrow keys or WASD to navigate, Space to jump',
      description: `Experience the exhilarating gameplay of ${s} on Pratham Games. Fast, free, and ad-free!`,
      likes: 95
    };
  }

  // --- 3. PAGE INITIALIZATION ---
  function initApp() {
    state.games = getGamesDB();

    // Curate Featured Games for Hero Banner
    const prioritySlugs = [
      'subway-surfers', 'monkey-mart', 'drive-mad', 'stickman-hook',
      'basketball-stars', 'retro-bowl', 'level-devil', 'temple-run-2'
    ];
    state.featuredList = prioritySlugs
      .map(s => state.games.find(g => g.slug === s))
      .filter(Boolean);

    if (state.featuredList.length === 0) {
      state.featuredList = state.games.slice(0, 6);
    }

    renderStoreView();
    attachHeaderListeners();
    attachDockListeners();
    attachPlayerStageListeners();
    attachGitHubModalListeners();
    attachPlayerModalListeners();

    // Check player onboarding (asks Name then Age if not registered)
    checkPlayerOnboarding();

    // Send initial user visit telemetry to GitHub
    sendTelemetry('USER_VISIT', { gameTitle: 'Games Store Home' });

    // Check URL parameters (?game=<slug> or ?search=<query>)
    const urlParams = new URLSearchParams(window.location.search);
    const initialGame = urlParams.get('game');
    const initialSearch = urlParams.get('search') || urlParams.get('category');

    if (initialGame) {
      switchToPlay(initialGame, false);
    } else {
      switchToBrowse(false);
      if (initialSearch) {
        const searchInput = document.getElementById('headerSearchInput');
        if (searchInput) {
          searchInput.value = initialSearch;
          filterGames(initialSearch);
        }
      }
    }

    // Browser History Handling (Back / Forward buttons)
    window.addEventListener('popstate', (e) => {
      const params = new URLSearchParams(window.location.search);
      const gameParam = params.get('game');
      if (gameParam) {
        switchToPlay(gameParam, false);
      } else {
        switchToBrowse(false);
      }
    });
  }

  // --- 4. RENDER PAGE 1: GAMES STORE ---
  function renderStoreView() {
    renderHeroBanner();
    renderCategoriesBar();
    renderTrendingSection();
    renderCatalogGrid();
  }

  // Hero Banner (Featured Game Highlight matching GamXe Reference)
  function renderHeroBanner() {
    const banner = document.getElementById('storeHeroBanner');
    if (!banner || state.featuredList.length === 0) return;

    const game = state.featuredList[state.featuredIndex];
    const thumbUrl = game.cdnThumbnail || game.thumbnail || '';

    banner.innerHTML = `
      <div class="hero-left-content">
        <div class="hero-badge-row">
          <span class="hero-tag-pill">🔥 #1 FEATURED SPOTLIGHT</span>
          <span class="hero-stats-pill">⭐ ${game.rating || 4.9} RATING</span>
          <span class="hero-stats-pill">🏃 ${game.plays || '6.4M+'} PLAYS</span>
        </div>

        <h1 class="hero-title">${game.title}</h1>
        <p class="hero-desc">${game.description || 'Dash into the ultimate high-speed web game experience. Instant play, smooth controls, and pure fun.'}</p>

        <div class="hero-action-row">
          <button class="hero-play-btn" id="heroPlayBtn" data-slug="${game.slug}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <span>PLAY NOW</span>
          </button>

          <div class="hero-social-stack">
            <div class="hero-avatars">
              <span class="hero-avatar-bubble">🦊</span>
              <span class="hero-avatar-bubble">⚡</span>
              <span class="hero-avatar-bubble">🎮</span>
            </div>
            <span>+14.8k gamers active</span>
          </div>
        </div>
      </div>

      <div class="hero-right-visual">
        <div class="hero-art-gradient-overlay"></div>
        <img class="hero-bg-art" src="${thumbUrl}" alt="${game.title}" onerror="this.onerror=null; this.src=getColoredPlaceholder('${game.title.replace(/'/g, "\\'")}', '${game.category || 'Arcade'}');">
      </div>

      <div class="hero-carousel-pills" id="heroDotsContainer">
        ${state.featuredList.map((g, idx) => `
          <button class="hero-dot ${idx === state.featuredIndex ? 'active' : ''}" data-index="${idx}" title="${g.title}"></button>
        `).join('')}
      </div>
    `;

    // Hero Play Button Listener
    document.getElementById('heroPlayBtn').addEventListener('click', () => {
      sfx.launch();
      switchToPlay(game.slug);
    });

    // Hero Carousel Dots Listeners
    document.querySelectorAll('.hero-dot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sfx.click();
        state.featuredIndex = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        renderHeroBanner();
      });
    });

    // Auto-cycle hero banner every 7 seconds
    clearInterval(state.heroTimer);
    state.heroTimer = setInterval(() => {
      state.featuredIndex = (state.featuredIndex + 1) % state.featuredList.length;
      renderHeroBanner();
    }, 7000);
  }

  // Category Pills Bar
  function renderCategoriesBar() {
    const bar = document.getElementById('storeCategoriesBar');
    if (!bar) return;

    const categories = [
      { id: 'all', label: 'All Games', icon: '🎮', count: state.games.length },
      { id: 'popular', label: 'Popular', icon: '🔥', count: 48 },
      { id: 'racing', label: 'Racing & Car', icon: '🏎️', count: 35 },
      { id: 'adventure', label: 'Adventure', icon: '🏃', count: 18 },
      { id: 'puzzle', label: 'Puzzle & Brain', icon: '🧩', count: 16 },
      { id: 'action', label: 'Action & Battle', icon: '⚔️', count: 14 },
      { id: 'multiplayer', label: '2 Player & Multi', icon: '👥', count: 12 },
      { id: 'arcade', label: 'Arcade Classic', icon: '🕹️', count: 59 }
    ];

    bar.innerHTML = categories.map(cat => `
      <button class="category-pill-btn ${cat.id === state.currentCategory ? 'active' : ''}" data-cat="${cat.id}">
        <span>${cat.icon}</span>
        <span>${cat.label}</span>
      </button>
    `).join('');

    bar.querySelectorAll('.category-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sfx.click();
        const cat = e.currentTarget.getAttribute('data-cat');
        state.currentCategory = cat;
        bar.querySelectorAll('.category-pill-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        filterGames();
      });
    });
  }

  // Section 1: Top Trending Grid (Matching Reference Image 3)
  function renderTrendingSection() {
    const grid = document.getElementById('storeTrendingGrid');
    if (!grid) return;

    const trendingSlugs = ['monkey-mart', 'subway-surfers', 'drive-mad', 'retro-bowl'];
    const trendingGames = trendingSlugs.map(s => findGame(s)).filter(Boolean);

    grid.innerHTML = trendingGames.map(game => `
      <div class="trending-card" data-slug="${game.slug}">
        <div class="trending-thumb-wrapper">
          <img class="trending-thumb-img" src="${game.cdnThumbnail || game.thumbnail || ''}" alt="${game.title}" loading="lazy" onerror="this.onerror=null; this.src=getColoredPlaceholder('${game.title.replace(/'/g, "\\'")}', '${game.category || 'Arcade'}');">
          <span class="trending-badge-overlay">HOT</span>
          <span class="trending-rating-overlay">⭐ ${game.rating || 4.9}</span>
        </div>
        <div class="trending-card-body">
          <h3 class="trending-card-title">${game.title}</h3>
          <div class="trending-card-meta">${game.category || 'Arcade'} • ${game.developer || 'Top Studio'}</div>

          <div class="trending-card-stats">
            <div class="trending-stat-row">
              <span style="color:var(--text-muted)">Plays</span>
              <span style="font-weight:700;color:var(--text-secondary)">${game.plays || '5.2M'}</span>
            </div>
            <div class="trending-stat-row">
              <span style="color:var(--text-muted)">Ad Status</span>
              <span style="font-weight:700;color:#10b981">Ad-Free Verified</span>
            </div>
          </div>

          <button class="trending-play-btn" data-slug="${game.slug}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <span>PLAY NOW</span>
          </button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.trending-card, .trending-play-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        const slug = el.getAttribute('data-slug');
        if (slug) {
          sfx.launch();
          switchToPlay(slug);
        }
      });
    });
  }

  // Section 2: All 151 Games Mosaic Grid
  function renderCatalogGrid(filteredGames = null) {
    const grid = document.getElementById('storeAllGamesGrid');
    const countLabel = document.getElementById('catalogCountText');
    if (!grid) return;

    const gamesToShow = filteredGames || state.games;
    if (countLabel) {
      countLabel.innerText = `${gamesToShow.length} Games Ready`;
    }

    if (gamesToShow.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">🔍</div>
          <h3 style="font-size: 1.3rem; color: var(--text-main); margin-bottom: 0.5rem;">No games found</h3>
          <p>Try searching for a different game name or select 'All Games'.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = gamesToShow.map(game => `
      <div class="game-catalog-card" data-slug="${game.slug}" title="Play ${game.title}">
        <div class="game-card-thumb-wrap">
          <img class="game-card-img" src="${game.cdnThumbnail || game.thumbnail || ''}" alt="${game.title}" loading="lazy" onerror="this.onerror=null; this.src=getColoredPlaceholder('${game.title.replace(/'/g, "\\'")}', '${game.category || 'Arcade'}');">
          ${game.badge ? `<span class="game-card-badge">${game.badge}</span>` : ''}
          <div class="game-card-play-overlay">
            <div class="game-play-circle-icon">▶</div>
          </div>
        </div>
        <div class="game-card-details">
          <div class="game-card-title">${game.title}</div>
          <div class="game-card-sub">
            <span class="game-card-cat">${game.category || 'Arcade'}</span>
            <span>⭐ ${game.rating || 4.8}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Click handler for all catalog cards
    grid.querySelectorAll('.game-catalog-card').forEach(card => {
      card.addEventListener('mouseenter', () => sfx.hover());
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const slug = card.getAttribute('data-slug');
        if (slug) {
          sfx.launch();
          switchToPlay(slug);
        }
      });
    });
  }

  // Live Filtering Engine (Ultra-Fast, Fixed & Professional)
  function filterGames(forceQuery = null) {
    const q = (forceQuery !== null ? forceQuery : (state.searchQuery || '')).toLowerCase().trim();
    const heroBanner = document.getElementById('storeHeroBanner');
    const trendingSec = document.querySelector('.store-trending-section');
    const resultsBanner = document.getElementById('searchResultsBanner');
    const resultsTitle = document.getElementById('searchResultsTitle');
    const searchDropdown = document.getElementById('headerSearchDropdown');
    const clearBtn = document.getElementById('headerSearchClear');

    if (clearBtn) {
      clearBtn.style.display = q ? 'flex' : 'none';
    }

    if (q) {
      // Actively searching: search across ALL 151 games without category restriction
      if (heroBanner) heroBanner.style.display = 'none';
      if (trendingSec) trendingSec.style.display = 'none';

      const filtered = state.games.filter(game => {
        return game.title.toLowerCase().includes(q) ||
          game.slug.toLowerCase().includes(q) ||
          (game.category && game.category.toLowerCase().includes(q)) ||
          (game.developer && game.developer.toLowerCase().includes(q));
      });

      if (resultsBanner) {
        resultsBanner.style.display = 'flex';
        if (resultsTitle) {
          resultsTitle.innerHTML = `Search Results for <strong>"${q}"</strong> (${filtered.length} ${filtered.length === 1 ? 'game' : 'games'} found)`;
        }
      }

      // Populate Live Suggestions Dropdown
      if (searchDropdown) {
        if (filtered.length > 0) {
          searchDropdown.style.display = 'flex';
          searchDropdown.innerHTML = filtered.slice(0, 5).map(g => `
            <div class="header-dropdown-item" data-slug="${g.slug}">
              <img class="header-dropdown-thumb" src="${g.cdnThumbnail || g.thumbnail || ''}" alt="${g.title}" onerror="this.onerror=null; this.src=getColoredPlaceholder('${g.title.replace(/'/g, "\\'")}', '${g.category||'Arcade'}');">
              <div class="header-dropdown-info">
                <div class="header-dropdown-title">${g.title}</div>
                <div class="header-dropdown-meta">${g.category || 'Arcade'} • ⭐ ${g.rating || 4.8}</div>
              </div>
              <span class="header-dropdown-play">PLAY ▶</span>
            </div>
          `).join('');

          searchDropdown.querySelectorAll('.header-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
              e.stopPropagation();
              const slug = item.getAttribute('data-slug');
              if (slug) {
                sfx.launch();
                searchDropdown.style.display = 'none';
                switchToPlay(slug);
              }
            });
          });
        } else {
          searchDropdown.style.display = 'flex';
          searchDropdown.innerHTML = `
            <div style="padding: 1.15rem; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
              No games found matching "<strong>${q}</strong>". Try another keyword like Racing, Subway, Car, or Gun.
            </div>
          `;
        }
      }

      renderCatalogGrid(filtered);
    } else {
      // Search cleared: restore Hero Spotlight Banner and Trending Section
      if (heroBanner) heroBanner.style.display = 'grid';
      if (trendingSec) trendingSec.style.display = 'block';
      if (resultsBanner) resultsBanner.style.display = 'none';
      if (searchDropdown) searchDropdown.style.display = 'none';

      const cat = state.currentCategory.toLowerCase();
      const filtered = state.games.filter(game => {
        return cat === 'all' ||
          (cat === 'popular' && (game.rating >= 4.7 || (game.playsNum && game.playsNum >= 5))) ||
          (game.category && game.category.toLowerCase().includes(cat));
      });

      renderCatalogGrid(filtered);
    }
  }

  // --- 5. RENDER PAGE 2: GAME PLAYER VIEW ---
  function switchToPlay(slug, updateHistory = true) {
    if (!slug) return;
    const game = findGame(slug);
    state.activeSlug = game.slug;

    // Increment loadCounter to prevent stale loading race conditions
    state.loadCounter++;
    const currentLoadId = state.loadCounter;

    // Update body mode class
    document.body.classList.remove('mode-browse');
    document.body.classList.add('mode-play');

    // Populate Player Header Details
    const thumb = document.getElementById('playerGameThumb');
    const title = document.getElementById('playerGameTitle');
    const sub = document.getElementById('playerGameSub');
    const catBadge = document.getElementById('playerCatBadge');
    const devLabel = document.getElementById('playerDevLabel');
    const controls = document.getElementById('playerControlsHint');
    const likeBtn = document.getElementById('playerLikeBtn');
    const likeCount = document.getElementById('playerLikeCount');
    const iframe = document.getElementById('playerIframe');
    const loader = document.getElementById('playerLoadingOverlay');

    // Finalize previous game session if any
    finalizeGameSession();

    const player = getPlayer() || { name: 'Rahul', age: 16 };
    state.currentSession = {
      gameTitle: game.title,
      slug: game.slug,
      category: game.category,
      startTime: Date.now()
    };

    if (thumb) {
      thumb.src = game.cdnThumbnail || game.thumbnail || '';
      thumb.onerror = function() {
        this.src = getColoredPlaceholder(game.title, game.category);
      };
    }
    if (title) title.innerText = game.title;
    if (sub) sub.innerText = `⭐ ${game.rating || 4.9} • ${game.plays || '4.2M'} Plays • 🟢 Player: ${player.name} (Age: ${player.age})`;
    if (catBadge) catBadge.innerText = game.category || 'Arcade';
    if (devLabel) devLabel.innerText = `by ${game.developer || 'Verified Studio'}`;
    if (controls) controls.innerText = `🎮 Controls: ${game.controls || 'Use Arrow keys or WASD to navigate'}`;

    // Send Real-time Game Play Telemetry to GitHub & PrathamGames/data/
    sendTelemetry('GAME_PLAY', {
      gameTitle: game.title,
      slug: game.slug,
      category: game.category
    });

    // Log gameplay entry into player's daily file in PrathamGames/data/<name>/
    fetch('/api/log-gameplay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: player.name,
        age: player.age,
        gameTitle: game.title,
        slug: game.slug,
        category: game.category,
        score: 'Active Session Started',
        duration: '0m'
      })
    }).catch(() => {});

    // Likes state
    const isLiked = !!state.likes[game.slug];
    if (likeBtn) likeBtn.classList.toggle('liked', isLiked);
    if (likeCount) likeCount.innerText = (game.likes || 89) + (isLiked ? 1 : 0);

    // Show loading overlay
    if (loader) {
      loader.style.pointerEvents = 'auto';
      loader.style.display = 'flex';
      loader.style.opacity = '1';
    }

    // Embed local ad-free streaming iframe
    if (iframe) {
      // Clear previous iframe first to immediately stop previous game sound/state
      iframe.src = 'about:blank';

      // Load new game locally via high performance proxy
      setTimeout(() => {
        if (state.loadCounter === currentLoadId) {
          iframe.src = `/play-game/${game.slug}`;

          let dismissed = false;
          const dismissLoader = () => {
            if (dismissed) return;
            dismissed = true;
            if (state.loadCounter === currentLoadId && loader) {
              loader.style.pointerEvents = 'none';
              loader.style.opacity = '0';
              setTimeout(() => { loader.style.display = 'none'; }, 200);
            }
          };

          iframe.onload = () => {
            setTimeout(dismissLoader, 150);
          };
          iframe.onerror = dismissLoader;
          // Ultra-fast safety dismiss so user never feels stuck (max 1200ms)
          setTimeout(dismissLoader, 1200);
        }
      }, 20);
    }

    // Populate More Games Sibling Rail & Bottom Grid
    populatePlayerSiblings(game.slug);

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update History & Document Title
    if (updateHistory) {
      try {
        history.pushState({ game: game.slug }, '', `/?game=${game.slug}`);
      } catch (e) {}
    }
    document.title = `${game.title} — Pratham Games`;
    showToast(`Now Playing: <strong>${game.title}</strong>`);
  }

  function switchToBrowse(updateHistory = true) {
    finalizeGameSession();
    state.activeSlug = null;
    state.loadCounter++;

    // Update body mode class
    document.body.classList.remove('mode-play');
    document.body.classList.add('mode-browse');

    // Stop iframe audio and execution immediately
    const iframe = document.getElementById('playerIframe');
    if (iframe) iframe.src = 'about:blank';

    // Update History & Document Title
    if (updateHistory) {
      try {
        history.pushState(null, '', '/');
      } catch (e) {}
    }
    document.title = 'PRATHAM GAMES — Premium Online Web Gaming Platform';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Returned to Games Store');
  }

  // Populate Sibling Games (Sidebar & Bottom Grid)
  function populatePlayerSiblings(activeSlug) {
    const railList = document.getElementById('playerSiblingRailList');
    const bottomGrid = document.getElementById('playerBottomGrid');
    if (!railList || !bottomGrid) return;

    railList.innerHTML = '';
    bottomGrid.innerHTML = '';

    const otherGames = state.games.filter(g => g.slug !== activeSlug);
    // Shuffle for fresh variety
    const shuffled = [...otherGames].sort(() => 0.5 - Math.random());

    // 1. Right Sidebar (10 Sibling Games)
    shuffled.slice(0, 10).forEach(g => {
      const item = document.createElement('div');
      item.className = 'player-sibling-item';
      item.innerHTML = `
        <img class="player-sibling-thumb" src="${g.cdnThumbnail || g.thumbnail || ''}" alt="${g.title}" loading="lazy" onerror="this.onerror=null; this.src=getColoredPlaceholder('${g.title.replace(/'/g, "\\'")}', '${g.category || 'Arcade'}');">
        <div class="player-sibling-info">
          <div class="player-sibling-title">${g.title}</div>
          <div class="player-sibling-meta">⭐ ${g.rating || 4.8} • ${g.category}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        sfx.launch();
        switchToPlay(g.slug);
      });
      railList.appendChild(item);
    });

    // 2. Bottom Grid (24 Sibling Games)
    shuffled.slice(10, 34).forEach(g => {
      const card = document.createElement('div');
      card.className = 'game-catalog-card';
      card.innerHTML = `
        <div class="game-card-thumb-wrap">
          <img class="game-card-img" src="${g.cdnThumbnail || g.thumbnail || ''}" alt="${g.title}" loading="lazy" onerror="this.onerror=null; this.src=getColoredPlaceholder('${g.title.replace(/'/g, "\\'")}', '${g.category || 'Arcade'}');">
          <div class="game-card-play-overlay">
            <div class="game-play-circle-icon">▶</div>
          </div>
        </div>
        <div class="game-card-details">
          <div class="game-card-title">${g.title}</div>
          <div class="game-card-sub">
            <span class="game-card-cat">${g.category || 'Arcade'}</span>
            <span>⭐ ${g.rating || 4.8}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => {
        sfx.launch();
        switchToPlay(g.slug);
      });
      bottomGrid.appendChild(card);
    });
  }

  // --- 6. EVENT LISTENERS ATTACHMENT ---
  function attachHeaderListeners() {
    // Brand click returns to store
    document.querySelectorAll('.header-brand, #dockLogoBtn').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.click();
        switchToBrowse();
      });
    });

    // Live search input & dropdown controller
    const searchInput = document.getElementById('headerSearchInput');
    const searchClear = document.getElementById('headerSearchClear');
    const searchResultsClear = document.getElementById('searchClearBtn');
    const searchDropdown = document.getElementById('headerSearchDropdown');

    function resetSearch() {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      if (searchDropdown) searchDropdown.style.display = 'none';
      filterGames('');
      if (searchInput) searchInput.focus();
    }

    if (searchClear) {
      searchClear.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.click();
        resetSearch();
      });
    }

    if (searchResultsClear) {
      searchResultsClear.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.click();
        resetSearch();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value;
        state.searchQuery = q;
        if (document.body.classList.contains('mode-play') && q.trim()) {
          switchToBrowse(false);
        }
        filterGames(q);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const q = (searchInput.value || '').trim().toLowerCase();
          if (!q) return;
          const match = state.games.find(g =>
            g.title.toLowerCase().includes(q) ||
            g.slug.toLowerCase().includes(q) ||
            (g.category && g.category.toLowerCase().includes(q))
          );
          if (match) {
            sfx.launch();
            if (searchDropdown) searchDropdown.style.display = 'none';
            switchToPlay(match.slug);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          resetSearch();
        }
      });

      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim() && searchDropdown) {
          searchDropdown.style.display = 'flex';
        }
      });
    }

    // Dismiss search dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (searchDropdown && !e.target.closest('.header-search-box')) {
        searchDropdown.style.display = 'none';
      }
    });
  }

  // Left Vertical Dock Navigation
  function attachDockListeners() {
    document.querySelectorAll('.dock-btn[data-category]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sfx.click();
        const cat = e.currentTarget.getAttribute('data-category');
        state.currentCategory = cat;

        // Switch to browse mode if playing
        if (document.body.classList.contains('mode-play')) {
          switchToBrowse();
        }

        // Highlight dock button
        document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Sync with horizontal category bar
        const catPills = document.querySelectorAll('.category-pill-btn');
        catPills.forEach(p => {
          p.classList.toggle('active', p.getAttribute('data-cat') === cat);
        });

        filterGames();
        showToast(`Filtered category: <strong>${cat.toUpperCase()}</strong>`);
      });
    });

    // Dock Surprise Me
    const dockSurprise = document.getElementById('dockSurpriseBtn');
    if (dockSurprise) {
      dockSurprise.addEventListener('click', () => {
        sfx.click();
        if (state.games.length > 0) {
          const rand = state.games[Math.floor(Math.random() * state.games.length)];
          switchToPlay(rand.slug);
          showToast(`🎲 Surprise Game: <strong>${rand.title}</strong>`);
        }
      });
    }
  }

  // Player Stage Controls
  function attachPlayerStageListeners() {
    // Back to Store button
    document.getElementById('playerBackBtn').addEventListener('click', (e) => {
      e.preventDefault();
      sfx.click();
      switchToBrowse();
    });

    // Next Game button
    document.getElementById('playerNextBtn').addEventListener('click', () => {
      sfx.click();
      const others = state.games.filter(g => g.slug !== state.activeSlug);
      if (others.length > 0) {
        const rand = others[Math.floor(Math.random() * others.length)];
        switchToPlay(rand.slug);
      }
    });

    // Restart Game button
    document.getElementById('playerRestartBtn').addEventListener('click', () => {
      sfx.click();
      const iframe = document.getElementById('playerIframe');
      if (iframe) iframe.src = iframe.src;
      showToast('🔄 Restarting game...');
    });

    // Fullscreen button (with cross-browser & mobile iOS/Android support)
    document.getElementById('playerFullscreenBtn').addEventListener('click', () => {
      sfx.click();
      const frameBox = document.getElementById('playerFrameBox');
      const iframe = document.getElementById('playerIframe');
      const targetElem = frameBox || iframe;
      const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      
      if (!isFs) {
        const req = targetElem.requestFullscreen || targetElem.webkitRequestFullscreen || targetElem.mozRequestFullScreen || targetElem.msRequestFullscreen;
        if (req) {
          req.call(targetElem).catch(() => {
            if (iframe && (iframe.requestFullscreen || iframe.webkitRequestFullscreen)) {
              const ifReq = iframe.requestFullscreen || iframe.webkitRequestFullscreen;
              ifReq.call(iframe).catch(() => {});
            }
          });
        }
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (exit) exit.call(document).catch(() => {});
      }
    });

    // Like button
    document.getElementById('playerLikeBtn').addEventListener('click', function () {
      sfx.click();
      const game = findGame(state.activeSlug);
      const isLiked = !state.likes[game.slug];
      state.likes[game.slug] = isLiked;
      localStorage.setItem('pratham_likes', JSON.stringify(state.likes));

      this.classList.toggle('liked', isLiked);
      const countEl = document.getElementById('playerLikeCount');
      if (countEl) {
        countEl.innerText = (game.likes || 89) + (isLiked ? 1 : 0);
      }
      showToast(isLiked ? '❤️ Added to liked games!' : '💔 Removed from liked');
    });

    // Share button
    document.getElementById('playerShareBtn').addEventListener('click', () => {
      sfx.click();
      const shareUrl = `${window.location.origin}/?game=${state.activeSlug}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('🔗 Link copied to clipboard!');
      }).catch(() => {
        showToast(`Share URL: ${shareUrl}`);
      });
    });
  }

  // --- 7. GITHUB TELEMETRY MODAL & LIVE TRACKER ---
  function attachGitHubModalListeners() {
    const statusBtn = document.getElementById('githubStatusBtn');
    const modal = document.getElementById('githubModal');
    const closeBtn = document.getElementById('githubModalClose');
    const feedList = document.getElementById('githubFeedList');
    const eventCountBadge = document.getElementById('githubEventCountBadge');
    const saveBtn = document.getElementById('githubSaveConfigBtn');
    const pingBtn = document.getElementById('githubTestPingBtn');
    const webhookInput = document.getElementById('githubWebhookInput');
    const repoInput = document.getElementById('githubRepoInput');
    const tokenInput = document.getElementById('githubTokenInput');

    function loadGitHubHistory() {
      fetch('/api/github-history')
        .then(r => r.json())
        .then(data => {
          if (data && data.events && feedList) {
            if (eventCountBadge) eventCountBadge.innerText = `${data.events.length} Events Logged`;
            if (data.events.length === 0) {
              feedList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No activity recorded yet.</div>';
              return;
            }
            feedList.innerHTML = data.events.map(ev => `
              <div class="github-feed-item">
                <span class="github-feed-item-tag">${ev.type}</span>
                <span style="font-weight:700;color:var(--text-main);">${ev.gameTitle || 'Portal'}</span>
                <span style="color:var(--text-muted);font-size:0.72rem;">${ev.timestamp || ''}</span>
              </div>
            `).join('');
          }
        })
        .catch(() => {});
    }

    function loadGitHubConfig() {
      fetch('/api/github-config')
        .then(r => r.json())
        .then(data => {
          if (data && data.config) {
            if (webhookInput) webhookInput.value = data.config.webhook_url || '';
            if (repoInput) repoInput.value = data.config.github_repo || '';
            if (tokenInput) tokenInput.value = data.config.github_token || '';
          }
        })
        .catch(() => {});
    }

    if (statusBtn && modal) {
      statusBtn.addEventListener('click', () => {
        sfx.click();
        modal.style.display = 'flex';
        loadGitHubHistory();
        loadGitHubConfig();
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        sfx.click();
        const cfg = {
          webhook_url: webhookInput ? webhookInput.value.trim() : '',
          github_repo: repoInput ? repoInput.value.trim() : '',
          github_token: tokenInput ? tokenInput.value.trim() : ''
        };
        fetch('/api/github-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg)
        })
        .then(r => r.json())
        .then(d => {
          showToast('✅ GitHub Settings Saved!');
        })
        .catch(() => showToast('Error saving settings'));
      });
    }

    if (pingBtn) {
      pingBtn.addEventListener('click', () => {
        sfx.launch();
        sendTelemetry('MANUAL_PING', { gameTitle: 'Test Ping from User' });
        setTimeout(() => {
          loadGitHubHistory();
          showToast('📡 GitHub Ping Sent & Recorded!');
        }, 300);
      });
    }
  }

  // --- 8. PLAYER ONBOARDING & PROFILE CONTROLLERS ---
  function checkPlayerOnboarding() {
    const player = getPlayer();
    if (!player || !player.name) {
      const modal = document.getElementById('playerOnboardModal');
      if (modal) {
        modal.style.display = 'flex';
        const nameInput = document.getElementById('onboardNameInput');
        if (nameInput) setTimeout(() => nameInput.focus(), 150);
      }
    } else {
      updatePlayerUI(player);
    }
  }

  function attachPlayerModalListeners() {
    const onboardModal = document.getElementById('playerOnboardModal');
    const onboardForm = document.getElementById('playerOnboardForm');
    const nameInput = document.getElementById('onboardNameInput');
    const ageInput = document.getElementById('onboardAgeInput');

    const profileModal = document.getElementById('playerProfileModal');
    const playerBtn = document.getElementById('headerPlayerBtn');
    const profileClose = document.getElementById('playerProfileClose');
    const profileCloseBtn = document.getElementById('profileCloseBtn');
    const profileSwitchBtn = document.getElementById('profileSwitchBtn');

    // Skip / Close Onboarding
    const skipOnboarding = () => {
      sfx.click();
      const guestPlayer = setPlayer('Player', 16);
      if (onboardModal) onboardModal.style.display = 'none';
      showToast('🎮 Welcome! Playing as <strong>Player</strong>');
    };

    const onboardClose = document.getElementById('onboardCloseBtn');
    if (onboardClose) onboardClose.addEventListener('click', skipOnboarding);

    const onboardSkip = document.getElementById('onboardSkipBtn');
    if (onboardSkip) onboardSkip.addEventListener('click', skipOnboarding);

    // Onboarding Form Submit
    if (onboardForm) {
      onboardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawName = nameInput ? nameInput.value.trim() : '';
        const rawAge = ageInput ? parseInt(ageInput.value, 10) : 16;

        if (!rawName) {
          showToast('⚠️ Please enter your gamer name!');
          if (nameInput) nameInput.focus();
          return;
        }

        sfx.launch();
        const savedPlayer = setPlayer(rawName, rawAge);

        // Register in backend PrathamGames/data/ and registered_users.txt
        fetch('/api/register-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: savedPlayer.name, age: savedPlayer.age })
        })
        .then(r => r.json())
        .then(() => {
          showToast(`🎮 Welcome, <strong>${savedPlayer.name}</strong>! Let's play!`);
        })
        .catch(() => {
          showToast(`🎮 Welcome, <strong>${savedPlayer.name}</strong>!`);
        });

        if (onboardModal) onboardModal.style.display = 'none';
      });
    }

    // Open Profile Modal & Load Daily Activity
    function openProfileModal() {
      const p = getPlayer() || { name: 'Rahul', age: 16 };
      if (profileModal) profileModal.style.display = 'flex';

      const statName = document.getElementById('profileStatName');
      const statAge = document.getElementById('profileStatAge');
      const statTz = document.getElementById('profileStatTimezone');
      const fileNameEl = document.getElementById('profileTodayFileName');
      const feedList = document.getElementById('profileFeedList');
      const logCountBadge = document.getElementById('profileLogCount');

      if (statName) statName.innerText = p.name;
      if (statAge) statAge.innerText = `${p.age} yrs`;
      if (statTz) statTz.innerText = 'Active Gamer';

      if (feedList) {
        feedList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">Loading your activity...</div>';
      }

      fetch(`/api/player-history?name=${encodeURIComponent(p.name)}`)
        .then(r => r.json())
        .then(data => {
          if (fileNameEl) {
            fileNameEl.innerText = data.date || 'Today';
          }
          if (logCountBadge && data.history) {
            const gameEvents = data.history.filter(h => h.includes('GAME PLAYED') || h.includes('PLAYED:'));
            logCountBadge.innerText = `${gameEvents.length} Played`;
          }
          if (feedList && data.history) {
            if (data.history.length === 0) {
              feedList.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No games played today yet. Launch any game to start playing!</div>';
              return;
            }
            feedList.innerHTML = data.history.map(item => {
              const timeMatch = item.match(/^\[(.*?)\]/);
              const timeStr = timeMatch ? timeMatch[1].replace(' IST', '') : '';
              let title = item.replace(/^\[.*?\]\s*/, '');
              let tag = '🎮 GAME';
              let tagBg = 'var(--brand-orange)';

              if (title.includes('GAME PLAYED:')) {
                const parts = title.split('GAME PLAYED:')[1].split('|');
                title = parts[0].trim();
                tag = '🎮 PLAY';
              } else if (title.includes('PLAYER REGISTERED:')) {
                title = 'Joined Pratham Games';
                tag = '👤 JOIN';
                tagBg = '#10b981';
              }

              return `
                <div class="github-feed-item" style="display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem;">
                  <span class="github-feed-item-tag" style="background: ${tagBg}; color: #fff; font-weight: 800; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 6px;">${tag}</span>
                  <span style="font-weight: 700; color: var(--text-main); font-size: 0.85rem;">${title}</span>
                  <span style="margin-left: auto; font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${timeStr}</span>
                </div>
              `;
            }).join('');
          }
        })
        .catch(() => {
          if (feedList) feedList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No activity recorded yet.</div>';
        });
    }

    if (playerBtn) {
      playerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.click();
        openProfileModal();
      });
    }

    if (profileClose) {
      profileClose.addEventListener('click', () => {
        if (profileModal) profileModal.style.display = 'none';
      });
    }
    if (profileCloseBtn) {
      profileCloseBtn.addEventListener('click', () => {
        if (profileModal) profileModal.style.display = 'none';
      });
    }
    if (profileModal) {
      profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) profileModal.style.display = 'none';
      });
    }

    // Switch Player Button
    if (profileSwitchBtn) {
      profileSwitchBtn.addEventListener('click', () => {
        sfx.click();
        if (profileModal) profileModal.style.display = 'none';
        if (onboardModal) {
          onboardModal.style.display = 'flex';
          const p = getPlayer();
          if (p && nameInput) nameInput.value = p.name;
          if (p && ageInput) ageInput.value = p.age;
          if (nameInput) setTimeout(() => nameInput.focus(), 150);
        }
      });
    }
  }

  // Handle Tab Close / Unload Session Logging
  window.addEventListener('beforeunload', () => {
    finalizeGameSession();
  });

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
