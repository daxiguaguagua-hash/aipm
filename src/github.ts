import { execFileSync } from 'child_process';
import https from 'https';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import os from 'os';
import { ensureDir, logInfo } from './utils';

interface ReleaseInfo {
  tag: string;
  tarballUrl: string;
}

/**
 * Format an actionable GitHub release failure hint for alpha users.
 */
export function formatGitHubFailureHint(
  error: Error,
  owner: string,
  repo: string,
  version?: string
): string {
  const target = `${owner}/${repo}${version ? `@${version}` : '@latest'}`;
  const detail = error.message;
  const lower = detail.toLowerCase();
  const lines = [`GitHub release lookup failed for ${target}: ${detail}.`];

  if (lower.includes('download failed')) {
    lines[0] = `Tarball download failed for ${target}: ${detail}.`;
    lines.push('Next steps: check GitHub token permissions, release asset availability, and network access.');
  } else if (lower.includes('not found') || lower.includes('404')) {
    lines.push('Next steps: confirm the repository exists and that the release tag is correct.');
    if (version) {
      lines.push(`If a specific version was requested, confirm that release tag \`${version}\` exists.`);
    }
    lines.push('If this is a private repository, run `gh auth status` and confirm the account has repository access, or set `GITHUB_TOKEN` with repo permissions.');
  } else if (lower.includes('bad credentials') || lower.includes('401') || lower.includes('403') || lower.includes('rate limit')) {
    lines.push('Next steps: run `gh auth status`, refresh GitHub auth if needed, or set `GITHUB_TOKEN` with repo permissions.');
  } else {
    lines.push('Next steps: check network access, GitHub release availability, and authentication with `gh auth status` or `GITHUB_TOKEN`.');
  }

  return lines.join(' ');
}

/**
 * Extract owner/repo from GitHub URL or github: prefix
 */
export function parseGitHubRepo(source: string): { owner: string; repo: string } | null {
  const githubPrefix = /^github:(.+)/;
  const githubUrl = /^https?:\/\/github\.com\/([^/]+)\/([^/\s.]+?)(?:\.git)?$/;

  let match = source.match(githubPrefix);
  if (match) {
    const parts = match[1].split('/');
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  }

  match = source.match(githubUrl);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }

  return null;
}

/**
 * Get GitHub API auth token from gh CLI or GITHUB_TOKEN env
 */
function getAuthToken(): string | null {
  try {
    const token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (token) return token;
  } catch {}

  return process.env.GITHUB_TOKEN || null;
}

/**
 * Fetch release info for a GitHub repo at the given tag
 */
async function getReleaseInfo(owner: string, repo: string, version?: string): Promise<ReleaseInfo> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'aipm',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let path: string;
  if (version) {
    path = `/repos/${owner}/${repo}/releases/tags/${version}`;
  } else {
    path = `/repos/${owner}/${repo}/releases/latest`;
  }

  const data = await githubApiRequest(headers, path);
  const release = JSON.parse(data);

  return {
    tag: release.tag_name,
    tarballUrl: release.tarball_url,
  };
}

function githubApiRequest(headers: Record<string, string>, apiPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method: 'GET',
      headers: {
        ...headers,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'aipm',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        if (!redirectUrl) {
          reject(new Error(`Redirect without location header`));
          return;
        }
        // Follow redirect (e.g., tarball download)
        https.get(redirectUrl, (redirectRes) => {
          const chunks: Buffer[] = [];
          redirectRes.on('data', (chunk: Buffer) => chunks.push(chunk));
          redirectRes.on('end', () => resolve(Buffer.concat(chunks).toString('binary')));
          redirectRes.on('error', reject);
        }).on('error', reject);
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode && res.statusCode >= 400) {
          let message = `GitHub API error (${res.statusCode})`;
          try {
            const err = JSON.parse(body);
            message = err.message || message;
          } catch {}
          reject(new Error(message));
        } else {
          resolve(body);
        }
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Download a GitHub release tarball to a temp file
 * Returns the temp file path
 */
export async function downloadRelease(
  owner: string,
  repo: string,
  version?: string
): Promise<{ tarballPath: string; tag: string }> {
  let release: ReleaseInfo;
  try {
    release = await getReleaseInfo(owner, repo, version);
  } catch (error) {
    throw new Error(formatGitHubFailureHint(error as Error, owner, repo, version));
  }
  logInfo(`Found release ${release.tag} for ${owner}/${repo}`);

  const headers: Record<string, string> = {
    'User-Agent': 'aipm',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const tmpDir = path.join(os.tmpdir(), 'aipm-github');
  await ensureDir(tmpDir);
  const tarballPath = path.join(tmpDir, `${repo}-${release.tag}.tar.gz`);

  try {
    await downloadFile(release.tarballUrl, headers, tarballPath);
  } catch (error) {
    throw new Error(formatGitHubFailureHint(error as Error, owner, repo, version));
  }

  return { tarballPath, tag: release.tag };
}

function downloadFile(url: string, headers: Record<string, string>, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { ...headers, 'Accept': 'application/octet-stream' },
    };

    https.get(options, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        if (!redirectUrl) {
          reject(new Error('Redirect without location'));
          return;
        }
        downloadFile(redirectUrl, headers, dest).then(resolve, reject);
        return;
      }

      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`Download failed (${res.statusCode})`));
        return;
      }

      const fileStream = createWriteStream(dest);
      pipeline(res, fileStream).then(() => resolve()).catch(reject);
    }).on('error', reject);
  });
}
