最高优先级：Codex + Hermes 作为目标平台

## 1. Codex adapter (src/adapters/codex.ts)
- 研究 Codex 配置格式
- 将 stack.yaml 中的 MCP servers 导出为 Codex 格式
- 将 agents 导出为 Codex 格式
- 将 skills 导出为 Codex 格式
- CLI: aipm use codex / aipm export codex

## 2. Hermes adapter (src/adapters/hermes.ts)  
- 研究 Hermes config.yaml 格式
- MCP → Hermes MCP 配置
- agents → Hermes 配置
- skills → Hermes skills 目录
- CLI: aipm use hermes / aipm export hermes

## 3. CLI + 测试
- aipm use codex / aipm export codex
- aipm use hermes / aipm export hermes
- 更新 targets 类型定义
- 各 adapter 对应测试

约束：TDD、不覆盖已有配置（先 dry-run）、build→test→codex review→commit