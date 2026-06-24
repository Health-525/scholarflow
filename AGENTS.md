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
- 验证状态：`npm run typecheck`、`npm run lint`、`npm test`、`npx playwright test` 均通过

## v1.0.2 桌面端调课功能重设计

- 移除全局涂抹式调课工具栏，改为「单课程上下文操作」
- 新增 `AdjustmentDialog` 调课弹窗，支持选择目标周次、星期、节次、生效模式（长期/单次）
- 支持三种核心场景：本周课调到下周、本周课之间互调、取消单次课程
- 数据模型增加 `sourceSpecificWeek`，支持跨周同节次移动（例如本周课顺延到下周同一节）
- 桌面端 `WeekGrid` 支持拖拽课程块到目标格子快速调课
- 移动端 `MobileSchedule` 同步改为抽屉操作入口
- `CourseDrawer` 增加「调课 / 取消本节 / 撤销调课」按钮及当前调课状态提示
- 新增 `tests/schedule-adjustments.test.ts` 单元测试（141 个测试全部通过）
- 版本号已更新至 `1.0.2`，产物包括安装版与便携版

## Skill 使用约定

项目根目录 `skills/` 下已下载 465+ 个 SKILL.md，覆盖 UI/UX、前端、测试、安全、性能、数据库、API 设计等领域。`mattpocock/skills` 已迁移至 Kimi 项目级 skill 目录。

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
| 工程流程 / Git / CI-CD | `skills/awesome-claude-code-toolkit/skills/git-advanced/` |
| 工程流程（Kimi 自动注册） | `.kimi-code/skills/mattpocock-skills/skills/` |

> 注意：`scholarflow/skills/` 目录不会被 kimi-code 自动扫描注册；Kimi 项目级 skill 请使用 `.kimi-code/skills/` 路径。Agent 仍可通过 `Read` 主动读取任一目录下的 SKILL.md。

## 设计系统方向（Design System Direction）

项目正在从「装饰优先」向「克制、一致、可维护」迁移，参考 Linear、Apple Design、Notion 等长寿命应用。后续 UI 改动应遵循以下原则：

### 1. 动画：解释状态，而非装饰
- **不再使用全局路由进入动画**（已移除 `AppShell` 的 `animate-page`）。页面切换应瞬时完成。
- 保留有意义的微交互：按钮 active、完成勾选、弹窗进入、骨架屏。
- 所有动画必须尊重 `prefers-reduced-motion`。

### 2. 导航：单一入口，避免重复
- **移动端「更多」统一指向 `/more` 页面**，不再维护独立的 `MobileMore` 组件和底部抽屉。
- `/chat` 已加入全局搜索；`/stats` 等不存在路由已从快捷键移除。
- 桌面端侧边栏保持 4 个分组；新增一级入口需审慎。

### 3. 卡片与容器：减少视觉噪音
- 卡片默认 hover 仅做边框色变化，不再整体上浮/加阴影。
- 移除无意义的装饰性模糊光斑、grain 叠加、大投影。
- 优先用留白和分组替代边框和阴影。

### 4. 设计 token：逐步约束，减少任意值
- **圆角**：优先使用 `rounded-md(6)/lg(12)/xl(18)/2xl(24)/full`，逐步替换 `rounded-[22px]`、`rounded-[28px]` 等任意值。
- **字号**：优先使用 `text-xs(12)/sm(14)/base(15)/lg(18)/xl(20)/2xl(24)`，逐步替换 `text-[11px]`、`text-[13px]`、`text-[15px]` 等任意值。
- **间距**：优先使用 `space-1/2/3/4/5/6/8`，减少 `gap-2.5`、`gap-3.5` 等混合值。
- **阴影**：仅使用 `--shadow-xs/sm/md/lg`，禁止内联 `shadow-[...]`。

### 5. 空状态与表单
- 空状态只保留一个主操作，移除示例/占位数据（已完成笔记示例清理）。
- 表单标签统一为 `text-xs font-medium text-muted-foreground`，不再使用 uppercase + tracking。
- 所有输入框统一走 `Input` / `Textarea` 组件，保持焦点环一致。

### 6. 主题与响应式
- 移动端 `ximi` 皮肤目前强制浅色，后续需提供暗色变体或改为仅调整强调色。
- 响应式优先复用组件，而非维护两套独立 UI（`MobileHome` / `MobileSchedule` 等属于历史债务）。

## 通用执行原则

1. **最小改动**：只做实现目标所必需的修改，不重构无关代码。
2. **行为保留**：重构/清理后必须运行 `npm run typecheck`、`npm run lint`、`npm test` 验证。
3. **提交前验证清单**：任何可能影响页面渲染、Electron 主进程或依赖的改动，在提交前必须依次执行：
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npx playwright test`（E2E）
   若正在运行 Electron 热加载（`npm run electron:hot`），先停止它再跑测试，否则 `better-sqlite3` 二进制被占用会导致 ABI 切换失败。
4. **删除谨慎**：删除文件/依赖前，先用 Grep 确认没有引用。
4. **Electron 改动**：修改 `electron/` 后，使用 `node --check electron/main.js` 检查语法。
5. **Windows 环境**：Bash 工具使用 Git Bash，路径使用 POSIX 风格（`/d/A/scholarflow` 或 `D:/A/scholarflow`）。
6. **及时提交**：每完成一批阶段性任务后应及时 `git commit`，避免大量未提交改动堆积。
7. **前端验证**：涉及 UI/UX 的改动需自行截图验证效果；遇到问题先查看终端、浏览器控制台与日志，不反问用户。
8. **上下文压缩**：用户切换任务或当前上下文过长时，主动对已完成任务的细节进行压缩，保留关键结论与待办，避免上下文爆炸。
