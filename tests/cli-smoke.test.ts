import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('CLI smoke test', () => {
  const repoRoot = path.join(__dirname, '..');
  const cliPath = path.join(repoRoot, 'dist', 'cli.js');
  let tempRoot: string;
  let projectDir: string;
  let homeDir: string;

  function runCli(args: string[]): string {
    return execFileSync(process.execPath, [cliPath, ...args], {
      cwd: projectDir,
      env: {
        ...process.env,
        HOME: homeDir,
        NO_COLOR: '1',
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-cli-smoke-'));
    projectDir = path.join(tempRoot, 'fixture-project');
    homeDir = path.join(tempRoot, 'home');
    fs.mkdirSync(projectDir);
    fs.mkdirSync(homeDir);
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('runs init, validate, install, export, and use without network dependencies', () => {
    expect(fs.existsSync(cliPath)).toBe(true);

    const initOutput = runCli(['init']);
    expect(initOutput).toContain('Initialized aipm project "fixture-project"');
    expect(fs.existsSync(path.join(projectDir, '.ai', 'stack.yaml'))).toBe(true);

    fs.writeFileSync(
      path.join(projectDir, '.ai', 'stack.yaml'),
      `project: aipm-cli-smoke

skills: []

agents:
  - id: smoke-planner
    model: claude-haiku
    system: You verify the aipm CLI smoke path.
    skills: []

mcps:
  - id: filesystem
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
    transport: stdio

targets:
  claude-code:
    mcps: [filesystem]
    agents: [smoke-planner]
    skills: []
`,
      'utf8'
    );

    const validateOutput = runCli(['validate']);
    expect(validateOutput).toContain('Configuration is valid for project "aipm-cli-smoke"');
    expect(validateOutput).toContain('0 skills, 1 agents, 1 MCPs');

    const dryRunOutput = runCli(['install', '--dry-run']);
    expect(dryRunOutput).toContain('Dry run - would install:');
    expect(dryRunOutput).toContain('0 skill(s), 0 agent(s)');
    expect(fs.existsSync(path.join(projectDir, '.ai', 'stack.lock'))).toBe(false);

    const installOutput = runCli(['install']);
    expect(installOutput).toContain('Install complete: 0 skills, 0 agents, 0 MCPs');
    expect(fs.existsSync(path.join(projectDir, '.ai', 'stack.lock'))).toBe(true);

    const exportOutput = runCli(['export', 'claude-code']);
    expect(exportOutput).toContain('Export complete for claude-code');
    expect(fs.existsSync(path.join(projectDir, '.claude', 'settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.claude', 'agents.json'))).toBe(true);

    const useOutput = runCli(['use', 'claude-code']);
    expect(useOutput).toContain('Switched to claude-code environment');
    expect(fs.readFileSync(path.join(projectDir, '.ai', 'current'), 'utf8')).toBe('claude-code');

    const settings = JSON.parse(fs.readFileSync(path.join(projectDir, '.claude', 'settings.json'), 'utf8'));
    expect(settings.mcpServers.filesystem.command).toBe('npx');

    const agents = JSON.parse(fs.readFileSync(path.join(projectDir, '.claude', 'agents.json'), 'utf8'));
    expect(agents.agents['smoke-planner'].system).toBe('You verify the aipm CLI smoke path.');
  });
});
