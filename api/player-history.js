module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const name = req.query.name || 'Gamer';
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const dateFull = istDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return res.status(200).json({
    success: true,
    player: name,
    date: dateFull,
    history: []
  });
};
