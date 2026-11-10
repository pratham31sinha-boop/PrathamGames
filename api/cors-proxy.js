module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing target URL');
  }

  const forwardHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
  };

  for (const [k, v] of Object.entries(req.headers)) {
    const kl = k.toLowerCase();
    if (!['host', 'origin', 'referer', 'content-length', 'connection', 'accept-encoding'].includes(kl)) {
      forwardHeaders[k] = v;
    }
  }

  if (targetUrl.includes('minefun')) {
    forwardHeaders['Origin'] = 'https://c89f4abe-5041-497b-8705-986b6f3b748c.poki-gdn.com';
    forwardHeaders['Referer'] = 'https://c89f4abe-5041-497b-8705-986b6f3b748c.poki-gdn.com/';
  } else if (targetUrl.includes('vectaria')) {
    forwardHeaders['Origin'] = 'https://e00d1cab-5c0c-46e5-8f15-e409e1215622.poki-gdn.com';
    forwardHeaders['Referer'] = 'https://e00d1cab-5c0c-46e5-8f15-e409e1215622.poki-gdn.com/';
  } else {
    forwardHeaders['Origin'] = 'https://games.poki.com';
    forwardHeaders['Referer'] = 'https://games.poki.com/';
  }

  const fetchOptions = {
    method: req.method,
    headers: forwardHeaders
  };

  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(targetUrl, fetchOptions);
    const buffer = await upstream.arrayBuffer();

    for (const [hk, hv] of upstream.headers.entries()) {
      const hkl = hk.toLowerCase();
      if (!['transfer-encoding', 'content-encoding', 'access-control-allow-origin', 'access-control-allow-credentials', 'content-security-policy'].includes(hkl)) {
        res.setHeader(hk, hv);
      }
    }

    return res.status(upstream.status).send(Buffer.from(buffer));
  } catch (err) {
    return res.status(502).json({ error: String(err) });
  }
};
