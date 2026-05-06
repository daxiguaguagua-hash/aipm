import { importOpenClaw } from '../../src/importers/openclaw';

const fixture = JSON.stringify({
  meta: { lastTouchedVersion: '2026.4.23' },
  models: {
    mode: 'merge',
    providers: {
      'qwen-portal': {
        baseUrl: 'https://portal.qwen.ai/v1',
        apiKey: 'qwen-oauth',
        api: 'openai-completions',
        models: [
          { id: 'coder-model', name: 'Qwen Coder', contextWindow: 128000, maxTokens: 8192 },
        ],
      },
      deepseek: {
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'deepseek-api-key',
        api: 'openai-completions',
        models: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 131072, maxTokens: 8192 },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: {
        primary: 'openai-codex/gpt-5.4',
        fallbacks: [
          'openrouter/anthropic/claude-opus-4-6',
          'qwen-portal/coder-model',
        ],
      },
      models: {
        'openrouter/anthropic/claude-opus-4-6': { alias: 'opus' },
        'qwen-portal/coder-model': { alias: 'qwen' },
      },
    },
    list: [
      { id: 'main', model: 'openai-codex/gpt-5.4' },
      { id: 'unicom', name: 'unicom', model: 'openai-codex/gpt-5.4' },
    ],
  },
  channels: {
    telegram: {
      enabled: true,
      botToken: 'SECRET-TELEGRAM-TOKEN',
      dmPolicy: 'pairing',
    },
    feishu: {
      enabled: true,
      appId: 'cli-app-id',
      appSecret: 'SECRET-FEISHU-SECRET',
    },
  },
  gateway: {
    port: 18789,
    mode: 'local',
    auth: { mode: 'token', token: 'SECRET-GATEWAY-TOKEN' },
  },
});

describe('importOpenClaw', () => {
  let plan: ReturnType<typeof importOpenClaw> extends Promise<infer T> ? T : never;

  beforeAll(async () => {
    plan = await importOpenClaw(fixture);
  });

  test('extracts source info', () => {
    expect(plan.source.tool).toBe('openclaw');
    expect(plan.source.version).toBe('2026.4.23');
  });

  test('extracts agents from agents.list', () => {
    const agentIds = plan.agents.map((a) => a.id);
    expect(agentIds).toContain('main');
    expect(agentIds).toContain('unicom');

    const main = plan.agents.find((a) => a.id === 'main');
    expect(main?.model).toBe('openai-codex/gpt-5.4');
  });

  test('extracts providers from models.providers', () => {
    const qwen = plan.mcps.find((m) => m.id === 'qwen-portal');
    expect(qwen).toBeDefined();
    expect(qwen?.command).toBe('qwen-portal');
  });

  test('does not extract secrets', () => {
    const planJson = JSON.stringify(plan);
    expect(planJson).not.toContain('SECRET-TELEGRAM-TOKEN');
    expect(planJson).not.toContain('SECRET-FEISHU-SECRET');
    expect(planJson).not.toContain('SECRET-GATEWAY-TOKEN');
  });

  test('does not extract apiKey values from providers', () => {
    const planJson = JSON.stringify(plan);
    expect(planJson).not.toContain('qwen-oauth');
    expect(planJson).not.toContain('deepseek-api-key');
  });

  test('lists unmapped fields', () => {
    expect(plan.unmapped.length).toBeGreaterThan(0);
    expect(plan.unmapped).toContain('channels');
    expect(plan.unmapped).toContain('gateway');
  });

  test('generates notes about the migration', () => {
    expect(plan.notes.length).toBeGreaterThan(0);
  });
});
