import fs from 'fs';
import path from 'path';
import { InstalledComponent } from './types';
import { ensureDir, getGlobalCacheDir, logInfo, logSuccess, logError } from './utils';

export class CacheManager {
  private cacheDir: string;

  constructor() {
    this.cacheDir = getGlobalCacheDir();
  }

  /**
   * Ensures the cache directory exists (async version)
   * @returns Promise resolving when cache directory is ready
   */
  async init(): Promise<void> {
    await ensureDir(this.cacheDir);
  }

  getCachePath(id: string): string {
    return path.join(this.cacheDir, id);
  }

  async isInstalled(id: string): Promise<boolean> {
    try {
      await fs.promises.access(this.getCachePath(id));
      return true;
    } catch {
      return false;
    }
  }

  async getInstalledMetadata(id: string): Promise<InstalledComponent | null> {
    const metaPath = path.join(this.getCachePath(id), '.aipm-meta.json');
    try {
      const data = await fs.promises.readFile(metaPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async saveMetadata(meta: InstalledComponent): Promise<void> {
    try {
      const componentDir = this.getCachePath(meta.id);
      await ensureDir(componentDir);
      const metaPath = path.join(componentDir, '.aipm-meta.json');
      await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2));
      logSuccess(`Saved metadata for ${meta.id}`);
    } catch (error) {
      logError(`Failed to save metadata for ${meta.id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async listInstalled(): Promise<InstalledComponent[]> {
    try {
      await ensureDir(this.cacheDir);
      const items = await fs.promises.readdir(this.cacheDir);
      const result: InstalledComponent[] = [];
      for (const item of items) {
        const meta = await this.getInstalledMetadata(item);
        if (meta) {
          result.push(meta);
        }
      }
      return result;
    } catch (error) {
      logError(`Failed to list installed components: ${(error as Error).message}`);
      return [];
    }
  }

  async deleteComponent(id: string): Promise<void> {
    try {
      const componentPath = this.getCachePath(id);
      // Check if component exists
      if (!(await this.isInstalled(id))) {
        logInfo(`Component ${id} not found in cache`);
        return;
      }

      // Remove the component directory
      await fs.promises.rm(componentPath, { recursive: true, force: true });
      logSuccess(`Component ${id} deleted from cache`);
    } catch (error) {
      logError(`Failed to delete component ${id}: ${(error as Error).message}`);
      throw error;
    }
  }
}
