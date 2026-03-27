---
name: Project Documentation Convention
description: Documentation file naming convention for projects
type: feedback
---

# 项目文档约定 / Project Documentation Convention

## Rule / 规则

> For all projects:
> 1. **Keep two separate documentation files**:
>    - One Chinese version: `README.zh.md`
>    - One English version: `README.md` (this is the default shown on GitHub homepage)
> 2. **Link the Chinese version from the English README** at the top of the file
> 3. This convention applies to all new projects created by this user

> 对于所有项目：
> 1. **保留两份独立的文档文件**：
>    - 中文版本：`README.zh.md`
>    - 英文版本：`README.md`（这是GitHub项目首页默认展示的）
> 2. **在英文 README 顶部链接到中文文档**
> 3. 这个约定适用于用户创建的所有新项目

## Why / 原因

User wants:
- GitHub homepage defaults to English for broader audience
- Chinese speakers can easily find the Chinese version via the link
- Keep documentation cleanly separated instead of mixing languages in one file

---

## How to apply / 如何应用

When starting a new project or updating documentation:
- Create `README.md` in English (default)
- Create `README.zh.md` in Chinese
- Add `> **[中文文档在这里 / Chinese documentation is here](./README.zh.md)**` at the top of `README.md`
