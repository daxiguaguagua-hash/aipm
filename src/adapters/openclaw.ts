import fs from 'fs';
import path from 'path';
import { Adapter, StackConfig, InstalledComponent } from '../types';
import { ensureDir, logSuccess, logError } from '../utils';

/**
 * OpenClaw (NanoClaw) adapter exports configuration
 * OpenClaw uses .nano/settings.json similar to Claude Code but with different structure
 */
export class OpenClawAdapter implements Adapter {
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

      // Build OpenClaw settings structure
      const settings: any = {
        mcpServers: {},
        skills: {},
        agents: {},
      };

      // Add MCP servers
      const targetConfig = stack.targets['openclaw'];
      if (targetConfig && targetConfig.mcps) {
        for (const mcpId of targetConfig.mcps) {
          const mcpDef = stack.mcps?.find(m => m.id === mcpId);
          if (!mcpDef) {
            logError(`MCP ${mcpId} not found in stack configuration, skipping`);
            continue;
          }

          settings.mcpServers[mcpId] = {
            command: mcpDef.command,
            args: mcpDef.args || [],
            env: mcpDef.env || {},
          };

          if (mcpDef.transport) {
            settings.mcpServers[mcpId].transport = mcpDef.transport;
          }
        }
      }

      // Add skills
      if (targetConfig && targetConfig.skills) {
        for (const skillId of targetConfig.skills) {
          const installedSkill = installed.skills.find(s => s.id === skillId);
          if (!installedSkill) {
            logError(`Skill ${skillId} not installed, skipping`);
            continue;
          }
          settings.skills[skillId] = {
            path: installedSkill.path,
            version: installedSkill.version,
          };
        }
      }

      // Add agents
      if (targetConfig && targetConfig.agents) {
        for (const agentId of targetConfig.agents) {
          const installedAgent = installed.agents.find(a => a.id === agentId);
          if (!installedAgent) {
            logError(`Agent ${agentId} not installed, skipping`);
            continue;
          }
          settings.agents[agentId] = {
            path: installedAgent.path,
            version: installedAgent.version,
          };
        }
      }

      // Write settings.json
      const outputPath = path.join(outputDir, '.nano', 'settings.json');
      await ensureDir(path.dirname(outputPath));
      await fs.promises.writeFile(outputPath, JSON.stringify(settings, null, 2), 'utf8');

      logSuccess(`Exported OpenClaw configuration to ${outputPath}`);
    } catch (error) {
      logError(`Failed to export OpenClaw configuration: ${(error as Error).message}`);
      throw error;
    }
  }
}
