# TODO / 待办

优先级从高到低排列。

进度接管说明见 `CODEX.md`。`TODO.md` 是用户在体验小版本后亲自记录的反馈池，不是 agent 自动执行队列。具体执行范围由用户确认后再进入 `CODEX.md`。

- [*] **工作流提取为 skill** — 将当前开发闭环（build → test → commit → codex review → 修复）封装为可复用的 skill。以后其他项目也能直接用这套自动化流程。优先级最高：这是自己的效率工具，做好了一劳永逸。

- [*] **GitHub 作为后端** — 使用 GitHub Releases / API 作为 skills 和 agents 的分发后端。支持从 GitHub Release assets 下载安装，支持私有仓库认证。依赖多配置支持。

- [*] **v0.2.0-alpha 版本定位** — 当前版本先定位为 alpha / dogfood，不继续急着堆新功能。目标是证明一条真实主路径可重复跑通，再考虑正常可用版本。
  - 建议版本标识：`v0.2.0-alpha.1`
  - `package.json` 版本与 alpha 定位一致
  - README / README.zh 明确标注 experimental / alpha / dogfood only
  - ROADMAP 中把 v0.2.0 状态调整为 alpha hardening
  - 暂时冻结大功能，把重点放在 alpha hardening

- [*] **建立灰度验收清单** — 新增 `docs/alpha-checklist.md`，把主流程验收写成可重复执行的步骤。
  - `aipm init`
  - 编辑 stack
  - `aipm validate`
  - `aipm install`
  - `aipm use claude-code`
  - 检查 `.claude/settings.json`、skills、agents 等生成文件
  - 记录预期输出和失败时排查点

- [*] **增加 CLI smoke test** — 用真实 CLI 命令跑主链路，避免只有函数级单元测试通过。
  - 使用临时目录执行构建后的 `dist/cli.js`
  - 覆盖 `init`、`validate`、`install --dry-run`、`use/export` 的可运行性
  - 避免真实网络依赖，必要时使用本地 fixture 或 dry-run

- [*] **新增可运行 demo stack** — 提供一个真实示例，不只是 README 片段。
  - 放在 `examples/` 或 `fixtures/`
  - 能用于灰度验收和 smoke test
  - 覆盖至少一个 skill、一个 inline agent、一个 MCP、一个 target

- [*] **明确失败体验** — 灰度阶段先把常见失败提示打磨清楚。
  - 无 GitHub token
  - 私有 repo 没权限
  - Release 不存在
  - tarball 下载失败
  - fallback git clone 失败
  - 错误信息要告诉用户下一步怎么排查

- [*] **已有工具配置导入 / 迁移** — 全部完成。`aipm import openclaw/hermes/codex/openrouter` 四平台导入已实现（dry-run / --write / --json / --on-conflict）。13 suites / 96 tests 全绿，零 secrets 泄露。

- [ ] **Dogfood 缺口：工作流文件管理** — zama 项目实战中发现 aipm 管不了的三个东西：
  1. `.claude/settings.local.json`（权限绕过配置）— aipm 只生成 `settings.json`（MCP）
  2. `.claude/skills/dev-cycle.md`（本地 skill）— aipm 只支持 Git 来源的 skill
  3. `CODEX.md`（项目交接文档）— 不在 aipm 抽象模型内
  应在 aipm 中支持声明式管理这些文件，让 `aipm use` 一步到位。

- [ ] **多配置支持** — 同一个 Git 仓库可能需要多份 AI 环境配置（如前端/后端团队各用一套）。两种方案：
  - 方案 A：`aipm init <name>` 创建 `.ai/<name>.stack.yaml`，后续命令用 `-c` 指定
  - 方案 B：单文件多 profile 片段，`aipm use claude-code --profile frontend`

- [*] **整理 ROADMAP.md** — 已完成。创建了含 v0.1.0 → v0.2.0 → v0.3.0 的版本路线图。

- [*] **init 用当前目录名作为默认项目名** — 已完成。取 `path.basename(process.cwd())`，init 成功后提示可编辑第一行改名。

## 约定
- `[ ]` 未开始
- `[-]` 进行中
- `[*]` 已完成
