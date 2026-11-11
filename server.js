const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || process.argv[2] || 8080, 10);
const HOST = '0.0.0.0';
const BASE_DIR = __dirname;
const PACKAGE_DIR = path.join(BASE_DIR, 'package');

// Lazy-load API handlers
const apiHandlers = {
  '/api/play-game': require('./api/play-game'),
  '/api/log-gameplay': require('./api/log-gameplay'),
  '/api/github-telemetry': require('./api/github-telemetry'),
  '/api/github-config': require('./api/github-config'),
  '/api/register-player': require('./api/register-player'),
  '/api/player-history': require('./api/player-history'),
  '/api/github-history': require('./api/github-history'),
  '/api/cors-proxy': require('./api/cors-proxy')
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.unityweb': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function serveFile(filePath, res) {
  try {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return false;
    }
    const ext = path.extname(filePath).toLowerCase();
    const ctype = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', ctype);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *;");
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch (e) {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname || '/';

  // Polyfill Express-like helpers for serverless handlers
  res.status = function(code) {
    res.statusCode = code;
    return res;
  };
  res.send = function(body) {
    if (typeof body === 'object' && !Buffer.isBuffer(body)) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    } else {
      res.end(body);
    }
    return res;
  };
  res.json = function(data) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };

  req.query = Object.fromEntries(reqUrl.searchParams.entries());

  // Parse body for POST/PUT
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    await new Promise(resolve => {
      req.on('end', () => {
        try {
          req.body = JSON.parse(bodyData);
        } catch (e) {
          req.body = bodyData;
        }
        resolve();
      });
    });
  }

  // 1. Root route
  if (pathname === '/' || pathname === '/index.html') {
    return serveFile(path.join(BASE_DIR, 'index.html'), res);
  }

  // 2. Play game route: /play-game/<slug>
  if (pathname.startsWith('/play-game/')) {
    const slug = pathname.replace(/^\/play-game\//, '').replace(/\/$/, '');
    req.query.slug = slug;
    return apiHandlers['/api/play-game'](req, res);
  }

  // 3. API endpoints
  if (apiHandlers[pathname]) {
    return apiHandlers[pathname](req, res);
  }

  // 4. Static files in assets/ or package/assets/
  let localPath = path.join(BASE_DIR, pathname);
  if (serveFile(localPath, res)) return;

  let pkgPath = path.join(PACKAGE_DIR, pathname);
  if (serveFile(pkgPath, res)) return;

  if (pathname.startsWith('/assets/')) {
    const sub = pathname.substring('/assets/'.length);
    if (serveFile(path.join(PACKAGE_DIR, 'assets', sub), res)) return;
  }

  // 5. Referer-based proxy fallback (for Unity/Defold game sub-resources like /Build/..., /files/...)
  const referer = req.headers['referer'] || '';
  if (referer.includes('/play-game/')) {
    const refSlug = referer.split('/play-game/')[1].split('?')[0].replace(/^\/+|\/+$/g, '').split('/')[0];
    if (refSlug) {
      req.query.slug = `${refSlug}/${pathname.replace(/^\/+/, '')}`;
      return apiHandlers['/api/play-game'](req, res);
    }
  }

  // 404
  res.status(404).send('Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`Pratham Games Universal Server running at http://${HOST}:${PORT}`);
});
