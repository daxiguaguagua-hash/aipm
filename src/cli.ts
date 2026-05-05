#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadStackConfigFromFile } from './parser';
import { CacheManager } from './cache';
import { GitInstaller } from './installer';
import { getAdapter, TargetPlatformName } from './adapters';
import { ensureDir, getLocalAiDir, logInfo, logSuccess, logError } from './utils';
import { InstalledComponent } from './types';

const program = new Command();
const DEFAULT_STACK_FILE_YAML = '.ai/stack.yaml';
const DEFAULT_STACK_FILE_YML = '.ai/stack.yml';
const DEFAULT_STACK_FILE_JSON = '.ai/stack.json';

// Try to find stack file in order: yaml -> yml -> json
// Searches current directory first, then parent directories
function findStackConfigFile(): string | null {
  const files = [DEFAULT_STACK_FILE_YAML, DEFAULT_STACK_FILE_YML, DEFAULT_STACK_FILE_JSON];
  let dir = process.cwd();

  while (true) {
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  return null;
}

async function exportToPlatform(platform: string): Promise<void> {
  const validPlatforms: TargetPlatformName[] = ['claude-code', 'openclaw', 'opencode'];
  if (!validPlatforms.includes(platform as TargetPlatformName)) {
    logError(`Invalid platform: ${platform}. Valid platforms: ${validPlatforms.join(', ')}`);
    process.exit(1);
  }

  const stackFile = findStackConfigFile();
  if (!stackFile) {
    logError(`No stack configuration file found. Run 'aipm init' first.`);
    process.exit(1);
  }

  const lockFile = path.join(getLocalAiDir(), 'stack.lock');
  if (!fs.existsSync(lockFile)) {
    logError(`Lock file not found at ${lockFile}. Run 'aipm install' first.`);
    process.exit(1);
  }

  const stack = await loadStackConfigFromFile(stackFile);
  const lock = JSON.parse(await fs.promises.readFile(lockFile, 'utf8'));

  const adapter = getAdapter(platform as TargetPlatformName);
  const outputDir = process.cwd();
  await adapter.exportConfig(stack, {
    skills: lock.skills || [],
    agents: lock.agents || [],
    mcps: lock.mcps || [],
  }, outputDir);
}

program
  .name('aipm')
  .description('AI Coding Stack Manager - 统一管理你的 AI 编程环境')
  .version('0.1.0');

/**
 * aipm init - initialize a new aipm project
 */
program
  .command('init')
  .description('Initialize a new AI stack project')
  .action(async () => {
    try {
      const aiDir = getLocalAiDir();
      await ensureDir(aiDir);

      const stackFile = path.join(aiDir, 'stack.yaml');
      if (fs.existsSync(stackFile)) {
        logInfo('Stack file already exists at ' + stackFile);
        process.exit(0);
      }

      // Create default stack.yaml
      const defaultStack = `project: my-ai-stack

# Skills are reusable AI capability modules
# 技能是可复用的 AI 能力模块
skills:
  # Example:
  # 示例：
  # - id: code-review
  #   source: github:anthonyclays/aipm-skill-code-review
  #   entry: ./main.md

# Agents orchestrate multiple skills
# Agents with a source will be installed from Git
# Agent 编排多个技能
# 带有 source 的 Agent 会从 Git 自动安装
agents:
  # Example:
  # 示例：
  # - id: planner
  #   source: https://github.com/your-org/team-agents.git
  #   version: v1.0.0
  #   model: claude-sonnet
  #   system: You are an expert planning agent...
  #   skills: [code-review]

# MCP (Model Context Protocol) external tools
# MCP（Model Context Protocol）外部工具
mcps:
  # Example:
  # 示例：
  # - id: filesystem
  #   command: npx
  #   args: ["-y", "@modelcontextprotocol/server-filesystem", "."]

# Target platform configurations
# 目标平台配置
targets:
  claude-code:
    mcps: []
  openclaw:
    skills: []
  opencode:
    mcps: []
`;

      await fs.promises.writeFile(stackFile, defaultStack, 'utf8');
      logSuccess(`Initialized aipm project at ${aiDir}`);
      logInfo('Edit ' + stackFile + ' to add your skills, agents, and MCP servers');
    } catch (error) {
      logError(`Init failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * aipm install - install all dependencies from stack.yaml
 */
program
  .command('install')
  .description('Install all skills, agents, and MCP servers from stack.yaml (supports yaml/yml/json)')
  .option('-f, --force', 'Force reinstall even if already installed')
  .action(async (options: { force?: boolean }) => {
    try {
      const stackFile = findStackConfigFile();
      if (!stackFile) {
        logError(`No stack configuration file found. Run 'aipm init' first.`);
        process.exit(1);
      }

      // Load and parse stack config
      const stack = await loadStackConfigFromFile(path.resolve(stackFile));
      logInfo(`Loaded stack configuration for ${stack.project}`);

      // Initialize cache
      const cacheManager = new CacheManager();
      await cacheManager.init();

      const installer = new GitInstaller(cacheManager);

      // Force reinstall: delete all existing components first
      if (options.force) {
        logInfo('Force reinstalling all components...');
        for (const skill of stack.skills || []) {
          if (await cacheManager.isInstalled(skill.id)) {
            await cacheManager.deleteComponent(skill.id);
          }
        }
        for (const agent of stack.agents || []) {
          if (agent.source && await cacheManager.isInstalled(agent.id)) {
            await cacheManager.deleteComponent(agent.id);
          }
        }
      }

      // Install all skills
      const installedSkills = [];
      for (const skill of stack.skills || []) {
        const installed = await installer.installSkill(skill);
        installedSkills.push(installed);
      }

      // Install all agents that have a source
      const installedAgents: InstalledComponent[] = [];
      for (const agent of stack.agents || []) {
        if (agent.source) {
          const installed = await installer.installAgent(agent);
          installedAgents.push(installed);
        }
      }

      // MCPs don't need installation - they're passed through directly to the platform
      const installedMcps: InstalledComponent[] = [];

      // Write lock file
      const lockFile = path.join(getLocalAiDir(), 'stack.lock');
      const lockContent = {
        project: stack.project,
        skills: installedSkills,
        agents: installedAgents,
        mcps: installedMcps,
        timestamp: new Date().toISOString(),
      };
      await fs.promises.writeFile(lockFile, JSON.stringify(lockContent, null, 2), 'utf8');

      logSuccess(`Install complete: ${installedSkills.length} skills, ${installedAgents.length} agents, ${installedMcps.length} MCPs`);
    } catch (error) {
      logError(`Install failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * aipm export <platform> - export configuration for target platform
 */
program
  .command('export <platform>')
  .description('Export configuration for the specified target platform (supports yaml/yml/json)')
  .action(async (platform: string) => {
    try {
      await exportToPlatform(platform);
      logSuccess(`Export complete for ${platform}`);
    } catch (error) {
      logError(`Export failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * aipm use <platform> - switch to specified platform (export and setup)
 */
program
  .command('use <platform>')
  .description('Switch AI environment to the specified platform')
  .action(async (platform: string) => {
    try {
      await exportToPlatform(platform);

      // Write current platform state
      const currentFile = path.join(getLocalAiDir(), 'current');
      await fs.promises.writeFile(currentFile, platform, 'utf8');

      logSuccess(`Switched to ${chalk.bold(platform)} environment`);
    } catch (error) {
      logError(`Switch failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * aipm list - list installed components
 */
program
  .command('list')
  .description('List all installed components')
  .option('--json', 'Output in JSON format')
  .action(async (options: { json?: boolean }) => {
    try {
      // Prefer lock file for richer data, fall back to cache
      const lockFile = path.join(getLocalAiDir(), 'stack.lock');
      let skills: InstalledComponent[] = [];
      let agents: InstalledComponent[] = [];
      let mcps: InstalledComponent[] = [];

      if (fs.existsSync(lockFile)) {
        const lock = JSON.parse(await fs.promises.readFile(lockFile, 'utf8'));
        skills = lock.skills || [];
        agents = lock.agents || [];
        mcps = lock.mcps || [];
      } else {
        const cacheManager = new CacheManager();
        await cacheManager.init();
        const all = await cacheManager.listInstalled();
        // Without lock file we can't distinguish types, list all as skills
        skills = all;
      }

      const total = skills.length + agents.length + mcps.length;

      if (options.json) {
        console.log(JSON.stringify({ skills, agents, mcps, total }, null, 2));
        process.exit(0);
      }

      if (total === 0) {
        logInfo('No components installed');
        process.exit(0);
      }

      console.log();
      console.log(chalk.bold('Installed components:'));
      console.log();

      if (skills.length > 0) {
        console.log(chalk.bold('  Skills:'));
        skills.forEach(s => {
          console.log(`    ${chalk.cyan(s.id)} @ ${chalk.yellow(s.version)}`);
          console.log(`      ${chalk.gray(s.source)}`);
        });
      }

      if (agents.length > 0) {
        console.log(chalk.bold('  Agents:'));
        agents.forEach(a => {
          console.log(`    ${chalk.cyan(a.id)} @ ${chalk.yellow(a.version)}`);
          console.log(`      ${chalk.gray(a.source)}`);
        });
      }

      console.log();
      console.log(`Total: ${total} component(s) (${skills.length} skills, ${agents.length} agents, ${mcps.length} MCPs)`);
    } catch (error) {
      logError(`List failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * aipm status - show current environment status
 */
program
  .command('status')
  .description('Show current AI environment status')
  .action(async () => {
    try {
      const aiDir = getLocalAiDir();

      // Check for stack config
      const stackFile = findStackConfigFile();
      if (!stackFile) {
        console.log(chalk.yellow('No AI stack initialized. Run ') + chalk.bold('aipm init') + chalk.yellow(' to start.'));
        process.exit(0);
      }

      const stack = await loadStackConfigFromFile(stackFile);
      console.log();
      console.log(chalk.bold('Project:'), chalk.cyan(stack.project));

      // Active platform
      const currentFile = path.join(aiDir, 'current');
      if (fs.existsSync(currentFile)) {
        const activePlatform = (await fs.promises.readFile(currentFile, 'utf8')).trim();
        console.log(chalk.bold('Active platform:'), chalk.green(activePlatform));
      } else {
        console.log(chalk.bold('Active platform:'), chalk.gray('none (run ') + chalk.bold('aipm use <platform>') + chalk.gray(' to activate)'));
      }

      // Installed components
      const lockFile = path.join(aiDir, 'stack.lock');
      if (fs.existsSync(lockFile)) {
        const lock = JSON.parse(await fs.promises.readFile(lockFile, 'utf8'));
        const total = (lock.skills?.length || 0) + (lock.agents?.length || 0) + (lock.mcps?.length || 0);
        console.log(chalk.bold('Installed:'), `${lock.skills?.length || 0} skills, ${lock.agents?.length || 0} agents, ${lock.mcps?.length || 0} MCPs (${total} total)`);

        if (lock.timestamp) {
          console.log(chalk.bold('Last install:'), new Date(lock.timestamp).toLocaleString());
        }

        if (total > 0) {
          console.log();
          if (lock.skills?.length > 0) {
            console.log(chalk.bold('  Skills:'));
            lock.skills.forEach((s: InstalledComponent) => {
              console.log(`    ${chalk.cyan(s.id)} @ ${chalk.yellow(s.version)}`);
            });
          }
          if (lock.agents?.length > 0) {
            console.log(chalk.bold('  Agents:'));
            lock.agents.forEach((a: InstalledComponent) => {
              console.log(`    ${chalk.cyan(a.id)} @ ${chalk.yellow(a.version)}`);
            });
          }
        }
      } else {
        console.log(chalk.bold('Installed:'), chalk.gray('nothing yet (run ') + chalk.bold('aipm install') + chalk.gray(' to install)'));
      }

      // Defined but not installed
      const definedSkills = stack.skills?.length || 0;
      const definedAgents = stack.agents?.length || 0;
      const definedMcps = stack.mcps?.length || 0;
      const totalDefined = definedSkills + definedAgents + definedMcps;
      if (totalDefined > 0) {
        console.log(chalk.bold('Defined in stack:'), `${definedSkills} skills, ${definedAgents} agents, ${definedMcps} MCPs`);
        console.log();
        console.log(chalk.gray('  Run ') + chalk.bold('aipm install') + chalk.gray(' to install all defined components.'));
      }

      console.log();
    } catch (error) {
      logError(`Status failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * aipm update [id] - update installed components to latest version
 */
program
  .command('update [id]')
  .description('Update all or a specific installed component to the latest version')
  .action(async (id?: string) => {
    try {
      const stackFile = findStackConfigFile();
      if (!stackFile) {
        logError(`No stack configuration file found. Run 'aipm init' first.`);
        process.exit(1);
      }

      const lockFile = path.join(getLocalAiDir(), 'stack.lock');
      if (!fs.existsSync(lockFile)) {
        logError(`Lock file not found. Run 'aipm install' first.`);
        process.exit(1);
      }

      const stack = await loadStackConfigFromFile(path.resolve(stackFile));
      const cacheManager = new CacheManager();
      await cacheManager.init();
      const installer = new GitInstaller(cacheManager);

      let updated = 0;

      // Update skills
      for (const skill of stack.skills || []) {
        if (id && skill.id !== id) continue;
        if (!(await cacheManager.isInstalled(skill.id))) {
          logInfo(`Skill ${skill.id} not installed, skipping`);
          continue;
        }
        logInfo(`Updating skill ${skill.id}...`);
        await cacheManager.deleteComponent(skill.id);
        await installer.installSkill(skill);
        updated++;
      }

      // Update agents
      for (const agent of stack.agents || []) {
        if (id && agent.id !== id) continue;
        if (!agent.source) continue;
        if (!(await cacheManager.isInstalled(agent.id))) {
          logInfo(`Agent ${agent.id} not installed, skipping`);
          continue;
        }
        logInfo(`Updating agent ${agent.id}...`);
        await cacheManager.deleteComponent(agent.id);
        await installer.installAgent(agent);
        updated++;
      }

      if (id && updated === 0) {
        logInfo(`Component ${id} not found in stack configuration`);
        process.exit(0);
      }

      // Refresh lock file with current cache state
      const updatedSkills: InstalledComponent[] = [];
      for (const skill of stack.skills || []) {
        const meta = await cacheManager.getInstalledMetadata(skill.id);
        if (meta) updatedSkills.push(meta);
      }
      const updatedAgents: InstalledComponent[] = [];
      for (const agent of stack.agents || []) {
        if (!agent.source) continue;
        const meta = await cacheManager.getInstalledMetadata(agent.id);
        if (meta) updatedAgents.push(meta);
      }

      await fs.promises.writeFile(lockFile, JSON.stringify({
        project: stack.project,
        skills: updatedSkills,
        agents: updatedAgents,
        mcps: [],
        timestamp: new Date().toISOString(),
      }, null, 2), 'utf8');

      logSuccess(`Updated ${updated} component(s)`);
    } catch (error) {
      logError(`Update failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * aipm uninstall <id> - remove an installed component
 */
program
  .command('uninstall <id>')
  .description('Remove an installed component from cache')
  .action(async (id: string) => {
    try {
      const cacheManager = new CacheManager();
      await cacheManager.init();

      if (!(await cacheManager.isInstalled(id))) {
        logInfo(`Component ${id} is not installed`);
        process.exit(0);
      }

      await cacheManager.deleteComponent(id);
      logSuccess(`Uninstalled ${id}`);

      // Update lock file if it exists
      const lockFile = path.join(getLocalAiDir(), 'stack.lock');
      if (fs.existsSync(lockFile)) {
        const lock = JSON.parse(await fs.promises.readFile(lockFile, 'utf8'));
        lock.skills = (lock.skills || []).filter((s: InstalledComponent) => s.id !== id);
        lock.agents = (lock.agents || []).filter((a: InstalledComponent) => a.id !== id);
        lock.mcps = (lock.mcps || []).filter((m: InstalledComponent) => m.id !== id);
        lock.timestamp = new Date().toISOString();
        await fs.promises.writeFile(lockFile, JSON.stringify(lock, null, 2), 'utf8');
      }
    } catch (error) {
      logError(`Uninstall failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * aipm validate - validate stack configuration without installing
 */
program
  .command('validate')
  .description('Validate stack configuration file without installing anything')
  .action(async () => {
    try {
      const stackFile = findStackConfigFile();
      if (!stackFile) {
        logError(`No stack configuration file found. Run 'aipm init' first.`);
        process.exit(1);
      }

      const stack = await loadStackConfigFromFile(path.resolve(stackFile));
      logSuccess(`Configuration is valid for project "${stack.project}"`);

      const skills = stack.skills?.length || 0;
      const agents = stack.agents?.length || 0;
      const mcps = stack.mcps?.length || 0;
      const targets = Object.keys(stack.targets).length;

      console.log();
      console.log(chalk.bold('  Defined:'), `${skills} skills, ${agents} agents, ${mcps} MCPs`);
      console.log(chalk.bold('  Targets:'), `${targets} platforms (${Object.keys(stack.targets).join(', ')})`);

      // Check for inline agents (no source)
      const inlineAgents = (stack.agents || []).filter(a => !a.source);
      if (inlineAgents.length > 0) {
        console.log(chalk.bold('  Inline agents:'), `${inlineAgents.length} (will be defined in export, not installed from Git)`);
      }

      console.log();
      logInfo('Run ' + chalk.bold('aipm install') + ' to install all components.');
    } catch (error) {
      logError(`Validation failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
