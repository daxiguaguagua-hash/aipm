import { Adapter } from '../types';
import { ClaudeCodeAdapter } from './claude-code';
import { OpenClawAdapter } from './openclaw';
import { OpenCodeAdapter } from './opencode';

export type TargetPlatformName = 'claude-code' | 'openclaw' | 'opencode';

export { ClaudeCodeAdapter } from './claude-code';
export { OpenClawAdapter } from './openclaw';
export { OpenCodeAdapter } from './opencode';

/**
 * Get the appropriate adapter for a target platform
 * @param platform Target platform name
 * @returns Adapter instance
 */
export function getAdapter(platform: TargetPlatformName): Adapter {
  switch (platform) {
    case 'claude-code':
      return new ClaudeCodeAdapter();
    case 'openclaw':
      return new OpenClawAdapter();
    case 'opencode':
      return new OpenCodeAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

