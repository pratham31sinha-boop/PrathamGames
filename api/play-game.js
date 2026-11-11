const fs = require('fs');
const path = require('path');

// 1. Direct in-memory bundle of all 151 game HTML documents (0ms lookup, no filesystem errors)
let gamesBundle = {};
try {
  gamesBundle = require('./games_bundle.json');
} catch (e) {
  try {
    gamesBundle = require('../games_bundle.json');
  } catch (err) {}
}

// 2. Direct catalog cache mapping slugs to upstream CDN endpoints
let gamesCache = {};
try {
  gamesCache = require('./games_cache.json');
} catch (e) {
  try {
    gamesCache = require('../games_cache.json');
  } catch (err) {}
}

const MOCK_SDK_SNIPPET = `<meta name="referrer" content="no-referrer">
<script>
(function() {
  'use strict';
  var noop = function() {};
  var resolvedPromise = function(val) { return Promise.resolve(val); };

  window.updateProgress = window.updateProgress || function() {};
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
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *;");

  if (!slug) {
    return res.status(400).send('Game slug required');
  }

  // 1. In-memory bundle lookup (Instant, works 100% on Vercel, Render, or any host)
  if (gamesBundle[slug]) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(gamesBundle[slug]);
  }

  // 2. Check if slug is a sub-resource path (e.g. scripts/jobworker.js or slug/subpath)
  let refSlug = null;
  let subpath = slug;
  if (slug.includes('/')) {
    const parts = slug.split('/', 2);
    if (gamesBundle[parts[0]] || gamesCache[parts[0]]) {
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
    } else if (gamesBundle[refSlug]) {
      const m = gamesBundle[refSlug].match(/<base\s+href=['"]([^'"]+)['"]/i);
      if (m) baseUrl = m[1];
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

  // 3. Dynamic upstream fallback fetch (resolves and prepares game from gamesCache or Poki)
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

  // 4. Return an active playable iframe runner rather than a 404
  const fallbackHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${slug}</title>
  <style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;}iframe{width:100%;height:100%;border:none;}</style>
</head>
<body>
  <iframe src="https://games.poki.com/${slug}" allow="autoplay; fullscreen; camera; focus-without-user-activation *"></iframe>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(fallbackHtml);
};
