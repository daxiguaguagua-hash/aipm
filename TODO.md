# TODO / 待办

优先级从高到低排列。

- [*] **工作流提取为 skill** — 将当前开发闭环（build → test → commit → codex review → 修复）封装为可复用的 skill。以后其他项目也能直接用这套自动化流程。优先级最高：这是自己的效率工具，做好了一劳永逸。

- [-] **GitHub 作为后端** — 使用 GitHub Releases / API 作为 skills 和 agents 的分发后端。支持从 GitHub Release assets 下载安装，支持私有仓库认证。依赖多配置支持。

- [ ] **多配置支持** — 同一个 Git 仓库可能需要多份 AI 环境配置（如前端/后端团队各用一套）。两种方案：
  - 方案 A：`aipm init <name>` 创建 `.ai/<name>.stack.yaml`，后续命令用 `-c` 指定
  - 方案 B：单文件多 profile 片段，`aipm use claude-code --profile frontend`

- [*] **整理 ROADMAP.md** — 已完成。创建了含 v0.1.0 → v0.2.0 → v0.3.0 的版本路线图。

- [*] **init 用当前目录名作为默认项目名** — 已完成。取 `path.basename(process.cwd())`，init 成功后提示可编辑第一行改名。

## 约定
- `[ ]` 未开始
- `[-]` 进行中
- `[*]` 已完成
