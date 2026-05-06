import fs from 'fs';
import path from 'path';
import { parseStackConfig } from '../src/parser';

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

describe('alpha demo stack', () => {
  const demoStackPath = path.join(__dirname, '..', 'examples', 'alpha-demo.stack.yaml');

  test('provides a parseable demo with a skill, inline agent, MCP, and target', () => {
    const content = fs.readFileSync(demoStackPath, 'utf8');
    const stack = parseStackConfig(content);

    expect(stack.project).toBe('aipm-alpha-demo');
    expect(stack.skills).toHaveLength(1);
    expect(stack.skills?.[0].id).toBe('demo-code-review');
    expect(stack.agents).toHaveLength(1);
    expect(stack.agents?.[0].source).toBeUndefined();
    expect(stack.mcps).toHaveLength(1);
    expect(stack.mcps?.[0].id).toBe('filesystem');
    expect(stack.targets['claude-code'].skills).toContain('demo-code-review');
    expect(stack.targets['claude-code'].agents).toContain('demo-planner');
    expect(stack.targets['claude-code'].mcps).toContain('filesystem');
  });
});
