import { MCP, Skill } from '../types';

export interface SourceInfo {
  tool: string;
  path: string;
  version?: string;
}

export interface AgentImportItem {
  id: string;
  model?: string;
  provider?: string;
  system?: string;
  skills: string[];
}

export interface ConflictInfo {
  id: string;
  type: 'skill' | 'agent' | 'mcp';
  existing: string;
}

export interface MigrationPlan {
  source: SourceInfo;
  skills: Skill[];
  agents: AgentImportItem[];
  mcps: MCP[];
  unmapped: string[];
  conflicts: ConflictInfo[];
  notes: string[];
}
