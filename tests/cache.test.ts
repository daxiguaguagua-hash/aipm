import fs from 'fs';
import path from 'path';
import os from 'os';
import { CacheManager } from '../src/cache';

describe('CacheManager', () => {
  let cacheDir: string;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-cache-test-'));
    // Override global cache dir by mocking
    jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('not found'));
    jest.spyOn(fs.promises, 'readdir').mockResolvedValue([]);
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('not found'));
    jest.spyOn(fs.promises, 'rm').mockResolvedValue(undefined);
    cacheManager = new CacheManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    try { fs.rmSync(cacheDir, { recursive: true }); } catch {}
  });

  describe('init', () => {
    test('should create cache directory', async () => {
      await cacheManager.init();
      expect(fs.promises.mkdir).toHaveBeenCalled();
    });
  });

  describe('isInstalled', () => {
    test('should return false for missing component', async () => {
      const result = await cacheManager.isInstalled('nonexistent');
      expect(result).toBe(false);
    });

    test('should return true when component directory exists', async () => {
      jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined as any);
      const result = await cacheManager.isInstalled('installed-comp');
      expect(result).toBe(true);
    });
  });

  describe('getInstalledMetadata', () => {
    test('should return null when no metadata file', async () => {
      const result = await cacheManager.getInstalledMetadata('missing');
      expect(result).toBeNull();
    });

    test('should parse metadata from file', async () => {
      const meta = { id: 'test', source: 'https://example.com', version: 'v1.0', path: '/cache/test' };
      jest.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify(meta));
      const result = await cacheManager.getInstalledMetadata('test');
      expect(result).toEqual(meta);
    });
  });

  describe('saveMetadata', () => {
    test('should write metadata to file', async () => {
      const meta = { id: 'test', source: 'https://example.com', version: 'v1.0', path: '/cache/test' };
      await cacheManager.saveMetadata(meta);
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });
  });

  describe('listInstalled', () => {
    test('should return empty array when no components', async () => {
      const result = await cacheManager.listInstalled();
      expect(result).toEqual([]);
    });

    test('should return installed components with metadata', async () => {
      const meta = { id: 'test', source: 'https://example.com', version: 'v1.0', path: '/cache/test' };
      jest.spyOn(fs.promises, 'readdir').mockResolvedValueOnce(['test'] as any);
      jest.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify(meta));
      jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined as any);

      const result = await cacheManager.listInstalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(meta);
    });
  });

  describe('deleteComponent', () => {
    test('should not fail for missing component', async () => {
      await expect(cacheManager.deleteComponent('missing')).resolves.toBeUndefined();
    });

    test('should delete component directory', async () => {
      jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined as any);
      await cacheManager.deleteComponent('test');
      expect(fs.promises.rm).toHaveBeenCalled();
    });
  });
});
