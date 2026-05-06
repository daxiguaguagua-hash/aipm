---
name: dev-cycle
description: Workspace cleanup cycle — after Codex finishes coding, commit, verify, and clean. Use when INBOX says to clean workspace.
---

# Workspace Cleanup Cycle

Your role is workspace manager. Codex does the coding. You do the cleanup.

After Codex finishes a round, Hermes will write to INBOX.md telling you to clean up.

## Step 1: Check Status

```bash
git status
```

See what Codex changed.

## Step 2: Verify

If there are significant code changes, run verification:

```bash
npm run build
npm test
```

If build or test fails, note it in STATUS.md and stop. Do NOT fix code — that's Codex's job.

## Step 3: Commit

```bash
git add <changed files>
git commit -m "descriptive message summarizing Codex's round"
```

## Step 4: Verify Clean

```bash
git status
```

Must show only `coverage/` untracked (which is normal). Nothing else.

## Step 5: Update STATUS

Write a summary to STATUS.md (newest at top).

## Step 6: Clear INBOX

INBOX.md should be empty after processing.

---

## Rules

- Never skip steps. If a step fails, fix before moving on.
- Do NOT write feature code. That's Codex's job.
- Do NOT modify Codex's code to fix bugs — report them in STATUS.md.
- Commit messages should describe what Codex delivered.
- All commands run without user confirmation.
