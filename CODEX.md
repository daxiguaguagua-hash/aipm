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
- Latest observed test result: 57 tests passed across 7 test suites.
- Current package version is `0.2.0-alpha.1`.
- README / README.zh mark the project as experimental alpha / dogfood only.
- ROADMAP marks v0.2.0 as alpha hardening.
- Gray-release acceptance checklist exists at `docs/alpha-checklist.md`.
- Documentation test covers the alpha checklist content.
- CLI smoke test covers built `dist/cli.js` in a temporary project.
- Runnable demo stack exists at `examples/alpha-demo.stack.yaml`.
- GitHub install failure messages include actionable troubleshooting hints.

## Development Agents

- Claude Code is configured to use Deepseek 4.0 Pro.
- Codex is configured to use GPT-5.5.

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
- `v0.2.0-alpha.1` positioning is complete.
- Gray-release acceptance checklist is complete.
- CLI smoke test is complete.
- Runnable demo stack is complete.
- Common GitHub install failure messages are hardened.

## Remaining Work

Open user feedback items in `TODO.md` are alpha hardening items and later feature work.

Current priority order:

1. Later: import/migration and multi-configuration support.

## Agent Control Notes

- Keep status updates short and factual.
- Do not use Markdown tables or Mermaid diagrams for user-facing progress reports.
- Report using short sections and bullet lists.
- Before changing process documents, verify current git history and `TODO.md`.
- Do not overwrite user or agent changes without checking `git status`.
- Do not delete `coverage/` unless the user asks; it is generated test output and currently untracked.

## Next Codex Step

用户指令：继续推进 demo stack 和失败体验打磨。两项均已完成。

本轮新增 `examples/alpha-demo.stack.yaml`，并用 docs/smoke 测试覆盖可解析、可 validate、可 `install --dry-run`。同时补 GitHub release/tarball/fallback clone 失败提示，错误信息会指向 `gh auth status`、`GITHUB_TOKEN`、release tag、权限和网络排查。下一步剩余较大的方向是导入/迁移与多配置支持。
