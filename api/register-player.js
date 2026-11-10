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
  const age = parseInt(body.age || 16, 10);

  // Compute IST Date and Time
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const istDateStr = istDate.toISOString().replace('T', ' ').substring(0, 19) + ' IST';

  const playerObj = {
    name,
    age,
    registeredAt: istDateStr,
    status: 'ACTIVE_PLAYER'
  };

  return res.status(200).json({ success: true, player: playerObj });
};
