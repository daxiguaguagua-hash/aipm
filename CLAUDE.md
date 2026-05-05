# 工作方式

全自动运行。遇到决策选最优方案直接执行，事后简短告知。不要问"要不要做X"或"可以吗"，直接做。

不要使用 EnterPlanMode — 直接执行，不需要用户批准计划。

Git commit 自动执行，但不要 git push（除非明确要求）。

# 每个小闭环的流程

每次完成一个功能点或修复后，按以下顺序执行：

1. `npm run build && npm test` — 确保编译通过、40 个测试全绿
2. `git add` + `git commit` — 提交改动
3. `codex review --uncommitted` — 用 Codex 审计未提交的改动（如果有）
4. 如果测试或审计发现问题，立即修复后重新走闭环
5. 简短告知用户做了什么

如果 `codex review` 报错或不可用，跳过审计步骤但要在告知中说明。

# 上下文管理

当上下文窗口使用达到约 60% 时：
- 如果当前 task 未完成：保存 session 状态到 `~/.claude/sessions/`，记录当前进度，然后用 `/resume` 或新 session 继续
- 如果当前 task 已完成：压缩上下文后再开始下一个任务

不要等系统自动压缩，要主动管理上下文窗口。

# 项目背景

aipm (AI Coding Stack Manager) — AI 编程栈管理器，TypeScript CLI 工具。管理 AI coding agent 的安装、导出、切换等操作。

# 文档约定

- README.md (英文，GitHub 首页默认展示)
- README.zh.md (中文)
- 英文 README 顶部链接到中文文档
