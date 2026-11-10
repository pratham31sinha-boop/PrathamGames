const { appendFileToGitHub } = require('./_github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {}
  }

  const name = String(body.name || 'Gamer').trim();
  const gameTitle = String(body.gameTitle || 'Game');
  const category = String(body.category || 'Arcade');
  const score = String(body.score || 'Active');
  const duration = String(body.duration || '0m');

  // Compute Indian Standard Time (IST = UTC+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const dateFull = istDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-');
  const timeIST = istDate.toLocaleTimeString('en-US', { hour12: true }) + ' IST';

  const logLine = `[${timeIST}] GAME PLAYED: ${gameTitle} | Category: ${category} | Score: ${score} | Duration: ${duration}`;

  // Sync to GitHub if GITHUB_TOKEN environment variable is set
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
    try {
      const userFile = `PrathamGames/data/${name}/${dateFull}.txt`;
      await appendFileToGitHub(userFile, logLine, `Gameplay: ${name} - ${gameTitle} [${timeIST}]`);
    } catch (e) {
      console.error('Async GitHub sync error:', e);
    }
  }

  return res.status(200).json({
    success: true,
    entry: {
      player: name,
      gameTitle,
      category,
      score,
      duration,
      timestamp: `${dateFull} ${timeIST}`
    }
  });
};
