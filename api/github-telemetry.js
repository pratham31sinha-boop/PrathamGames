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

  const now = new Date();
  const nowUtc = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const eventType = body.type || 'USER_VISIT';
  const gameTitle = body.gameTitle || body.game || 'Website Portal';
  const device = body.device || 'Web Browser';
  const slug = body.slug || '';
  const category = body.category || 'Portal';

  const entry = {
    id: `act_${Date.now()}`,
    timestamp: nowUtc,
    type: eventType,
    gameTitle,
    slug,
    category,
    device,
    path: body.path || '/'
  };

  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
    try {
      const line = `| ${nowUtc} | ${eventType === 'GAME_PLAY' ? '🎮 ' : '🌐 '}${eventType} | **${gameTitle}** (${category}) | ${device} |`;
      await appendFileToGitHub('GITHUB_ACTIVITY.md', line, `Activity: ${eventType} - ${gameTitle}`);
    } catch (e) {
      console.error('Async GitHub telemetry error:', e);
    }
  }

  return res.status(200).json({ success: true, entry });
};
