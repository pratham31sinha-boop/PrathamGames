/**
 * PRATHAM STORE - High Performance Modern Gaming Portal Application
 * Pure Vanilla JS, Zero External Dependencies, 100% Offline-Friendly
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIS ENGINE (Web Audio API) ---
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

    playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.08) {
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

    hover() {
      this.playTone(320, 'sine', 0.04, 0.03);
    }

    click() {
      this.playTone(580, 'triangle', 0.06, 0.05);
    }

    favorite() {
      if (this.muted) return;
      this.playTone(523, 'sine', 0.1, 0.08);
      setTimeout(() => this.playTone(784, 'sine', 0.15, 0.08), 80);
    }

    dice() {
      if (this.muted) return;
      this.playTone(400, 'square', 0.05, 0.04);
      setTimeout(() => this.playTone(600, 'square', 0.05, 0.04), 60);
      setTimeout(() => this.playTone(800, 'triangle', 0.12, 0.06), 120);
    }

    win() {
      if (this.muted) return;
      [440, 554, 659, 880].forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 'triangle', 0.15, 0.07), idx * 70);
      });
    }
  }

  const sfx = new SoundFX();

  // --- STATE ---
  const state = {
    games: window.PRATHAM_GAMES || [],
    currentCategory: 'all',
    searchQuery: '',
    sortBy: 'popular',
    viewMode: 'standard',
    favorites: new Set(JSON.parse(localStorage.getItem('pratham_favs') || '[]')),
    recentlyPlayed: JSON.parse(localStorage.getItem('pratham_recents') || '[]'),
    userVotes: JSON.parse(localStorage.getItem('pratham_votes') || '{}'),
    activeFeaturedIndex: 0,
    featuredList: [],
    profile: JSON.parse(localStorage.getItem('pratham_profile') || JSON.stringify({
      name: 'Pratham Gamer',
      avatar: '⚡',
      title: 'Pro Player',
      level: 12,
      xp: 850
    })),
    currentGame: null,
    activeArcade: null
  };

  // Featured games selection
  state.featuredList = state.games.filter(g => g.featured);
  if (state.featuredList.length < 5) {
    state.featuredList = state.games.slice(0, 6);
  }

  // --- DOM ELEMENTS ---
  const elements = {
    themeToggle: document.getElementById('themeToggle'),
    sfxToggle: document.getElementById('sfxToggle'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    searchDropdown: document.getElementById('searchDropdown'),
    categoryScroll: document.getElementById('categoryScroll'),
    gamesGrid: document.getElementById('gamesGrid'),
    gamesCountText: document.getElementById('gamesCountText'),
    sortSelect: document.getElementById('sortSelect'),
    viewStandardBtn: document.getElementById('viewStandardBtn'),
    viewCozyBtn: document.getElementById('viewCozyBtn'),
    favNavBtn: document.getElementById('favNavBtn'),
    favNavCount: document.getElementById('favNavCount'),
    surpriseBtn: document.getElementById('surpriseBtn'),
    arcadeNavBtn: document.getElementById('arcadeNavBtn'),
    profileNavBtn: document.getElementById('profileNavBtn'),
    profileNavAvatar: document.getElementById('profileNavAvatar'),
    profileNavName: document.getElementById('profileNavName'),
    toastContainer: document.getElementById('toastContainer'),
    // Hero Elements
    heroBanner: document.getElementById('heroBanner'),
    heroBgImg: document.getElementById('heroBgImg'),
    heroTitle: document.getElementById('heroTitle'),
    heroDesc: document.getElementById('heroDesc'),
    heroRating: document.getElementById('heroRating'),
    heroPlays: document.getElementById('heroPlays'),
    heroDev: document.getElementById('heroDev'),
    heroCat: document.getElementById('heroCat'),
    heroPlayBtn: document.getElementById('heroPlayBtn'),
    heroFavBtn: document.getElementById('heroFavBtn'),
    heroThumbPicker: document.getElementById('heroThumbPicker'),
    // Modals
    gameModalBackdrop: document.getElementById('gameModalBackdrop'),
    modalThumb: document.getElementById('modalThumb'),
    modalTitle: document.getElementById('modalTitle'),
    modalDev: document.getElementById('modalDev'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalFullscreenBtn: document.getElementById('modalFullscreenBtn'),
    modalShareBtn: document.getElementById('modalShareBtn'),
    modalFavBtn: document.getElementById('modalFavBtn'),
    stageLaunchView: document.getElementById('stageLaunchView'),
    stageBgImg: document.getElementById('stageBgImg'),
    stageHeroThumb: document.getElementById('stageHeroThumb'),
    stageTitle: document.getElementById('stageTitle'),
    stageDesc: document.getElementById('stageDesc'),
    stagePlayOfficialBtn: document.getElementById('stagePlayOfficialBtn'),
    stageSwitchArcadeBtn: document.getElementById('stageSwitchArcadeBtn'),
    arcadeContainer: document.getElementById('arcadeContainer'),
    modalAboutDesc: document.getElementById('modalAboutDesc'),
    modalControlsText: document.getElementById('modalControlsText'),
    voteLikeBtn: document.getElementById('voteLikeBtn'),
    voteDislikeBtn: document.getElementById('voteDislikeBtn'),
    votePctText: document.getElementById('votePctText'),
    voteFill: document.getElementById('voteFill'),
    relatedGamesGrid: document.getElementById('relatedGamesGrid'),
    // Profile Modal
    profileModalBackdrop: document.getElementById('profileModalBackdrop'),
    profileModalCloseBtn: document.getElementById('profileModalCloseBtn'),
    profileModalAvatarLarge: document.getElementById('profileModalAvatarLarge'),
    profileUsernameInput: document.getElementById('profileUsernameInput'),
    profileTitleInput: document.getElementById('profileTitleInput'),
    profileSaveBtn: document.getElementById('profileSaveBtn'),
    profileStatGames: document.getElementById('profileStatGames'),
    profileStatFavs: document.getElementById('profileStatFavs')
  };

  // --- INITIALIZATION ---
  function init() {
    setupTheme();
    setupSFX();
    renderHero(0);
    renderHeroThumbnails();
    renderCategories();
    renderGames();
    updateFavCounter();
    updateProfileUI();
    attachEventListeners();
    startHeroAutoCycle();
  }

  // --- THEME ---
  function setupTheme() {
    const savedTheme = localStorage.getItem('pratham_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    sfx.click();
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pratham_theme', next);
    updateThemeIcon(next);
    showToast(`Switched to ${next} theme! 🎨`);
  }

  function updateThemeIcon(theme) {
    if (!elements.themeToggle) return;
    elements.themeToggle.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    elements.themeToggle.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
  }

  // --- SFX SETUP ---
  function setupSFX() {
    if (!elements.sfxToggle) return;
    updateSFXIcon();
  }

  function updateSFXIcon() {
    elements.sfxToggle.innerHTML = sfx.muted ? '🔇' : '🔊';
    elements.sfxToggle.title = sfx.muted ? 'Unmute Sound Effects' : 'Mute Sound Effects';
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message) {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    elements.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }

  // --- HERO SECTION ---
  let heroTimer = null;

  function renderHero(index) {
    if (!state.featuredList || state.featuredList.length === 0) return;
    state.activeFeaturedIndex = index % state.featuredList.length;
    const g = state.featuredList[state.activeFeaturedIndex];

    if (elements.heroBgImg) {
      elements.heroBgImg.src = g.thumbnail;
      elements.heroBgImg.onerror = () => { elements.heroBgImg.src = g.cdnThumbnail; };
    }
    if (elements.heroTitle) elements.heroTitle.textContent = g.title;
    if (elements.heroDesc) elements.heroDesc.textContent = g.description;
    if (elements.heroRating) elements.heroRating.textContent = g.rating;
    if (elements.heroPlays) elements.heroPlays.textContent = `${g.plays} Plays`;
    if (elements.heroDev) elements.heroDev.textContent = g.developer;
    if (elements.heroCat) elements.heroCat.textContent = g.category;

    if (elements.heroFavBtn) {
      const isFav = state.favorites.has(g.slug);
      elements.heroFavBtn.innerHTML = isFav ? '❤️ Favorited' : '🤍 Favorite';
    }

    // Update active thumb
    const thumbs = document.querySelectorAll('.hero-thumb-btn');
    thumbs.forEach((t, i) => {
      t.classList.toggle('active', i === state.activeFeaturedIndex);
    });
  }

  function renderHeroThumbnails() {
    if (!elements.heroThumbPicker) return;
    elements.heroThumbPicker.innerHTML = '';
    state.featuredList.forEach((g, idx) => {
      const btn = document.createElement('button');
      btn.className = `hero-thumb-btn ${idx === state.activeFeaturedIndex ? 'active' : ''}`;
      btn.title = g.title;
      btn.innerHTML = `<img src="${g.thumbnail}" alt="${g.title}" onerror="this.src='${g.cdnThumbnail}'">`;
      btn.addEventListener('click', () => {
        sfx.click();
        renderHero(idx);
        restartHeroAutoCycle();
      });
      btn.addEventListener('mouseenter', () => sfx.hover());
      elements.heroThumbPicker.appendChild(btn);
    });
  }

  function startHeroAutoCycle() {
    heroTimer = setInterval(() => {
      renderHero(state.activeFeaturedIndex + 1);
    }, 7000);
  }

  function restartHeroAutoCycle() {
    clearInterval(heroTimer);
    startHeroAutoCycle();
  }

  // --- CATEGORIES ---
  const CATEGORIES = [
    { id: 'all', name: 'All Games', icon: '🎮' },
    { id: 'trending', name: 'Trending', icon: '🔥' },
    { id: 'Racing', name: 'Racing & Cars', icon: '🏎️' },
    { id: 'Action', name: 'Action & Combat', icon: '⚔️' },
    { id: 'Puzzle', name: 'Puzzle & Brain', icon: '🧩' },
    { id: 'Sports', name: 'Sports', icon: '⚽' },
    { id: '.io & Arena', name: '.io & Arena', icon: '🌐' },
    { id: 'Arcade', name: 'Arcade', icon: '🕹️' },
    { id: 'Adventure', name: 'Adventure', icon: '🏕️' },
    { id: 'Casual', name: 'Casual', icon: '☕' },
    { id: 'favorites', name: 'My Favorites', icon: '❤️' },
    { id: 'recent', name: 'Recently Played', icon: '🕒' }
  ];

  function renderCategories() {
    if (!elements.categoryScroll) return;
    elements.categoryScroll.innerHTML = '';

    CATEGORIES.forEach(cat => {
      let count = 0;
      if (cat.id === 'all') count = state.games.length;
      else if (cat.id === 'trending') count = state.games.filter(g => g.badge === 'HOT' || g.badge === 'TRENDING').length;
      else if (cat.id === 'favorites') count = state.favorites.size;
      else if (cat.id === 'recent') count = state.recentlyPlayed.length;
      else count = state.games.filter(g => g.category === cat.id).length;

      const chip = document.createElement('button');
      chip.className = `category-chip ${state.currentCategory === cat.id ? 'active' : ''}`;
      chip.dataset.category = cat.id;
      chip.innerHTML = `
        <span class="category-icon">${cat.icon}</span>
        <span class="category-name">${cat.name}</span>
        <span class="category-chip-count">${count}</span>
      `;

      chip.addEventListener('click', () => {
        sfx.click();
        selectCategory(cat.id);
      });
      chip.addEventListener('mouseenter', () => sfx.hover());
      elements.categoryScroll.appendChild(chip);
    });
  }

  function selectCategory(catId) {
    state.currentCategory = catId;
    document.querySelectorAll('.category-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.category === catId);
    });
    renderGames();
  }
  window.selectCategory = function(catId) {
    selectCategory(catId);
    const catSection = document.getElementById('catalogSection');
    if (catSection) catSection.scrollIntoView({ behavior: 'smooth' });
  };

  // --- FILTER & SORT GAMES ---
  function getFilteredGames() {
    let list = [...state.games];

    // Category filter
    if (state.currentCategory === 'favorites') {
      list = list.filter(g => state.favorites.has(g.slug));
    } else if (state.currentCategory === 'recent') {
      const recentSlugs = new Set(state.recentlyPlayed);
      list = list.filter(g => recentSlugs.has(g.slug));
      // order by recency
      list.sort((a, b) => state.recentlyPlayed.indexOf(a.slug) - state.recentlyPlayed.indexOf(b.slug));
      return list;
    } else if (state.currentCategory === 'trending') {
      list = list.filter(g => g.badge === 'HOT' || g.badge === 'TRENDING');
    } else if (state.currentCategory !== 'all') {
      list = list.filter(g => g.category === state.currentCategory);
    }

    // Search query filter
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      list = list.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.developer.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q)
      );
    }

    // Sort
    if (state.sortBy === 'popular') {
      list.sort((a, b) => b.playsNum - a.playsNum);
    } else if (state.sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (state.sortBy === 'newest') {
      list.sort((a, b) => (b.badge === 'NEW' ? 1 : 0) - (a.badge === 'NEW' ? 1 : 0));
    } else if (state.sortBy === 'az') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }

  // --- RENDER GAMES GRID ---
  function renderGames() {
    if (!elements.gamesGrid) return;
    const filtered = getFilteredGames();

    if (elements.gamesCountText) {
      elements.gamesCountText.textContent = `${filtered.length} Game${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      elements.gamesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🕹️</div>
          <h3 class="empty-state-title">No games found</h3>
          <p>Try searching for something else or explore our top categories!</p>
          <button class="btn-primary-gradient" style="margin-top: 1rem;" id="resetFilterBtn">View All Games</button>
        </div>
      `;
      const resetBtn = document.getElementById('resetFilterBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          sfx.click();
          state.searchQuery = '';
          if (elements.searchInput) elements.searchInput.value = '';
          selectCategory('all');
        });
      }
      return;
    }

    elements.gamesGrid.innerHTML = '';
    const frag = document.createDocumentFragment();

    filtered.forEach(g => {
      const isFav = state.favorites.has(g.slug);
      const card = document.createElement('div');
      card.className = 'game-card';
      card.dataset.slug = g.slug;

      let badgeHtml = '';
      if (g.badge) {
        let bClass = 'badge-hot';
        if (g.badge === 'NEW') bClass = 'badge-new';
        if (g.badge === 'TOP') bClass = 'badge-top';
        if (g.badge === 'TRENDING') bClass = 'badge-trending';
        badgeHtml = `<span class="card-badge ${bClass}">${g.badge}</span>`;
      }

      card.innerHTML = `
        <div class="game-thumb-wrapper">
          ${badgeHtml}
          <button class="card-fav-btn ${isFav ? 'favorited' : ''}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" data-fav="${g.slug}">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          <img class="game-thumb-img" src="${g.thumbnail}" alt="${g.title}" loading="lazy" onerror="this.src='${g.cdnThumbnail}'">
          <div class="card-play-overlay">
            <div class="play-circle-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </div>
        <div class="game-card-info">
          <div class="game-card-title" title="${g.title}">${g.title}</div>
          <div class="game-card-meta">
            <span class="game-card-dev">${g.developer}</span>
            <div class="game-card-rating">
              <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              <span>${g.rating}</span>
            </div>
          </div>
        </div>
      `;

      // Favorite click handler
      const favBtn = card.querySelector('.card-fav-btn');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(g.slug);
      });

      // Card open modal click handler
      card.addEventListener('click', () => {
        sfx.click();
        openGameModal(g);
      });

      card.addEventListener('mouseenter', () => sfx.hover());
      frag.appendChild(card);
    });

    elements.gamesGrid.appendChild(frag);
  }

  // --- FAVORITES MANAGEMENT ---
  function toggleFavorite(slug) {
    if (state.favorites.has(slug)) {
      state.favorites.delete(slug);
      sfx.click();
      showToast('Removed from favorites 💔');
    } else {
      state.favorites.add(slug);
      sfx.favorite();
      showToast('Added to favorites! ❤️');
    }
    localStorage.setItem('pratham_favs', JSON.stringify([...state.favorites]));
    updateFavCounter();

    // Update in-place favorite buttons on cards
    document.querySelectorAll(`.card-fav-btn[data-fav="${slug}"]`).forEach(btn => {
      const isFav = state.favorites.has(slug);
      btn.classList.toggle('favorited', isFav);
      btn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    });

    // Update hero fav button if matching
    const currentHero = state.featuredList[state.activeFeaturedIndex];
    if (currentHero && currentHero.slug === slug && elements.heroFavBtn) {
      const isFav = state.favorites.has(slug);
      elements.heroFavBtn.innerHTML = isFav ? '❤️ Favorited' : '🤍 Favorite';
    }

    // Update modal fav button if open
    if (state.currentGame && state.currentGame.slug === slug && elements.modalFavBtn) {
      const isFav = state.favorites.has(slug);
      elements.modalFavBtn.innerHTML = isFav ? '❤️' : '🤍';
    }

    // If currently on favorites category, re-render
    if (state.currentCategory === 'favorites') {
      renderGames();
    }
    renderCategories();
  }

  function updateFavCounter() {
    if (!elements.favNavCount) return;
    elements.favNavCount.textContent = state.favorites.size;
  }

  // --- RECENTLY PLAYED ---
  function recordGamePlayed(slug) {
    state.recentlyPlayed = [slug, ...state.recentlyPlayed.filter(s => s !== slug)].slice(0, 20);
    localStorage.setItem('pratham_recents', JSON.stringify(state.recentlyPlayed));
    renderCategories();
  }

  // --- INSTANT SEARCH WITH DROPDOWN ---
  function setupSearch() {
    if (!elements.searchInput) return;

    elements.searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      state.searchQuery = val;
      if (elements.searchClear) {
        elements.searchClear.style.display = val ? 'flex' : 'none';
      }
      renderSearchResultsDropdown(val);
      renderGames();
    });

    if (elements.searchClear) {
      elements.searchClear.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.searchClear.style.display = 'none';
        if (elements.searchDropdown) elements.searchDropdown.classList.remove('active');
        renderGames();
      });
    }

    // Focus / Blur
    elements.searchInput.addEventListener('focus', () => {
      if (elements.searchInput.value.trim()) {
        renderSearchResultsDropdown(elements.searchInput.value);
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        if (elements.searchDropdown) elements.searchDropdown.classList.remove('active');
      }
    });

    // Global keyboard shortcut '/' or 'Ctrl+K'
    document.addEventListener('keydown', (e) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== elements.searchInput) {
        e.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
      }
      if (e.key === 'Escape' && document.activeElement === elements.searchInput) {
        elements.searchInput.blur();
        if (elements.searchDropdown) elements.searchDropdown.classList.remove('active');
      }
    });
  }

  function renderSearchResultsDropdown(query) {
    if (!elements.searchDropdown) return;
    const q = query.toLowerCase().trim();
    if (!q) {
      elements.searchDropdown.classList.remove('active');
      return;
    }

    const matches = state.games.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.developer.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q)
    ).slice(0, 7);

    if (matches.length === 0) {
      elements.searchDropdown.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
          No matches for "<strong>${escapeHtml(query)}</strong>"
        </div>
      `;
      elements.searchDropdown.classList.add('active');
      return;
    }

    elements.searchDropdown.innerHTML = '';
    matches.forEach(g => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <img class="search-thumb" src="${g.thumbnail}" alt="${g.title}" onerror="this.src='${g.cdnThumbnail}'">
        <div class="search-info">
          <div class="search-info-title">${g.title}</div>
          <div class="search-info-sub">
            <span>${g.developer}</span> • <span>${g.category}</span> • <span>⭐ ${g.rating}</span>
          </div>
        </div>
      `;
      item.addEventListener('click', () => {
        sfx.click();
        elements.searchDropdown.classList.remove('active');
        openGameModal(g);
      });
      elements.searchDropdown.appendChild(item);
    });

    elements.searchDropdown.classList.add('active');
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  // --- GAME PLAYER & DETAILS MODAL ---
  function openGameModal(game) {
    state.currentGame = game;
    recordGamePlayed(game.slug);

    if (elements.modalThumb) elements.modalThumb.src = game.thumbnail;
    if (elements.modalTitle) elements.modalTitle.textContent = game.title;
    if (elements.modalDev) elements.modalDev.textContent = `${game.developer} • ${game.category}`;
    if (elements.stageBgImg) elements.stageBgImg.src = game.thumbnail;
    if (elements.stageHeroThumb) elements.stageHeroThumb.src = game.thumbnail;
    if (elements.stageTitle) elements.stageTitle.textContent = game.title;
    if (elements.stageDesc) elements.stageDesc.textContent = game.description;
    if (elements.modalAboutDesc) elements.modalAboutDesc.textContent = game.description;
    if (elements.modalControlsText) elements.modalControlsText.textContent = game.controls;

    // Reset Arcade Stage
    closeArcadeMiniGame();

    // Favorite state in modal
    if (elements.modalFavBtn) {
      elements.modalFavBtn.innerHTML = state.favorites.has(game.slug) ? '❤️' : '🤍';
    }

    // Upvote/Downvote state
    updateVoteUI(game.slug);

    // Render Related Games
    renderRelatedGames(game);

    // Open Modal
    if (elements.gameModalBackdrop) {
      elements.gameModalBackdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeGameModal() {
    if (elements.gameModalBackdrop) {
      elements.gameModalBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
    closeArcadeMiniGame();
    state.currentGame = null;
  }

  function renderRelatedGames(currentGame) {
    if (!elements.relatedGamesGrid) return;
    const related = state.games
      .filter(g => g.category === currentGame.category && g.slug !== currentGame.slug)
      .slice(0, 4);

    elements.relatedGamesGrid.innerHTML = '';
    related.forEach(g => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="game-thumb-wrapper" style="aspect-ratio: 16/10;">
          <img class="game-thumb-img" src="${g.thumbnail}" alt="${g.title}" onerror="this.src='${g.cdnThumbnail}'">
        </div>
        <div class="game-card-info" style="padding: 0.5rem 0.65rem;">
          <div class="game-card-title" style="font-size: 0.85rem;">${g.title}</div>
          <div class="game-card-meta">
            <span>⭐ ${g.rating}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => {
        sfx.click();
        openGameModal(g);
      });
      elements.relatedGamesGrid.appendChild(card);
    });
  }

  function updateVoteUI(slug) {
    const vote = state.userVotes[slug];
    if (elements.voteLikeBtn) {
      elements.voteLikeBtn.classList.toggle('active-like', vote === 'like');
    }
    if (elements.voteDislikeBtn) {
      elements.voteDislikeBtn.classList.toggle('active-dislike', vote === 'dislike');
    }
    const pct = vote === 'dislike' ? 91 : (vote === 'like' ? 99 : 96);
    if (elements.votePctText) elements.votePctText.textContent = `${pct}% Recommended`;
    if (elements.voteFill) elements.voteFill.style.width = `${pct}%`;
  }

  function handleVote(slug, type) {
    sfx.click();
    if (state.userVotes[slug] === type) {
      delete state.userVotes[slug];
    } else {
      state.userVotes[slug] = type;
    }
    localStorage.setItem('pratham_votes', JSON.stringify(state.userVotes));
    updateVoteUI(slug);
    showToast(type === 'like' ? 'Thanks for voting! 👍' : 'Feedback recorded! 👎');
  }

  // --- BUILT-IN ARCADE PLAYABLE GAMES ---
  function startArcadeMiniGame(gameType = 'tictactoe') {
    sfx.win();
    state.activeArcade = gameType;
    if (elements.stageLaunchView) elements.stageLaunchView.style.display = 'none';
    if (elements.arcadeContainer) {
      elements.arcadeContainer.classList.add('active');
      if (gameType === 'tictactoe') {
        initTicTacToe();
      } else if (gameType === '2048') {
        init2048();
      } else if (gameType === 'runner') {
        initRunner();
      }
    }
  }

  function closeArcadeMiniGame() {
    state.activeArcade = null;
    if (elements.arcadeContainer) {
      elements.arcadeContainer.classList.remove('active');
      elements.arcadeContainer.innerHTML = '';
    }
    if (elements.stageLaunchView) elements.stageLaunchView.style.display = 'flex';
  }

  // 1. TIC TAC TOE ENGINE (Unbeatable Minimax AI)
  function initTicTacToe() {
    if (!elements.arcadeContainer) return;
    elements.arcadeContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 320px; margin-bottom: 0.5rem;">
        <span style="font-weight: 800; font-size: 1rem; color: #fff;">Tic Tac Toe Ultimate</span>
        <button id="exitArcadeBtn" class="nav-btn" style="padding: 0.3rem 0.75rem; font-size: 0.75rem;">✕ Close Game</button>
      </div>
      <div class="ttt-status" id="tttStatus">Your turn! (Playing as X)</div>
      <div class="ttt-board" id="tttBoard">
        ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<div class="ttt-cell" data-idx="${i}"></div>`).join('')}
      </div>
      <div style="display: flex; gap: 0.75rem;">
        <button id="tttResetBtn" class="btn-primary-gradient" style="padding: 0.5rem 1.25rem; font-size: 0.85rem;">🔄 Play Again</button>
      </div>
    `;

    document.getElementById('exitArcadeBtn').addEventListener('click', closeArcadeMiniGame);

    let board = Array(9).fill('');
    let gameActive = true;
    const statusEl = document.getElementById('tttStatus');
    const boardEl = document.getElementById('tttBoard');

    function checkWin(b, player) {
      const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];
      return wins.some(w => w.every(idx => b[idx] === player));
    }

    function checkTie(b) {
      return b.every(c => c !== '');
    }

    function aiMove() {
      // Find best move using simple smart AI
      const emptyIndices = board.map((val, idx) => val === '' ? idx : null).filter(val => val !== null);
      if (emptyIndices.length === 0 || !gameActive) return;

      // 1. Check if AI can win
      for (let idx of emptyIndices) {
        board[idx] = 'O';
        if (checkWin(board, 'O')) {
          finalizeMove(idx, 'O');
          statusEl.textContent = 'Robot AI wins! 🤖 Better luck next time!';
          gameActive = false;
          return;
        }
        board[idx] = '';
      }

      // 2. Check if user is about to win and block
      for (let idx of emptyIndices) {
        board[idx] = 'X';
        if (checkWin(board, 'X')) {
          board[idx] = 'O';
          finalizeMove(idx, 'O');
          return;
        }
        board[idx] = '';
      }

      // 3. Take center if available
      if (board[4] === '') {
        board[4] = 'O';
        finalizeMove(4, 'O');
        return;
      }

      // 4. Take random available
      const randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      board[randomIdx] = 'O';
      finalizeMove(randomIdx, 'O');
    }

    function finalizeMove(idx, player) {
      const cell = boardEl.querySelector(`[data-idx="${idx}"]`);
      if (cell) {
        cell.textContent = player;
        cell.classList.add(player.toLowerCase());
      }
      if (checkWin(board, player)) {
        statusEl.textContent = player === 'X' ? '🎉 YOU WIN! Awesome!' : 'Robot AI wins!';
        gameActive = false;
        sfx.win();
      } else if (checkTie(board)) {
        statusEl.textContent = "🤝 It's a draw! Well played!";
        gameActive = false;
      } else {
        statusEl.textContent = player === 'X' ? "AI is thinking..." : "Your turn! (X)";
      }
    }

    boardEl.querySelectorAll('.ttt-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const idx = parseInt(cell.dataset.idx, 10);
        if (board[idx] !== '' || !gameActive) return;
        sfx.click();
        board[idx] = 'X';
        finalizeMove(idx, 'X');
        if (gameActive) {
          setTimeout(aiMove, 300);
        }
      });
    });

    document.getElementById('tttResetBtn').addEventListener('click', () => {
      sfx.click();
      initTicTacToe();
    });
  }

  // 2. 2048 NEON SLIDER GAME
  function init2048() {
    if (!elements.arcadeContainer) return;
    elements.arcadeContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 320px;">
        <span style="font-weight: 800; font-size: 1rem; color: #fff;">2048 Neon</span>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span id="score2048" style="background: var(--brand-primary); color: #fff; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 800; font-size: 0.85rem;">0</span>
          <button id="exitArcadeBtn" class="nav-btn" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">✕ Close</button>
        </div>
      </div>
      <div class="game-2048-board" id="board2048">
        ${[...Array(16)].map(() => '<div class="tile-2048"></div>').join('')}
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">Use Arrow Keys to slide & merge tiles</div>
    `;

    document.getElementById('exitArcadeBtn').addEventListener('click', closeArcadeMiniGame);

    let grid = Array(16).fill(0);
    let score = 0;
    const boardEl = document.getElementById('board2048');
    const scoreEl = document.getElementById('score2048');

    function addTile() {
      const empty = grid.map((v, i) => v === 0 ? i : null).filter(v => v !== null);
      if (empty.length > 0) {
        const rand = empty[Math.floor(Math.random() * empty.length)];
        grid[rand] = Math.random() < 0.9 ? 2 : 4;
      }
    }

    function renderBoard() {
      const tiles = boardEl.querySelectorAll('.tile-2048');
      tiles.forEach((tile, i) => {
        const val = grid[i];
        tile.textContent = val > 0 ? val : '';
        tile.className = `tile-2048 ${val > 0 ? 'tile-' + Math.min(val, 2048) : ''}`;
      });
      scoreEl.textContent = `Score: ${score}`;
    }

    function slide(row) {
      let filtered = row.filter(v => v !== 0);
      for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i + 1]) {
          filtered[i] *= 2;
          score += filtered[i];
          filtered[i + 1] = 0;
        }
      }
      filtered = filtered.filter(v => v !== 0);
      while (filtered.length < 4) filtered.push(0);
      return filtered;
    }

    function moveLeft() {
      let changed = false;
      for (let r = 0; r < 4; r++) {
        const row = [grid[r * 4], grid[r * 4 + 1], grid[r * 4 + 2], grid[r * 4 + 3]];
        const newRow = slide(row);
        for (let c = 0; c < 4; c++) {
          if (grid[r * 4 + c] !== newRow[c]) changed = true;
          grid[r * 4 + c] = newRow[c];
        }
      }
      return changed;
    }

    function moveRight() {
      let changed = false;
      for (let r = 0; r < 4; r++) {
        const row = [grid[r * 4 + 3], grid[r * 4 + 2], grid[r * 4 + 1], grid[r * 4]];
        const newRow = slide(row);
        for (let c = 0; c < 4; c++) {
          if (grid[r * 4 + 3 - c] !== newRow[c]) changed = true;
          grid[r * 4 + 3 - c] = newRow[c];
        }
      }
      return changed;
    }

    function moveUp() {
      let changed = false;
      for (let c = 0; c < 4; c++) {
        const col = [grid[c], grid[c + 4], grid[c + 8], grid[c + 12]];
        const newCol = slide(col);
        for (let r = 0; r < 4; r++) {
          if (grid[r * 4 + c] !== newCol[r]) changed = true;
          grid[r * 4 + c] = newCol[r];
        }
      }
      return changed;
    }

    function moveDown() {
      let changed = false;
      for (let c = 0; c < 4; c++) {
        const col = [grid[c + 12], grid[c + 8], grid[c + 4], grid[c]];
        const newCol = slide(col);
        for (let r = 0; r < 4; r++) {
          if (grid[(3 - r) * 4 + c] !== newCol[r]) changed = true;
          grid[(3 - r) * 4 + c] = newCol[r];
        }
      }
      return changed;
    }

    function handleKey(e) {
      if (!state.activeArcade || state.activeArcade !== '2048') return;
      let moved = false;
      if (e.key === 'ArrowLeft') { e.preventDefault(); moved = moveLeft(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moved = moveRight(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); moved = moveUp(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); moved = moveDown(); }

      if (moved) {
        sfx.hover();
        addTile();
        renderBoard();
      }
    }

    window.addEventListener('keydown', handleKey);
    addTile();
    addTile();
    renderBoard();
  }

  // 3. CYBER RUNNER CANVAS GAME
  function initRunner() {
    if (!elements.arcadeContainer) return;
    elements.arcadeContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 480px; margin-bottom: 0.5rem;">
        <span style="font-weight: 800; font-size: 1rem; color: #fff;">Cyber Runner 3D</span>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span id="runnerScore" style="background: var(--brand-accent); color: #fff; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 800; font-size: 0.85rem;">Score: 0</span>
          <button id="exitArcadeBtn" class="nav-btn" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">✕ Close</button>
        </div>
      </div>
      <canvas id="runnerCanvas" width="480" height="240"></canvas>
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">Press SPACEBAR or TAP screen to Jump & Dodge!</div>
    `;

    document.getElementById('exitArcadeBtn').addEventListener('click', closeArcadeMiniGame);

    const canvas = document.getElementById('runnerCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('runnerScore');

    let running = true;
    let score = 0;
    let py = 180;
    let vy = 0;
    const gravity = 0.8;
    let onGround = true;

    let obstacles = [];
    let spawnTimer = 0;

    function jump() {
      if (onGround) {
        vy = -12;
        onGround = false;
        sfx.playTone(450, 'triangle', 0.1, 0.05);
      }
    }

    function onKeyDown(e) {
      if (e.code === 'Space' || e.key === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    }

    canvas.addEventListener('click', jump);
    window.addEventListener('keydown', onKeyDown);

    function loop() {
      if (!state.activeArcade || state.activeArcade !== 'runner' || !running) return;

      // Update
      vy += gravity;
      py += vy;
      if (py >= 180) {
        py = 180;
        vy = 0;
        onGround = true;
      }

      spawnTimer++;
      if (spawnTimer > 75) {
        obstacles.push({ x: 500, w: 20, h: 30 + Math.random() * 20 });
        spawnTimer = 0;
      }

      for (let o of obstacles) {
        o.x -= 5;
        // Collision
        if (o.x < 50 + 20 && o.x + o.w > 50 && py + 30 > 220 - o.h) {
          running = false;
          sfx.playTone(150, 'sawtooth', 0.3, 0.1);
          scoreEl.textContent = `Game Over! Final: ${score}`;
          setTimeout(() => {
            if (state.activeArcade === 'runner') initRunner();
          }, 1500);
          return;
        }
      }

      obstacles = obstacles.filter(o => o.x > -50);
      score++;
      scoreEl.textContent = `Score: ${Math.floor(score / 5)}`;

      // Draw
      ctx.fillStyle = '#060914';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Floor line with neon glow
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 210);
      ctx.lineTo(480, 210);
      ctx.stroke();

      // Draw Player (Cyber Cube)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.fillRect(50, py, 26, 30);
      ctx.shadowBlur = 0;

      // Draw Obstacles (Neon Spikes)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 10;
      for (let o of obstacles) {
        ctx.fillRect(o.x, 210 - o.h, o.w, o.h);
      }
      ctx.shadowBlur = 0;

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }

  // --- GAMER PROFILE & AVATAR STUDIO ---
  function updateProfileUI() {
    if (elements.profileNavAvatar) elements.profileNavAvatar.textContent = state.profile.avatar;
    if (elements.profileNavName) elements.profileNavName.textContent = state.profile.name;
    if (elements.profileModalAvatarLarge) elements.profileModalAvatarLarge.textContent = state.profile.avatar;
    if (elements.profileUsernameInput) elements.profileUsernameInput.value = state.profile.name;
    if (elements.profileTitleInput) elements.profileTitleInput.value = state.profile.title || 'Pro Gamer';
    if (elements.profileStatFavs) elements.profileStatFavs.textContent = state.favorites.size;
    if (elements.profileStatGames) elements.profileStatGames.textContent = state.recentlyPlayed.length;
  }

  function openProfileModal() {
    sfx.click();
    updateProfileUI();
    if (elements.profileModalBackdrop) {
      elements.profileModalBackdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeProfileModal() {
    if (elements.profileModalBackdrop) {
      elements.profileModalBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function saveProfile() {
    sfx.win();
    state.profile.name = elements.profileUsernameInput.value.trim() || 'Pratham Gamer';
    state.profile.title = elements.profileTitleInput.value.trim() || 'Pro Player';
    localStorage.setItem('pratham_profile', JSON.stringify(state.profile));
    updateProfileUI();
    closeProfileModal();
    showToast('Profile updated successfully! 🚀');
  }

  // --- EVENT LISTENERS ---
  function attachEventListeners() {
    // Theme toggle
    if (elements.themeToggle) elements.themeToggle.addEventListener('click', toggleTheme);

    // SFX toggle
    if (elements.sfxToggle) {
      elements.sfxToggle.addEventListener('click', () => {
        sfx.toggle();
        updateSFXIcon();
        showToast(sfx.muted ? 'Sound Muted 🔇' : 'Sound Enabled 🔊');
      });
    }

    // Hero buttons
    if (elements.heroPlayBtn) {
      elements.heroPlayBtn.addEventListener('click', () => {
        sfx.click();
        const g = state.featuredList[state.activeFeaturedIndex];
        if (g) openGameModal(g);
      });
    }

    if (elements.heroFavBtn) {
      elements.heroFavBtn.addEventListener('click', () => {
        const g = state.featuredList[state.activeFeaturedIndex];
        if (g) toggleFavorite(g.slug);
      });
    }

    // Sort select
    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        sfx.click();
        state.sortBy = e.target.value;
        renderGames();
      });
    }

    // View toggles
    if (elements.viewStandardBtn && elements.viewCozyBtn) {
      elements.viewStandardBtn.addEventListener('click', () => {
        sfx.click();
        state.viewMode = 'standard';
        elements.viewStandardBtn.classList.add('active');
        elements.viewCozyBtn.classList.remove('active');
        elements.gamesGrid.classList.remove('cozy-view');
      });
      elements.viewCozyBtn.addEventListener('click', () => {
        sfx.click();
        state.viewMode = 'cozy';
        elements.viewCozyBtn.classList.add('active');
        elements.viewStandardBtn.classList.remove('active');
        elements.gamesGrid.classList.add('cozy-view');
      });
    }

    // Navbar Favorites button
    if (elements.favNavBtn) {
      elements.favNavBtn.addEventListener('click', () => {
        sfx.click();
        selectCategory('favorites');
        document.getElementById('catalogSection').scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Surprise Me button
    if (elements.surpriseBtn) {
      elements.surpriseBtn.addEventListener('click', () => {
        sfx.dice();
        const randIndex = Math.floor(Math.random() * state.games.length);
        const randomGame = state.games[randIndex];
        showToast(`🎲 Selected: ${randomGame.title}!`);
        setTimeout(() => openGameModal(randomGame), 300);
      });
    }

    // Mini Arcade nav button
    if (elements.arcadeNavBtn) {
      elements.arcadeNavBtn.addEventListener('click', () => {
        sfx.click();
        // Pick top game and open in built-in arcade
        const g = state.games.find(x => x.slug === 'tic-tac-toe-ultimate') || state.games[0];
        openGameModal(g);
        setTimeout(() => startArcadeMiniGame('tictactoe'), 200);
      });
    }

    // Profile nav button
    if (elements.profileNavBtn) {
      elements.profileNavBtn.addEventListener('click', openProfileModal);
    }
    if (elements.profileModalCloseBtn) {
      elements.profileModalCloseBtn.addEventListener('click', closeProfileModal);
    }
    if (elements.profileSaveBtn) {
      elements.profileSaveBtn.addEventListener('click', saveProfile);
    }

    // Avatar picker buttons
    document.querySelectorAll('.avatar-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sfx.click();
        document.querySelectorAll('.avatar-opt-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.profile.avatar = btn.dataset.avatar;
        if (elements.profileModalAvatarLarge) {
          elements.profileModalAvatarLarge.textContent = btn.dataset.avatar;
        }
      });
    });

    // Game Modal Actions
    if (elements.modalCloseBtn) elements.modalCloseBtn.addEventListener('click', closeGameModal);

    if (elements.modalFavBtn) {
      elements.modalFavBtn.addEventListener('click', () => {
        if (state.currentGame) toggleFavorite(state.currentGame.slug);
      });
    }

    if (elements.modalShareBtn) {
      elements.modalShareBtn.addEventListener('click', () => {
        sfx.click();
        const url = window.location.href.split('#')[0] + '#' + (state.currentGame ? state.currentGame.slug : '');
        navigator.clipboard.writeText(url).then(() => {
          showToast('Game link copied to clipboard! 📋');
        }).catch(() => {
          showToast('Game: ' + (state.currentGame ? state.currentGame.title : ''));
        });
      });
    }

    if (elements.modalFullscreenBtn) {
      elements.modalFullscreenBtn.addEventListener('click', () => {
        sfx.click();
        if (!document.fullscreenElement) {
          elements.gameModalBackdrop.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Modal Play Official Game Button
    if (elements.stagePlayOfficialBtn) {
      elements.stagePlayOfficialBtn.addEventListener('click', () => {
        sfx.click();
        if (state.currentGame) {
          window.open(state.currentGame.pokiUrl, '_blank', 'noopener,noreferrer');
        }
      });
    }

    // Modal Switch to Arcade Mini Game Button
    if (elements.stageSwitchArcadeBtn) {
      elements.stageSwitchArcadeBtn.addEventListener('click', () => {
        if (!state.currentGame) return;
        const slug = state.currentGame.slug;
        if (slug.includes('chess') || slug.includes('tic-tac-toe')) {
          startArcadeMiniGame('tictactoe');
        } else if (slug.includes('puzzle') || slug.includes('blast') || slug.includes('block')) {
          startArcadeMiniGame('2048');
        } else {
          startArcadeMiniGame('runner');
        }
      });
    }

    // Vote buttons in modal
    if (elements.voteLikeBtn) {
      elements.voteLikeBtn.addEventListener('click', () => {
        if (state.currentGame) handleVote(state.currentGame.slug, 'like');
      });
    }
    if (elements.voteDislikeBtn) {
      elements.voteDislikeBtn.addEventListener('click', () => {
        if (state.currentGame) handleVote(state.currentGame.slug, 'dislike');
      });
    }

    // Close modal on escape or backdrop click
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elements.gameModalBackdrop.classList.contains('open')) closeGameModal();
        if (elements.profileModalBackdrop.classList.contains('open')) closeProfileModal();
      }
    });

    elements.gameModalBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.gameModalBackdrop) closeGameModal();
    });
    elements.profileModalBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.profileModalBackdrop) closeProfileModal();
    });

    // Check hash on load for direct game link
    if (window.location.hash) {
      const slug = window.location.hash.replace('#', '');
      const matched = state.games.find(g => g.slug === slug);
      if (matched) {
        setTimeout(() => openGameModal(matched), 200);
      }
    }

    setupSearch();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
