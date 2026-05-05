# TODO / 待办

优先级从高到低排列。

- [*] **整理 ROADMAP.md** — 梳理已完成、进行中、计划中的功能，按版本排列。整合现有的 DESIGN.zh.md、Phase 2 设计文档，输出一份清晰的路线图。优先级最高：这是项目的门面，别人看 GitHub 第一眼就该知道项目走向。

- [ ] **多配置支持** — 同一个 Git 仓库可能需要多份 AI 环境配置（如前端/后端团队各用一套）。两种方案：
  - 方案 A：`aipm init <name>` 创建 `.ai/<name>.stack.yaml`，后续命令用 `-c` 指定
  - 方案 B：单文件多 profile 片段，`aipm use claude-code --profile frontend`

- [*] **init 用当前目录名作为默认项目名** — 已完成。取 `path.basename(process.cwd())`，init 成功后提示可编辑第一行改名。

## 约定
- `[ ]` 未开始
- `[-]` 进行中
- `[*]` 已完成
