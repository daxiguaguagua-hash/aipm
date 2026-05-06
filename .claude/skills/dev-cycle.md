---
name: dev-cycle
description: Complete development cycle — write code, build, test, commit, codex review. Use for every batch of code changes.
---

# Dev Cycle

After every batch of code changes, run this full cycle:

## Step 1: Build
```bash
npm run build
```
If build fails, fix errors and restart from Step 1.

## Step 2: Test
```bash
npm test
```
If any test fails, fix and restart from Step 1.

## Step 3: Commit
```bash
git add <changed files>
git commit -m "descriptive message"
```

## Step 4: Codex Review
```bash
codex review --uncommitted
```
If Codex finds issues, fix them and restart from Step 1.
If Codex is unavailable, skip but note in STATUS.md.

## Step 5: Clean Workspace
```bash
git status
```
Must be clean (only coverage/ untracked is OK).

## Step 6: Report
Write summary to STATUS.md, clear INBOX.md.

---

## Rules
- Never skip steps.
- TDD preferred: write tests first.
- Commit messages describe WHY, not just WHAT.
- All commands run without user confirmation.
