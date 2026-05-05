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

// Cached AI directory derived from the found stack config file
let resolvedAiDir: string | null = null;

// Try to find stack file in order: yaml -> yml -> json
// Searches current directory first, then parent directories
function findStackConfigFile(): string | null {
  const files = [DEFAULT_STACK_FILE_YAML, DEFAULT_STACK_FILE_YML, DEFAULT_STACK_FILE_JSON];
  let dir = process.cwd();

  while (true) {
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.existsSync(fullPath)) {
        resolvedAiDir = path.dirname(fullPath);
        return fullPath;
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  resolvedAiDir = null;
  return null;
}

function getAiDir(): string {
  if (!resolvedAiDir) {
    findStackConfigFile(); // sets resolvedAiDir if config is found
  }
  return resolvedAiDir || getLocalAiDir();
}

function validateComponentId(id: string): void {
  if (id.includes('..') || id.includes('/') || id.includes('\\') || id.trim() !== id || id.length === 0) {
    throw new Error(`Invalid component id: "${id}". IDs must be simple names without path separators.`);
  }
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

  const lockFile = path.join(getAiDir(), 'stack.lock');
  if (!fs.existsSync(lockFile)) {
    logError(`Lock file not found at ${lockFile}. Run 'aipm install' first.`);
    process.exit(1);
  }

  const stack = await loadStackConfigFromFile(stackFile);
  const lock = JSON.parse(await fs.promises.readFile(lockFile, 'utf8'));

  const adapter = getAdapter(platform as TargetPlatformName);
  const outputDir = path.dirname(getAiDir()); // project root (parent of .ai/)
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
  .option('-f, --force', 'Overwrite existing stack.yaml if it exists')
  .action(async (options: { force?: boolean }) => {
    try {
      const aiDir = getLocalAiDir(); // init always creates in cwd, not parent
      await ensureDir(aiDir);

      const stackFile = path.join(aiDir, 'stack.yaml');
      if (fs.existsSync(stackFile) && !options.force) {
        logInfo('Stack file already exists at ' + stackFile);
        logInfo('Use --force to overwrite');
        process.exit(0);
      }

      const projectName = path.basename(process.cwd());

      // Create default stack.yaml
      const defaultStack = `project: ${projectName}

# ==========================================
# Skills — reusable AI capability modules
# 技能 — 可复用的 AI 能力模块
# ==========================================
skills:
  # Example:
  # 示例：
  # - id: code-review
  #   source: github:anthonyclays/aipm-skill-code-review
  #   entry: ./main.md
  #   version: v0.3.1

# ==========================================
# Agents — skill orchestrators
# Agent 编排多个技能
# Two types 两种类型：
#   1. Git Agent (with source): auto-installed from Git
#      带 source 的 Agent 会从 Git 自动安装
#   2. Inline Agent (no source): defined here, exported directly
#      不带 source 的 inline Agent 直接定义，由平台导出
# ==========================================
agents:
  # --- Git Agent example 示例 ---
  # - id: senior-engineer
  #   source: https://github.com/your-org/team-agents.git
  #   version: v1.0.0
  #   model: claude-sonnet
  #   system: You are a senior engineer...
  #   skills: [code-review]

  # --- Inline Agent example 示例 ---
  # - id: quick-planner
  #   model: claude-haiku
  #   system: You are a fast planning assistant. Keep responses short.
  #   skills: []

# ==========================================
# MCP — external Model Context Protocol tools
# MCP — 外部 Model Context Protocol 工具
# ==========================================
mcps:
  # Example:
  # 示例：
  # - id: filesystem
  #   command: npx
  #   args: ["-y", "@modelcontextprotocol/server-filesystem", "."]

# ==========================================
# Targets — platform-specific configurations
# 目标平台 — 各平台特定配置
# ==========================================
targets:
  claude-code:
    mcps: []
    # skills: [code-review]
    # agents: [senior-engineer, quick-planner]

  openclaw:
    skills: []
    # agents: [senior-engineer]

  opencode:
    mcps: []
    # skills: [code-review]
`;

      await fs.promises.writeFile(stackFile, defaultStack, 'utf8');
      logSuccess(`Initialized aipm project "${projectName}" at ${aiDir}`);
      logInfo('Edit the first line of ' + stackFile + ' to rename, or add skills, agents, and MCP servers');
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
  .option('-n, --dry-run', 'Show what would be installed without doing it')
  .action(async (options: { force?: boolean; dryRun?: boolean }) => {
    try {
      const stackFile = findStackConfigFile();
      if (!stackFile) {
        logError(`No stack configuration file found. Run 'aipm init' first.`);
        process.exit(1);
      }

      // Load and parse stack config
      const stack = await loadStackConfigFromFile(path.resolve(stackFile));
      logInfo(`Loaded stack configuration for ${stack.project}`);

      if (options.dryRun) {
        const skillCount = (stack.skills || []).length;
        const agentCount = (stack.agents || []).filter(a => a.source).length;
        console.log();
        console.log(chalk.bold('Dry run - would install:'));
        console.log(`  ${skillCount} skill(s), ${agentCount} agent(s)`);
        if (skillCount > 0) {
          console.log(chalk.bold('  Skills:'));
          (stack.skills || []).forEach(s => console.log(`    - ${chalk.cyan(s.id)} from ${chalk.gray(s.source)}`));
        }
        if (agentCount > 0) {
          console.log(chalk.bold('  Agents:'));
          (stack.agents || []).filter(a => a.source).forEach(a => console.log(`    - ${chalk.cyan(a.id)} from ${chalk.gray(a.source!)}`));
        }
        console.log();
        process.exit(0);
      }

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
      const lockFile = path.join(getAiDir(), 'stack.lock');
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
      const currentFile = path.join(getAiDir(), 'current');
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
      const lockFile = path.join(getAiDir(), 'stack.lock');
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
  .option('--json', 'Output in JSON format')
  .action(async (options: { json?: boolean }) => {
    try {
      // Check for stack config (must set resolvedAiDir before getAiDir())
      const stackFile = findStackConfigFile();
      if (!stackFile) {
        console.log(chalk.yellow('No AI stack initialized. Run ') + chalk.bold('aipm init') + chalk.yellow(' to start.'));
        process.exit(0);
      }

      const aiDir = getAiDir();
      const stack = await loadStackConfigFromFile(stackFile);
      if (options.json) {
        const currentFile = path.join(aiDir, 'current');
        let activePlatform: string | null = null;
        if (fs.existsSync(currentFile)) {
          activePlatform = (await fs.promises.readFile(currentFile, 'utf8')).trim();
        }
        const lockFile = path.join(aiDir, 'stack.lock');
        let installed: any = null;
        if (fs.existsSync(lockFile)) {
          installed = JSON.parse(await fs.promises.readFile(lockFile, 'utf8'));
        }
        console.log(JSON.stringify({
          project: stack.project,
          activePlatform,
          installed,
          defined: {
            skills: stack.skills?.length || 0,
            agents: stack.agents?.length || 0,
            mcps: stack.mcps?.length || 0,
          },
        }, null, 2));
        process.exit(0);
      }

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

      const lockFile = path.join(getAiDir(), 'stack.lock');
      if (!fs.existsSync(lockFile)) {
        logError(`Lock file not found. Run 'aipm install' first.`);
        process.exit(1);
      }

      const stack = await loadStackConfigFromFile(path.resolve(stackFile));
      const cacheManager = new CacheManager();
      await cacheManager.init();
      const installer = new GitInstaller(cacheManager);

      let updated = 0;
      let failed = 0;

      // Update skills — force reinstall by bumping installed version
      for (const skill of stack.skills || []) {
        if (id && skill.id !== id) continue;
        if (!(await cacheManager.isInstalled(skill.id))) {
          logInfo(`Skill ${skill.id} not installed, skipping`);
          continue;
        }
        logInfo(`Updating skill ${skill.id}...`);
        try {
          // Force reinstall: mark installed version as stale
          const meta = await cacheManager.getInstalledMetadata(skill.id);
          if (meta) {
            meta.version = meta.version + '-stale';
            await cacheManager.saveMetadata(meta);
          }
          await installer.installSkill(skill);
          updated++;
        } catch (err) {
          failed++;
          logError(`Failed to update ${skill.id}: ${(err as Error).message}`);
        }
      }

      // Update agents — force reinstall by bumping installed version
      for (const agent of stack.agents || []) {
        if (id && agent.id !== id) continue;
        if (!agent.source) continue;
        if (!(await cacheManager.isInstalled(agent.id))) {
          logInfo(`Agent ${agent.id} not installed, skipping`);
          continue;
        }
        logInfo(`Updating agent ${agent.id}...`);
        try {
          const meta = await cacheManager.getInstalledMetadata(agent.id);
          if (meta) {
            meta.version = meta.version + '-stale';
            await cacheManager.saveMetadata(meta);
          }
          await installer.installAgent(agent);
          updated++;
        } catch (err) {
          failed++;
          logError(`Failed to update ${agent.id}: ${(err as Error).message}`);
        }
      }

      if (id && updated === 0 && failed === 0) {
        logInfo(`Component ${id} not found in stack configuration`);
        process.exit(0);
      }

      if (failed > 0) {
        logError(`${failed} component(s) failed to update. Run 'aipm install' to recover.`);
        process.exit(1);
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
      validateComponentId(id);

      const cacheManager = new CacheManager();
      await cacheManager.init();

      if (!(await cacheManager.isInstalled(id))) {
        logInfo(`Component ${id} is not installed`);
        process.exit(0);
      }

      await cacheManager.deleteComponent(id);
      logSuccess(`Uninstalled ${id}`);

      // Update lock file if it exists
      const lockFile = path.join(getAiDir(), 'stack.lock');
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
  .option('--json', 'Output in JSON format')
  .action(async (options: { json?: boolean }) => {
    try {
      const stackFile = findStackConfigFile();
      if (!stackFile) {
        logError(`No stack configuration file found. Run 'aipm init' first.`);
        process.exit(1);
      }

      const stack = await loadStackConfigFromFile(path.resolve(stackFile));

      if (options.json) {
        console.log(JSON.stringify({
          valid: true,
          project: stack.project,
          defined: {
            skills: stack.skills?.length || 0,
            agents: stack.agents?.length || 0,
            mcps: stack.mcps?.length || 0,
          },
          targets: Object.keys(stack.targets),
          inlineAgents: (stack.agents || []).filter(a => !a.source).length,
        }, null, 2));
        process.exit(0);
      }

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

/**
 * aipm clean - remove all installed components from cache
 */
program
  .command('clean')
  .description('Remove all installed components from cache')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options: { force?: boolean }) => {
    try {
      const cacheManager = new CacheManager();
      await cacheManager.init();
      const installed = await cacheManager.listInstalled();

      if (installed.length === 0) {
        logInfo('No components to clean');
        process.exit(0);
      }

      if (!options.force) {
        console.log(chalk.yellow(`This will remove ${installed.length} component(s) from cache:`));
        installed.forEach(c => console.log(`  ${chalk.cyan(c.id)} @ ${chalk.yellow(c.version)}`));
        console.log();
        logInfo('Use ' + chalk.bold('aipm clean --force') + ' to confirm removal.');
        process.exit(0);
      }

      for (const comp of installed) {
        await cacheManager.deleteComponent(comp.id);
      }

      // Clear lock file
      const lockFile = path.join(getAiDir(), 'stack.lock');
      if (fs.existsSync(lockFile)) {
        await fs.promises.unlink(lockFile);
      }

      logSuccess(`Cleaned ${installed.length} component(s)`);
    } catch (error) {
      logError(`Clean failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * aipm info <id> - show detailed information about a component
 */
program
  .command('info <id>')
  .description('Show detailed information about an installed component')
  .action(async (id: string) => {
    try {
      validateComponentId(id);
      const cacheManager = new CacheManager();
      await cacheManager.init();

      if (!(await cacheManager.isInstalled(id))) {
        logInfo(`Component ${id} is not installed`);
        process.exit(0);
      }

      const meta = await cacheManager.getInstalledMetadata(id);
      if (!meta) {
        logInfo(`No metadata found for ${id}`);
        process.exit(0);
      }

      console.log();
      console.log(chalk.bold('Component:'), chalk.cyan(meta.id));
      console.log(chalk.bold('Version:'), chalk.yellow(meta.version));
      console.log(chalk.bold('Source:'), chalk.gray(meta.source));
      console.log(chalk.bold('Path:'), meta.path);

      // Check if it's defined in the current stack
      const stackFile = findStackConfigFile();
      if (stackFile) {
        const stack = await loadStackConfigFromFile(stackFile);
        const inSkills = (stack.skills || []).some(s => s.id === id);
        const inAgents = (stack.agents || []).some(a => a.id === id);
        const inMcps = (stack.mcps || []).some(m => m.id === id);
        const types: string[] = [];
        if (inSkills) types.push('skill');
        if (inAgents) types.push('agent');
        if (inMcps) types.push('MCP');
        if (types.length > 0) {
          console.log(chalk.bold('Type:'), types.join(', '));
          console.log(chalk.bold('Status:'), chalk.green('active in current stack'));
        } else {
          console.log(chalk.bold('Status:'), chalk.gray('not in current stack'));
        }
      }

      console.log();
    } catch (error) {
      logError(`Info failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
