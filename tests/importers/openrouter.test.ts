import { importOpenRouter } from '../../src/importers/openrouter';

const fixture = JSON.stringify({
  models: [
    { id: 'google/gemini-2.5-flash', context_length: 1048576, pricing: { prompt: '0.15', completion: '0.60' } },
    { id: 'anthropic/claude-sonnet-4-6', context_length: 200000, pricing: { prompt: '3.00', completion: '15.00' } },
    { id: 'openai/gpt-5.1', context_length: 272000, pricing: { prompt: '1.25', completion: '10.00' } },
    { id: 'meta-llama/llama-4-maverick', context_length: 131072, pricing: { prompt: '0.20', completion: '0.60' } },
  ],
  prompt_template: 'You are a helpful assistant.',
});

describe('importOpenRouter', () => {
  let plan: Awaited<ReturnType<typeof importOpenRouter>>;

  beforeAll(async () => {
    plan = await importOpenRouter(fixture);
  });

  test('extracts source info', () => {
    expect(plan.source.tool).toBe('openrouter');
    expect(plan.source.path).toBe('~/.openrouter/models.json');
  });

  test('does not generate agents', () => {
    expect(plan.agents).toHaveLength(0);
  });

  test('does not generate MCPs', () => {
    expect(plan.mcps).toHaveLength(0);
  });

  test('extracts model recommendations as notes', () => {
    const notesStr = plan.notes.join('\n');
    expect(notesStr).toContain('google/gemini-2.5-flash');
    expect(notesStr).toContain('anthropic/claude-sonnet-4-6');
    expect(notesStr).toContain('openai/gpt-5.1');
    expect(notesStr).toContain('meta-llama/llama-4-maverick');
  });

  test('handles empty input gracefully', async () => {
    const emptyPlan = await importOpenRouter('{}');
    expect(emptyPlan.source.tool).toBe('openrouter');
    expect(emptyPlan.notes.length).toBeGreaterThanOrEqual(0);
    expect(emptyPlan.agents).toHaveLength(0);
  });

  test('handles missing models key', async () => {
    const planNoModels = await importOpenRouter('{"other": "data"}');
    expect(planNoModels.notes.length).toBeGreaterThanOrEqual(0);
    expect(planNoModels.agents).toHaveLength(0);
  });
});
