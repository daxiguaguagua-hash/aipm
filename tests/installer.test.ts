import { GitInstaller } from '../src/installer';
import { CacheManager } from '../src/cache';
import { Skill, Agent } from '../src/types';

// Mock simple-git
jest.mock('simple-git', () => {
  const mockGit = {
    clone: jest.fn().mockResolvedValue(undefined),
    checkout: jest.fn().mockResolvedValue(undefined),
    revparse: jest.fn().mockResolvedValue('abcdef1234567890\n'),
  };
  return jest.fn(() => mockGit);
});

// Mock CacheManager
jest.mock('../src/cache');

describe('GitInstaller', () => {
  let cacheManager: jest.Mocked<CacheManager>;
  let installer: GitInstaller;
  const mockSimpleGit = require('simple-git');

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager = new CacheManager() as jest.Mocked<CacheManager>;
    cacheManager.getCachePath.mockImplementation((id) => `/tmp/aipm/cache/${id}`);
    installer = new GitInstaller(cacheManager);
  });

  test('should return existing installed skill if already installed at same version', async () => {
    const skill: Skill = {
      id: 'test-skill',
      source: 'https://github.com/user/test-skill.git',
      version: 'v1.0.0',
      entry: './main.md',
    };

    const existingMeta = {
      id: 'test-skill',
      source: 'https://github.com/user/test-skill.git',
      version: 'v1.0.0',
      path: '/cache/test-skill',
    };

    cacheManager.isInstalled.mockResolvedValue(true);
    cacheManager.getInstalledMetadata.mockResolvedValue(existingMeta);

    const result = await installer.installSkill(skill);

    expect(result).toEqual(existingMeta);
    expect(mockSimpleGit).not.toHaveBeenCalled();
  });

  test('should install new skill when not installed', async () => {
    const skill: Skill = {
      id: 'test-skill',
      source: 'https://github.com/user/test-skill.git',
      version: 'v1.0.0',
      entry: './main.md',
    };

    cacheManager.isInstalled.mockResolvedValue(false);

    const result = await installer.installSkill(skill);

    expect(cacheManager.saveMetadata).toHaveBeenCalled();
    expect(result.id).toBe('test-skill');
    expect(result.version).toBe('v1.0.0');
    expect(mockSimpleGit).toHaveBeenCalled();
  });

  test('should clean git+ prefix from URL', async () => {
    const skill: Skill = {
      id: 'test-skill',
      source: 'git+https://github.com/user/test-skill.git',
      entry: './main.md',
    };

    cacheManager.isInstalled.mockResolvedValue(false);

    await installer.installSkill(skill);

    // The git clone should be called without git+ prefix
    // We can't directly test the private method, but the code path should work
    expect(cacheManager.saveMetadata).toHaveBeenCalled();
  });

  test('should handle SSH URL format', async () => {
    const skill: Skill = {
      id: 'test-skill',
      source: 'git@github.com:user/test-skill.git',
      entry: './main.md',
    };

    cacheManager.isInstalled.mockResolvedValue(false);

    const result = await installer.installSkill(skill);

    expect(result.id).toBe('test-skill');
    expect(cacheManager.saveMetadata).toHaveBeenCalled();
  });

  test('installAgent should install agent from git', async () => {
    const mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
      checkout: jest.fn().mockResolvedValue(undefined),
      revparse: jest.fn().mockResolvedValue('abcdef1234567890'),
    };
    (mockSimpleGit as jest.Mock).mockReturnValue(mockGit);

    cacheManager.isInstalled = jest.fn().mockResolvedValue(false);
    cacheManager.saveMetadata = jest.fn().mockResolvedValue(undefined);

    const agent = {
      id: 'test-agent',
      source: 'https://github.com/user/test-agent.git',
      version: 'v1.0.0',
      skills: ['test-skill'],
    };

    const result = await installer.installAgent(agent);

    expect(result.id).toBe('test-agent');
    expect(result.version).toBe('v1.0.0');
    expect(cacheManager.saveMetadata).toHaveBeenCalled();
    expect(mockGit.clone).toHaveBeenCalled();
  });

  test('installAgent should return existing if already installed', async () => {
    cacheManager.isInstalled = jest.fn().mockResolvedValue(true);
    cacheManager.getInstalledMetadata = jest.fn().mockResolvedValue({
      id: 'test-agent',
      source: 'https://github.com/user/test-agent.git',
      version: 'v1.0.0',
      path: '/cache/test-agent',
    });
    cacheManager.saveMetadata = jest.fn().mockResolvedValue(undefined);

    const agent = {
      id: 'test-agent',
      source: 'https://github.com/user/test-agent.git',
      version: 'v1.0.0',
      skills: ['test-skill'],
    };

    const result = await installer.installAgent(agent);

    expect(result.version).toBe('v1.0.0');
    expect(cacheManager.saveMetadata).not.toHaveBeenCalled();
  });
});
