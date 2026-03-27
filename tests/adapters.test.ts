import { getAdapter } from '../src/adapters';
import { ClaudeCodeAdapter } from '../src/adapters/claude-code';
import { OpenClawAdapter } from '../src/adapters/openclaw';
import { OpenCodeAdapter } from '../src/adapters/opencode';

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
});
