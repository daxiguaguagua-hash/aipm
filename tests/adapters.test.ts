import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAdapter } from '../src/adapters';
import { ClaudeCodeAdapter } from '../src/adapters/claude-code';
import { OpenClawAdapter } from '../src/adapters/openclaw';
import { OpenCodeAdapter } from '../src/adapters/opencode';
import { StackConfig } from '../src/types';

describe('Adapters', () => {
  describe('getAdapter', () => {
    test('returns ClaudeCodeAdapter for claude-code', () => {
      const adapter = getAdapter('claude-code');
      expect(adapter).toBeInstanceOf(ClaudeCodeAdapter);
    });

    test('returns OpenClawAdapter for openclaw', () => {
      const adapter = getAdapter('openclaw');
      expect(adapter).toBeInstanceOf(OpenClawAdapter);
    });

    test('returns OpenCodeAdapter for opencode', () => {
      const adapter = getAdapter('opencode');
      expect(adapter).toBeInstanceOf(OpenCodeAdapter);
    });

    test('throws error for unsupported platform', () => {
      expect(() => getAdapter('invalid-platform' as any)).toThrow('Unsupported platform: invalid-platform');
    });
  });

  describe('ClaudeCodeAdapter skills export', () => {
    test('ClaudeCodeAdapter should export skills', async () => {
      const adapter = getAdapter('claude-code');
      const stack: StackConfig = {
        project: 'test',
        skills: [
          { id: 'test-skill', source: 'https://example.com/test', entry: './main.md' },
        ],
        targets: {
          'claude-code': {
            skills: ['test-skill'],
          },
          openclaw: {},
          opencode: {},
        },
      };
      const installed = {
        skills: [
          { id: 'test-skill', source: 'https://example.com/test', version: 'v1.0.0', path: '/tmp/cache/test-skill' },
        ],
        agents: [],
        mcps: [],
      };

      // Create temp directory
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipm-test-'));

      await adapter.exportConfig(stack, installed, tempDir);

      // Check that skills.json was created
      const skillsPath = path.join(tempDir, '.claude', 'skills.json');
      expect(fs.existsSync(skillsPath)).toBe(true);

      const skillsJson = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
      expect(skillsJson.skills['test-skill']).toEqual({
        path: '/tmp/cache/test-skill',
        version: 'v1.0.0',
      });

      // Cleanup
      fs.rmSync(tempDir, { recursive: true });
    });
  });
});
