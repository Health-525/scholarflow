# Project Memory — ScholarFlow

## Overview
- ScholarFlow: Next.js 15 + React 19 + TypeScript 课表/学习流管理应用
- 桌面端 Electron + better-sqlite3，移动端 Capacitor (Android)
- 测试：Vitest + Playwright；状态：Zustand + TanStack Query
- 关键路径：`app/`、`components/`、`lib/`、`electron/`、`tests/`

## Skills 资产
- Kimi 项目级 skill 目录：`scholarflow/.kimi-code/skills/`
- 已安装 `mattpocock/skills`（GitHub 开源）至 `scholarflow/.kimi-code/skills/mattpocock-skills/`
- 已删除旧副本 `scholarflow/skills/mattpocock-skills/`，统一使用 Kimi 项目级 skill 路径
- mattpocock-skills 覆盖：PRD 编写、issue 拆解、TDD、代码库架构改进、Git guardrails、接口设计等工程流程

## Commands
- `npm run typecheck` — TypeScript 类型检查
- `npm run lint` — ESLint
- `npm test` — Vitest 单元测试
- `npm run e2e` — Playwright E2E 测试
- `node --check electron/main.js` — Electron 主进程语法检查

## Known Conventions
- 最小改动原则；重构后必须跑 typecheck/lint/test
- Windows 环境使用 Git Bash，路径用 POSIX 风格
- UI/UX 改动需截图验证

## Session Notes
- Last updated: 2026-06-23
- 已将 `mattpocock/skills` 仓库下载并注册为 Kimi 项目级 skill：`scholarflow/.kimi-code/skills/mattpocock-skills/`
