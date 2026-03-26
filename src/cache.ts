import fs from 'fs';
import path from 'path';
import { InstalledComponent } from './types';
import { ensureDir, getGlobalCacheDir, logInfo, logSuccess } from './utils';

export class CacheManager {
  private cacheDir: string;

  constructor() {
    this.cacheDir = getGlobalCacheDir();
    ensureDir(this.cacheDir);
  }

  getCachePath(id: string): string {
    return path.join(this.cacheDir, id);
  }

  isInstalled(id: string): boolean {
    return fs.existsSync(this.getCachePath(id));
  }

  getInstalledMetadata(id: string): InstalledComponent | null {
    const metaPath = path.join(this.getCachePath(id), '.aipm-meta.json');
    if (!fs.existsSync(metaPath)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch {
      return null;
    }
  }

  saveMetadata(meta: InstalledComponent): void {
    const metaPath = path.join(this.getCachePath(meta.id), '.aipm-meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    logSuccess(`Saved metadata for ${meta.id}`);
  }

  listInstalled(): InstalledComponent[] {
    ensureDir(this.cacheDir);
    const items = fs.readdirSync(this.cacheDir);
    const result: InstalledComponent[] = [];
    for (const item of items) {
      const meta = this.getInstalledMetadata(item);
      if (meta) {
        result.push(meta);
      }
    }
    return result;
  }
}
