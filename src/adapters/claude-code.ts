import fs from 'fs';
import path from 'path';
import { Adapter, StackConfig, InstalledComponent } from '../types';
import { ensureDir, logSuccess, logError } from '../utils';

/**
 * Claude Code adapter exports configuration to Claude Code format
 * Claude Code uses .claude/settings.json for project-level MCP configuration
 */
export class ClaudeCodeAdapter implements Adapter {
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

      // Build Claude Code settings structure
      const settings: any = {
        mcpServers: {},
      };

      // Add MCP servers from the stack configuration
      const targetConfig = stack.targets['claude-code'];
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

      // Add skills from the stack configuration
      if (targetConfig && targetConfig.skills) {
        settings.skills = {};
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

      // Add agents from the stack configuration
      if (targetConfig && targetConfig.agents) {
        settings.agents = {};
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

      // Write settings.json for MCP configuration
      const settingsPath = path.join(outputDir, '.claude', 'settings.json');
      await ensureDir(path.dirname(settingsPath));
      await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

      // Write skills.json if there are skills
      if (settings.skills && Object.keys(settings.skills).length > 0) {
        const skillsPath = path.join(outputDir, '.claude', 'skills.json');
        await fs.promises.writeFile(skillsPath, JSON.stringify({ skills: settings.skills }, null, 2), 'utf8');
      }

      // Write agents.json if there are agents
      if (settings.agents && Object.keys(settings.agents).length > 0) {
        const agentsPath = path.join(outputDir, '.claude', 'agents.json');
        await fs.promises.writeFile(agentsPath, JSON.stringify({ agents: settings.agents }, null, 2), 'utf8');
      }

      logSuccess(`Exported Claude Code configuration to ${outputDir}/.claude/`);
    } catch (error) {
      logError(`Failed to export Claude Code configuration: ${(error as Error).message}`);
      throw error;
    }
  }
}
