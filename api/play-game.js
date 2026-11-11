const fs = require('fs');
const path = require('path');

// Potential cache directory paths (handles local dev and Vercel Lambda /var/task)
const POSSIBLE_CACHE_DIRS = [
  path.join(process.cwd(), 'games_html_cache'),
  path.join(__dirname, '..', 'games_html_cache'),
  path.join('/var/task', 'games_html_cache')
];

function findCachedFile(slug) {
  for (const dir of POSSIBLE_CACHE_DIRS) {
    const candidate = path.join(dir, `${slug}.html`);
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (e) {}
  }
  return null;
}

let gamesCache = {};
try {
  const possibleCacheJson = [
    path.join(process.cwd(), 'games_cache.json'),
    path.join(__dirname, '..', 'games_cache.json'),
    path.join('/var/task', 'games_cache.json')
  ];
  for (const cp of possibleCacheJson) {
    if (fs.existsSync(cp)) {
      gamesCache = JSON.parse(fs.readFileSync(cp, 'utf8'));
      break;
    }
  }
} catch (e) {}

const MOCK_SDK_SNIPPET = `<script>
(function() {
  'use strict';
  var noop = function() {};
  var resolvedPromise = function(val) { return Promise.resolve(val); };

  window.Progress = window.Progress || {
    _listeners: [],
    addListener: function(fn) {
      if (typeof fn === 'function') {
        this._listeners.push(fn);
        try { fn(100); } catch(e) {}
      }
    },
    notifyListeners: function(val) {
      for (var i = 0; i < this._listeners.length; i++) {
        try { this._listeners[i](val); } catch(e) {}
      }
    }
  };

  var PokiMock = {
    init: function(opts) {
      if (opts && typeof opts === 'object') {
        if (typeof opts.submitScore === 'function') {
          try { opts.submitScore(function() {}); } catch(e) {}
        }
        if (typeof opts.onReady === 'function') {
          try { opts.onReady(); } catch(e) {}
        }
      }
      if (typeof arguments[0] === 'function') {
        try { arguments[0](); } catch(e) {}
      }
      return resolvedPromise();
    },
    initWithVideoHB: function() { return resolvedPromise(); },
    commercialBreak: function(fn) {
      if (typeof fn === 'function') {
        try { fn(); } catch(e) {}
      }
      return resolvedPromise();
    },
    rewardedBreak: function(fn) {
      if (typeof fn === 'function') {
        try { fn(true); } catch(e) {}
      }
      return resolvedPromise(true);
    },
    displayAd: function(e, t, o, i) {
      if (typeof i === 'function') i(true);
      if (typeof o === 'function') o();
      if (typeof e === 'function') e();
      return resolvedPromise();
    },
    destroyAd: noop,
    getLeaderboard: function() { return resolvedPromise([]); },
    shareableURL: function() { return resolvedPromise(window.location.href); },
    getURLParam: function(p) {
      try {
        return new URLSearchParams(window.location.search).get(p) || '';
      } catch(e) { return ''; }
    },
    getLanguage: function() { return (navigator.language || 'en').split('-')[0]; },
    getDeviceInfo: function() { return { category: 'desktop' }; },
    isAdBlocked: function() { return false; },
    getUser: function() { return resolvedPromise({ id: 'pratham_user', name: 'Gamer' }); },
    getToken: function() { return resolvedPromise('pratham_token'); },
    login: function() { return resolvedPromise({ id: 'pratham_user' }); },
    generateScreenshot: function() { return resolvedPromise(''); },
    measure: noop,
    captureError: noop,
    customEvent: noop,
    gameInteractive: noop,
    gameLoadingFinished: noop,
    gameLoadingProgress: noop,
    gameLoadingStart: noop,
    gameplayStart: noop,
    gameplayStop: noop,
    happyTime: noop,
    logError: noop,
    muteAd: noop,
    roundEnd: noop,
    roundStart: noop,
    sendHighscore: noop,
    setDebug: noop,
    setDebugTouchOverlayController: noop,
    setLogging: noop,
    setPlayerAge: noop,
    setPlaytestCanvas: noop,
    enableEventTracking: noop,
    openExternalLink: noop,
    playtestSetCanvas: noop,
    playtestCaptureHtmlOnce: noop,
    playtestCaptureHtmlForce: noop,
    playtestCaptureHtmlOn: noop,
    playtestCaptureHtmlOff: noop,
    movePill: noop,
    showLeaderboard: function() { return resolvedPromise([]); }
  };

  var pokiProxy = new Proxy(PokiMock, {
    get: function(target, prop) {
      if (prop in target) return target[prop];
      return function() {
        var lastArg = arguments[arguments.length - 1];
        if (typeof lastArg === 'function') {
          try { lastArg(true); } catch(e) {}
        }
        return resolvedPromise(true);
      };
    }
  });

  try {
    Object.defineProperty(window, 'PokiSDK', {
      value: pokiProxy,
      writable: true,
      configurable: true
    });
  } catch(e) {
    window.PokiSDK = pokiProxy;
  }

  window.pokiReady = true;
  window.pokiAdBlock = false;
  window.PokiSDKInited = true;
  window.isPokiSDKInited = true;
  window.isWasmLoaded = true;
})();
</script>`;

module.exports = async function handler(req, res) {
  let slug = req.query.slug || '';
  if (!slug && req.url) {
    const parts = req.url.split('?')[0].split('/play-game/');
    if (parts.length > 1) {
      slug = parts[1].replace(/^\/+|\/+$/g, '');
    }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *;");

  if (!slug) {
    return res.status(400).send('Game slug required');
  }

  // 1. Direct cached HTML file on disk
  const cachedPath = findCachedFile(slug);
  if (cachedPath) {
    try {
      let html = fs.readFileSync(cachedPath, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (e) {
      console.error(`Error reading cached file for ${slug}:`, e);
    }
  }

  // 2. Check if slug is a sub-resource path (e.g. scripts/jobworker.js or slug/subpath)
  let refSlug = null;
  let subpath = slug;
  if (slug.includes('/')) {
    const parts = slug.split('/', 2);
    if (gamesCache[parts[0]] || findCachedFile(parts[0])) {
      refSlug = parts[0];
      subpath = slug.substring(parts[0].length + 1);
    }
  }

  if (!refSlug) {
    const referer = req.headers.referer || '';
    if (referer.includes('/play-game/')) {
      const seg = referer.split('/play-game/')[1].split('?')[0].replace(/^\/+|\/+$/g, '').split('/')[0];
      if (seg) refSlug = seg;
    } else if (referer.includes('?game=')) {
      refSlug = referer.split('?game=')[1].split('&')[0];
    }
  }

  if (refSlug) {
    let baseUrl = null;
    if (gamesCache[refSlug]) {
      const cleanUri = gamesCache[refSlug].split('?')[0];
      baseUrl = cleanUri.substring(0, cleanUri.lastIndexOf('/') + 1);
    } else {
      const refFile = findCachedFile(refSlug);
      if (refFile) {
        try {
          const content = fs.readFileSync(refFile, 'utf8');
          const m = content.match(/<base\s+href=['"]([^'"]+)['"]/i);
          if (m) baseUrl = m[1];
        } catch (e) {}
      }
    }

    if (baseUrl) {
      try {
        const targetUrl = new URL(subpath, baseUrl).href;
        const upstream = await fetch(targetUrl, {
          headers: {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://games.poki.com/'
          }
        });
        const buffer = await upstream.arrayBuffer();
        let ctype = upstream.headers.get('content-type');
        if (!ctype || ctype.includes('text/plain')) {
          if (subpath.endsWith('.js')) ctype = 'text/javascript; charset=utf-8';
          else if (subpath.endsWith('.wasm')) ctype = 'application/wasm';
          else if (subpath.endsWith('.json')) ctype = 'application/json';
          else if (subpath.endsWith('.css')) ctype = 'text/css';
          else if (subpath.endsWith('.png')) ctype = 'image/png';
          else if (subpath.endsWith('.jpg') || subpath.endsWith('.jpeg')) ctype = 'image/jpeg';
        }
        res.setHeader('Content-Type', ctype);

        const enc = upstream.headers.get('content-encoding');
        if (enc) {
          res.setHeader('Content-Encoding', enc);
        } else if (subpath.endsWith('.gz') || subpath.endsWith('.unityweb')) {
          res.setHeader('Content-Encoding', 'gzip');
        }
        return res.status(upstream.status).send(Buffer.from(buffer));
      } catch (err) {
        console.error(`Error proxying subpath ${subpath} for ${refSlug}:`, err);
      }
    }
  }

  // 3. Dynamic upstream fallback fetch (resolves and prepares game if not pre-cached)
  let gameUri = gamesCache[slug] || null;
  if (!gameUri) {
    try {
      const pokiPageUrl = `https://poki.com/en/g/${slug}`;
      const pokiRes = await fetch(pokiPageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://poki.com/'
        }
      });
      if (pokiRes.ok) {
        const text = await pokiRes.text();
        const m = text.match(/https?:\/\/[a-f0-9-]+\.(?:poki-gdn\.com|gdn\.poki\.com)\/[a-f0-9-]+\/index\.html[^\s"']*/i);
        if (m) gameUri = m[0];
      }
    } catch (e) {}
  }

  if (gameUri) {
    try {
      const cleanUri = gameUri.split('?')[0];
      const baseUrl = cleanUri.substring(0, cleanUri.lastIndexOf('/') + 1);
      const resp = await fetch(gameUri, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://games.poki.com/'
        }
      });
      if (resp.ok) {
        let html = await resp.text();
        const baseTag = `<base href="${baseUrl}">`;
        html = html.replace(/<script[^>]*src=['"][^'"]*poki-sdk[^'"]*['"][^>]*>\s*<\/script>/gi, '');
        html = html.replace(/<div[^>]*id=['"](?:adInfo|poki-video-ad-container)['"][^>]*>.*?<\/div>/gis, '');
        html = html.replace('src="/loaders/v3/master-loader.js"', 'src="https://game-cdn.poki.com/loaders/v3/master-loader.js"');
        const injection = baseTag + '\n' + MOCK_SDK_SNIPPET;
        if (html.includes('<head>')) {
          html = html.replace('<head>', '<head>\n' + injection);
        } else {
          html = injection + '\n' + html;
        }
        html = html.replace('var isPokiSDKInited = false;', 'var isPokiSDKInited = true;');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
      }
    } catch (e) {
      console.error(`Error resolving upstream for ${slug}:`, e);
    }
  }

  return res.status(404).send(`Game or resource "${slug}" not found.`);
};
