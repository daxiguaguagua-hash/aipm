# Codex Project Handoff

This document is the working handoff for Codex on `aipm`.

It exists to keep project progress under user control after earlier agent work allowed Claude to plan too much of the workflow by itself.

## Progress Rule

- `TODO.md` is the user's hands-on feedback backlog after trying a small completed version.
- `CODEX.md` is the handoff and control document.
- `ROADMAP.md` is the version-level direction.
- Old files under `docs/superpowers/plans/` are historical implementation plans only.
- Do not treat old unchecked plan boxes as live progress.
- Do not automatically execute items from `TODO.md`; the user decides which feedback item becomes active work.
- Do not let an agent create a new long-running workflow unless the user explicitly asks for it.
- For each active task, summarize the selected scope in `CODEX.md`, then implement, verify, and only update `TODO.md` when the user-facing feedback status actually changes.

## Current Status

- Build passes with `npm run build`.
- Test suite passes with `npm test`.
- Latest observed test result: 49 tests passed across 5 test suites.
- Working tree is clean except for untracked `coverage/` output.
- Latest committed task update: `docs: mark GitHub backend and dev-cycle skill as done`.

## Completed Work

- MVP core is complete.
- Stack config parsing supports YAML, YML, and JSON.
- Skills and agents can be installed from Git sources.
- GitHub source support has been added for release tarball download with git clone fallback.
- GitHub auth uses `gh auth token` first, then `GITHUB_TOKEN`.
- Claude Code, OpenClaw, and OpenCode adapters exist.
- Claude Code export supports MCP, skills, and agents.
- Inline agents are supported.
- CLI lifecycle commands exist:
  - `init`
  - `install`
  - `export`
  - `use`
  - `status`
  - `update`
  - `uninstall`
  - `list`
  - `validate`
  - `clean`
  - `info`
- `init` uses the current directory name as the default project name.
- `validate` checks target references.
- Update flow has been hardened so failed updates do not corrupt cache or lock state.
- The development loop has been extracted into a reusable skill.
- `ROADMAP.md` has been organized into v0.1.0, v0.2.0, and v0.3.0.

## Remaining Work

The only open user feedback item in `TODO.md` is multi-configuration support.

Treat it as pending feedback, not as automatically authorized implementation.

Recommended direction:

1. Implement named stack files first.
2. Use `.ai/<name>.stack.yaml` as the concrete storage format.
3. Add a global `-c, --config <name-or-path>` option or per-command equivalent.
4. Keep default behavior backward compatible with `.ai/stack.yaml`.
5. Defer single-file profile syntax until named stack files are stable.

Acceptance criteria for multi-configuration support:

- `aipm init <name>` creates `.ai/<name>.stack.yaml`.
- Existing `aipm init` still creates `.ai/stack.yaml`.
- Commands can select a config by name.
- Commands can still auto-discover `.ai/stack.yaml` without options.
- Lock/current state does not collide between named configs.
- README and README.zh explain the new workflow.
- Tests cover config discovery, command selection, and state file placement.

## Agent Control Notes

- Keep status updates short and factual.
- Do not use Markdown tables or Mermaid diagrams for user-facing progress reports.
- Report using short sections and bullet lists.
- Before changing process documents, verify current git history and `TODO.md`.
- Do not overwrite user or agent changes without checking `git status`.
- Do not delete `coverage/` unless the user asks; it is generated test output and currently untracked.

## Next Codex Step

When the user asks to continue implementation, confirm the selected scope from `TODO.md` first. If the user selects the current open item, start with multi-configuration support.

Suggested first investigation:

1. Read `src/cli.ts` config discovery and AI directory logic.
2. Read `src/parser.ts` for stack loading behavior.
3. Read tests around CLI, parser, and cache.
4. Decide how named config lock files should be named.
5. Record the active implementation scope in this document before coding.
