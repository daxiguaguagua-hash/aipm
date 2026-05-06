import yaml from 'js-yaml';
import { MigrationPlan } from './types';

const UNMAPPED_TOP_LEVEL = new Set([
  'compression', 'memory', 'session_reset', 'tool_loop_guardrails',
  'code_execution', 'delegation', 'streaming', 'display', 'onboarding',
  'terminal', 'browser', 'skills', 'stt', 'prompt_caching',
  'group_sessions_per_user',
]);

const MAX_PERSONALITIES = 5;

export async function importHermes(content: string): Promise<MigrationPlan> {
  const raw = yaml.load(content) as Record<string, unknown>;

  const plan: MigrationPlan = {
    source: { tool: 'hermes', path: '~/.hermes/config.yaml' },
    skills: [],
    agents: [],
    mcps: [],
    unmapped: [],
    conflicts: [],
    notes: [],
  };

  // Model config
  if (raw.model) {
    const m = raw.model as Record<string, unknown>;
    if (m.default) plan.notes.push(`Default model: ${m.default}`);
    if (m.provider) plan.notes.push(`Provider: ${m.provider}`);
    if (m.base_url) plan.notes.push(`Base URL: ${m.base_url}`);
  }

  // Agent config
  if (raw.agent) {
    const a = raw.agent as Record<string, unknown>;
    if (a.max_turns !== undefined) plan.notes.push(`Agent max_turns: ${a.max_turns}`);
    if (a.reasoning_effort) plan.notes.push(`Agent reasoning_effort: ${a.reasoning_effort}`);

    // Personalities → inline agents
    if (a.personalities && typeof a.personalities === 'object') {
      let count = 0;
      for (const [name, prompt] of Object.entries(a.personalities as Record<string, string>)) {
        if (count >= MAX_PERSONALITIES) break;
        plan.agents.push({
          id: `personality-${name}`,
          system: prompt,
          skills: [],
        });
        count++;
      }
    }
  }

  // Platform toolsets
  if (raw.platform_toolsets && typeof raw.platform_toolsets === 'object') {
    const platforms = Object.keys(raw.platform_toolsets as Record<string, unknown>);
    plan.notes.push(`Messaging platforms: ${platforms.join(', ')}`);
  }

  // Add a generic Hermes agent note for the default model + personality combo
  if (raw.model && (raw.model as Record<string, unknown>).default) {
    plan.agents.unshift({
      id: 'hermes-default',
      model: (raw.model as Record<string, unknown>).default as string,
      skills: [],
    });
  }

  // Unmapped
  for (const key of UNMAPPED_TOP_LEVEL) {
    if (raw[key] !== undefined) {
      plan.unmapped.push(key);
    }
  }

  plan.notes.push(
    'Hermes personalities are imported as inline agents. Assign them to targets and choose a model in stack.yaml.'
  );

  return plan;
}
