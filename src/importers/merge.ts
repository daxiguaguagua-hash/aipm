import { MigrationPlan, ConflictInfo } from './types';
import { StackConfig, Agent } from '../types';

export type ConflictStrategy = 'keep-existing' | 'overwrite';

export interface MergeResult {
  stack: StackConfig;
  conflicts: ConflictInfo[];
  summary: string[];
  addedAgents: number;
  skippedAgents: number;
  addedMcps: number;
  skippedMcps: number;
}

export function mergeIntoStack(
  plan: MigrationPlan,
  stack: StackConfig,
  strategy: ConflictStrategy = 'keep-existing'
): MergeResult {
  const conflicts: ConflictInfo[] = [];
  const summary: string[] = [];
  let addedAgents = 0;
  let skippedAgents = 0;
  let addedMcps = 0;
  let skippedMcps = 0;

  const existingAgentIds = new Set((stack.agents || []).map((a) => a.id));
  const existingMcpIds = new Set((stack.mcps || []).map((m) => m.id));

  // Merge agents
  stack.agents = stack.agents || [];
  for (const importAgent of plan.agents) {
    if (existingAgentIds.has(importAgent.id)) {
      conflicts.push({ id: importAgent.id, type: 'agent', existing: 'stack.yaml' });
      if (strategy === 'keep-existing') {
        skippedAgents++;
        summary.push(`Agent "${importAgent.id}" already exists in stack, skipping`);
        continue;
      }
      // overwrite: replace existing
      const idx = stack.agents.findIndex((a) => a.id === importAgent.id);
      if (idx >= 0) {
        stack.agents[idx] = agentImportToStackAgent(importAgent);
        summary.push(`Agent "${importAgent.id}" overwritten`);
        continue;
      }
    }

    stack.agents.push(agentImportToStackAgent(importAgent));
    addedAgents++;
    summary.push(`Agent "${importAgent.id}" added`);
  }

  // Merge MCPs
  stack.mcps = stack.mcps || [];
  for (const importMcp of plan.mcps) {
    if (existingMcpIds.has(importMcp.id)) {
      conflicts.push({ id: importMcp.id, type: 'mcp', existing: 'stack.yaml' });
      if (strategy === 'keep-existing') {
        skippedMcps++;
        summary.push(`MCP "${importMcp.id}" already exists in stack, skipping`);
        continue;
      }
      const idx = stack.mcps.findIndex((m) => m.id === importMcp.id);
      if (idx >= 0) {
        stack.mcps[idx] = importMcp;
        summary.push(`MCP "${importMcp.id}" overwritten`);
        continue;
      }
    }

    stack.mcps.push(importMcp);
    addedMcps++;
    summary.push(`MCP "${importMcp.id}" added`);
  }

  // Update target configs to include new agents
  if (addedAgents > 0 || (strategy === 'overwrite' && plan.agents.length > 0)) {
    for (const targetKey of Object.keys(stack.targets) as Array<keyof typeof stack.targets>) {
      const targetConfig = stack.targets[targetKey];
      if (targetConfig) {
        targetConfig.agents = targetConfig.agents || [];
        for (const importAgent of plan.agents) {
          if (!targetConfig.agents.includes(importAgent.id)) {
            targetConfig.agents.push(importAgent.id);
          }
        }
      }
    }
    summary.push('Updated target configurations with imported agents');
  }

  return { stack, conflicts, summary, addedAgents, skippedAgents, addedMcps, skippedMcps };
}

function agentImportToStackAgent(imported: {
  id: string;
  model?: string;
  provider?: string;
  system?: string;
  skills: string[];
}): Agent {
  return {
    id: imported.id,
    model: imported.model,
    system: imported.system,
    skills: imported.skills,
  };
}
