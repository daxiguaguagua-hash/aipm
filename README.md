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

aipm solves this by giving you **one declarative configuration file** that works for all tools.
Supports both YAML (`.yaml`/`.yml`) and JSON formats.

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

## Workflow: Portable AI Environment

Since your entire AI environment is defined in one configuration file, you can:
1. **Commit** your `.ai/stack.yaml` (or `.json`) to your dotfiles or project repository
2. **Clone** on a new machine
3. **Run** `aipm install && aipm use <platform>`
4. **Done** - you have your exact familiar AI environment on the new machine!

No more manual setup when you get a new computer.

## Commands

| Command | Description |
|---------|-------------|
| `aipm init` | Initialize a new aipm project (`--force` to overwrite) |
| `aipm install` | Install all components (`--force` to reinstall, `--dry-run` to preview) |
| `aipm export <platform>` | Export configuration to target platform |
| `aipm use <platform>` | Switch AI environment to target platform |
| `aipm status` | Show current environment status |
| `aipm update [id]` | Update all or a specific component to latest |
| `aipm uninstall <id>` | Remove an installed component |
| `aipm list` | List all installed components (`--json` for machine output) |
| `aipm info <id>` | Show detailed information about a component |
| `aipm validate` | Validate stack configuration without installing |
| `aipm clean` | Remove all cached components (`--force` to confirm) |

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
Orchestrator that composes multiple skills. Agents can be installed from Git:
```yaml
id: senior-engineer
source: https://github.com/your-team/team-agents.git
version: v1.0.0
model: claude-opus-4-6
system: |
  You are a senior engineer on our team.
  Follow our coding standards strictly.
  Always think about edge cases and testability.
skills:
  - everything-claude-code:tdd
  - everything-claude-code:security-review
```

**Fields:**
- `id` - Unique identifier for the agent
- `source` - Git repository URL (HTTPS or SSH) *[required for remote installation]*
- `version` - Git tag, branch, or commit hash *[optional, defaults to `latest`]*
- `model` - Preferred model for this agent
- `system` - Custom system prompt (inline or file path)
- `skills` - List of skills this agent can use *[required]*

AIPM will automatically clone, cache, and update agents from their Git repository.

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

- ✅ **Phase 3 In Progress** - Extended CLI with management commands
- ✅ Parsing and validation of `stack.yaml` (YAML + JSON)
- ✅ Git installer for **skills and agents** with automatic caching
- ✅ Adapters for all three platforms with skills and agents export (Claude Code: MCP + skills + agents)
- ✅ Full CLI: `init/install/export/use/status/update/uninstall/list/validate`
- ✅ Agent installation from remote Git repositories
- ✅ Automatic version checking and upgrades
- ✅ Environment status overview and component lifecycle management

---

## Development Workflow

See [docs/development-workflow.md](./docs/development-workflow.md) for the development process and how superpowers skills are used in this project.

## Original Design

The original project design was discussed with GPT-5.4, full record is available at [DESIGN.zh.md](./DESIGN.zh.md) (in Chinese).

## Acknowledgement

This project was **entirely designed, coded, and documented by Volcano Engine (Doubao Auto)**.
Claude Code only provides the runtime environment. The project owner pays for the compute service, and fully owns all output of this project.

Although Claude Code/Anthropic provides the editor environment, we want to state clearly:

> **Note on Political Positioning:**
> We firmly oppose Anthropic's inappropriate political positioning that regards China as an enemy country. We believe in peaceful development and mutual respect between all countries.

## License

MIT
