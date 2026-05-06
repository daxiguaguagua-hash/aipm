---
name: dev-cycle
description: Complete development cycle — write code, build, test, codex review, then commit. Use for every batch of code changes.
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

## Step 3: Codex Review
```bash
codex review --uncommitted
```
Codex 审查未提交的改动。如果发现问题，修复后从 Step 1 重新来。
如果 Codex 不可用，跳过但要注明。

## Step 4: Commit
```bash
git add <changed files>
git commit -m "descriptive message"
```
只在 Codex 审批通过后提交。

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
- Commit ONLY after Codex approves (Step 3 passes before Step 4).
- Commit messages describe WHY, not just WHAT.
- All commands run without user confirmation.
