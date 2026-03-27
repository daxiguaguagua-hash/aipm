# aipm - AI 编程栈管理器

> **English version is here / 英文版本在这里 → [README.md](./README.md)**

aipm 是你的 **AI 编程环境控制平面**。

它统一管理你的 AI 能力（skills、agents、MCP 服务），并部署到不同的 AI 工具：
- Claude Code
- OpenClaw (NanoClaw)
- OpenCode

目标：**把"工具切换"变成"环境切换"** - 消除在不同 AI 编程工具之间切换时的配置开销。

---

## 这是什么？

如果你同时使用多个 AI 编程工具（Claude Code、OpenClaw、OpenCode），你可能已经发现：
- 每个工具都有自己的配置格式
- MCP 服务器需要在每个工具中单独配置
- Skills/agents 需要不同的设置

aipm 通过给你**一份声明式配置文件**（`.ai/stack.yaml`）解决这个问题，一份配置对所有工具生效。

---

## 安装（开发阶段）

```bash
# 克隆并构建
git clone https://github.com/你的用户名/aipm.git
cd aipm
npm install
npm run build

# 链接到全局
npm link
```

## 快速开始

```bash
# 在你的项目中初始化
aipm init

# 编辑 .ai/stack.yaml 添加你的技能、agents 和 MCP
# 生成的模板中有注释指导你

# 安装所有组件
aipm install

# 切换到 Claude Code 环境（导出配置）
aipm use claude-code

# 完成！你的 Claude Code 现在拥有所有配置好的 MCP 服务器、skills 和 agents。

# 需要时切换到 OpenClaw
aipm use openclaw
```

## 命令

| 命令 | 说明 |
|---------|-------------|
| `aipm init` | 初始化新的 aipm 项目 |
| `aipm install` | 从 `stack.yaml` 安装所有组件 |
| `aipm export <platform>` | 导出配置到目标平台 |
| `aipm use <platform>` | 切换 AI 环境到目标平台 |
| `aipm list` | 列出所有已安装组件 |

## 支持的平台

- `claude-code` - Claude Code CLI
- `openclaw` - OpenClaw (NanoClaw)
- `opencode` - OpenCode

## 核心概念

### 1. Skill（技能）
可复用的 AI 能力模块：
```yaml
id: code-review
source: git+https://github.com/example/code-review-skill.git
version: 0.3.1
entry: ./main.md
dependencies: []
```

### 2. Agent（代理）
组合多个技能的编排器。Agent 支持从 Git 远程安装：
```yaml
id: senior-engineer
source: https://github.com/your-team/team-agents.git
version: v1.0.0
model: claude-opus-4-6
system: |
  你是我们团队的高级工程师。
  严格遵守我们的编码规范。
  始终考虑边界情况和可测试性。
skills:
  - everything-claude-code:tdd
  - everything-claude-code:security-review
```

**字段说明：**
- `id` - Agent 的唯一标识符
- `source` - Git 仓库地址（支持 HTTPS 和 SSH）**[远程安装必填]**
- `version` - Git 标签、分支或 commit hash *[可选，默认为 `latest`]*
- `model` - 该 Agent 偏好使用的模型
- `system` - 自定义系统提示词（内联或文件路径）
- `skills` - 该 Agent 可以使用的技能列表 **[必填]**

AIPM 会自动从 Git 克隆、缓存和升级 Agents。

### 3. MCP
外部 Model Context Protocol 服务器：
```yaml
id: filesystem
command: npx
args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
transport: stdio
```

### 4. Target（目标）
要部署你的栈的目标平台：
- `claude-code`
- `openclaw`
- `opencode`

---

## 设计原则

1. **声明式优先** - `stack.yaml` 是唯一真相源
2. **本地优先** - 不需要中央注册表，直接从 Git 安装
3. **80% 标准 + 20% 平台特化** - 核心抽象统一，平台差异由 Adapter 处理
4. **不锁定** - aipm 只是为你现有的工具生成配置

---

## 项目状态

- ✅ **第二阶段 MVP 完成** - 所有核心功能已实现
- ✅ `stack.yaml` 解析和验证
- ✅ Git 安装器支持**技能、Agents 和 MCPs**
- ✅ 三个平台的 Adapters，Claude Code 支持完整 skills 导出
- ✅ 完整 CLI 支持 `init/install/export/use/list`
- ✅ 从远程 Git 仓库安装 Agents
- ✅ 自动版本检查和升级

---

## 开发流程

关于开发过程以及本项目如何使用 superpowers skills，请看 [docs/development-workflow.md](./docs/development-workflow.md)。

## 原始方案设计

本项目的原始方案设计是与 GPT-5.4 讨论得出的，完整记录在 [DESIGN.zh.md](./DESIGN.zh.md)。

## 许可证

MIT
