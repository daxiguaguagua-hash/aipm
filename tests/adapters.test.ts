import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAdapter } from '../src/adapters';
import { ClaudeCodeAdapter } from '../src/adapters/claude-code';
import { OpenClawAdapter } from '../src/adapters/openclaw';
import { OpenCodeAdapter } from '../src/adapters/opencode';
import { StackConfig } from '../src/types';

describe('Adapters', () => {
  describe('getAdapter', () => {
    test('returns ClaudeCodeAdapter for claude-code', () => {
      const adapter = getAdapter('claude-code');
      expect(adapter).toBeInstanceOf(ClaudeCodeAdapter);
    });

    test('returns OpenClawAdapter for openclaw', () => {
      const adapter = getAdapter('openclaw');
      expect(adapter).toBeInstanceOf(OpenClawAdapter);
    });

    test('returns OpenCodeAdapter for opencode', () => {
      const adapter = getAdapter('opencode');
      expect(adapter).toBeInstanceOf(OpenCodeAdapter);
    });

    test('throws error for unsupported platform', () => {
      expect(() => getAdapter('invalid-platform' as any)).toThrow('Unsupported platform: invalid-platform');
    });
  });

  describe('ClaudeCodeAdapter skills export', () => {
    test('ClaudeCodeAdapter should export skills', async () => {
      const adapter = getAdapter('claude-code');
      const stack: StackConfig = {
        project: 'test',
        skills: [
          { id: 'test-skill', source: 'https://example.com/test', entry: './main.md' },
        ],
        targets: {
          'claude-code': {
            skills: ['test-skill'],
          },
          openclaw: {},
          opencode: {},
        },
      };
      const installed = {
        skills: [
          { id: 'test-skill', source: 'https://example.com/test', version: 'v1.0.0', path: '/tmp/cache/test-skill' },
        ],
        agents: [],
        mcps: [],
      };

      // Create temp directory
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));

      await adapter.exportConfig(stack, installed, tempDir);

      // Check that skills.json was created
      const skillsPath = path.join(tempDir, '.claude', 'skills.json');
      expect(fs.existsSync(skillsPath)).toBe(true);

      const skillsJson = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
      expect(skillsJson.skills['test-skill']).toEqual({
        path: '/tmp/cache/test-skill',
        version: 'v1.0.0',
      });

      // Cleanup
      fs.rmSync(tempDir, { recursive: true });
    });

    test('ClaudeCodeAdapter should export agents', async () => {
      const adapter = getAdapter('claude-code');
      const stack: StackConfig = {
        project: 'test',
        agents: [
          { id: 'test-agent', source: 'https://example.com/agent', skills: ['test-skill'] },
        ],
        targets: {
          'claude-code': {
            agents: ['test-agent'],
          },
          openclaw: {},
          opencode: {},
        },
      };
      const installed = {
        skills: [],
        agents: [
          { id: 'test-agent', source: 'https://example.com/agent', version: 'v2.0.0', path: '/tmp/cache/test-agent' },
        ],
        mcps: [],
      };

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
      await adapter.exportConfig(stack, installed, tempDir);

      const agentsPath = path.join(tempDir, '.claude', 'agents.json');
      expect(fs.existsSync(agentsPath)).toBe(true);

      const agentsJson = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
      expect(agentsJson.agents['test-agent']).toEqual({
        path: '/tmp/cache/test-agent',
        version: 'v2.0.0',
      });

      fs.rmSync(tempDir, { recursive: true });
    });
  });

  describe('OpenClawAdapter', () => {
    test('should export settings.json with skills and agents', async () => {
      const adapter = getAdapter('openclaw');
      const stack: StackConfig = {
        project: 'test',
        skills: [
          { id: 'test-skill', source: 'https://example.com/skill', entry: './main.md' },
        ],
        agents: [
          { id: 'test-agent', source: 'https://example.com/agent', skills: ['test-skill'] },
        ],
        mcps: [
          { id: 'filesystem', command: 'npx', args: ['-y', '@mcp/server-filesystem', '.'] },
        ],
        targets: {
          'claude-code': {},
          openclaw: {
            skills: ['test-skill'],
            agents: ['test-agent'],
            mcps: ['filesystem'],
          },
          opencode: {},
        },
      };
      const installed = {
        skills: [{ id: 'test-skill', source: 'https://example.com/skill', version: 'v1.0.0', path: '/tmp/cache/test-skill' }],
        agents: [{ id: 'test-agent', source: 'https://example.com/agent', version: 'v2.0.0', path: '/tmp/cache/test-agent' }],
        mcps: [],
      };

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
      await adapter.exportConfig(stack, installed, tempDir);

      const settingsPath = path.join(tempDir, '.nano', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.skills['test-skill']).toEqual({ path: '/tmp/cache/test-skill', version: 'v1.0.0' });
      expect(settings.agents['test-agent']).toEqual({ path: '/tmp/cache/test-agent', version: 'v2.0.0' });
      expect(settings.mcpServers['filesystem']).toBeDefined();

      fs.rmSync(tempDir, { recursive: true });
    });

    test('should handle missing installed skills/agents gracefully', async () => {
      const adapter = getAdapter('openclaw');
      const stack: StackConfig = {
        project: 'test',
        targets: {
          'claude-code': {},
          openclaw: { skills: ['missing-skill'], agents: ['missing-agent'] },
          opencode: {},
        },
      };
      const installed = { skills: [], agents: [], mcps: [] };

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
      await adapter.exportConfig(stack, installed, tempDir);

      const settingsPath = path.join(tempDir, '.nano', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(Object.keys(settings.skills)).toHaveLength(0);
      expect(Object.keys(settings.agents)).toHaveLength(0);

      fs.rmSync(tempDir, { recursive: true });
    });
  });

  describe('OpenCodeAdapter', () => {
    test('should export mcp.json with MCP servers', async () => {
      const adapter = getAdapter('opencode');
      const stack: StackConfig = {
        project: 'test',
        mcps: [
          { id: 'filesystem', command: 'npx', args: ['-y', '@mcp/server-filesystem', '.'], transport: 'stdio' },
          { id: 'github', command: 'npx', args: ['-y', '@mcp/server-github'], env: { GITHUB_TOKEN: 'test' } },
        ],
        targets: {
          'claude-code': {},
          openclaw: {},
          opencode: { mcps: ['filesystem', 'github'] },
        },
      };
      const installed = { skills: [], agents: [], mcps: [] };

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
      await adapter.exportConfig(stack, installed, tempDir);

      const mcpPath = path.join(tempDir, '.opencode', 'mcp.json');
      expect(fs.existsSync(mcpPath)).toBe(true);

      const mcpConfig = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
      expect(mcpConfig.mcpServers['filesystem']).toBeDefined();
      expect(mcpConfig.mcpServers['filesystem'].command).toBe('npx');
      expect(mcpConfig.mcpServers['filesystem'].transport).toBe('stdio');
      expect(mcpConfig.mcpServers['github'].env).toEqual({ GITHUB_TOKEN: 'test' });

      fs.rmSync(tempDir, { recursive: true });
    });

    test('should export ai.json with skills and agents', async () => {
      const adapter = getAdapter('opencode');
      const stack: StackConfig = {
        project: 'test',
        skills: [
          { id: 'test-skill', source: 'https://example.com/skill', entry: './main.md' },
        ],
        agents: [
          { id: 'test-agent', source: 'https://example.com/agent', skills: ['test-skill'] },
        ],
        targets: {
          'claude-code': {},
          openclaw: {},
          opencode: { skills: ['test-skill'], agents: ['test-agent'] },
        },
      };
      const installed = {
        skills: [{ id: 'test-skill', source: 'https://example.com/skill', version: 'v1.0.0', path: '/tmp/cache/test-skill' }],
        agents: [{ id: 'test-agent', source: 'https://example.com/agent', version: 'v2.0.0', path: '/tmp/cache/test-agent' }],
        mcps: [],
      };

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
      await adapter.exportConfig(stack, installed, tempDir);

      const aiPath = path.join(tempDir, '.opencode', 'ai.json');
      expect(fs.existsSync(aiPath)).toBe(true);

      const aiConfig = JSON.parse(fs.readFileSync(aiPath, 'utf8'));
      expect(aiConfig.skills['test-skill']).toEqual({ path: '/tmp/cache/test-skill', version: 'v1.0.0' });
      expect(aiConfig.agents['test-agent']).toEqual({ path: '/tmp/cache/test-agent', version: 'v2.0.0' });

      fs.rmSync(tempDir, { recursive: true });
    });
  });
    test('ClaudeCodeAdapter should export inline agents', async () => {
      const adapter = getAdapter('claude-code');
      const stack: StackConfig = {
        project: 'test',
        agents: [
          { id: 'inline-planner', model: 'claude-haiku', system: 'Keep it short.', skills: ['code-review'] },
        ],
        targets: {
          'claude-code': { agents: ['inline-planner'] },
          openclaw: {},
          opencode: {},
        },
      };
      const installed = { skills: [], agents: [], mcps: [] };

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
      await adapter.exportConfig(stack, installed, tempDir);

      const agentsPath = path.join(tempDir, '.claude', 'agents.json');
      expect(fs.existsSync(agentsPath)).toBe(true);

      const agentsJson = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
      expect(agentsJson.agents['inline-planner']).toEqual({
        model: 'claude-haiku',
        system: 'Keep it short.',
        skills: ['code-review'],
      });

      fs.rmSync(tempDir, { recursive: true });
    });


});
