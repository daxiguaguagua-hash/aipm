# ROADMAP / 路线图

## 概览

aipm 的目标：**把 AI 编程工具的"工具切换"变成"环境切换"**。

核心逻辑：一份 `stack.yaml` 声明式配置文件，管理 skills / agents / MCPs，一键导出到 Claude Code / OpenClaw / OpenCode。

---

## v0.1.0 — MVP 核心架构 ✅

**已完成** — 2026年3月

基础能力到位：配置文件解析 → Git 安装 → 平台导出。

| 模块 | 内容 |
|------|------|
| 配置解析 | YAML + JSON 双格式支持，完整校验（skills/agents/MCPs/targets） |
| Git 安装器 | 从 Git 仓库自动克隆 skills 和 agents，版本管理，缓存复用，支持 HTTPS/SSH |
| 缓存管理 | `~/.aipm/cache/` 全局缓存，元数据持久化，安装/卸载/列表 |
| 三平台适配器 | Claude Code（`.claude/settings.json`）、OpenClaw（`.nano/settings.json`）、OpenCode（`.opencode/mcp.json`） |
| CLI 基础命令 | `init` `install` `export` `use` `list` |

**技术栈：** TypeScript, Commander.js, simple-git, js-yaml, Jest

---

## v0.2.0 — 丰富 CLI 与工程质量 ✅

**正在进行** — 2026年5月

在 MVP 基础上补齐管理命令、提升工程质量、引入 Codex 审计循环。

### 新增命令

| 命令 | 功能 |
|------|------|
| `aipm status` | 环境状态总览：项目名、激活平台、已安装组件、配置定义（支持 `--json`） |
| `aipm update [id]` | 更新所有或指定组件到最新版本 |
| `aipm uninstall <id>` | 卸载组件并清理锁文件（含路径遍历安全校验） |
| `aipm validate` | 校验配置文件，不安装（支持 `--json`） |
| `aipm clean` | 清除所有缓存组件（需 `--force` 确认） |
| `aipm info <id>` | 查看组件详情：版本、来源、类型、是否在 stack 中 |

### 命令增强

| 命令 | 新增选项 |
|------|---------|
| `install` | `--force` 强制重装，`--dry-run` 预览 |
| `init` | `--force` 覆盖已有配置，默认项目名取当前目录名 |
| `list` | `--json` 机器可读输出，按 skills/agents/MCPs 分类 |

### 适配器增强

- Claude Code：完整导出 MCP（`settings.json`）+ skills（`skills.json`）+ agents（`agents.json`）
- 三个适配器均支持 inline agent（无 source 的 agent 直接导出定义）
- 删除配置中的 skills/agents 时自动清理残留的 JSON 文件

### 工程质量

- 父目录自动发现 stack 配置（子目录也能用 aipm）
- AI 状态文件跟随配置目录（不再写错位置）
- `init` 始终在当前目录创建，不误触父级配置
- 测试：25 → 43 个，覆盖率：53% → 86.5%
- Codex 审计集成：每次提交后自动 `codex review`

---

## v0.3.0 — 多配置与注册中心 🔲

**计划中**

### 多配置支持

同一个代码仓库支持多份 AI 环境配置（如前端/后端团队各一套）。

**方案 A（推荐）：** `aipm init <name>` 创建 `.ai/<name>.stack.yaml`，后续命令用 `-c <name>` 指定。

**方案 B：** 单文件多 profile 片段，`aipm use claude-code --profile frontend`。

### 全局配置

`~/.aipm/stack.yaml` — 用户级默认配置，所有项目共享的基础 skills/agents。

### 公开 Registry（远期）

- `aipm add skill <name>` 从 registry 安装（类似 npm install）
- 团队内部 registry 支持
- 社区贡献的公共 skills/agents 仓库

---

## 版本对比

| 能力 | v0.1.0 | v0.2.0 | v0.3.0 |
|------|--------|--------|--------|
| 配置解析 + 校验 | ✅ | ✅ | ✅ |
| Git 安装 + 缓存 | ✅ | ✅ | ✅ |
| 三平台适配器 | ✅ | ✅ | ✅ |
| 基础命令 (5) | ✅ | ✅ | ✅ |
| 管理命令 (6) | — | ✅ | ✅ |
| JSON 输出 | — | ✅ | ✅ |
| 安全校验 | — | ✅ | ✅ |
| 子目录使用 | — | ✅ | ✅ |
| 测试覆盖率 | 53% | 86.5% | 90%+ |
| Codex 审计 | — | ✅ | ✅ |
| 多配置 | — | — | 🔲 |
| 全局配置 | — | — | 🔲 |
| 公开 Registry | — | — | 🔲 |

---

## 原始设计

项目的原始方案是与 GPT-5.4 讨论得出的，完整记录在 [DESIGN.zh.md](./DESIGN.zh.md)。
