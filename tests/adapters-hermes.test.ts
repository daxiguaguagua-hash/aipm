import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import { HermesAdapter } from '../src/adapters/hermes';
import { StackConfig } from '../src/types';

describe('HermesAdapter', () => {
  test('should export MCP servers to YAML', async () => {
    const adapter = new HermesAdapter();
    const stack: StackConfig = {
      project: 'test',
      mcps: [
        { id: 'filesystem', command: 'npx', args: ['-y', '@mcp/server-filesystem', '.'], transport: 'stdio' },
        { id: 'github', command: 'npx', args: ['-y', '@mcp/server-github'], env: { GITHUB_TOKEN: 'test' } },
      ],
      targets: {
        'claude-code': {},
        openclaw: {},
        opencode: {},
        codex: {},
        hermes: { mcps: ['filesystem', 'github'] },
      },
    };
    const installed = { skills: [], agents: [], mcps: [] };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const exportPath = path.join(tempDir, '.hermes', 'stack-export.yaml');
    expect(fs.existsSync(exportPath)).toBe(true);

    const content = yaml.load(fs.readFileSync(exportPath, 'utf8')) as any;
    expect(content.mcp_servers).toBeDefined();
    expect(content.mcp_servers.filesystem.command).toBe('npx');
    expect(content.mcp_servers.filesystem.args).toEqual(['-y', '@mcp/server-filesystem', '.']);
    expect(content.mcp_servers.github.env).toEqual({ GITHUB_TOKEN: 'test' });

    fs.rmSync(tempDir, { recursive: true });
  });

  test('should export HTTP MCP servers to YAML', async () => {
    const adapter = new HermesAdapter();
    const stack: StackConfig = {
      project: 'test',
      mcps: [
        { id: 'figma', url: 'https://mcp.figma.com/mcp', transport: 'http' },
      ],
      targets: {
        'claude-code': {},
        openclaw: {},
        opencode: {},
        codex: {},
        hermes: { mcps: ['figma'] },
      },
    };
    const installed = { skills: [], agents: [], mcps: [] };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const exportPath = path.join(tempDir, '.hermes', 'stack-export.yaml');
    const content = yaml.load(fs.readFileSync(exportPath, 'utf8')) as any;
    expect(content.mcp_servers.figma.url).toBe('https://mcp.figma.com/mcp');

    fs.rmSync(tempDir, { recursive: true });
  });

  test('should export skills as markdown files', async () => {
    const adapter = new HermesAdapter();

    // Create a real skill directory with content
    const skillCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-skill-'));
    const skillEntryContent = '# Code Review Skill\n\nThis skill reviews code.\n';
    fs.writeFileSync(path.join(skillCacheDir, 'SKILL.md'), skillEntryContent, 'utf8');

    const stack: StackConfig = {
      project: 'test',
      skills: [
        { id: 'code-review', source: 'https://example.com/skill', entry: './SKILL.md' },
      ],
      targets: {
        'claude-code': {},
        openclaw: {},
        opencode: {},
        codex: {},
        hermes: { skills: ['code-review'] },
      },
    };
    const installed = {
      skills: [{ id: 'code-review', source: 'https://example.com/skill', version: 'v1.0.0', path: skillCacheDir }],
      agents: [],
      mcps: [],
    };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const skillDir = path.join(tempDir, '.hermes', 'skills', 'code-review');
    expect(fs.existsSync(skillDir)).toBe(true);

    const skillFile = path.join(skillDir, 'SKILL.md');
    expect(fs.existsSync(skillFile)).toBe(true);

    const content = fs.readFileSync(skillFile, 'utf8');
    expect(content).toContain('# Code Review Skill');
    expect(content).toContain('reviews code');

    fs.rmSync(tempDir, { recursive: true });
    fs.rmSync(skillCacheDir, { recursive: true });
  });

  test('should export agents as YAML config', async () => {
    const adapter = new HermesAdapter();
    const stack: StackConfig = {
      project: 'test',
      agents: [
        { id: 'inline-planner', model: 'claude-haiku', system: 'Keep it short.', skills: ['code-review'] },
      ],
      targets: {
        'claude-code': {},
        openclaw: {},
        opencode: {},
        codex: {},
        hermes: { agents: ['inline-planner'] },
      },
    };
    const installed = { skills: [], agents: [], mcps: [] };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const exportPath = path.join(tempDir, '.hermes', 'stack-export.yaml');
    const content = yaml.load(fs.readFileSync(exportPath, 'utf8')) as any;
    expect(content.agents).toBeDefined();
    expect(content.agents['inline-planner']).toBeDefined();
    expect(content.agents['inline-planner'].model).toBe('claude-haiku');
    expect(content.agents['inline-planner'].system).toBe('Keep it short.');

    fs.rmSync(tempDir, { recursive: true });
  });

  test('should skip missing MCP references gracefully', async () => {
    const adapter = new HermesAdapter();
    const stack: StackConfig = {
      project: 'test',
      targets: {
        'claude-code': {},
        openclaw: {},
        opencode: {},
        codex: {},
        hermes: { mcps: ['missing-mcp'] },
      },
    };
    const installed = { skills: [], agents: [], mcps: [] };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const exportPath = path.join(tempDir, '.hermes', 'stack-export.yaml');
    expect(fs.existsSync(exportPath)).toBe(true);
    const content = yaml.load(fs.readFileSync(exportPath, 'utf8')) as any;
    expect(content.mcp_servers).toEqual({});

    fs.rmSync(tempDir, { recursive: true });
  });

  test('should handle empty targets gracefully', async () => {
    const adapter = new HermesAdapter();
    const stack: StackConfig = {
      project: 'test',
      targets: {
        'claude-code': {},
        openclaw: {},
        opencode: {},
        codex: {},
        hermes: {},
      },
    };
    const installed = { skills: [], agents: [], mcps: [] };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const exportPath = path.join(tempDir, '.hermes', 'stack-export.yaml');
    expect(fs.existsSync(exportPath)).toBe(true);

    fs.rmSync(tempDir, { recursive: true });
  });
});
