# Phase 2 设计文档：完成 MVP 功能

**项目**: aipm - AI Coding Stack Manager
**日期**: 2026-03-27
**阶段**: 第二阶段

---

## 概述

第一阶段已经完成了核心功能：
- ✅ `stack.yaml` 解析和验证
- ✅ Skill 的 Git 安装和缓存管理
- ✅ 三个平台的 Adapter 接口框架
- ✅ CLI 基础命令 (`init/install/export/use/list`)

第二阶段的目标是**完成 MVP 的所有剩余功能**，使得 agents 和 MCPs 也能完整工作。

---

## 设计决策回顾

通过头脑风暴，我们确认了以下设计决策：

### 1. MCP 处理方式
**决策**: 直接透传，不做安装缓存

**理由**:
- MCP 是外部进程，由目标平台直接启动执行
- MCP 不需要从 Git 克隆安装，一般是通过 npx/npm 分发
- 保持简单，减少复杂性

### 2. Agent 处理方式
**决策**: 转换为目标平台原生格式，支持 Git 安装

**理由**:
- Agent 在不同平台有不同的原生格式
- 支持从 Git 安装可以复用和共享 agents
- 保持和 skill 一致的安装模式，减少概念复杂度

---

## 详细设计

### 1. 类型定义修改

**文件**: `src/types.ts`

在 `Agent` 接口增加两个可选字段：

```typescript
export interface Agent {
  id: string;
  source?: string;      // 新增：Git 源码地址（可选）
  version?: string;     // 新增：版本（分支/标签/commit，可选）
  model?: string;
  system?: string;
  skills: string[];
}
```

这样支持两种 Agent 定义方式：

**Inline Agent (直接定义在 stack.yaml)**：
```yaml
agents:
  - id: planner
    model: claude-sonnet
    system: ./planner-system.md
    skills: [code-review]
```

**Git Agent (从 Git 安装)**：
```yaml
agents:
  - id: code-reviewer
    source: github:org/aipm-agent-code-reviewer
    version: v1.0.0
    skills: [code-review]
```

### 2. GitInstaller 扩展

**文件**: `src/installer.ts`

新增 `installAgent()` 方法，逻辑和 `installSkill()` 完全一致：

```typescript
async installAgent(agent: Agent): Promise<InstalledComponent> {
  // 逻辑：
  // 1. 检查是否已安装且版本匹配 → 直接返回
  // 2. 否则删除旧版本，克隆 Git 仓库
  // 3. 检出指定版本（如果有）
  // 4. 保存元数据到缓存
  // 5. 返回 InstalledComponent
}
```

复用现有的 `cloneRepository()` 方法，不需要重复代码。

### 3. CLI install 命令完成

**文件**: `src/cli.ts`

当前第 113 行是 TODO，替换为实际的 Agent 安装逻辑：

```typescript
// 安装所有 agents
const installedAgents = [];
for (const agent of stack.agents || []) {
  if (agent.source) {
    // 只有带 source 的 agent 需要安装
    const installed = await installer.installAgent(agent);
    installedAgents.push(installed);
  }
  // 不带 source 的 inline agent 保留在配置中，不需要安装
}

// MCPs 不需要安装，保持为空（因为直接透传）
const installedMcps: any[] = [];
```

### 4. ClaudeCodeAdapter 补全

**文件**: `src/adapters/claude-code.ts`

当前只导出了 MCP 配置，需要增加 skills 导出：

Claude Code 使用 `.claude/skills.json` 来配置 skills，格式类似：

```json
{
  "skills": {
    "code-review": {
      "path": "/path/to/cache/code-review",
      "version": "v1.0.0"
    }
  }
}
```

所以我们需要：
1. 在 `exportConfig()` 中处理 `targetConfig.skills`
2. 将已安装的 skills 映射到对应的路径
3. 写入 `.claude/skills.json`

### 5. 测试补充

- 在 `tests/installer.test.ts` 增加 agent 安装测试
- 在 `tests/adapters.test.ts` 增加 Claude Code skills 导出测试

---

## 架构一致性

这个设计保持了项目现有的架构一致性：

1. **遵循已有模式**：Agent Git 安装和 Skill 完全一致，复用现有缓存机制
2. **零破坏性变更**：不改变现有接口，只增加功能
3. **YAGNI**：MCP 保持简单透传，不做不必要的复杂性
4. **每个文件职责单一**：修改都在现有文件中，不需要创造新文件

---

## 验收标准

- [ ] 类型定义正确，支持 inline 和 Git 两种 agents
- [ ] GitInstaller 正确安装 agents 到缓存
- [ ] CLI install 命令正确处理 agents
- [ ] ClaudeCodeAdapter 正确导出 skills 配置
- [ ] 所有现有测试通过
- [ ] 新增测试覆盖 agent 安装和 Claude Code skills 导出
- [ ] 编译成功，无 TypeScript 错误

