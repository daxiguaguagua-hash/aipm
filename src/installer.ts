import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { CacheManager } from './cache';
import { InstalledComponent, Skill } from './types';
import { extractGitRepoName, logInfo, logSuccess, logError, ensureDir } from './utils';

/**
 * Installer handles cloning Git repositories into the cache
 */
export class GitInstaller {
  private cacheManager: CacheManager;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * Install a skill from its Git source
   * @param skill Skill to install
   * @returns Promise resolving to InstalledComponent metadata
   */
  async installSkill(skill: Skill): Promise<InstalledComponent> {
    logInfo(`Installing skill ${skill.id} from ${skill.source}`);

    // Check if already installed
    if (await this.cacheManager.isInstalled(skill.id)) {
      const existing = await this.cacheManager.getInstalledMetadata(skill.id);
      if (existing && existing.version === (skill.version || 'latest')) {
        logSuccess(`Skill ${skill.id} already installed at version ${existing.version}`);
        return existing;
      }
      // If version different, we need to reinstall/upgrade
      logInfo(`Updating skill ${skill.id} to version ${skill.version || 'latest'}`);
      await this.cacheManager.deleteComponent(skill.id);
    }

    const component: InstalledComponent = await this.cloneRepository(
      skill.id,
      skill.source,
      skill.version
    );

    // Save metadata
    await this.cacheManager.saveMetadata(component);

    logSuccess(`Installed skill ${skill.id}@${component.version}`);
    return component;
  }

  /**
   * Clone a Git repository to the cache directory
   * @param id Component ID
   * @param source Git source URL (can be git+https://..., git+ssh://..., or direct URL)
   * @param version Optional version (branch/tag/commit)
   * @returns InstalledComponent metadata
   */
  async cloneRepository(
    id: string,
    source: string,
    version?: string
  ): Promise<InstalledComponent> {
    const cachePath = this.cacheManager.getCachePath(id);
    const gitUrl = this.cleanGitUrl(source);
    const repoName = extractGitRepoName(source);
    const targetVersion = version || 'latest';

    await ensureDir(path.dirname(cachePath));

    try {
      const git = simpleGit();
      await git.clone(gitUrl, cachePath);

      const gitInCache = simpleGit(cachePath);

      if (version) {
        await gitInCache.checkout(version);
      }

      // Get current commit hash for metadata
      const commit = await gitInCache.revparse(['HEAD']);
      const actualVersion = version || commit.trim();

      return {
        id,
        source,
        version: actualVersion,
        path: cachePath,
      };
    } catch (error) {
      logError(`Failed to clone ${gitUrl}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Clean up Git URL by removing git+ prefix
   * @param url Original URL possibly with git+ prefix
   * @returns Clean URL for git clone
   */
  private cleanGitUrl(url: string): string {
    return url.replace(/^git\+/, '');
  }
}
