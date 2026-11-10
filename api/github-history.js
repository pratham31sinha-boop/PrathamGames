const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let events = [];
  try {
    const actFile = path.join(process.cwd(), 'activity_logs.json');
    if (fs.existsSync(actFile)) {
      events = JSON.parse(fs.readFileSync(actFile, 'utf8'));
    }
  } catch (e) {}

  return res.status(200).json({ success: true, events });
};
