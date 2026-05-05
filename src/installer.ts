import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { CacheManager } from './cache';
import { InstalledComponent, Skill, Agent } from './types';
import { extractGitRepoName, logInfo, logSuccess, logError, ensureDir } from './utils';
import { parseGitHubRepo, downloadRelease } from './github';

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
    if (!skill.source) {
      throw new Error(`Skill ${skill.id} has no source URL`);
    }
    return this.installComponent(skill.id, skill.source, skill.version, 'skill');
  }

  /**
   * Install an agent from its Git source
   * @param agent Agent to install
   * @returns Promise resolving to InstalledComponent metadata
   */
  async installAgent(agent: Agent): Promise<InstalledComponent> {
    if (!agent.source) {
      throw new Error(`Agent ${agent.id} has no source URL`);
    }
    return this.installComponent(agent.id, agent.source, agent.version, 'agent');
  }

  /**
   * Generic component installation logic
   * @param id Component ID
   * @param source Git source URL
   * @param version Optional version
   * @param componentType Type of component ('skill' or 'agent')
   * @returns Promise resolving to InstalledComponent metadata
   */
  private async installComponent(
    id: string,
    source: string,
    version: string | undefined,
    componentType: 'skill' | 'agent'
  ): Promise<InstalledComponent> {
    logInfo(`Installing ${componentType} ${id} from ${source}`);

    // Check if already installed
    if (await this.cacheManager.isInstalled(id)) {
      const existing = await this.cacheManager.getInstalledMetadata(id);
      if (existing && existing.version === (version || 'latest')) {
        logSuccess(`${componentType.charAt(0).toUpperCase() + componentType.slice(1)} ${id} already installed at version ${existing.version}`);
        return existing;
      }
      // If version different, we need to reinstall/upgrade
      logInfo(`Updating ${componentType} ${id} to version ${version || 'latest'}`);
      await this.cacheManager.deleteComponent(id);
    }

    const component: InstalledComponent = await this.cloneRepository(
      id,
      source,
      version
    );

    // Save metadata
    await this.cacheManager.saveMetadata(component);

    logSuccess(`Installed ${componentType} ${id}@${component.version}`);
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

    // Try GitHub release download first (smaller, faster, no git clone overhead)
    const ghRepo = parseGitHubRepo(source);
    if (ghRepo) {
      try {
        return await this.downloadGitHubRelease(id, ghRepo.owner, ghRepo.repo, version, source, cachePath);
      } catch {
        logInfo(`GitHub release download failed for ${source}, falling back to git clone`);
        // Fall through to git clone below
      }
    }

    const gitUrl = this.cleanGitUrl(source);
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
   * Download a GitHub release tarball and extract to cache
   */
  private async downloadGitHubRelease(
    id: string,
    owner: string,
    repo: string,
    version: string | undefined,
    source: string,
    cachePath: string
  ): Promise<InstalledComponent> {
    const { tarballPath, tag } = await downloadRelease(owner, repo, version);

    // Remove existing cache dir and extract
    if (fs.existsSync(cachePath)) {
      await fs.promises.rm(cachePath, { recursive: true });
    }
    await ensureDir(cachePath);

    logInfo(`Extracting ${owner}/${repo}@${tag} to cache...`);
    execFileSync('tar', ['-xzf', tarballPath, '-C', cachePath, '--strip-components=1'], {
      stdio: 'pipe',
    });

    // Clean up temp tarball
    try { await fs.promises.unlink(tarballPath); } catch {}

    return {
      id,
      source,
      version: tag,
      path: cachePath,
    };
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
