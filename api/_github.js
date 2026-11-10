/**
 * GitHub REST API Integration for Vercel Serverless Functions
 * Uses process.env.GITHUB_TOKEN and process.env.GITHUB_REPO
 */

const DEFAULT_REPO = 'pratham31sinha-boop/PrathamGames';

function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const repo = process.env.GITHUB_REPO || DEFAULT_REPO;
  return { token: token.trim(), repo: repo.trim() };
}

/**
 * Appends a line or writes content to a file inside the GitHub repository.
 * Handles existing files by fetching current SHA and Base64 appending.
 */
async function appendFileToGitHub(filePath, newText, commitMessage = 'Activity update [IST]') {
  const { token, repo } = getGitHubConfig();
  if (!token || !repo) {
    return { success: false, reason: 'No GITHUB_TOKEN configured' };
  }

  const cleanPath = filePath.replace(/^\/+/, '');
  const url = `https://api.github.com/repos/${repo}/contents/${cleanPath}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'PrathamGames-Vercel'
  };

  try {
    let existingSha = null;
    let existingContent = '';

    const getRes = await fetch(url, { headers });
    if (getRes.status === 200) {
      const data = await getRes.json();
      existingSha = data.sha;
      if (data.content) {
        existingContent = Buffer.from(data.content, 'base64').toString('utf8');
      }
    }

    const updatedContent = existingContent ? (existingContent.endsWith('\n') ? existingContent + newText : existingContent + '\n' + newText) : newText;
    const base64Content = Buffer.from(updatedContent, 'utf8').toString('base64');

    const putBody = {
      message: commitMessage,
      content: base64Content
    };
    if (existingSha) {
      putBody.sha = existingSha;
    }

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    if (putRes.ok) {
      return { success: true };
    } else {
      const errText = await putRes.text();
      console.error(`GitHub API commit failed (${putRes.status}):`, errText);
      return { success: false, error: errText };
    }
  } catch (err) {
    console.error('Error syncing to GitHub:', err);
    return { success: false, error: String(err) };
  }
}

module.exports = {
  getGitHubConfig,
  appendFileToGitHub
};
