# INBOX

> 来自 Kiro 的代码审查和建议（2026-05-16）

---

## 观察与建议

### 1. Dogfood 缺口优先级最高

TODO 里已有记录，但值得再强调：`settings.local.json`、本地 skill 文件（如 `.claude/skills/dev-cycle.md`）、`CODEX.md` 这类文件是真实使用中最痛的点——它们恰恰是最需要跨机器同步的，但 aipm 目前完全管不了。

建议在 `stack.yaml` 里增加一个 `files` 字段，支持声明式管理任意本地文件的来源和目标路径，`aipm use` 时一并处理。

---

### 2. `cli.ts` 需要拆分

当前 `cli.ts` 已超过 1000 行，所有命令逻辑都堆在一个文件里。建议拆到 `src/commands/` 目录，每个命令一个文件，`cli.ts` 只做命令注册。这对后续维护和测试都有好处。

---

### 3. `update` 命令的实现方式脆弱

当前通过给版本号追加 `-stale` 后缀来触发重装，这个 hack 比较脆弱——如果版本号本身包含特殊字符，或者 installer 的版本比较逻辑变化，就会出问题。

建议在 `GitInstaller.installSkill` / `installAgent` 里加一个 `force: boolean` 参数，直接跳过版本检查，逻辑更清晰。

---

### 4. Lock 文件里 `mcps` 始终为空数组

MCP 不需要安装，这是对的。但 lock 文件里记录 `mcps: []` 会让 `aipm status` 和 `aipm list` 的输出产生误导（显示"0 MCPs"，用户可能以为 MCP 没配置好）。

两个选项：
- 从 lock 文件里去掉 `mcps` 字段，MCP 状态直接从 `stack.yaml` 读取
- 或者在 `status` 输出里区分"已安装"和"直通（pass-through）"两种类型

---

### 5. `import` 和 `export` 的闭环不完整

`import` 支持从 openclaw/hermes/codex/openrouter 导入，适配器也支持导出到这些平台，但用户体验上没有形成完整闭环。建议在文档或 `aipm status` 输出里明确展示"哪些平台可以导入、哪些可以导出"，避免用户困惑。

---

## 小问题

- `program.version('0.1.0')` 在 `cli.ts` 里硬编码，和 `package.json` 的 `0.2.0-alpha.1` 不一致，应该从 `package.json` 读取。

---

## 产品方向讨论（2026-05-16）

### 核心使用场景：个人 AI 环境跨机器迁移

用户在 GitHub 上维护一份私有的全局 `stack.yaml`，记录自己所有的 MCP、skills、agents 配置。换新电脑时，从 GitHub 拉取这份配置，通过 TUI 界面勾选想安装的条目，一键恢复整个 AI 开发环境。

### 完整实现路径（按优先级排序）

**第一步：本地 MCP 流程验证（当前任务）**
- 用一个真实存在的公开 MCP（如 `@modelcontextprotocol/server-filesystem`）在空白项目里跑通完整流程
- 流程：`aipm init` → 编辑 `stack.yaml` 加入 MCP 定义 → `aipm install` → `aipm use claude-code` → 检查 `.claude/settings.json`
- 注意：`aipm install` 对纯 MCP 项目是多余步骤（MCP 不需要安装），但目前 `aipm use` 强依赖 lock 文件，需要先跑 install 才能 use
- 真实测试由用户手动执行，不由 AI agent 代劳

**第二步：全局配置支持**
- 实现 `~/.aipm/stack.yaml` 用户级全局配置
- 与项目级 `.ai/stack.yaml` 区分，全局配置管理跨项目共享的 MCP/skills/agents

**第三步：GitHub 同步**
- `aipm push`：把全局 `stack.yaml` 推送到用户指定的 GitHub 私有仓库
- `aipm pull`：从 GitHub 拉取全局配置到本地
- 认证复用现有的 `gh auth token` / `GITHUB_TOKEN` 机制

**第四步：TUI 交互式安装界面**
- `aipm setup`（或 `aipm install --interactive`）触发
- 从 GitHub 拉取 `stack.yaml` 后，用 TUI（推荐 `@clack/prompts`）列出所有条目
- 用户勾选想安装的 MCP/skills/agents，确认后一键安装 + 导出到目标平台
- 适合 200+ skills 的场景，比手动编辑 YAML 友好得多

### 关于 200+ skills 的管理问题

一个 `stack.yaml` 写 200 个条目是可行的，但需要解决：
- skills 的来源组织方式（是否都是独立 Git 仓库？还是一个 monorepo？）
- TUI 里的分类/搜索能力，避免 200 条平铺难以选择
- 这个问题待用户确认 skills 的存放方式后再设计

### 关于"默认 MCP 三件套"

graphify/gbrain/monorepo 是用户自己开发的 MCP 服务，目前还没有确定的启动命令。不应写死进 `aipm init` 的默认模板，应该作为用户个人 `stack.yaml` 里的配置，通过 GitHub sync 分发到新机器。
