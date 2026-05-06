# Codex 工作交接

## 项目架构（三人分工）

```
Hermes Agent （总控）
  ├── 读 TODO.md，拆解任务
  ├── 通过 tmux 向你发指令
  ├── 验收你的产出
  └── 调度 Claude Code 清理工作区

Codex = 你 （开发者）
  ├── 收到 Hermes 的 tmux 指令后执行
  ├── 写代码 + 测试（TDD 优先）
  ├── 跑 build + test
  └── 完成后汇报结果（不必等 commit，Claude Code 会提交）

Claude Code （工作区管理员）
  ├── 读 INBOX.md
  ├── 提交你的产出
  ├── 验证 build/test
  └── 更新 STATUS.md
```

## 你的工作方式

- Hermes 通过 tmux session `codex-aipm` 向你发指令
- 收到指令后立即开始，不要等确认
- 使用 TDD：先写测试，再写实现
- 每完成一个任务跑 `npm run build && npm test`
- 完成后说"本轮完成"并列出产出，Hermes 会接管后续

## 当前状态

- 版本：`v0.2.0-alpha.1`
- 测试：7 suites，57 tests，全部通过
- 工作区由 Claude Code 维护，你不用担心 git commit

## 已完成

- MVP 核心架构
- 三平台适配器（Claude Code / OpenClaw / OpenCode）
- CLI 命令 10+ 个
- GitHub 后端（Release + clone fallback）
- v0.2.0-alpha.1 版本定位
- 灰度验收清单
- CLI smoke test
- Demo stack
- 失败体验打磨

## 待办（由 Hermes 调度）

- 已有工具配置导入/迁移
- 多配置支持

## 注意事项

- 不要自己决定做什么 — 等 Hermes 指令
- 不要 git commit — Claude Code 负责
- 不要删除 coverage/
- 每轮结束后保留你的修改在工作区，不要回退
