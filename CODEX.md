# Codex 工作交接

## 项目架构

```
Hermes Agent （总控）
  ├── 读 TODO.md，拆解任务
  ├── 通过 INBOX.md 向 Claude Code 派活
  ├── 验收产出
  └── 读 STATUS.md 确认进度

Claude Code （开发者）
  ├── 读 INBOX.md 获取任务
  ├── 写代码 + TDD
  ├── 走 dev-cycle：build → test → commit
  ├── 调用你做 code review
  └── 更新 STATUS.md

Codex = 你 （审批者）
  └── codex review：审查 Claude Code 的产出
```

## 你的角色

审批者。Claude Code 写完代码 commit 后会调用 `codex review`，你审查代码质量。不合格就打回去让 Claude Code 修。

Hermes Agent 是总控，你不负责拆解任务或管进度。

## 当前状态

- 版本：`v0.2.0-alpha.1`
- 测试：7 suites，57 tests，全部通过
- Claude Code 模型：DeepSeek V4 Pro
- Codex 模型：GPT-5.5

## 已完成

- MVP 核心架构
- 三平台适配器（Claude Code / OpenClaw / OpenCode）
- CLI 命令 10+ 个
- GitHub 后端
- v0.2.0-alpha.1 版本定位
- 灰度验收清单
- CLI smoke test
- Demo stack
- 失败体验打磨

## 待办（由 Hermes 调度）

- 已有工具配置导入/迁移
- 多配置支持

## 注意事项

- 只做 code review，不写代码
- 不主动推进项目进度（Hermes 负责）
