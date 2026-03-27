#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadStackConfigFromFile } from './parser';
import { CacheManager } from './cache';
import { GitInstaller } from './installer';
import { getAdapter, TargetPlatformName } from './adapters';
import { ensureDir, getLocalAiDir, getLocalExportsDir, logInfo, logSuccess, logError } from './utils';
import { StackConfig, InstalledComponent } from './types';

const program = new Command();
const DEFAULT_STACK_FILE_YAML = '.ai/stack.yaml';
const DEFAULT_STACK_FILE_YML = '.ai/stack.yml';
const DEFAULT_STACK_FILE_JSON = '.ai/stack.json';

// Try to find stack file in order: yaml -> yml -> json
function findStackConfigFile(): string | null {
  if (fs.existsSync(DEFAULT_STACK_FILE_YAML)) {
    return DEFAULT_STACK_FILE_YAML;
  }
  if (fs.existsSync(DEFAULT_STACK_FILE_YML)) {
    return DEFAULT_STACK_FILE_YML;
  }
  if (fs.existsSync(DEFAULT_STACK_FILE_JSON)) {
    return DEFAULT_STACK_FILE_JSON;
  }
  return null;
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
  .action(async () => {
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
          // Only agents with source need installation
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

      // Load config and lock
      const stack = await loadStackConfigFromFile(stackFile);
      const lock = JSON.parse(await fs.promises.readFile(lockFile, 'utf8'));

      // Get adapter and export
      const adapter = getAdapter(platform as TargetPlatformName);
      const outputDir = process.cwd();
      await adapter.exportConfig(stack, {
        skills: lock.skills || [],
        agents: lock.agents || [],
        mcps: lock.mcps || [],
      }, outputDir);

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

      // Load config and lock
      const stack = await loadStackConfigFromFile(stackFile);
      const lock = JSON.parse(await fs.promises.readFile(lockFile, 'utf8'));

      // Get adapter and export
      const adapter = getAdapter(platform as TargetPlatformName);
      const outputDir = process.cwd();
      await adapter.exportConfig(stack, {
        skills: lock.skills || [],
        agents: lock.agents || [],
        mcps: lock.mcps || [],
      }, outputDir);

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
  .action(async () => {
    try {
      const cacheManager = new CacheManager();
      await cacheManager.init();
      const installed = await cacheManager.listInstalled();

      if (installed.length === 0) {
        logInfo('No components installed');
        process.exit(0);
      }

      console.log();
      console.log(chalk.bold('Installed components:'));
      console.log();
      installed.forEach(comp => {
        console.log(`  ${chalk.cyan(comp.id)} @ ${chalk.yellow(comp.version)}`);
        console.log(`    ${chalk.gray(comp.source)}`);
      });
      console.log();
      console.log(`Total: ${installed.length} component(s)`);
    } catch (error) {
      logError(`List failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
