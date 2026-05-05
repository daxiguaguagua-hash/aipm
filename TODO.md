# TODO / 待办

- [*] **init 用当前目录名作为默认项目名** — 目前写死 `my-ai-stack`。应取 `path.basename(process.cwd())`，并支持 `aipm init <name>` 手动指定。
- [ ] **多配置支持** — 同一个 Git 仓库可能需要多份 AI 环境配置（如前端/后端团队各用一套）。两种方案：
  - 方案 A：`aipm init <name>` 创建 `.ai/<name>.stack.yaml`，后续命令用 `-c` 指定
  - 方案 B：单文件多 profile 片段，`aipm use claude-code --profile frontend`

## 约定
- `[ ]` 未开始
- `[-]` 进行中
- `[*]` 已完成
