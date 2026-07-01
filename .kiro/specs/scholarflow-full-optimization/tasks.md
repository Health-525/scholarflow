# Implementation Plan: ScholarFlow 全面优化

## Overview

本计划将 21 项需求按「基础工具层 → 共享 Hook 层 → 逻辑 Bug 修复 → 重构层 → UI 一致性」五个阶段有序落地。
每项任务均引用具体需求条款，并附验收标准。全程使用 TypeScript（Next.js 15 App Router + React 19）。
每完成一批任务后执行 `npm run typecheck && npm run lint && npm test` 验证。

---

## Tasks

- [x] 1. 创建基础工具与 Hook 层（无依赖，优先建立）
  - 新建 `lib/format-duration.ts`（Req 4）
  - 新建 `hooks/useIsClient.ts`（Req 14）
  - 新建 `hooks/useGreeting.ts`（Req 5）
  - _Requirements: 4.1, 5.1, 14.1_

  - [x] 1.1 实现 `lib/format-duration.ts`
    - 导出 `formatDuration(totalMinutes: number): string`（中文长格式，供 ActivityPage）
    - 导出 `formatDurationShort(totalMinutes: number): string`（英文短格式 `"Xh Ym"`，供 ScreenTimeCard）
    - 导出 `formatAppDuration(seconds: number): string`（`"Xm Ys"` / `"Xs"`）
    - 导出 `formatSeconds(seconds: number): string`（`"H:MM:SS"` / `"M:SS"`）
    - 边界值防御：输入负数视为 0；`formatDuration(0)` → `"0分钟"`，`formatAppDuration(0)` → `"0秒"`，`formatSeconds(0)` → `"0:00"`
    - _Requirements: 4.1, 4.4_

  - [ ]* 1.2 为 `lib/format-duration.ts` 编写属性测试（fast-check）
    - 安装 `fast-check` 开发依赖（若未安装）：`npm install --save-dev fast-check`
    - **Property 5: formatDuration 系列函数输出等价性** — 对任意非负整数输入，新函数输出必须与原始实现完全相同
    - **Validates: Requirements 4.4**
    - 在 `tests/format-duration.test.ts` 中用 `fc.nat(10000)` 生成输入，`numRuns: 200`
    - _Requirements: 4.4_

  - [x] 1.3 实现 `hooks/useIsClient.ts`
    - 返回 `boolean`：SSR 时为 `false`，首次客户端 `useEffect` 后变为 `true`
    - 实现：`useState(false)` + `useEffect(() => setIsClient(true), [])`，不访问 `window`/`document`
    - _Requirements: 14.1, 14.6_

  - [ ]* 1.4 为 `hooks/useIsClient.ts` 编写属性测试
    - **Property 10: useIsClient 水合时序的正确性** — SSR 阶段返回 `false`，首次 effect 后返回 `true` 且不再变 `false`
    - **Validates: Requirements 14.6**
    - 在 `tests/useIsClient.test.ts` 中 mock `useEffect`，验证状态转换
    - _Requirements: 14.6_

  - [x] 1.5 实现 `hooks/useGreeting.ts`
    - 导出 `GreetingResult` 接口：`{ text: string; date: string }`
    - 时段边界：`h<6→夜深了`，`h<9→早安`，`h<12→上午好`，`h<14→中午好`，`h<18→下午好`，`h<22→晚上好`，`≥22→夜深了`
    - `date` 用 `toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })`
    - `setInterval` 每分钟更新，`useEffect` 清理计时器
    - _Requirements: 5.1, 5.4_

  - [ ]* 1.6 为 `hooks/useGreeting.ts` 编写属性测试
    - **Property 6: useGreeting 时段边界与原始实现等价** — 任意小时值 h∈[0,23]，返回文本与两处原始实现相同
    - **Validates: Requirements 5.4**
    - 在 `tests/useGreeting.test.ts` 中 mock `new Date()`，`fc.integer({ min: 0, max: 23 })`
    - _Requirements: 5.4_


- [x] 2. 修复逻辑 Bug：useAssignmentsQuery 空数组歧义（Req 7）
  - 修改 `hooks/useQueries.ts` 中的 `getCurrentAssignments` 函数
  - _Requirements: 7.1, 7.2, 7.3_

  - [x] 2.1 修复 `getCurrentAssignments` 中的 `undefined`/`null`/`[]` 语义
    - 将 `if (cached !== undefined)` 改为 `if (cached !== undefined && cached !== null)`
    - 添加注释说明三种语义：`undefined` → 缓存未初始化，`[]` → 有效空数组，非 `undefined/null` → 直接返回
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 2.2 为 `getCurrentAssignments` 编写单元测试（含属性测试）
    - **Property 9: getCurrentAssignments 缓存语义正确性** — `undefined` 时调用 `tryLocalApi`；`[]` 或非空数组时直接返回；`null` 时回退
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - 在 `tests/useAssignmentsQuery.test.ts` 中 mock `queryClient.getQueryData`，测试 4 种输入
    - _Requirements: 7.1, 7.2, 7.3_


- [x] 3. 修复逻辑 Bug：考试页面删除操作竞态问题（Req 3）
  - 修改 `app/exams/page.tsx`，将 `rollbackRef`/`pendingDeleteRef` 单值 ref 替换为 Map
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.1 将 `rollbackRef` 和 `pendingDeleteRef` 替换为 Map 结构
    - `rollbackMap = useRef<Map<string, Exam[]>>(new Map())`
    - `pendingDeleteMap = useRef<Map<string, { exam: Exam; timer: ReturnType<typeof setTimeout> }>>(new Map())`
    - 删除原有单值 ref 声明
    - _Requirements: 3.1_

  - [x] 3.2 重写删除触发逻辑，使用唯一 opId
    - 触发删除时：`opId = crypto.randomUUID()`
    - 快照存入 `rollbackMap.current.set(opId, currentExams)`
    - 若 `pendingDeleteMap.current.size > 0`：迭代所有 pending，立即调用 `deleteExam()`，清除各自计时器；任意 flush 失败则 toast `"删除「${exam.subject}」失败，请稍后重试"`；清空 pendingDeleteMap
    - 设置新 5000ms 计时器，存入 `pendingDeleteMap.current.set(opId, { exam, timer })`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.3 修复计时器完成和错误回滚路径使用 opId
    - 计时器触发：`deleteExam(target.id)` → `pendingDeleteMap.current.delete(opId)` → `rollbackMap.current.delete(opId)`
    - 乐观更新失败：用 `rollbackMap.current.get(opId)` 回滚，再 `rollbackMap.current.delete(opId)`
    - 撤销按钮：`pendingDeleteMap.current.has(opId)` → 清除计时器 → 还原 exam → 清除两 Map 中的 opId
    - _Requirements: 3.2, 3.5_

  - [x] 3.4 添加组件卸载清理 useEffect
    - `useEffect(() => { return () => { pendingDeleteMap.current.forEach(({ exam, timer }) => { clearTimeout(timer); deleteExam(exam.id, ...) }); pendingDeleteMap.current.clear(); }; }, [schoolId, userId])`
    - _Requirements: 3.3_

  - [ ]* 3.5 为竞态修复编写属性测试
    - **Property 1: 并发删除操作的唯一性与隔离性** — N 个并发删除各有唯一 opId，操作 k 完成只移除 k 的回滚快照
    - **Property 2: 顺序删除的 deferred flush 时序不变量** — 第二次删除初始化前，第一次 deferred 调用已被触发
    - **Property 3: deferred flush 失败的 toast 准确性** — toast 内容包含对应 `subject`
    - **Property 4: 多次删除后可见列表完整性** — 已删除的考试不在列表，未删除的全部保留
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
    - 在 `tests/exams-race-condition.test.ts` 中 mock timer/fetch，`numRuns: 100`
    - _Requirements: 3.1–3.5_


- [x] 4. Checkpoint — 基础层验证
  - 执行 `npm run typecheck && npm run lint && npm test`，确保全部通过，有问题及时修复后再继续。

- [x] 5. 消费 `useIsClient` Hook：替换四处 `mounted` 模式（Req 14）
  - _Requirements: 14.2, 14.3, 14.4, 14.5_

  - [x] 5.1 `AssignmentsCard` 改用 `useIsClient`
    - 删除 `const [mounted, setMounted] = useState(false)` 及对应 `useEffect`
    - 导入并调用 `const isClient = useIsClient()`，将所有 `mounted` 引用替换为 `isClient`
    - _Requirements: 14.2_

  - [x] 5.2 `ScheduleCard` 改用 `useIsClient`
    - 同上替换模式
    - _Requirements: 14.3_

  - [x] 5.3 `ScreenTimeCard` 改用 `useIsClient`
    - 同上替换模式
    - _Requirements: 14.4_

  - [x] 5.4 `MobileHome/TodayTasks` 改用 `useIsClient`
    - 同上替换模式
    - _Requirements: 14.5_


- [x] 6. 消费 `format-duration.ts`：替换 ActivityPage 和 ScreenTimeCard 本地实现（Req 4）
  - _Requirements: 4.2, 4.3_

  - [x] 6.1 重构 `app/activity/page.tsx`：删除本地格式化函数，导入共享实现
    - 删除本地 `formatDuration`、`formatAppDuration`、`formatSeconds` 函数定义
    - 从 `@/lib/format-duration` 导入同名函数（使用 `formatDuration` 中文长格式版本）
    - _Requirements: 4.2_

  - [x] 6.2 重构 `components/dashboard/ScreenTimeCard.tsx`：删除本地格式化函数，导入共享实现
    - 删除本地 `formatDuration`、`formatSeconds` 函数定义
    - 从 `@/lib/format-duration` 导入 `formatDurationShort`（英文短格式）替代原 `formatDuration`，`formatSeconds` 保持同名导入
    - _Requirements: 4.3_

- [x] 7. 消费 `useGreeting` Hook：统一问候语逻辑（Req 5）
  - _Requirements: 5.2, 5.3_

  - [x] 7.1 重构 `app/page.tsx`：删除本地 `useGreeting`，导入共享 Hook
    - 删除 `function useGreeting()` 本地定义
    - 从 `@/hooks/useGreeting` 导入并调用，解构 `{ text, date }`
    - _Requirements: 5.2_

  - [x] 7.2 重构 `components/ximi/MobileHome.tsx`：删除本地 `useGreetingText`，使用共享 Hook
    - 删除 `function useGreetingText()` 本地定义
    - 从 `@/hooks/useGreeting` 导入，仅取 `.text` 字段
    - _Requirements: 5.3_


- [x] 8. 提取 `CatAvatar` 共享组件（Req 17）
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 8.1 创建 `components/ximi/CatAvatar.tsx`
    - 接口：`{ className?: string; variant?: "desktop" | "mobile" }`
    - `desktop` 变体：`border-border bg-secondary`；`mobile` 变体：`border-white bg-surface-container shadow-sm`
    - 内容来自 `app/chat/page.tsx` 中的 `CatAvatar` 实现（以桌面版为基准，mobile 变体覆盖 className）
    - _Requirements: 17.1, 17.4_

  - [x] 8.2 `app/chat/page.tsx` 改用共享 `CatAvatar`
    - 删除本地 `CatAvatar` 组件定义
    - 从 `@/components/ximi/CatAvatar` 导入，传入 `variant="desktop"`
    - _Requirements: 17.2_

  - [x] 8.3 `components/ximi/MobileChat.tsx` 改用共享 `CatAvatar`
    - 删除本地 `CatAvatar` 组件定义
    - 从 `@/components/ximi/CatAvatar` 导入，传入 `variant="mobile"`
    - _Requirements: 17.3_

  - [ ]* 8.4 `CatAvatar` 编写单元测试
    - 验证 `variant="desktop"` 渲染含 `border-border bg-secondary`，`variant="mobile"` 渲染含 `border-white bg-surface-container`
    - _Requirements: 17.4_


- [x] 9. 扩展 `config/navigation.ts` 并重构 More 页面（Req 18）
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [x] 9.1 扩展 `NavItemConfig` 接口，添加可选 `description` 字段
    - 在 `config/navigation.ts` 的 `NavItemConfig` 接口中添加 `description?: string`
    - _Requirements: 18.1_

  - [x] 9.2 在 `NAV_REGISTRY` 各条目中补充 `description` 字段
    - 依照 `app/more/page.tsx` 中 `FEATURE_GROUPS` 的描述文本填充：
      - `dashboard`：`"一屏掌握课表、作业、考试与状态"`
      - `schedule`：`"本周网格、今日视图与调课管理"`
      - `assignments`：`"快速录入、完成追踪与截止日期提醒"`
      - `exams`：`"考试安排与倒计时"`
      - `gpa`：`"GPA 统计与学期成绩趋势"`
      - `goals`：`"每日目标与连续打卡"`
      - `daily`：`"每日学习总结与反思"`
      - `weekly`：`"基于日报和作业自动生成周报"`
      - `pomodoro`：`"专注 / 休息循环计时"`
      - `notes`：`"Markdown 笔记与全文搜索"`
      - `activity`：`"桌面端应用使用统计"`
      - `chat`：`"整理笔记、检查作业与答疑"`
      - `settings`：`"账号、数据导出与主题"`
    - _Requirements: 18.2_

  - [x] 9.3 导出 `MORE_PAGE_GROUPS: NavGroupConfig[]` 常量
    - 4 个分组，标签完全保留：`"学业"`、`"成长"`、`"专注"`、`"生活与其他"`
    - 使用现有 `pick()` 函数按顺序引用 `NAV_REGISTRY` 条目
    - 包含 `weekly`、`chat`、`settings`（不在 `SIDE_NAV_GROUPS` 中的条目也要包含）
    - _Requirements: 18.2_

  - [x] 9.4 重构 `app/more/page.tsx` 使用 `MORE_PAGE_GROUPS`
    - 删除本地 `FeatureItem`、`FeatureGroup` 类型定义
    - 删除本地 `FEATURE_GROUPS` 常量
    - 从 `@/config/navigation` 导入 `MORE_PAGE_GROUPS`
    - 渲染逻辑改为遍历 `MORE_PAGE_GROUPS`，字段映射：`item.href`、`item.label`（作 title）、`item.description ?? ""`（作 subtitle）、`item.icon`
    - _Requirements: 18.3, 18.4, 18.5_

  - [ ]* 9.5 为 MorePage 编写属性测试
    - **Property 12: MorePage 对任意 NavItemConfig 的渲染正确性** — 有/无 `description` 均不报错，有时显示值，无时显示空字符串
    - **Validates: Requirements 18.4, 18.5**
    - 在 `tests/morePage.test.tsx` 中用 `fc.record()` 生成 `NavItemConfig`，验证渲染
    - _Requirements: 18.4, 18.5_


- [x] 10. 拆分 ActivityPage 为子组件（Req 15）
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 10.1 创建 `components/activity/category-config.ts`
    - 从 `app/activity/page.tsx` 迁移 `CATEGORY_ICON`、`CATEGORY_CLASS`、`CATEGORY_LABELS` 三个常量，内容不变
    - _Requirements: 15.4_

  - [x] 10.2 创建 `components/activity/ActivityStats.tsx`
    - 接收 props：`state`, `settings`, `isToday`, `reducedMotion`
    - 渲染：核心指标卡片（总时长、空闲/离开、追踪状态、当前应用）
    - _Requirements: 15.1_

  - [x] 10.3 创建 `components/activity/CategoryBreakdown.tsx`
    - 接收 props：`categoryBreakdown`, `activeMinutes`
    - 渲染：分类堆叠条 + 分类列表
    - 从 `@/components/activity/category-config` 导入共享常量
    - _Requirements: 15.1_

  - [x] 10.4 创建 `components/activity/AppRanking.tsx`
    - 接收 props：`appBreakdown`, `settings`, `onCategorize`, `onAddOverride`, `appsExpanded`, `onToggleExpanded`
    - 渲染：应用排行列表 + 展开/收起 + 分类 dropdown
    - _Requirements: 15.1_

  - [x] 10.5 创建 `components/activity/TrendChart.tsx`
    - 接收 props：`trendDays`
    - 渲染：近 7 天柱状趋势图
    - _Requirements: 15.1_

  - [x] 10.6 创建 `components/activity/TrackingSettings.tsx`
    - 接收 props：`settings`, `onUpdate`, `onTogglePaused`, `onRecategorize`, `loading`
    - 渲染：暂停追踪 / 排除应用 / 分类覆盖 / 重新校正按钮
    - _Requirements: 15.1_

  - [x] 10.7 创建 `components/activity/ActivityActions.tsx`
    - 接收 props：`onExport`, `onClear`
    - 渲染：导出 CSV + 清除数据按钮行
    - _Requirements: 15.2_

  - [x] 10.8 重写 `app/activity/page.tsx` 为协调层（≤150 行）
    - 持有所有顶层 state：`date`、`clearDialogOpen`、`appsExpanded`、`recategorizing`
    - 通过 props 传入各子组件
    - 保留 non-Electron 空状态渲染
    - 保留 `<PageHeader>`、`<DateNavigator>`、`<ConfirmDialog>` 清除数据弹窗
    - 从子组件中删除对 `CATEGORY_ICON`/`CATEGORY_CLASS`/`CATEGORY_LABELS` 的本地定义，统一从 `category-config.ts` 导入
    - _Requirements: 15.3, 15.4, 15.5_

  - [x]* 10.9 执行 typecheck + lint 验证拆分结果
    - `npm run typecheck` 零新增错误
    - `npm run lint` 零新增警告
    - _Requirements: 15.6_


- [x] 11. Checkpoint — 重构层验证
  - 执行 `npm run typecheck && npm run lint && npm test`，确保全部通过；有失败项先修复。

- [x] 12. Goals 页面统一页面头部、颜色 Token、hover 行为与动画（Req 1, 9, 12, 13）
  - _Requirements: 1.1–1.4, 9.1–9.6, 12.1–12.4, 13.1–13.3_

  - [x] 12.1 Goals 页面：用 `PageHeader` 替换内联 header div（Req 1）
    - 将现有 `flex items-center gap-3 mb-6` header div 替换为：
      `<PageHeader icon={<Target className="size-5 text-primary" />} title="每日目标" description="小步前进，积少成多" />`
    - 删除页面中 `font-display` 类（如有）
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 12.2 Goals 页面：替换硬编码颜色为 Design Token（Req 9）
    - `ring-[#3370FF]` → `ring-primary`
    - `bg-[#F0F5FF]` → `bg-primary/10`
    - `text-[#3370FF]` → `text-primary`
    - `bg-[#E5E6EB]` → `bg-muted`（非激活 week dot 等背景场景）
    - `focus:border-[#3370FF]` 和 `focus:ring-[#3370FF]/20` → 删除，改用标准 `Input` 组件自带焦点环
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 12.3 Goals 页面：统一卡片 hover 行为（Req 12）
    - 今日进度卡：移除 `hover:shadow-md transition-shadow duration-200`，替换为 `hover:border-border/80`
    - 连续天数卡：保留 `hover:translate-y-0`，移除 `hover:shadow-sm`（或确认仅保留 translate-y-0 防上浮）
    - 其他卡片（近 7 天、添加目标、目标列表、空状态）：保持 `hover:shadow-sm hover:translate-y-0` 不变（已符合 shadow-sm 上限）
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 12.4 Goals 页面：移除 Flame 图标 `animate-pulse`（Req 13）
    - 将 `<Flame className={... streak > 0 ? "animate-pulse" : ""} ...>` 替换为：
      `<Flame className={cn("w-8 h-8 transition-opacity duration-300", streak > 0 ? "opacity-100 text-orange-500" : "opacity-60 text-orange-500/60")} />`
    - 确保无 CSS 运动动画，符合 `prefers-reduced-motion`
    - _Requirements: 13.1, 13.2, 13.3_


- [x] 13. Exams 页面 UI 修复：消除冗余筛选显示与颜色 Token（Req 2, 10）
  - _Requirements: 2.1, 2.2, 10.1, 10.2_

  - [x] 13.1 消除 ExamsPage 筛选状态冗余显示（Req 2）
    - 删除 `filter !== "all"` 时手动渲染的独立筛选 badge 块（含当前筛选标签和 clear 入口）
    - 确认 `ExamStats` 组件已完整承载筛选标签展示和清除操作
    - _Requirements: 2.1, 2.2_

  - [x] 13.2 Exams 页面：替换硬编码颜色为 Design Token（Req 10）
    - filter status badge 中 `bg-[#3370FF] text-white` → `bg-primary text-primary-foreground`
    - _Requirements: 10.1, 10.2_

- [x] 14. Daily Reports 页面：替换 `window.confirm` 为 `ConfirmDialog`（Req 6）
  - _Requirements: 6.1–6.7_

  - [x] 14.1 添加 ConfirmDialog 状态机
    - 新增状态：`const [confirmState, setConfirmState] = useState<ConfirmStateType>(null)`
    - 类型定义：`type ConfirmStateType = { type: "discard-edit"; pendingDate: string } | { type: "overwrite-generate" } | null`
    - _Requirements: 6.2, 6.4_

  - [x] 14.2 重写 `handleSelectDate` 使用状态驱动
    - `isDirty=true` 时：`setConfirmState({ type: "discard-edit", pendingDate: newDate })`，不直接切换日期
    - `isDirty=false` 时：直接切换（保持原逻辑）
    - _Requirements: 6.2, 6.7_

  - [x] 14.3 重写 `handleGenerate` 使用状态驱动
    - `isDirty=true` 时：`setConfirmState({ type: "overwrite-generate" })`，不直接执行生成
    - `isDirty=false` 时：直接执行（保持原逻辑）
    - _Requirements: 6.4, 6.7_

  - [x] 14.4 实现 `handleConfirmDialogConfirm` 回调并渲染 `ConfirmDialog`
    - `"discard-edit"` 分支：`setSelectedDate(confirmState.pendingDate)`, `setIsEditing(false)`, `setIsDirty(false)`, `setConfirmState(null)`
    - `"overwrite-generate"` 分支：执行 `handleGenerate` 流程，`setConfirmState(null)` 在 finally 中
    - `onOpenChange(false)` → `setConfirmState(null)`（不改其他状态）
    - 删除所有 `window.confirm()` 调用
    - 渲染 `<ConfirmDialog>` 按设计文档的 title/description/confirmText/danger 传参
    - _Requirements: 6.1, 6.3, 6.5, 6.6_

  - [ ]* 14.5 为 ConfirmDialog 状态机编写属性测试
    - **Property 7: ConfirmDialog 确认操作的状态转换正确性** — `isDirty=true` 确认后 `selectedDate`=`newDate`，`isEditing`=`false`，`isDirty`=`false`，不触发生成
    - **Property 8: ConfirmDialog 取消操作保持状态不变** — 取消/关闭不改变任何状态，不触发生成
    - **Validates: Requirements 6.3, 6.6**
    - 在 `tests/dailyReports-confirmDialog.test.tsx` 中用 RTL + fast-check 验证
    - _Requirements: 6.3, 6.6_


- [x] 15. AppShell：替换内联 SVG wifi-off 图标为 Lucide 组件（Req 8）
  - _Requirements: 8.1, 8.2, 8.3_

  - [x] 15.1 `AppShell` 替换离线图标
    - 从 `lucide-react` 导入 `WifiOff`
    - 将 offline banner 中的 `<svg>` 元素替换为 `<WifiOff className="..." />`，保持相同 `size`、`color` 类名
    - 确认组件中无其他 `<svg>` 元素用于图标
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 16. Activity 页面：替换硬编码颜色为 Design Token（Req 11）
  - 在完成任务 10（子组件拆分）后，对新建的子组件文件执行 token 替换
  - _Requirements: 11.1–11.6_

  - [x] 16.1 Activity 相关文件全量 token 替换
    - `from-[#3370FF] to-[#3370FF]/70` → `from-primary to-primary/70`（应用排行进度条，AppRanking.tsx）
    - `from-[#3370FF] to-[#3370FF]/60` → `from-primary to-primary/60`（7 天趋势最大值条，TrendChart.tsx）
    - `bg-[#E5E6EB] dark:bg-muted` → `bg-muted`（7 天趋势非最大值条，TrendChart.tsx）
    - `ring-[#3370FF]/30` → `ring-primary/30`（今日柱高亮，TrendChart.tsx）
    - `border-[#E5E6EB]` → `border-border`（操作区分隔线，ActivityActions.tsx 或父页面）
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 17. Chat 页面：快捷动作按钮 hover 颜色使用 Design Token（Req 20）
  - _Requirements: 20.1, 20.2_

  - [x] 17.1 DesktopChat 快捷动作按钮 token 替换
    - `hover:bg-[#F0F5FF] hover:text-[#3370FF]` → `hover:bg-primary/10 hover:text-primary`
    - _Requirements: 20.1, 20.2_

- [x] 18. MobileHome TodayTasks：补充「查看更多」入口（Req 16）
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 18.1 TodayTasks 添加 pending 数量超 4 时的更多链接
    - 在任务列表底部（`isClient && !isLoading && !error` 条件块内）添加：
      ```tsx
      {allPending.length > 4 && (
        <Link href="/assignments" className="mt-1 flex items-center justify-center gap-1 rounded-2xl px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
          还有 {allPending.length - 4} 项待办
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
      ```
    - `allPending` = 原始 `assignments.filter(a => !a.done)`（不受截取前 4 条影响）
    - `≤4` 时不渲染
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [ ]* 18.2 TodayTasks 编写属性测试
    - **Property 11: TodayTasks 更多任务链接的显示不变量** — `n>4` 时必须渲染链接；`n≤4` 时不渲染
    - **Validates: Requirements 16.1, 16.3**
    - 在 `tests/todayTasks.test.tsx` 中用 `fc.nat(20)` 生成 n，验证渲染
    - _Requirements: 16.1, 16.3_


- [x] 19. Settings 页面：桌面端增加皮肤提示（Req 19）
  - _Requirements: 19.1, 19.2, 19.3_

  - [x] 19.1 Settings 页面条件渲染：桌面端显示皮肤提示文字
    - 现有皮肤 `SettingsSection` 仅在 `isMobile=true` 时渲染（保持不变）
    - 新增 `!isMobile` 分支，渲染同样的 `<SettingsSection icon={<Palette />} title="配色">` 但内部为：
      `<p className="text-xs text-muted-foreground">皮肤选项仅在移动端生效，请在手机端 ScholarFlow 中切换配色。</p>`
    - _Requirements: 19.1, 19.2, 19.3_

- [x] 20. 全局 Design Token 清理专项（Req 21）
  - 扫描 `app/` 和 `components/` 所有文件，替换残余硬编码颜色
  - _Requirements: 21.1–21.7_

  - [x] 20.1 全局扫描并替换 `#3370FF` 系列颜色值
    - `text-[#3370FF]` → `text-primary`（全局）
    - `bg-[#3370FF]` → `bg-primary`（全局）
    - `ring-[#3370FF]` → `ring-primary`（全局；含各种 opacity 变体如 `/20`, `/30`）
    - `from-[#3370FF]` → `from-primary`，`to-[#3370FF]` → `to-primary`（含 opacity 变体）
    - 排除文档/注释行
    - _Requirements: 21.1, 21.2, 21.3_

  - [x] 20.2 全局扫描并替换 `#F0F5FF` 和 `#E5E6EB` 系列颜色值
    - `bg-[#F0F5FF]` → `bg-primary/10`（全局）
    - `bg-[#E5E6EB]` → `bg-muted` 或 `bg-secondary`（依上下文：background 用 `bg-muted`，interactive 用 `bg-secondary`）
    - `border-[#E5E6EB]` → `border-border`（全局）
    - _Requirements: 21.4, 21.5_

  - [x]* 20.3 验证清理结果：grep 零匹配
    - 执行 grep 检索 `#3370FF`、`#F0F5FF`、`#E5E6EB` 在 `app/` 和 `components/` 中的剩余匹配
    - 预期结果：0 匹配（排除注释/文档行）
    - `npm run typecheck && npm run lint` 零新增错误
    - _Requirements: 21.6, 21.7_

- [x] 21. Final Checkpoint — 全量验证
  - 执行 `npm run typecheck && npm run lint && npm test`，确保全部通过。
  - 检查所有 21 项需求的验收标准均已满足。
  - 有问题逐一修复，再次执行验证直至全部通过。


---

## Notes

- 标有 `*` 的子任务为可选测试任务，可在快速 MVP 时跳过
- 每个任务均引用具体需求条款，保证可追溯性
- 属性测试使用 `fast-check`（需 `npm install --save-dev fast-check`）
- 验收流程：每阶段结束执行 `npm run typecheck && npm run lint && npm test`；涉及 UI 变更的任务额外执行 `npx playwright test`
- 任务执行顺序严格按依赖关系排列：工具/Hook 层（1）→ 逻辑 Bug 修复（2, 3）→ Hook 消费（5, 6, 7）→ 组件提取（8, 9, 10）→ 页面 UI 修复（12–20）→ 全局清理（20）

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.5"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.6", "2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "5.1", "5.2", "5.3", "5.4", "6.1", "6.2", "7.1", "7.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "8.1", "9.1"] },
    { "id": 4, "tasks": ["3.5", "8.2", "8.3", "9.2"] },
    { "id": 5, "tasks": ["8.4", "9.3", "10.1"] },
    { "id": 6, "tasks": ["9.4", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7"] },
    { "id": 7, "tasks": ["9.5", "10.8"] },
    { "id": 8, "tasks": ["10.9", "12.1", "12.2", "12.3", "12.4", "13.1", "13.2", "14.1", "15.1", "17.1", "18.1", "19.1"] },
    { "id": 9, "tasks": ["14.2", "14.3", "16.1"] },
    { "id": 10, "tasks": ["14.4", "16.2", "20.1"] },
    { "id": 11, "tasks": ["14.5", "18.2", "20.2"] },
    { "id": 12, "tasks": ["20.3"] }
  ]
}
```
