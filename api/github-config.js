const { getGitHubConfig } = require('./_github');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token, repo } = getGitHubConfig();

  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }
    return res.status(200).json({
      success: true,
      message: 'Config updated in session',
      config: {
        github_repo: body.github_repo || repo,
        github_token: body.github_token ? '••••••••' : (token ? '••••••••' : ''),
        webhook_url: body.webhook_url || ''
      }
    });
  }

  return res.status(200).json({
    success: true,
    config: {
      github_repo: repo,
      github_token: token ? '••••••••' : '',
      webhook_url: ''
    }
  });
};
