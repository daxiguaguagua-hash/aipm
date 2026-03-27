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

      // Write settings.json
      const outputPath = path.join(outputDir, '.claude', 'settings.json');
      await ensureDir(path.dirname(outputPath));
      await fs.promises.writeFile(outputPath, JSON.stringify(settings, null, 2), 'utf8');

      logSuccess(`Exported Claude Code configuration to ${outputPath}`);
    } catch (error) {
      logError(`Failed to export Claude Code configuration: ${(error as Error).message}`);
      throw error;
    }
  }
}
