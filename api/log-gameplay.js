module.exports = function handler(req, res) {
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

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const istTimeStr = istDate.toISOString().replace('T', ' ').substring(0, 19) + ' IST';

  return res.status(200).json({
    success: true,
    entry: {
      player: name,
      gameTitle,
      category,
      score,
      duration,
      timestamp: istTimeStr
    }
  });
};
