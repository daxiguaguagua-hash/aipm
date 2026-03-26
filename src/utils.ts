import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getGlobalCacheDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return path.join(home, '.aipm', 'cache');
}

export function getLocalAiDir(): string {
  return path.join(process.cwd(), '.ai');
}

export function getLocalExportsDir(): string {
  return path.join(getLocalAiDir(), 'exports');
}

export function logInfo(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

export function logSuccess(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function logError(message: string): void {
  console.error(chalk.red('✗'), message);
}

export function extractGitRepoName(url: string): string {
  // Handle git+https://... format
  const cleanUrl = url.replace(/^git\+/, '');
  const parts = cleanUrl.split('/');
  const repoName = parts.pop() || '';
  return repoName.replace(/\.git$/, '');
}
