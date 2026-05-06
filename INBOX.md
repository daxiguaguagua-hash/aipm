Phase 1: 导入迁移 — OpenClaw dry-run

## 任务拆解

### 1. 创建 src/importers/types.ts
定义核心类型：
- SourceInfo { tool, path, version }
- MigrationPlan { source, skills[], agents[], mcps[], unmapped[], conflicts[], notes[] }
- AgentImportItem { id, model?, provider?, system?, skills[] }
- ConflictInfo { id, type, existing }

### 2. 创建 src/importers/detector.ts
- detectOpenClawPath(): 检测 ~/.openclaw/openclaw.json 是否存在
- detectCodexPath(): 预留
- detectHermesPath(): 预留

### 3. 创建 src/importers/openclaw.ts
- 读取 openclaw.json
- 提取 agents.defaults.models 中的 agent 信息
- 提取 channels 中的平台配置
- 提取 models.providers 中的自定义 provider
- unmapped 字段：auth、gateway、hooks 等不适合映射的
- 构建 MigrationPlan
- 注意：不要提取 secrets（botToken、appSecret 等）

### 4. CLI 集成 src/cli.ts
- 新增 `aipm import <source>` 命令
- --dry-run（默认）：只输出预览，不写文件
- --json：机器可读输出
- 第一阶段只支持 source=openclaw

### 5. 测试
- tests/importers/detector.test.ts
- tests/importers/openclaw.test.ts
- 用你的实际 openclaw.json 做 fixture

约束：
- TDD：先写测试再写实现
- build → test → codex review → commit
- 不要提取 secrets
- 不要修改任何文件（dry-run only）