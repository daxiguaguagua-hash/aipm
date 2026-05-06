import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectOpenClawPath } from '../../src/importers/detector';

describe('detectOpenClawPath', () => {
  test('returns path when openclaw.json exists', () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-detector-'));
    const openClawDir = path.join(tmpHome, '.openclaw');
    fs.mkdirSync(openClawDir);
    fs.writeFileSync(path.join(openClawDir, 'openclaw.json'), '{}');

    try {
      const result = detectOpenClawPath(tmpHome);
      expect(result).toBe(path.join(tmpHome, '.openclaw', 'openclaw.json'));
    } finally {
      fs.rmSync(tmpHome, { recursive: true, force: true });
    }
  });

  test('returns null when openclaw.json does not exist', () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-detector-'));

    try {
      const result = detectOpenClawPath(tmpHome);
      expect(result).toBeNull();
    } finally {
      fs.rmSync(tmpHome, { recursive: true, force: true });
    }
  });

  test('returns null when .openclaw dir is missing', () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-detector-'));

    try {
      const result = detectOpenClawPath(tmpHome);
      expect(result).toBeNull();
    } finally {
      fs.rmSync(tmpHome, { recursive: true, force: true });
    }
  });
});
