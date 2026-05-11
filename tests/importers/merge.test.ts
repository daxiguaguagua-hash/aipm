import { mergeIntoStack } from '../../src/importers/merge';
import { MigrationPlan } from '../../src/importers/types';
import { StackConfig } from '../../src/types';

const basePlan: MigrationPlan = {
  source: { tool: 'openclaw', path: '~/.openclaw/openclaw.json' },
  skills: [],
  agents: [
    { id: 'main', model: 'claude-opus', skills: [] },
    { id: 'planner', model: 'claude-haiku', skills: [] },
  ],
  mcps: [
    { id: 'qwen-portal', command: 'qwen-portal', transport: 'http' },
  ],
  unmapped: ['channels'],
  conflicts: [],
  notes: ['test migration'],
};

const baseStack: StackConfig = {
  project: 'test-project',
  skills: [],
  agents: [
    { id: 'planner', model: 'gpt-4', skills: ['code-review'], system: 'existing' },
  ],
  mcps: [
    { id: 'filesystem', command: 'npx', args: ['-y', '@mcp/server-filesystem', '.'] },
  ],
  targets: {
    'claude-code': { skills: [], agents: [], mcps: [] },
    openclaw: { skills: [], agents: [], mcps: [] },
    opencode: { skills: [], agents: [], mcps: [] },
    codex: {},
    hermes: {},
  },
};

describe('mergeIntoStack', () => {
  test('merges new agents without overwriting existing', () => {
    const result = mergeIntoStack(basePlan, JSON.parse(JSON.stringify(baseStack)), 'keep-existing');

    const agentIds = result.stack.agents!.map((a) => a.id);
    expect(agentIds).toContain('main');
    expect(agentIds).toContain('planner');

    // Existing planner should NOT be overwritten
    const planner = result.stack.agents!.find((a) => a.id === 'planner');
    expect(planner?.model).toBe('gpt-4');
    expect(planner?.system).toBe('existing');
    expect(planner?.skills).toContain('code-review');
  });

  test('reports conflicts with keep-existing strategy', () => {
    const result = mergeIntoStack(basePlan, JSON.parse(JSON.stringify(baseStack)), 'keep-existing');

    const plannerConflict = result.conflicts.find((c) => c.id === 'planner');
    expect(plannerConflict).toBeDefined();
    expect(plannerConflict?.type).toBe('agent');
  });

  test('overwrites when on-conflict is overwrite', () => {
    const result = mergeIntoStack(basePlan, JSON.parse(JSON.stringify(baseStack)), 'overwrite');

    const planner = result.stack.agents!.find((a) => a.id === 'planner');
    expect(planner?.model).toBe('claude-haiku');
    expect(planner?.skills).toEqual([]);
  });

  test('merges new MCPs', () => {
    const result = mergeIntoStack(basePlan, JSON.parse(JSON.stringify(baseStack)), 'keep-existing');

    const mcpIds = result.stack.mcps!.map((m) => m.id);
    expect(mcpIds).toContain('filesystem');
    expect(mcpIds).toContain('qwen-portal');
  });

  test('does not duplicate MCPs with same id', () => {
    const result = mergeIntoStack(basePlan, JSON.parse(JSON.stringify(baseStack)), 'keep-existing');
    const qwenMcps = result.stack.mcps!.filter((m) => m.id === 'qwen-portal');
    expect(qwenMcps).toHaveLength(1);
  });

  test('generates a preview summary', () => {
    const result = mergeIntoStack(basePlan, JSON.parse(JSON.stringify(baseStack)), 'keep-existing');
    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
  });

  test('returns the change counts', () => {
    const result = mergeIntoStack(basePlan, JSON.parse(JSON.stringify(baseStack)), 'keep-existing');
    expect(typeof result.addedAgents).toBe('number');
    expect(typeof result.skippedAgents).toBe('number');
    expect(typeof result.addedMcps).toBe('number');
  });
});
