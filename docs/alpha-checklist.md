# Alpha Acceptance Checklist

Version target: `v0.2.0-alpha.1`

Purpose: verify that the main aipm workflow can be repeated in a fresh project before adding more large features.

Workflow:

`aipm init` -> Edit `.ai/stack.yaml` -> `aipm validate` -> `aipm install` -> `aipm use claude-code` -> inspect generated files

## Preconditions

- Run from a temporary project directory, not from the aipm repository root.
- Build the CLI first if testing from source:

```bash
npm run build
```

- Use the built CLI from this repository, or a globally linked `aipm`.

## 1. Initialize

```bash
aipm init
```

Expected output:

- A success line like `Initialized aipm project "<directory-name>" at <path>/.ai`.
- A follow-up line telling you to edit `.ai/stack.yaml`.

Expected files:

- `.ai/stack.yaml`

Troubleshooting:

- If `Stack file already exists`, rerun in a clean temporary directory or use `aipm init --force`.
- If the project name is wrong, edit the first line of `.ai/stack.yaml`.

## 2. Edit `.ai/stack.yaml`

Use this network-free stack for the alpha checklist. It covers MCP export and inline agent export without relying on remote Git availability.

```yaml
project: aipm-alpha-check

skills: []

agents:
  - id: checklist-planner
    model: claude-haiku
    system: You help verify the aipm alpha workflow. Keep responses short.
    skills: []

mcps:
  - id: filesystem
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
    transport: stdio

targets:
  claude-code:
    mcps: [filesystem]
    agents: [checklist-planner]
    skills: []
```

Expected output:

- No CLI output is expected while editing.

Expected files:

- `.ai/stack.yaml` contains one MCP, one inline agent, and the `claude-code` target.

Troubleshooting:

- If later validation fails with a YAML parse error, check indentation first.
- If later validation reports an undefined reference, make sure every ID listed under `targets.claude-code` exists in `skills`, `agents`, or `mcps`.

## 3. Validate

```bash
aipm validate
```

Expected output:

- `Configuration is valid for project "aipm-alpha-check"`.
- A `Defined:` line showing `0 skills, 1 agents, 1 MCPs`.
- A `Targets:` line showing `1 platforms (claude-code)`.
- An `Inline agents:` line showing `1`.

Troubleshooting:

- `No stack configuration file found`: run the command from the project directory or a child directory under it.
- `Missing or invalid "targets" field`: add a `targets:` object with at least one platform.
- `Invalid target platform`: use one of `claude-code`, `openclaw`, or `opencode`.

## 4. Install

```bash
aipm install
```

Expected output:

- `Loaded stack configuration for aipm-alpha-check`.
- `Install complete: 0 skills, 0 agents, 0 MCPs`.

Expected files:

- `.ai/stack.lock`

Notes:

- Inline agents are not installed from Git, so the installed agent count remains `0`.
- MCP definitions are passed through to target adapters, so the installed MCP count remains `0`.

Troubleshooting:

- If install fails while using a stack with remote skills or agents, confirm the source URL, network access, release/tag name, and GitHub authentication.
- For private GitHub sources, run `gh auth status` and confirm the account has repository access.

## 5. Use Claude Code

```bash
aipm use claude-code
```

Expected output:

- `Exported Claude Code configuration to <project>/.claude/`.
- `Switched to claude-code environment`.

Expected files:

- `.claude/settings.json`
- `.claude/agents.json`
- `.ai/current`

Conditional files:

- `.claude/skills.json` exists only when the `claude-code` target includes installed skills.
- For this network-free alpha stack, `.claude/skills.json` is expected to be absent because `skills: []`.

Troubleshooting:

- `Lock file not found`: run `aipm install` first.
- `Invalid platform`: use `claude-code`, `openclaw`, or `opencode`.
- Missing `.claude/agents.json`: confirm `targets.claude-code.agents` includes `checklist-planner`.
- Missing `.claude/settings.json`: rerun `aipm use claude-code` and check write permissions in the project directory.

## 6. Inspect Generated Files

```bash
cat .claude/settings.json
cat .claude/agents.json
cat .ai/current
```

Expected output:

- `.claude/settings.json` contains `mcpServers.filesystem.command` set to `npx`.
- `.claude/agents.json` contains `agents.checklist-planner`.
- `.ai/current` contains `claude-code`.

Optional skill check:

- If the tested stack includes a remote skill and `targets.claude-code.skills`, inspect `.claude/skills.json`.
- Expected output for that case: `.claude/skills.json` contains the skill ID and cache path.

Troubleshooting:

- If the generated JSON is empty, check that the `claude-code` target lists the MCPs, skills, or agents you expect to export.
- If a referenced remote skill or agent is skipped, rerun `aipm install` and check whether it appears in `.ai/stack.lock`.

## 7. Pass Criteria

The alpha checklist passes when all of these are true:

- `aipm init` creates `.ai/stack.yaml`.
- Edited stack passes `aipm validate`.
- `aipm install` creates `.ai/stack.lock`.
- `aipm use claude-code` creates `.claude/settings.json`.
- Inline agent export creates `.claude/agents.json`.
- `.ai/current` records `claude-code`.
- `.claude/skills.json` behavior is understood: present when installed skills are targeted, absent when no skills are targeted.

If any step fails, record:

- command run;
- exit code;
- full output;
- current `.ai/stack.yaml`;
- whether the test used remote GitHub sources.
