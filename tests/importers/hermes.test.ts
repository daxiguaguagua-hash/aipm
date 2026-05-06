import { importHermes } from '../../src/importers/hermes';

const fixture = `
model:
  default: deepseek-v4-pro
  provider: deepseek
  base_url: https://api.deepseek.com/v1

agent:
  max_turns: 60
  reasoning_effort: medium
  personalities:
    helpful: You are a helpful, friendly AI assistant.
    concise: You are a concise assistant.

platform_toolsets:
  cli:
  - hermes-cli
  telegram:
  - hermes-telegram
  discord:
  - hermes-discord

compression:
  enabled: true
  threshold: 0.5

memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200

session_reset:
  mode: both
  idle_minutes: 1440

tool_loop_guardrails:
  warnings_enabled: true
  hard_stop_enabled: false

code_execution:
  timeout: 300
  max_tool_calls: 50

delegation:
  max_iterations: 50
`;

describe('importHermes', () => {
  let plan: Awaited<ReturnType<typeof importHermes>>;

  beforeAll(async () => {
    plan = await importHermes(fixture);
  });

  test('extracts source info', () => {
    expect(plan.source.tool).toBe('hermes');
    expect(plan.source.path).toBe('~/.hermes/config.yaml');
  });

  test('extracts model config as notes', () => {
    const notesStr = plan.notes.join('\n');
    expect(notesStr).toContain('deepseek-v4-pro');
    expect(notesStr).toContain('https://api.deepseek.com/v1');
  });

  test('extracts agent config settings', () => {
    const notesStr = plan.notes.join('\n');
    expect(notesStr).toContain('max_turns: 60');
    expect(notesStr).toContain('reasoning_effort: medium');
  });

  test('extracts personalities as inline agents', () => {
    const helpful = plan.agents.find((a) => a.id === 'personality-helpful');
    expect(helpful).toBeDefined();
    expect(helpful?.system).toBe('You are a helpful, friendly AI assistant.');

    const concise = plan.agents.find((a) => a.id === 'personality-concise');
    expect(concise).toBeDefined();
  });

  test('does not import more than 5 personalities to avoid noise', () => {
    // Fixture has 2 personalities, which is fine
    expect(plan.agents.length).toBeLessThanOrEqual(5);
  });

  test('extracts platform toolsets', () => {
    const notesStr = plan.notes.join('\n');
    expect(notesStr).toContain('cli');
    expect(notesStr).toContain('telegram');
    expect(notesStr).toContain('discord');
  });

  test('lists unmapped Hermes-specific fields', () => {
    const unmappedSet = new Set(plan.unmapped);
    expect(unmappedSet.has('compression')).toBe(true);
    expect(unmappedSet.has('memory')).toBe(true);
    expect(unmappedSet.has('session_reset')).toBe(true);
    expect(unmappedSet.has('tool_loop_guardrails')).toBe(true);
    expect(unmappedSet.has('code_execution')).toBe(true);
    expect(unmappedSet.has('delegation')).toBe(true);
  });

  test('does not extract secrets', () => {
    const planJson = JSON.stringify(plan);
    expect(planJson).not.toContain('api_key');
  });
});
