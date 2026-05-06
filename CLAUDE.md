# 工作方式

全自动运行。遇到决策选最优方案直接执行，事后简短告知。不要问"要不要做X"或"可以吗"，直接做。

不要使用 EnterPlanMode — 直接执行，不需要用户批准计划。

Git commit 自动执行，但不要 git push（除非明确要求）。

# 用户远程消息（INBOX / STATUS）

用户可能不在电脑前，通过 Hermes Agent 远程传话。每个循环开始前检查：

## INBOX.md（用户 → 你）
- 每个循环开始前：`cat INBOX.md`。如果有内容，优先处理。
- 处理完后：清空 INBOX.md，把执行结果追加到 STATUS.md。
- INBOX.md 的内容优先级高于 TODO.md 和 CODEX.md。

## STATUS.md（你 → 用户）
- 每个循环结束后：把当前状态追加到 STATUS.md 顶部（最新在上）。
- 格式：时间戳 + 三行以内摘要。只写事实，不写计划。
- 示例：
  ```
  ## 2026-05-06 10:30
  - build 通过，49 tests 全绿
  - commit: fix: 修复 parser 对空 yaml 的处理
  - codex review: 通过，无问题
  ```

如果 codex 不可用，在 STATUS.md 中注明。

# 每个小闭环的流程

使用 `/dev-cycle` skill。每次代码改动后走：build → test → commit → codex review → 修复直到通过。

如果 codex 不可用，跳过审计步骤但要说明。

# 上下文管理

当上下文窗口使用达到约 60% 时：
- 如果当前 task 未完成：保存 session 状态到 `~/.claude/sessions/`，记录当前进度，然后用 `/resume` 或新 session 继续
- 如果当前 task 已完成：压缩上下文后再开始下一个任务

不要等系统自动压缩，要主动管理上下文窗口。

# 项目背景

aipm (AI Coding Stack Manager) — AI 编程栈管理器，TypeScript CLI 工具。管理 AI coding agent 的安装、导出、切换等操作。

# 待办事项

用户提出的需求和改进记录在 `TODO.md` 中。工作过程中如果遇到新的需求或 bug，追加到 TODO.md 中，不要存在记忆里。

TODO.md 标记约定：
- `[ ]` 未开始
- `[-]` 进行中
- `[*]` 已完成

# 文档约定

- README.md (英文，GitHub 首页默认展示)
- README.zh.md (中文)
- 英文 README 顶部链接到中文文档
- TODO.md (项目待办事项)
