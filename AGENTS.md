# ScholarFlow Agent 指南

## 项目技术栈

- **前端框架**：Next.js 15 (App Router) + React 19 + TypeScript
- **样式**：Tailwind CSS + shadcn/ui + Base UI
- **状态管理**：Zustand + TanStack Query (React Query)
- **桌面端**：Electron + better-sqlite3
- **移动端**：Capacitor (Android)
- **测试**：Vitest + Playwright

## 已完成的清理工作

- 已删除未使用的 UI 组件、依赖和 Electron 后台功能（桌面宠物、抬头纹监控、Vision-Model 自动启动）
- 已统一重复类型定义
- 已移除前端无入口的僵尸功能（/progress、/knowledge、DashboardSummary 中的 health/knowledge 字段）
- 验证状态：`npm run typecheck`、`npm run lint`、`npm test` 均通过

## Skill 使用约定

项目根目录 `skills/` 下已下载 465+ 个 SKILL.md，覆盖 UI/UX、前端、测试、安全、性能、数据库、API 设计等领域。

**Agent 在执行相关任务时，应主动读取并遵循对应 skill 的规范。** 常用 skill 映射如下：

| 任务类型 | 优先参考 skill |
|---|---|
| UI/UX 设计、视觉审查、组件设计 | `skills/designer-skills/ui-design/`、`skills/design-skills/skills/linear/`、`skills/interface-design/`、`skills/ui-ux-pro-max-skill/` |
| React / Next.js / TypeScript 代码 | `skills/awesome-claude-code-toolkit/skills/nextjs-mastery/`、`skills/vercel-agent-skills/skills/react-best-practices/`、`skills/mcollina-skills/skills/typescript-magician/` |
| 代码重构、简化、审查 | `skills/agent-skills/skills/code-simplification/`、`skills/agent-skills/skills/code-review-and-quality/` |
| 测试补全 / E2E | `skills/awesome-claude-code-toolkit/skills/testing-strategies/`、`skills/agents/plugins/developer-essentials/skills/e2e-testing-patterns/` |
| 安全审计 | `skills/awesome-claude-code-toolkit/skills/security-hardening/`、`skills/agent-skills/skills/security-and-hardening/` |
| 性能优化 | `skills/awesome-claude-code-toolkit/skills/performance-optimization/`、`skills/agent-skills/skills/performance-optimization/` |
| API 设计 / 数据库 | `skills/awesome-claude-code-toolkit/skills/api-design-patterns/`、`skills/awesome-claude-code-toolkit/skills/database-optimization/` |
| 工程流程 / Git / CI-CD | `skills/awesome-claude-code-toolkit/skills/git-advanced/`、`skills/mattpocock-skills/skills/` |

> 注意：当前 kimi-code 不会自动扫描 `skills/` 目录注册 skill。Agent 应在需要时通过 `Read` 主动读取对应 SKILL.md，并将其原则融入执行过程。

## 通用执行原则

1. **最小改动**：只做实现目标所必需的修改，不重构无关代码。
2. **行为保留**：重构/清理后必须运行 `npm run typecheck`、`npm run lint`、`npm test` 验证。
3. **删除谨慎**：删除文件/依赖前，先用 Grep 确认没有引用。
4. **Electron 改动**：修改 `electron/` 后，使用 `node --check electron/main.js` 检查语法。
5. **Windows 环境**：Bash 工具使用 Git Bash，路径使用 POSIX 风格（`/d/A/scholarflow` 或 `D:/A/scholarflow`）。
