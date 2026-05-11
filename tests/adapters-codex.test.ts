import fs from 'fs';
import path from 'path';
import os from 'os';
import { CodexAdapter } from '../src/adapters/codex';
import { StackConfig } from '../src/types';

describe('CodexAdapter', () => {
  test('should export MCP servers as TOML', async () => {
    const adapter = new CodexAdapter();
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
        codex: { mcps: ['filesystem', 'github'] },
        hermes: {},
      },
    };
    const installed = { skills: [], agents: [], mcps: [] };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const exportPath = path.join(tempDir, '.codex', 'stack-export.toml');
    expect(fs.existsSync(exportPath)).toBe(true);

    const content = fs.readFileSync(exportPath, 'utf8');
    expect(content).toContain('[mcp_servers.filesystem]');
    expect(content).toContain('command = "npx"');
    expect(content).toContain('[mcp_servers.github]');
    expect(content).toContain('GITHUB_TOKEN');

    fs.rmSync(tempDir, { recursive: true });
  });

  test('should export HTTP MCP servers with url', async () => {
    const adapter = new CodexAdapter();
    const stack: StackConfig = {
      project: 'test',
      mcps: [
        { id: 'figma', url: 'https://mcp.figma.com/mcp', transport: 'http' },
      ],
      targets: {
        'claude-code': {},
        openclaw: {},
        opencode: {},
        codex: { mcps: ['figma'] },
        hermes: {},
      },
    };
    const installed = { skills: [], agents: [], mcps: [] };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const exportPath = path.join(tempDir, '.codex', 'stack-export.toml');
    const content = fs.readFileSync(exportPath, 'utf8');
    expect(content).toContain('[mcp_servers.figma]');
    expect(content).toContain('url = "https://mcp.figma.com/mcp"');

    fs.rmSync(tempDir, { recursive: true });
  });

  test('should export agents as plugins', async () => {
    const adapter = new CodexAdapter();
    const stack: StackConfig = {
      project: 'test',
      agents: [
        { id: 'code-review', source: 'https://example.com/agent', skills: [] },
        { id: 'inline-planner', model: 'claude-haiku', system: 'Keep it short.', skills: ['code-review'] },
      ],
      targets: {
        'claude-code': {},
        openclaw: {},
        opencode: {},
        codex: { agents: ['code-review', 'inline-planner'] },
        hermes: {},
      },
    };
    const installed = {
      skills: [],
      agents: [
        { id: 'code-review', source: 'https://example.com/agent', version: 'v1.0.0', path: '/tmp/cache/code-review' },
      ],
      mcps: [],
    };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const exportPath = path.join(tempDir, '.codex', 'stack-export.toml');
    const content = fs.readFileSync(exportPath, 'utf8');
    expect(content).toContain('[plugins.code-review]');
    expect(content).toContain('[plugins.inline-planner]');
    expect(content).toContain('enabled = true');

    fs.rmSync(tempDir, { recursive: true });
  });

  test('should skip MCP not in stack configuration', async () => {
    const adapter = new CodexAdapter();
    const stack: StackConfig = {
      project: 'test',
      targets: {
        'claude-code': {},
        openclaw: {},
        opencode: {},
        codex: { mcps: ['missing-mcp'] },
        hermes: {},
      },
    };
    const installed = { skills: [], agents: [], mcps: [] };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const exportPath = path.join(tempDir, '.codex', 'stack-export.toml');
    expect(fs.existsSync(exportPath)).toBe(true);
    const content = fs.readFileSync(exportPath, 'utf8');
    expect(content).not.toContain('[mcp_servers.');

    fs.rmSync(tempDir, { recursive: true });
  });

  test('should handle empty targets gracefully', async () => {
    const adapter = new CodexAdapter();
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

    const exportPath = path.join(tempDir, '.codex', 'stack-export.toml');
    expect(fs.existsSync(exportPath)).toBe(true);

    fs.rmSync(tempDir, { recursive: true });
  });

  test('should quote TOML keys with special characters', async () => {
    const adapter = new CodexAdapter();
    const stack: StackConfig = {
      project: 'test',
      mcps: [
        { id: 'ns:special', command: 'npx', args: ['test'], transport: 'stdio' },
      ],
      agents: [
        { id: 'ns:agent', skills: [] },
      ],
      targets: {
        'claude-code': {},
        openclaw: {},
        opencode: {},
        codex: { mcps: ['ns:special'], agents: ['ns:agent'] },
        hermes: {},
      },
    };
    const installed = { skills: [], agents: [], mcps: [] };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));
    await adapter.exportConfig(stack, installed, tempDir);

    const exportPath = path.join(tempDir, '.codex', 'stack-export.toml');
    const content = fs.readFileSync(exportPath, 'utf8');
    expect(content).toContain('[mcp_servers."ns:special"]');
    expect(content).toContain('[plugins."ns:agent"]');

    fs.rmSync(tempDir, { recursive: true });
  });
});
