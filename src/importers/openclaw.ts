import { MigrationPlan } from './types';

const SECRET_KEYS = new Set([
  'botToken', 'appSecret', 'secret', 'token', 'apiKey',
]);

const UNMAPPED_TOP_LEVEL = new Set([
  'auth', 'gateway', 'hooks', 'session', 'bindings',
  'acp', 'wizard', 'plugins', 'commands',
]);

function stripSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SECRET_KEYS.has(key)) {
      result[key] = '<redacted>';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = stripSecrets(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function hasChannels(raw: Record<string, unknown>): boolean {
  const channels = raw.channels as Record<string, unknown> | undefined;
  return !!channels && Object.keys(channels).length > 0;
}

export async function importOpenClaw(content: string): Promise<MigrationPlan> {
  const raw = JSON.parse(content);

  const version = raw.meta?.lastTouchedVersion || undefined;
  const plan: MigrationPlan = {
    source: { tool: 'openclaw', path: '~/.openclaw/openclaw.json', version },
    skills: [],
    agents: [],
    mcps: [],
    unmapped: [],
    conflicts: [],
    notes: [],
  };

  // Extract agents
  if (raw.agents?.list && Array.isArray(raw.agents.list)) {
    for (const item of raw.agents.list) {
      const { id, model, name, ...rest } = item;
      plan.agents.push({
        id,
        model: model || undefined,
        skills: [],
      });
      // Flag subagents config as unmapped if present
      if (rest.subagents) {
        plan.unmapped.push(`agents.${id}.subagents`);
      }
    }
  }

  // Extract default model info as a note
  if (raw.agents?.defaults?.model?.primary) {
    plan.notes.push(`Default model: ${raw.agents.defaults.model.primary}`);
  }
  if (raw.agents?.defaults?.model?.fallbacks) {
    plan.notes.push(`Model fallbacks: ${(raw.agents.defaults.model.fallbacks as string[]).join(', ')}`);
  }

  // Extract model aliases as notes
  if (raw.agents?.defaults?.models) {
    for (const [modelId, info] of Object.entries(raw.agents.defaults.models as Record<string, { alias?: string }>)) {
      if (info.alias) {
        plan.notes.push(`Model alias: ${modelId} → ${info.alias}`);
      }
    }
  }

  // Extract providers as MCP-like entries (external API endpoints)
  if (raw.models?.providers) {
    const providerEntries = stripSecrets(raw.models.providers);
    for (const [providerId, providerData] of Object.entries(providerEntries)) {
      const pd = providerData as Record<string, unknown>;
      const modelIds = Array.isArray(pd.models)
        ? (pd.models as Array<{ id: string }>).map((m) => m.id)
        : [];
      plan.mcps.push({
        id: providerId,
        command: providerId,
        transport: 'http',
        args: modelIds,
      });
    }
  }

  // Channels
  if (hasChannels(raw)) {
    plan.unmapped.push('channels');
    const channelNames = Object.keys(raw.channels as Record<string, unknown>);
    plan.notes.push(`Channels detected (not imported): ${channelNames.join(', ')}`);
  }

  // Top-level unmapped
  for (const key of UNMAPPED_TOP_LEVEL) {
    if (raw[key] !== undefined) {
      plan.unmapped.push(key);
    }
  }

  plan.notes.push(
    'Secrets (botToken, appSecret, apiKey, token) are not imported. Reconfigure authentication manually.'
  );
  plan.notes.push(
    'Provider API keys are redacted. Set them via environment variables or configure in the target tool directly.'
  );

  return plan;
}
