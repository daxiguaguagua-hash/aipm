import fs from 'fs';
import path from 'path';
import { Adapter, StackConfig, InstalledComponent } from '../types';
import { ensureDir, logSuccess, logError } from '../utils';

/**
 * OpenCode adapter exports configuration
 * OpenCode uses .opencode/mcp.json for MCP configuration
 */
export class OpenCodeAdapter implements Adapter {
  async exportConfig(
    stack: StackConfig,
    installed: {
      skills: InstalledComponent[];
      agents: InstalledComponent[];
      mcps: InstalledComponent[];
    },
    outputDir: string
  ): Promise<void> {
    try {
      await ensureDir(outputDir);

      // Build OpenCode MCP configuration structure
      const config: any = {
        mcpServers: {},
      };

      // Add MCP servers
      const targetConfig = stack.targets['opencode'];
      if (targetConfig && targetConfig.mcps) {
        for (const mcpId of targetConfig.mcps) {
          const mcpDef = stack.mcps?.find(m => m.id === mcpId);
          if (!mcpDef) {
            logError(`MCP ${mcpId} not found in stack configuration, skipping`);
            continue;
          }

          config.mcpServers[mcpId] = {
            command: mcpDef.command,
            args: mcpDef.args || [],
            env: mcpDef.env || {},
          };
        }
      }

      // Write mcp.json
      const outputPath = path.join(outputDir, '.opencode', 'mcp.json');
      await ensureDir(path.dirname(outputPath));
      await fs.promises.writeFile(outputPath, JSON.stringify(config, null, 2), 'utf8');

      // If there are skills/agents, export them to a separate file
      if ((targetConfig.skills && targetConfig.skills.length > 0) ||
          (targetConfig.agents && targetConfig.agents.length > 0)) {
        const aiConfig: any = {
          skills: {},
          agents: {},
        };

        if (targetConfig.skills) {
          for (const skillId of targetConfig.skills) {
            const installedSkill = installed.skills.find(s => s.id === skillId);
            if (!installedSkill) {
              logError(`Skill ${skillId} not installed, skipping`);
              continue;
            }
            aiConfig.skills[skillId] = {
              path: installedSkill.path,
              version: installedSkill.version,
            };
          }
        }

        if (targetConfig.agents) {
          for (const agentId of targetConfig.agents) {
            const installedAgent = installed.agents.find(a => a.id === agentId);
            if (!installedAgent) {
              logError(`Agent ${agentId} not installed, skipping`);
              continue;
            }
            aiConfig.agents[agentId] = {
              path: installedAgent.path,
              version: installedAgent.version,
            };
          }
        }

        const aiConfigPath = path.join(outputDir, '.opencode', 'ai.json');
        await fs.promises.writeFile(aiConfigPath, JSON.stringify(aiConfig, null, 2), 'utf8');
      }

      logSuccess(`Exported OpenCode configuration to ${outputPath}`);
    } catch (error) {
      logError(`Failed to export OpenCode configuration: ${(error as Error).message}`);
      throw error;
    }
  }
}
