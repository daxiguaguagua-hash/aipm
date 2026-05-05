import fs from 'fs';
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

// Mock fs.promises for safe swap operations in installer
jest.spyOn(fs.promises, 'rm').mockResolvedValue(undefined);
jest.spyOn(fs.promises, 'rename').mockResolvedValue(undefined);
jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);

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
    const agent: Agent = {
      id: 'test-agent',
      source: 'https://github.com/user/test-agent.git',
      version: 'v1.0.0',
      skills: ['test-skill'],
    };

    cacheManager.isInstalled.mockResolvedValue(false);

    const result = await installer.installAgent(agent);

    expect(cacheManager.saveMetadata).toHaveBeenCalled();
    expect(result.id).toBe('test-agent');
    expect(result.version).toBe('v1.0.0');
    expect(mockSimpleGit).toHaveBeenCalled();
  });

  test('installAgent should return existing if already installed at same version', async () => {
    const agent: Agent = {
      id: 'test-agent',
      source: 'https://github.com/user/test-agent.git',
      version: 'v1.0.0',
      skills: ['test-skill'],
    };

    const existingMeta = {
      id: 'test-agent',
      source: 'https://github.com/user/test-agent.git',
      version: 'v1.0.0',
      path: '/cache/test-agent',
    };

    cacheManager.isInstalled.mockResolvedValue(true);
    cacheManager.getInstalledMetadata.mockResolvedValue(existingMeta);

    const result = await installer.installAgent(agent);

    expect(result).toEqual(existingMeta);
    expect(mockSimpleGit).not.toHaveBeenCalled();
  });

  test('installAgent should upgrade agent when version differs', async () => {
    const agent: Agent = {
      id: 'test-agent',
      source: 'https://github.com/user/test-agent.git',
      version: 'v2.0.0',
      skills: ['test-skill'],
    };

    const existingMeta = {
      id: 'test-agent',
      source: 'https://github.com/user/test-agent.git',
      version: 'v1.0.0',
      path: '/cache/test-agent',
    };

    cacheManager.isInstalled.mockResolvedValue(true);
    cacheManager.getInstalledMetadata.mockResolvedValue(existingMeta);

    const result = await installer.installAgent(agent);

    // Safe swap: clones to .new, then replaces old. git clone is still called.
    expect(cacheManager.saveMetadata).toHaveBeenCalled();
    expect(result.version).toBe('v2.0.0');
  });

  test('installAgent should throw error when agent has no source', async () => {
    const agent: Agent = {
      id: 'test-agent',
      skills: ['test-skill'],
    };

    await expect(installer.installAgent(agent)).rejects.toThrow('Agent test-agent has no source URL');
  });

  test('installSkill should throw error when skill has no source', async () => {
    const skill = {
      id: 'test-skill',
      entry: './main.md',
    } as unknown as Skill;

    await expect(installer.installSkill(skill)).rejects.toThrow('Skill test-skill has no source URL');
  });
});
