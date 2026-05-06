export interface Skill {
  id: string;
  source: string;
  version?: string;
  entry: string;
  dependencies?: string[];
}

export interface Agent {
  id: string;
  source?: string;
  version?: string;
  model?: string;
  system?: string;
  skills: string[];
}

export interface MCP {
  id: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'stdio' | 'http';
  url?: string;
}

export type TargetPlatform = 'claude-code' | 'openclaw' | 'opencode';

export interface TargetConfig {
  agents?: string[];
  skills?: string[];
  mcps?: string[];
}

export interface StackConfig {
  project: string;
  skills?: Skill[];
  agents?: Agent[];
  mcps?: MCP[];
  targets: Record<TargetPlatform, TargetConfig>;
}

export interface InstalledComponent {
  id: string;
  source: string;
  version: string;
  path: string;
}

export interface Adapter {
  exportConfig(
    stack: StackConfig,
    installed: { skills: InstalledComponent[]; agents: InstalledComponent[]; mcps: InstalledComponent[] },
    outputDir: string
  ): Promise<void>;
}
