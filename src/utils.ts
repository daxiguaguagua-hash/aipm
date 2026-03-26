import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Ensures a directory exists, creating it if necessary
 * @param dir Directory path to ensure exists
 * @returns Promise resolving when directory is ensured
 */
export async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Gets the global cache directory path for aipm
 * @returns Global cache directory path
 */
export function getGlobalCacheDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return path.join(home, '.aipm', 'cache');
}

/**
 * Gets the local .ai directory path
 * @returns Local .ai directory path
 */
export function getLocalAiDir(): string {
  return path.join(process.cwd(), '.ai');
}

/**
 * Gets the local exports directory path
 * @returns Local exports directory path
 */
export function getLocalExportsDir(): string {
  return path.join(getLocalAiDir(), 'exports');
}

/**
 * Logs an info message with blue icon
 * @param message Message to log
 */
export function logInfo(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Logs a success message with green icon
 * @param message Message to log
 */
export function logSuccess(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Logs an error message with red icon
 * @param message Message to log
 */
export function logError(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Extracts repository name from various git URL formats
 * Handles HTTPS URLs (https://github.com/user/repo.git) and SSH URLs (git@github.com:user/repo.git)
 * @param url Git URL to extract repo name from
 * @returns Extracted repository name
 */
export function extractGitRepoName(url: string): string {
  // Handle git+https://... or git+ssh://... formats
  let cleanUrl = url.replace(/^git\+/, '');

  // Handle SSH URLs like git@github.com:user/repo.git
  if (cleanUrl.includes('@') && cleanUrl.includes(':')) {
    const parts = cleanUrl.split(':');
    const repoPart = parts.pop() || '';
    return repoPart.replace(/\.git$/, '').split('/').pop() || '';
  }

  // Handle HTTPS URLs
  const parts = cleanUrl.split('/');
  const repoName = parts.pop() || '';
  return repoName.replace(/\.git$/, '');
}
