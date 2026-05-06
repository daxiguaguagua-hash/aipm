import fs from 'fs';
import path from 'path';

describe('alpha checklist documentation', () => {
  const checklistPath = path.join(__dirname, '..', 'docs', 'alpha-checklist.md');

  test('covers the complete gray-release acceptance workflow', () => {
    const content = fs.readFileSync(checklistPath, 'utf8');

    const requiredContent = [
      '# Alpha Acceptance Checklist',
      'v0.2.0-alpha.1',
      'aipm init',
      'Edit `.ai/stack.yaml`',
      'aipm validate',
      'aipm install',
      'aipm use claude-code',
      '.claude/settings.json',
      '.claude/skills.json',
      '.claude/agents.json',
      'Expected output',
      'Troubleshooting',
    ];

    for (const item of requiredContent) {
      expect(content).toContain(item);
    }
  });
});
