const fs = require('fs');
const path = require('path');
const { getGitHubConfig } = require('./_github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const name = String(req.query.name || 'Gamer').trim();
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const dateHyphen = istDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-');
  const dateDisplay = istDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  let history = [];

  // 1. Try reading from local disk if available
  try {
    const localFile = path.join(process.cwd(), 'PrathamGames', 'data', name, `${dateHyphen}.txt`);
    if (fs.existsSync(localFile)) {
      const content = fs.readFileSync(localFile, 'utf8');
      history = content.split('\n').filter(line => line.trim().startsWith('['));
    }
  } catch (e) {}

  // 2. If running on Vercel without local file, check GitHub API if GITHUB_TOKEN configured
  if (history.length === 0) {
    const { token, repo } = getGitHubConfig();
    if (token && repo) {
      try {
        const ghUrl = `https://api.github.com/repos/${repo}/contents/PrathamGames/data/${encodeURIComponent(name)}/${dateHyphen}.txt`;
        const ghRes = await fetch(ghUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'PrathamGames-Vercel'
          }
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          if (ghData.content) {
            const decoded = Buffer.from(ghData.content, 'base64').toString('utf8');
            history = decoded.split('\n').filter(line => line.trim().startsWith('['));
          }
        }
      } catch (e) {}
    }
  }

  return res.status(200).json({
    success: true,
    player: name,
    date: dateDisplay,
    history
  });
};
