import { MigrationPlan } from './types';

interface OpenRouterModel {
  id: string;
  context_length?: number;
  pricing?: { prompt: string; completion: string };
}

interface OpenRouterConfig {
  models?: OpenRouterModel[];
  prompt_template?: string;
}

export async function importOpenRouter(content: string): Promise<MigrationPlan> {
  let raw: OpenRouterConfig;
  try {
    raw = JSON.parse(content);
  } catch {
    raw = {};
  }

  const plan: MigrationPlan = {
    source: { tool: 'openrouter', path: '~/.openrouter/models.json' },
    skills: [],
    agents: [],
    mcps: [],
    unmapped: [],
    conflicts: [],
    notes: [],
  };

  if (raw.models && raw.models.length > 0) {
    plan.notes.push(`OpenRouter model recommendations (${raw.models.length} models):`);
    for (const m of raw.models) {
      const price = m.pricing
        ? `$${m.pricing.prompt}/M in, $${m.pricing.completion}/M out`
        : 'pricing unknown';
      plan.notes.push(`  ${m.id} — ${price}`);
    }
  }

  if (raw.prompt_template) {
    plan.notes.push(`Prompt template: ${raw.prompt_template.slice(0, 200)}`);
  }

  if (plan.notes.length === 0) {
    plan.notes.push(
      'OpenRouter configuration found but no model recommendations detected.'
    );
  }

  plan.notes.push(
    'OpenRouter models are for reference only. Set your model in stack.yaml under the desired agent.'
  );

  return plan;
}
