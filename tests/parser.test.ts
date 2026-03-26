import { parseStackConfig } from '../src/parser';

test('parse valid stack config', () => {
  const config = `
project: my-ai-stack

skills:
  - id: code-review
    source: github:anthonyclays/code-review-skill
    entry: ./main.md

targets:
  claude-code:
    agents: [planner]
`;
  const result = parseStackConfig(config);
  expect(result.project).toBe('my-ai-stack');
  expect(result.skills).toHaveLength(1);
  expect(result.skills?.[0].id).toBe('code-review');
  expect(result.targets['claude-code']).toBeDefined();
});
