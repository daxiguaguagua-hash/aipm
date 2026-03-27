# aipm - AI Coding Stack Manager

> **[中文文档在这里 / Chinese documentation is here](./README.zh.md)**

aipm is the **Control Plane for your AI Coding environment**.

It unifies the management of your AI capabilities (skills, agents, MCP servers) and deploys them to different AI tools:
- Claude Code
- OpenClaw (NanoClaw)
- OpenCode

Goal: **Turn "tool switching" into "environment switching"** - eliminate the configuration overhead when switching between AI coding tools.

---

## What is this?

If you use multiple AI coding tools like Claude Code, OpenClaw, and OpenCode, you've probably noticed that:
- Each tool has its own configuration format
- MCP servers need to be configured separately for each tool
- Skills/agents need to be set up differently

aipm solves this by giving you **one declarative configuration file** (`.ai/stack.yaml`) that works for all tools.

---

## Installation (Development)

```bash
# Clone and build
git clone https://github.com/yourusername/aipm.git
cd aipm
npm install
npm run build

# Link to global
npm link
```

## Quick Start

```bash
# Initialize in your project
aipm init

# Edit .ai/stack.yaml to add your skills, agents, and MCPs
# (the generated template has comments to guide you)

# Install all components
aipm install

# Switch to Claude Code environment (exports configuration)
aipm use claude-code

# That's it! Your Claude Code now has all the configured MCP servers, skills, and agents.

# Switch to OpenClaw when you need it
aipm use openclaw
```

## Commands

| Command | Description |
|---------|-------------|
| `aipm init` | Initialize a new aipm project |
| `aipm install` | Install all components from `stack.yaml` |
| `aipm export <platform>` | Export configuration to target platform |
| `aipm use <platform>` | Switch AI environment to target platform |
| `aipm list` | List all installed components |

## Supported Platforms

- `claude-code` - Claude Code CLI
- `openclaw` - OpenClaw (NanoClaw)
- `opencode` - OpenCode

## Core Concepts

### 1. Skill
Reusable AI capability module:
```yaml
id: code-review
source: git+https://github.com/example/code-review-skill.git
version: 0.3.1
entry: ./main.md
dependencies: []
```

### 2. Agent
Orchestrator that composes multiple skills:
```yaml
id: planner
model: claude-sonnet
system: ./planner.md
skills:
  - code-review
```

### 3. MCP
External Model Context Protocol server:
```yaml
id: filesystem
command: npx
args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
transport: stdio
```

### 4. Target
Target platform to deploy your stack to:
- `claude-code`
- `openclaw`
- `opencode`

---

## Design Principles

1. **Declarative first** - `stack.yaml` is the single source of truth
2. **Local-first** - No central registry required, install directly from Git
3. **80% standard + 20% platform-specific** - Core abstraction is unified, platform differences handled by adapters
4. **No lock-in** - aipm just generates configuration for your existing tools

---

## Project Status

- ✅ **Phase 1 MVP Complete** - Core functionality works
- ✅ Parsing and validation of `stack.yaml`
- ✅ Git installer for skills/agents/MCPs
- ✅ Adapters for all three platforms
- ✅ Full CLI with `init/install/export/use`

---

## Development Workflow

See [docs/development-workflow.md](./docs/development-workflow.md) for the development process and how superpowers skills are used in this project.

## Original Design

The original project design was discussed with GPT-5.4, full record is available at [DESIGN.zh.md](./DESIGN.zh.md) (in Chinese).

## License

MIT
