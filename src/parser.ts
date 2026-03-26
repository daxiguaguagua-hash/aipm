import yaml from 'js-yaml';
import { StackConfig } from './types';
import { logError } from './utils';

export function parseStackConfig(content: string): StackConfig {
  try {
    const config = yaml.load(content) as any;

    // Basic validation
    if (!config.project || typeof config.project !== 'string') {
      throw new Error('Missing or invalid "project" field');
    }

    if (!config.targets || typeof config.targets !== 'object') {
      throw new Error('Missing or invalid "targets" field');
    }

    const stackConfig: StackConfig = {
      project: config.project,
      skills: config.skills || [],
      agents: config.agents || [],
      mcps: config.mcps || [],
      targets: config.targets,
    };

    return stackConfig;
  } catch (error) {
    if (error instanceof Error) {
      logError(`YAML parse error: ${error.message}`);
      throw error;
    }
    throw new Error('Unknown parse error');
  }
}

export function loadStackConfigFromFile(filePath: string): StackConfig {
  const fs = require('fs');
  const content = fs.readFileSync(filePath, 'utf8');
  return parseStackConfig(content);
}
