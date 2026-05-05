import { parseGitHubRepo } from '../src/github';

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
