const fs = require('fs');
const path = require('path');

const HTML_CACHE_DIR = path.join(process.cwd(), 'games_html_cache');
let gamesCache = {};
try {
  const cachePath = path.join(process.cwd(), 'games_cache.json');
  if (fs.existsSync(cachePath)) {
    gamesCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }
} catch (e) {}

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

  if (!slug) {
    return res.status(400).send('Game slug required');
  }

  // 1. Direct cached HTML file
  const cachedFile = path.join(HTML_CACHE_DIR, `${slug}.html`);
  if (fs.existsSync(cachedFile)) {
    try {
      const html = fs.readFileSync(cachedFile, 'utf8');
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
    if (gamesCache[parts[0]] || fs.existsSync(path.join(HTML_CACHE_DIR, `${parts[0]}.html`))) {
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
      const refFile = path.join(HTML_CACHE_DIR, `${refSlug}.html`);
      if (fs.existsSync(refFile)) {
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
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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

  return res.status(404).send(`Game or resource "${slug}" not found.`);
};
