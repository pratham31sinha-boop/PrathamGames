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
  const age = parseInt(body.age || 16, 10);

  // Compute Indian Standard Time (IST = UTC+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const dateFull = istDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-');
  const dateUser = istDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long' });
  const timeIST = istDate.toLocaleTimeString('en-US', { hour12: true }) + ' IST';
  const istDateStr = `${dateFull} ${timeIST}`;

  const playerObj = {
    name,
    age,
    registeredAt: istDateStr,
    status: 'ACTIVE_PLAYER'
  };

  // Sync to GitHub if GITHUB_TOKEN environment variable is present
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
    try {
      const regLine = `Name: ${name} | Age: ${age} | Date: ${dateUser} (${dateFull}) | Registered: ${timeIST}`;
      const userFile = `PrathamGames/data/${name}/${dateFull}.txt`;
      const userContent = `================================================================================\nPRATHAM GAMES — DAILY ACTIVITY & GAMEPLAY LOG\nPlayer: ${name}\nAge: ${age}\nDate: ${dateUser} (${dateFull})\nTimezone: Indian Standard Time (IST, UTC+5:30)\n================================================================================\n\n[${timeIST}] PLAYER REGISTERED: ${name} (Age: ${age})\n`;
      
      await Promise.allSettled([
        appendFileToGitHub('PrathamGames/data/registered_users.txt', regLine, `Register player: ${name} [IST]`),
        appendFileToGitHub(userFile, userContent, `Init daily log: ${name} [IST]`)
      ]);
    } catch (e) {
      console.error('Async GitHub sync error:', e);
    }
  }

  return res.status(200).json({ success: true, player: playerObj });
};
