# AI Coding Stack 管理器（aipm）方案设计

---

## 一、你的原始问题（用户原话）

> 我现在用了三套ai编程的工具组。1/claude code；2/openclaw；3/opencode；我发现在这三套工具之间切换的话成本太大了。
> 

> 我是这样想的：
> 
> 
> 1/用一个包管理工具，就像npm那样；
> 
> 2/这个包管理工具能够管理各种skills；
> 
> 3/能够管理各种agents；
> 
> 4/能够管理各种mcp；
> 
> 总之在切换到以上三种工具组合之前，这些配置都用这个管理工具管着。然后一旦我要切换工具，就从这个包管理工具中拿配置，自己填写。
> 

---

## 二、核心定位

**aipm = AI Coding 环境的控制平面（Control Plane）**

不是：

- 不是新的 agent
- 不是新的 IDE

而是：

👉 统一管理 AI 能力栈，并分发到不同工具（Claude Code / OpenClaw / OpenCode）

一句话：

**把“工具切换”变成“环境切换”**

---

## 三、核心抽象模型

### 1. Skill（能力模块）

```yaml
id: code-review
source: git+https://xxx
version: 0.3.1
entry: ./main.md
dependencies: []
```

---

### 2. Agent（能力编排者）

```yaml
id: planner
model: claude-sonnet
system: ./planner.md
skills:
  - code-review
```

---

### 3. MCP（外部能力）

```yaml
id: filesystem
command: npx
args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
transport: stdio
```

---

### 4. Target（目标平台）

- claude-code
- openclaw
- opencode

---

## 四、统一声明（核心文件）

`.ai/stack.yaml`

```yaml
project: my-ai-stack

skills:
  - id: code-review
    source: github:xxx/code-review-skill

agents:
  - id: planner
    model: claude-sonnet
    skills:
      - code-review

mcps:
  - id: filesystem
    command: npx

targets:
  claude-code:
    agents: [planner]

  openclaw:
    agents: [planner]

  opencode:
    skills: [code-review]
```

---

## 五、CLI 设计（最小可用）

### 初始化

```bash
aipm init
```

### 添加资源

```bash
aipm add skill chrome-cdp-skill
aipm add agent planner
aipm add mcp filesystem
```

### 安装依赖

```bash
aipm install
```

### 导出配置

```bash
aipm export openclaw
```

### 切换环境（核心能力）

```bash
aipm use claude-code
aipm use openclaw
```

👉 自动完成：

- 生成配置
- 注入环境变量
- 建立软链接

---

## 六、目录结构

```bash
.ai/
  stack.yaml
  stack.lock

  skills/
  agents/
  mcps/

  cache/

  exports/
    claude-code/
    openclaw/
    opencode/
```

---

## 七、系统分层

```
Interface（CLI）
Orchestrator（核心逻辑）
Provider（模型）
Tool（openclaw / opencode）
```

---

## 八、Adapter 机制（关键）

- adapter-claude-code
- adapter-openclaw
- adapter-opencode

负责：

- 配置格式转换
- 路径映射
- MCP 注入
- agent 转译

---

## 九、设计原则

1. 声明式优先（stack.yaml 是唯一真相）
2. 不追求完全兼容
3. 80% 标准 + 20% 平台特化
4. 本地优先（先不做 registry）

---

## 十、第一阶段目标（必须收敛）

只做：

- stack.yaml
- 三个 adapter（claude / openclaw / opencode）
- 三个命令：use / export / install

做到：

👉 一条命令完成工具切换

---

## 十一、本质总结

这不是一个包管理器，而是：

👉 **AI Coding Stack 的环境管理系统**
