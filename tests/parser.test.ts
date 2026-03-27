import { parseStackConfig, loadStackConfigFromFile, loadStackConfigFromFileSync } from '../src/parser';
import fs from 'fs';

// Mock only fs, not js-yaml since we need real YAML parsing
jest.mock('fs');

describe('parseStackConfig', () => {
  test('parse valid stack config', () => {
    const config = `
project: my-ai-stack

skills:
  - id: code-review
    source: github:anthonyclays/code-review-skill
    entry: ./main.md

agents:
  - id: planner
    skills: [code-review]

mcps:
  - id: git
    command: git

targets:
  claude-code:
    agents: [planner]
  openclaw:
    skills: [code-review]
  opencode:
    mcps: [git]
`;
    const result = parseStackConfig(config);
    expect(result.project).toBe('my-ai-stack');
    expect(result.skills).toHaveLength(1);
    expect(result.skills?.[0].id).toBe('code-review');
    expect(result.agents).toHaveLength(1);
    expect(result.agents?.[0].id).toBe('planner');
    expect(result.mcps).toHaveLength(1);
    expect(result.mcps?.[0].id).toBe('git');
    expect(result.targets['claude-code']).toBeDefined();
    expect(result.targets['openclaw']).toBeDefined();
    expect(result.targets['opencode']).toBeDefined();
  });

  test('throw error when missing project field', () => {
    const config = `
skills:
  - id: code-review
    source: github:anthonyclays/code-review-skill
    entry: ./main.md
`;
    expect(() => parseStackConfig(config)).toThrow('Missing or invalid "project" field');
  });

  test('throw error when invalid targets type', () => {
    const config = `
project: my-ai-stack
targets: "not an object"
`;
    expect(() => parseStackConfig(config)).toThrow('Missing or invalid "targets" field');
  });

  test('throw error when invalid target platform', () => {
    const config = `
project: my-ai-stack
targets:
  invalid-platform:
    agents: [planner]
`;
    expect(() => parseStackConfig(config)).toThrow('Invalid target platform: invalid-platform');
  });

  test('throw error when skill missing required fields', () => {
    const config = `
project: my-ai-stack
skills:
  - id: code-review
    source: github:anthonyclays/code-review-skill
targets:
  claude-code:
    agents: [planner]
`;
    expect(() => parseStackConfig(config)).toThrow('Skill at index 0 missing required "entry" field');
  });

  test('throw error when agent missing required fields', () => {
    const config = `
project: my-ai-stack
agents:
  - id: planner
targets:
  claude-code:
    agents: [planner]
`;
    expect(() => parseStackConfig(config)).toThrow('Agent at index 0 missing or invalid "skills" field');
  });

  test('throw error when MCP missing required fields', () => {
    const config = `
project: my-ai-stack
mcps:
  - id: git
targets:
  claude-code:
    mcps: [git]
`;
    expect(() => parseStackConfig(config)).toThrow('MCP at index 0 missing required "command" field');
  });
});

describe('loadStackConfigFromFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup fs.promises mock
    (fs as any).promises = {
      readFile: jest.fn(),
    };
  });

  test('load and parse config file asynchronously', async () => {
    const mockContent = `
project: my-ai-stack
targets:
  claude-code:
    agents: [planner]
`;
    (fs.promises.readFile as jest.Mock).mockResolvedValue(mockContent);

    const result = await loadStackConfigFromFile('test-config.yaml');
    expect(fs.promises.readFile).toHaveBeenCalledWith('test-config.yaml', 'utf8');
    expect(result.project).toBe('my-ai-stack');
  });

  test('throw error when file read fails', async () => {
    (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

    await expect(loadStackConfigFromFile('nonexistent.yaml')).rejects.toThrow('File not found');
  });
});

describe('loadStackConfigFromFileSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('load and parse config file synchronously', () => {
    const mockContent = `
project: my-ai-stack
targets:
  claude-code:
    agents: [planner]
`;
    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = loadStackConfigFromFileSync('test-config.yaml');
    expect(fs.readFileSync).toHaveBeenCalledWith('test-config.yaml', 'utf8');
    expect(result.project).toBe('my-ai-stack');
  });

  test('throw error when file read fails synchronously', () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File not found');
    });

    expect(() => loadStackConfigFromFileSync('nonexistent.yaml')).toThrow('File not found');
  });
});
