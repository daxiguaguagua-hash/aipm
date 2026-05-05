# Phase 2 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the MVP by adding agent Git installation and Claude Code skills export.

**Architecture:** Extend the existing GitInstaller with parallel installAgent method following the same pattern as installSkill. Update the TypeScript types to support optional source/version on Agent. Complete ClaudeCodeAdapter by adding skills export following the same pattern as OpenClawAdapter.

**Tech Stack:** TypeScript, Jest, simple-git, commander

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types.ts` | Add `source?: string` and `version?: string` to Agent interface |
| `src/installer.ts` | Add `installAgent()` method parallel to `installSkill()` |
| `src/cli.ts` | Implement agent installation in the `install` command |
| `src/adapters/claude-code.ts` | Add skills export to `.claude/skills.json` |
| `tests/installer.test.ts` | Add tests for agent installation |
| `tests/adapters.test.ts` | Add tests for Claude Code skills export |

---

### Task 1: Update TypeScript Agent interface

**Files:**
- Modify: `src/types.ts:9-14`

- [ ] **Step 1: Read current file and update Agent interface**

Current:
```typescript
export interface Agent {
  id: string;
  model?: string;
  system?: string;
  skills: string[];
}
```

Change to:
```typescript
export interface Agent {
  id: string;
  source?: string;
  version?: string;
  model?: string;
  system?: string;
  skills: string[];
}
```

- [ ] **Step 2: Run TypeScript compile to verify no errors**

```bash
npm run build
```

Expected: Compiles successfully

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add source and version fields to Agent interface

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Add installAgent method to GitInstaller

**Files:**
- Modify: `src/installer.ts`
- Test: `tests/installer.test.ts`

- [ ] **Step 1: Add installAgent method after installSkill**

Add this method after `installSkill()`:

```typescript
/**
 * Install an agent from its Git source
 * @param agent Agent to install
 * @returns Promise resolving to InstalledComponent metadata
 */
async installAgent(agent: Agent): Promise<InstalledComponent> {
  logInfo(`Installing agent ${agent.id} from ${agent.source}`);

  // Check if already installed
  if (await this.cacheManager.isInstalled(agent.id)) {
    const existing = await this.cacheManager.getInstalledMetadata(agent.id);
    if (existing && existing.version === (agent.version || 'latest')) {
      logSuccess(`Agent ${agent.id} already installed at version ${existing.version}`);
      return existing;
    }
    // If version different, we need to reinstall/upgrade
    logInfo(`Updating agent ${agent.id} to version ${agent.version || 'latest'}`);
    await this.cacheManager.deleteComponent(agent.id);
  }

  const component: InstalledComponent = await this.cloneRepository(
    agent.id,
    agent.source!,
    agent.version
  );

  // Save metadata
  await this.cacheManager.saveMetadata(component);

  logSuccess(`Installed agent ${agent.id}@${component.version}`);
  return component;
}
```

- [ ] **Step 2: Add failing test for installAgent to installer.test.ts**

Add to `tests/installer.test.ts`:

```typescript
test('installAgent should install agent from git', async () => {
  const mockGit = {
    clone: jest.fn().mockResolvedValue(undefined),
    checkout: jest.fn().mockResolvedValue(undefined),
    revparse: jest.fn().mockResolvedValue('abcdef1234567890'),
  };
  (simpleGit as jest.Mock).mockReturnValue(mockGit);

  const cacheManager = new CacheManager();
  cacheManager.init = jest.fn().mockResolvedValue(undefined);
  cacheManager.isInstalled = jest.fn().mockResolvedValue(false);
  cacheManager.saveMetadata = jest.fn().mockResolvedValue(undefined);

  const installer = new GitInstaller(cacheManager);
  const agent = {
    id: 'test-agent',
    source: 'https://github.com/user/test-agent.git',
    version: 'v1.0.0',
    skills: ['test-skill'],
  };

  const result = await installer.installAgent(agent);

  expect(result.id).toBe('test-agent');
  expect(result.version).toBe('v1.0.0');
  expect(cacheManager.saveMetadata).toHaveBeenCalled();
  expect(mockGit.clone).toHaveBeenCalled();
});

test('installAgent should return existing if already installed', async () => {
  const cacheManager = new CacheManager();
  cacheManager.init = jest.fn().mockResolvedValue(undefined);
  cacheManager.isInstalled = jest.fn().mockResolvedValue(true);
  cacheManager.getInstalledMetadata = jest.fn().mockResolvedValue({
    id: 'test-agent',
    source: 'https://github.com/user/test-agent.git',
    version: 'v1.0.0',
    path: '/cache/test-agent',
  });
  cacheManager.saveMetadata = jest.fn().mockResolvedValue(undefined);

  const installer = new GitInstaller(cacheManager);
  const agent = {
    id: 'test-agent',
    source: 'https://github.com/user/test-agent.git',
    version: 'v1.0.0',
    skills: ['test-skill'],
  };

  const result = await installer.installAgent(agent);

  expect(result.version).toBe('v1.0.0');
  expect(cacheManager.saveMetadata).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test tests/installer.test.ts -t "installAgent should install agent from git"
```

Expected: FAIL because `installAgent` doesn't exist yet. (Actually, the TypeScript compile will fail before that, which is expected.)

- [ ] **Step 4: Run TypeScript compile and tests to verify pass**

```bash
npm run build && npm test tests/installer.test.ts
```

Expected: All tests pass (the existing ones plus two new ones)

- [ ] **Step 5: Commit**

```bash
git add src/installer.ts tests/installer.test.ts
git commit -m "feat: add installAgent method to GitInstaller

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Update CLI install command to install agents

**Files:**
- Modify: `src/cli.ts:106-128`

- [ ] **Step 1: Replace TODO comment with actual agent installation**

Current lines 113-116:
```typescript
// TODO: Install agents and MCPs
const installedAgents: any[] = [];
const installedMcps: any[] = [];
```

Replace with:
```typescript
// Install all agents that have a source
const installedAgents = [];
for (const agent of stack.agents || []) {
  if (agent.source) {
    const installed = await installer.installAgent(agent);
    installedAgents.push(installed);
  }
}

// MCPs don't need installation - they're passed through directly to the platform
const installedMcps: InstalledComponent[] = [];
```

- [ ] **Step 2: Run build and tests**

```bash
npm run build && npm test
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: implement agent installation in CLI install command

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Complete ClaudeCodeAdapter with skills export

**Files:**
- Modify: `src/adapters/claude-code.ts`
- Test: `tests/adapters.test.ts`

- [ ] **Step 1: Add skills handling to exportConfig method**

After adding MCP servers (after line 48), add:

```typescript
// Add skills from the stack configuration
if (targetConfig && targetConfig.skills) {
  settings.skills = {};
  for (const skillId of targetConfig.skills) {
    const installedSkill = installed.skills.find(s => s.id === skillId);
    if (!installedSkill) {
      logError(`Skill ${skillId} not installed, skipping`);
      continue;
    }
    settings.skills[skillId] = {
      path: installedSkill.path,
      version: installedSkill.version,
    };
  }
}
```

And update the output path to also write skills.json. After line 51-53:

Original:
```typescript
// Write settings.json
const outputPath = path.join(outputDir, '.claude', 'settings.json');
await ensureDir(path.dirname(outputPath));
await fs.promises.writeFile(outputPath, JSON.stringify(settings, null, 2), 'utf8');
```

Change to:
```typescript
// Write settings.json for MCP configuration
const settingsPath = path.join(outputDir, '.claude', 'settings.json');
await ensureDir(path.dirname(settingsPath));
await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

// Write skills.json if there are skills
if (settings.skills && Object.keys(settings.skills).length > 0) {
  const skillsPath = path.join(outputDir, '.claude', 'skills.json');
  await fs.promises.writeFile(skillsPath, JSON.stringify({ skills: settings.skills }, null, 2), 'utf8');
}
```

Update the success message:

```typescript
logSuccess(`Exported Claude Code configuration to ${outputDir}/.claude/`);
```

- [ ] **Step 2: Add test for Claude Code skills export**

Add to `tests/adapters.test.ts`:

```typescript
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
```

Don't forget to add `os` import at the top of the test file if not already present:

```typescript
import os from 'os';
```

- [ ] **Step 3: Run the new test to verify it passes**

```bash
npm run build && npm test tests/adapters.test.ts -t "ClaudeCodeAdapter should export skills"
```

Expected: Test passes

- [ ] **Step 4: Run all tests to verify nothing is broken**

```bash
npm test
```

Expected: All 21 (was 19) tests pass

- [ ] **Step 5: Commit**

```bash
git add src/adapters/claude-code.ts tests/adapters.test.ts
git commit -m "feat: complete ClaudeCodeAdapter with skills export

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Final verification

**Files:** All modified files

- [ ] **Step 1: Run full build and test suite**

```bash
npm run build && npm test
```

Expected:
- Build succeeds with no TypeScript errors
- All tests pass

- [ ] **Step 2: Verify git status and check for unstaged changes**

```bash
git status
```

Expected: All changes are committed

- [ ] **Step 3: Done**

---

## Self-Review

- ✅ Spec coverage: All requirements from the spec are covered by tasks
- ✅ No placeholders: All code shown explicitly, all steps concrete
- ✅ Type consistency: Method names and types match existing patterns
- ✅ Bite-sized tasks: Each task is small enough to complete quickly

