---
name: dev-cycle
description: Development cycle — after each feature or fix, run build, test, commit, and codex audit in a loop until clean. Use when writing or modifying code.
---

# Dev Cycle Skill

After every batch of code changes, run this cycle:

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

## Step 4: Codex Audit
```bash
codex review --uncommitted
```
If `codex` reports issues, fix them and restart from Step 1.

If `codex` is unavailable, skip this step but note it.

## Step 5: Done
Report what was fixed/changed. The working tree should be clean.

---

## Rules
- Never skip steps. If a step fails, fix before moving on.
- Commit messages should describe the WHY, not just the WHAT.
- If codex finds an issue, always address it (fix or justify why not).
- All commands run without user confirmation — this is an automated cycle.
