import { parse } from 'smol-toml';
import { MigrationPlan } from './types';

interface CodexMcpServer {
  type?: string;
  command?: string;
  args?: string[];
  url?: string;
  enabled?: boolean;
  env?: Record<string, string>;
}

export async function importCodex(content: string): Promise<MigrationPlan> {
  const raw = parse(content) as Record<string, unknown>;

  const plan: MigrationPlan = {
    source: { tool: 'codex', path: '~/.codex/config.toml' },
    skills: [],
    agents: [],
    mcps: [],
    unmapped: [],
    conflicts: [],
    notes: [],
  };

  // Model config
  if (raw.model) plan.notes.push(`Default model: ${raw.model}`);
  if (raw.model_reasoning_effort) plan.notes.push(`Reasoning effort: ${raw.model_reasoning_effort}`);

  // MCP servers
  const servers = raw.mcp_servers as Record<string, CodexMcpServer> | undefined;
  if (servers) {
    for (const [name, srv] of Object.entries(servers)) {
      if (srv.enabled === false) continue;

      if (srv.url) {
        plan.mcps.push({
          id: name,
          transport: 'http',
          url: srv.url,
        });
      } else if (srv.command) {
        plan.mcps.push({
          id: name,
          transport: 'stdio',
          command: srv.command,
          args: srv.args || [],
          ...(srv.env ? { env: srv.env } : {}),
        });
      }
    }
  }

  // Plugins → agents
  const plugins = raw.plugins as Record<string, { enabled?: boolean }> | undefined;
  if (plugins) {
    for (const [fullName, plugin] of Object.entries(plugins)) {
      if (plugin.enabled === false) continue;
      const name = fullName.split('@')[0];
      plan.agents.push({
        id: name,
        skills: [],
      });
    }
  }

  // Features
  const features = raw.features as Record<string, unknown> | undefined;
  if (features) {
    for (const [key, val] of Object.entries(features)) {
      plan.notes.push(`Feature "${key}": ${JSON.stringify(val)}`);
    }
  }

  plan.notes.push(
    'Codex MCP servers imported. Review URLs and commands — some may require authentication setup in your target environment.'
  );

  return plan;
}
