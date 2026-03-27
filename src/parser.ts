import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { StackConfig, Skill, Agent, MCP, TargetPlatform } from './types';
import { logError } from './utils';

/**
 * Parses and validates AI stack configuration from YAML or JSON content
 * @param content Content string (YAML or JSON)
 * @returns Validated StackConfig object
 * @throws Error if configuration is invalid
 */
export function parseStackConfig(content: string): StackConfig {
  try {
    let config: any;

    // Try to parse as JSON first if it looks like JSON
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      config = JSON.parse(content);
    } else {
      // Default to YAML
      config = yaml.load(content) as any;
    }

    // Basic validation
    if (!config.project || typeof config.project !== 'string') {
      throw new Error('Missing or invalid "project" field');
    }

    if (!config.targets || typeof config.targets !== 'object') {
      throw new Error('Missing or invalid "targets" field');
    }

    // Validate skills
    if (config.skills) {
      if (!Array.isArray(config.skills)) {
        throw new Error('"skills" must be an array');
      }
      config.skills.forEach((skill: any, index: number) => {
        if (!skill.id || typeof skill.id !== 'string') {
          throw new Error(`Skill at index ${index} missing required "id" field`);
        }
        if (!skill.source || typeof skill.source !== 'string') {
          throw new Error(`Skill at index ${index} missing required "source" field`);
        }
        if (!skill.entry || typeof skill.entry !== 'string') {
          throw new Error(`Skill at index ${index} missing required "entry" field`);
        }
      });
    }

    // Validate agents
    if (config.agents) {
      if (!Array.isArray(config.agents)) {
        throw new Error('"agents" must be an array');
      }
      config.agents.forEach((agent: any, index: number) => {
        if (!agent.id || typeof agent.id !== 'string') {
          throw new Error(`Agent at index ${index} missing required "id" field`);
        }
        if (!agent.skills || !Array.isArray(agent.skills)) {
          throw new Error(`Agent at index ${index} missing or invalid "skills" field`);
        }
      });
    }

    // Validate mcps
    if (config.mcps) {
      if (!Array.isArray(config.mcps)) {
        throw new Error('"mcps" must be an array');
      }
      config.mcps.forEach((mcp: any, index: number) => {
        if (!mcp.id || typeof mcp.id !== 'string') {
          throw new Error(`MCP at index ${index} missing required "id" field`);
        }
        if (!mcp.command || typeof mcp.command !== 'string') {
          throw new Error(`MCP at index ${index} missing required "command" field`);
        }
      });
    }

    // Validate targets
    const validTargetPlatforms: TargetPlatform[] = ['claude-code', 'openclaw', 'opencode'];
    Object.keys(config.targets).forEach((platform) => {
      if (!validTargetPlatforms.includes(platform as TargetPlatform)) {
        throw new Error(`Invalid target platform: ${platform}. Valid platforms are: ${validTargetPlatforms.join(', ')}`);
      }
    });

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
      logError(`Parse error: ${error.message}`);
      throw error;
    }
    throw new Error('Unknown parse error');
  }
}

/**
 * Loads and parses AI stack configuration from file asynchronously
 * Supports .yaml, .yml, and .json formats
 * @param filePath Path to the configuration file
 * @returns Promise<StackConfig> Validated StackConfig object
 * @throws Error if file read or parsing fails
 */
export async function loadStackConfigFromFile(filePath: string): Promise<StackConfig> {
  const content = await fs.promises.readFile(filePath, 'utf8');
  return parseStackConfig(content);
}

/**
 * Loads and parses AI stack configuration from file synchronously
 * Supports .yaml, .yml, and .json formats
 * @param filePath Path to the configuration file
 * @returns Validated StackConfig object
 * @throws Error if file read or parsing fails
 */
export function loadStackConfigFromFileSync(filePath: string): StackConfig {
  const content = fs.readFileSync(filePath, 'utf8');
  return parseStackConfig(content);
}
