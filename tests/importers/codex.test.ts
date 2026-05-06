import { importCodex } from '../../src/importers/codex';

const fixture = `
model = "gpt-5.5"
model_reasoning_effort = "medium"

[mcp_servers.aws-core]
type = "stdio"
command = "uvx"
args = ["awslabs.core-mcp-server@latest"]

[mcp_servers.aws-core.env]
AWS_PROFILE = "codex-mcp"
AWS_REGION = "us-west-2"

[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
enabled = false

[mcp_servers.playwright]
type = "stdio"
command = "npx"
args = ["@playwright/mcp@latest"]
enabled = false

[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp"
bearer_token_env_var = "GITHUB_TOKEN"

[mcp_servers.stitch]
url = "https://stitch.googleapis.com/mcp"
enabled = false

[mcp_servers.stitch.http_headers]
X-Goog-Api-Key = "secret-key-should-not-leak"

[mcp_servers.notion]
url = "https://mcp.notion.com/mcp"
enabled = true

[mcp_servers.basic-memory]
type = "stdio"
command = "bash"
args = ["-c", "uvx basic-memory mcp"]

[features]
multi_agent = true

[plugins."gmail@openai-curated"]
enabled = true

[plugins."github@openai-curated"]
enabled = true
`;

describe('importCodex', () => {
  let plan: Awaited<ReturnType<typeof importCodex>>;

  beforeAll(async () => {
    plan = await importCodex(fixture);
  });

  test('extracts source info', () => {
    expect(plan.source.tool).toBe('codex');
    expect(plan.source.path).toBe('~/.codex/config.toml');
  });

  test('extracts model config as notes', () => {
    const notesStr = plan.notes.join('\n');
    expect(notesStr).toContain('gpt-5.5');
    expect(notesStr).toContain('medium');
  });

  test('extracts stdio MCP servers', () => {
    expect(plan.mcps.length).toBeGreaterThanOrEqual(2);
    const awsCore = plan.mcps.find((m) => m.id === 'aws-core');
    expect(awsCore).toBeDefined();
    expect(awsCore?.transport).toBe('stdio');
    expect(awsCore?.command).toBe('uvx');
    expect(awsCore?.args).toEqual(['awslabs.core-mcp-server@latest']);

    const basicMemory = plan.mcps.find((m) => m.id === 'basic-memory');
    expect(basicMemory).toBeDefined();
    expect(basicMemory?.transport).toBe('stdio');
    expect(basicMemory?.command).toBe('bash');
  });

  test('extracts HTTP MCP servers', () => {
    const notion = plan.mcps.find((m) => m.id === 'notion');
    expect(notion).toBeDefined();
    expect(notion?.transport).toBe('http');
    expect(notion?.url).toBe('https://mcp.notion.com/mcp');
  });

  test('skips disabled MCP servers by default', () => {
    const figma = plan.mcps.find((m) => m.id === 'figma');
    expect(figma).toBeUndefined();

    const playwright = plan.mcps.find((m) => m.id === 'playwright');
    expect(playwright).toBeUndefined();
  });

  test('extracts plugins as agents', () => {
    const gmail = plan.agents.find((a) => a.id === 'gmail');
    expect(gmail).toBeDefined();
    expect(gmail?.skills).toEqual([]);

    const github = plan.agents.find((a) => a.id === 'github');
    expect(github).toBeDefined();
  });

  test('does not extract secrets from MCP configs', () => {
    const planJson = JSON.stringify(plan);
    expect(planJson).not.toContain('secret-key-should-not-leak');
    expect(planJson).not.toContain('GITHUB_TOKEN');
  });

  test('notes about features', () => {
    const notesStr = plan.notes.join('\n');
    expect(notesStr).toContain('multi_agent');
  });
});
