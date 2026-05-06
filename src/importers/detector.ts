import fs from 'fs';
import os from 'os';
import path from 'path';

export function detectOpenClawPath(home?: string): string | null {
  const configPath = path.join(home ?? os.homedir(), '.openclaw', 'openclaw.json');
  if (fs.existsSync(configPath)) return configPath;
  return null;
}

export function detectCodexPath(home?: string): string | null {
  const configPath = path.join(home ?? os.homedir(), '.codex', 'config.toml');
  if (fs.existsSync(configPath)) return configPath;
  return null;
}

export function detectOpenRouterPath(home?: string): string | null {
  const configPath = path.join(home ?? os.homedir(), '.openrouter', 'models.json');
  if (fs.existsSync(configPath)) return configPath;
  return null;
}
