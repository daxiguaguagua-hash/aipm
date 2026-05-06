import { formatGitHubFailureHint, parseGitHubRepo } from '../src/github';

describe('parseGitHubRepo', () => {
  test('parses github: prefix', () => {
    const result = parseGitHubRepo('github:owner/repo');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  test('parses github: prefix with version', () => {
    const result = parseGitHubRepo('github:myorg/my-agent');
    expect(result).toEqual({ owner: 'myorg', repo: 'my-agent' });
  });

  test('parses https GitHub URL', () => {
    const result = parseGitHubRepo('https://github.com/anthropics/claude-code.git');
    expect(result).toEqual({ owner: 'anthropics', repo: 'claude-code' });
  });

  test('parses https GitHub URL without .git', () => {
    const result = parseGitHubRepo('https://github.com/owner/repo');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  test('returns null for non-GitHub URL', () => {
    expect(parseGitHubRepo('https://gitlab.com/owner/repo')).toBeNull();
    expect(parseGitHubRepo('git@github.com:user/repo.git')).toBeNull();
    expect(parseGitHubRepo('not-even-a-url')).toBeNull();
  });

  test('returns null for malformed github: prefix', () => {
    expect(parseGitHubRepo('github:owner')).toBeNull();
    expect(parseGitHubRepo('github:owner/repo/extra')).toBeNull();
  });
});

describe('formatGitHubFailureHint', () => {
  test('explains missing token or private repository access failures', () => {
    const message = formatGitHubFailureHint(
      new Error('Not Found'),
      'owner',
      'private-repo',
      'v1.0.0'
    );

    expect(message).toContain('GitHub release lookup failed for owner/private-repo@v1.0.0');
    expect(message).toContain('If this is a private repository, run `gh auth status`');
    expect(message).toContain('or set `GITHUB_TOKEN`');
  });

  test('explains release-not-found failures', () => {
    const message = formatGitHubFailureHint(
      new Error('Not Found'),
      'owner',
      'repo',
      'v9.9.9'
    );

    expect(message).toContain('confirm that release tag `v9.9.9` exists');
  });

  test('explains tarball download failures', () => {
    const message = formatGitHubFailureHint(
      new Error('Download failed (403)'),
      'owner',
      'repo'
    );

    expect(message).toContain('Tarball download failed');
    expect(message).toContain('check GitHub token permissions');
  });
});
