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
import { StackConfig } from './types';

const program = new Command();
const DEFAULT_STACK_FILE = '.ai/stack.yaml';

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
skills:
  # Example:
  # - id: code-review
  #   source: github:anthonyclays/aipm-skill-code-review
  #   entry: ./main.md

# Agents orchestrate multiple skills
agents:
  # Example:
  # - id: planner
  #   model: claude-sonnet
  #   skills: [code-review]

# MCP (Model Context Protocol) external tools
mcps:
  # Example:
  # - id: filesystem
  #   command: npx
  #   args: ["-y", "@modelcontextprotocol/server-filesystem", "."]

# Target platform configurations
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
  .description('Install all skills, agents, and MCP servers from stack.yaml')
  .action(async () => {
    try {
      const stackFile = path.resolve(DEFAULT_STACK_FILE);
      if (!fs.existsSync(stackFile)) {
        logError(`Stack file not found at ${stackFile}. Run 'aipm init' first.`);
        process.exit(1);
      }

      // Load and parse stack config
      const stack = await loadStackConfigFromFile(stackFile);
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

      // TODO: Install agents and MCPs
      const installedAgents: any[] = [];
      const installedMcps: any[] = [];

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
  .description('Export configuration for the specified target platform')
  .action(async (platform: string) => {
    try {
      const validPlatforms: TargetPlatformName[] = ['claude-code', 'openclaw', 'opencode'];
      if (!validPlatforms.includes(platform as TargetPlatformName)) {
        logError(`Invalid platform: ${platform}. Valid platforms: ${validPlatforms.join(', ')}`);
        process.exit(1);
      }

      const stackFile = path.resolve(DEFAULT_STACK_FILE);
      if (!fs.existsSync(stackFile)) {
        logError(`Stack file not found at ${stackFile}. Run 'aipm init' first.`);
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

      const stackFile = path.resolve(DEFAULT_STACK_FILE);
      if (!fs.existsSync(stackFile)) {
        logError(`Stack file not found at ${stackFile}. Run 'aipm init' first.`);
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
