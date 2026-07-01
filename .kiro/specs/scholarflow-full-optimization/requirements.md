# Requirements Document

## Introduction

本文档描述 ScholarFlow 全面优化的需求，涵盖逻辑 Bug 修复、代码重构、UI 一致性、用户体验改进与可维护性提升五个维度。优化目标是将项目从当前的「多处硬编码、逻辑分散、重复实现」状态，迁移到「设计 token 统一、单一数据源、行为可预期」的可维护状态，符合 `AGENTS.md` 中确立的设计系统方向。

所有改动范围限定在已分析的 21 个问题点，不引入新功能、不变更数据模型，不破坏现有用户数据。

---

## Glossary

- **Design_System**: 项目 Tailwind CSS + shadcn/ui 设计 token 体系，含颜色语义变量（`text-primary`、`bg-muted` 等）
- **PageHeader**: `components/layout/PageHeader` 统一页面头部组件
- **ConfirmDialog**: `components/ui/ConfirmDialog` 项目统一确认弹窗组件
- **useIsClient**: 待创建的 `hooks/useIsClient.ts` SSR 客户端挂载检测 Hook
- **Format_Duration_Util**: 待创建的 `lib/format-duration.ts` 统一时长格式化工具函数
- **NAV_REGISTRY**: `config/navigation.ts` 中的导航注册表，作为导航的单一数据源
- **FEATURE_GROUPS**: `app/more/page.tsx` 中维护的功能列表，当前与 `NAV_REGISTRY` 冗余
- **rollbackRef**: `app/exams/page.tsx` 中用于乐观更新回滚的 ref
- **pendingDeleteRef**: `app/exams/page.tsx` 中用于延迟删除缓冲的 ref
- **CatAvatar**: AI 助手页中定义的猫咪头像组件，当前在 `app/chat/page.tsx` 和 `components/ximi/MobileChat.tsx` 中各自重复实现
- **AppShell**: `components/layout/AppShell.tsx` 应用外壳布局组件
- **Lucide**: 项目图标系统库，所有图标应统一使用 Lucide 组件

---

## Requirements

### Requirement 1: 统一页面头部组件

**User Story:** 作为开发者，我希望所有页面使用统一的 `PageHeader` 组件，以便在视觉风格和代码结构上保持一致。

#### Acceptance Criteria

1. THE `Goals_Page` SHALL use the `PageHeader` component to replace the current inline header `div`, passing `icon={<Target className="size-5 text-primary" />}`, `title="每日目标"`, and `description="小步前进，积少成多"` props.
2. WHEN the `Goals_Page` PageHeader replacement is complete, THE `Goals_Page` source SHALL NOT contain the pattern `flex items-center gap-3 mb-6` in any standalone header div.
3. THE `Goals_Page` SHALL NOT use `font-display` class on the page title or description.
4. WHEN `npm run typecheck` is run after the replacement, THE project SHALL report zero new type errors related to the Goals page header.

---

### Requirement 2: 消除考试页面筛选状态冗余显示

**User Story:** 作为开发者，我希望 `ExamsPage` 中筛选状态只有一处呈现逻辑，避免 `ExamStats` 筛选器与下方手动渲染的筛选 badge 信息重复。

#### Acceptance Criteria

1. WHEN the user selects a filter in `ExamStats`, THE `Exams_Page` SHALL render the current filter state only through the `ExamStats` component, removing the standalone filter-status badge block rendered when `filter !== "all"`.
2. THE `ExamStats` component SHALL fully own the visual display of filter state and the clear-filter action, including the current filter label and clear entry point.

---

### Requirement 3: 修复考试页面删除操作的竞态问题

**User Story:** 作为用户，我希望快速连续删除多场考试时，每次删除都能被正确回滚或执行，不因竞态导致数据错乱。

#### Acceptance Criteria

1. WHEN the user triggers a delete operation, THE `Exams_Page` SHALL generate a unique operation ID for that delete call and store the rollback snapshot keyed to that operation ID, so that no two concurrent delete operations share the same rollback entry.
2. WHEN a delete operation completes (success or error), THE `Exams_Page` SHALL discard only the rollback snapshot whose key matches the operation ID of that specific call, leaving all other in-flight snapshots intact.
3. WHEN a new manual-exam delete is triggered and a previous deferred deletion has not yet been persisted, THE `Exams_Page` SHALL immediately flush the previous deferred delete to disk (within 5 seconds of its initiation) before queuing the new one.
4. IF the deferred flush in criterion 3 fails, THEN THE `Exams_Page` SHALL display an error toast containing the name of the exam that failed to delete, and SHALL NOT silently lose the deferred record.
5. WHEN multiple exams are deleted in quick succession, THE visible exam list SHALL reflect all pending deletions correctly without reverting any item that was not individually restored.

---

### Requirement 4: 统一时长格式化工具函数

**User Story:** 作为开发者，我希望项目中所有时长格式化逻辑集中在一处，避免在 `app/activity/page.tsx` 和 `components/dashboard/ScreenTimeCard.tsx` 中各自维护相同逻辑。

#### Acceptance Criteria

1. THE `Format_Duration_Util` SHALL export three functions from `lib/format-duration.ts`: `formatDuration(totalMinutes: number): string`, `formatAppDuration(seconds: number): string`, and `formatSeconds(seconds: number): string`.
2. WHEN `Format_Duration_Util` is created, THE `Activity_Page` SHALL remove its local `formatDuration`, `formatAppDuration`, and `formatSeconds` functions and import them from `lib/format-duration.ts`.
3. WHEN `Format_Duration_Util` is created, THE `ScreenTimeCard` component SHALL remove its local `formatDuration` and `formatSeconds` functions and import them from `lib/format-duration.ts`.
4. THE `Format_Duration_Util` function outputs SHALL be exactly identical to the originals in each respective location, preserving all display formats without change.

---

### Requirement 5: 统一问候语逻辑，消除重复实现

**User Story:** 作为开发者，我希望问候语生成逻辑只维护在一处，消除 `app/page.tsx` 中的 `useGreeting` 与 `components/ximi/MobileHome.tsx` 中 `useGreetingText` 的重复实现。

#### Acceptance Criteria

1. THE `Greeting_Hook` SHALL be created at `hooks/useGreeting.ts`, exporting a hook that returns an object with the time-of-day greeting text and the current date string.
2. WHEN `Greeting_Hook` is created, THE `Dashboard_Page` (`app/page.tsx`) SHALL remove its local `useGreeting` function and import from `hooks/useGreeting.ts`.
3. WHEN `Greeting_Hook` is created, THE `MobileHome` component SHALL remove its local `useGreetingText` function and use the shared greeting text field from `hooks/useGreeting.ts`.
4. THE `Greeting_Hook` time-of-day boundaries (夜深/早安/上午好/中午好/下午好/晚上好) SHALL be identical to both original implementations.

---

### Requirement 6: 替换日报页面的原生 confirm 弹窗

**User Story:** 作为用户，我希望日报页面的确认操作使用与项目其他部分一致的 `ConfirmDialog` 组件，而不是浏览器原生弹窗，以获得统一的视觉体验。

#### Acceptance Criteria

1. THE `Daily_Reports_Page` source SHALL NOT contain any call to `window.confirm()` after this change.
2. WHEN the user selects a different date while `isDirty` is true, THE `Daily_Reports_Page` SHALL open a `ConfirmDialog` with title `"放弃未保存的修改？"`, description `"当前日报有未保存的修改，确定要切换日期吗？"`, and confirm button text `"放弃修改"` before proceeding.
3. WHEN the user confirms the discard dialog in criterion 2, THE `Daily_Reports_Page` SHALL update `selectedDate` to the new date, set `isEditing` to `false`, and set `isDirty` to `false`.
4. WHEN the user clicks the generate button while `isDirty` is true, THE `Daily_Reports_Page` SHALL open a `ConfirmDialog` with title `"覆盖未保存的内容？"`, description `"当前日报有未保存的修改，生成日报会覆盖它，是否继续？"`, and confirm button text `"生成并覆盖"` before executing the generation flow.
5. WHEN the user confirms the overwrite dialog in criterion 4, THE `Daily_Reports_Page` SHALL proceed with the `handleGenerate` flow as if `isDirty` were false.
6. IF the user cancels or closes either `ConfirmDialog`, THEN THE `Daily_Reports_Page` SHALL NOT change `selectedDate`, `isEditing`, `isDirty`, or trigger any report generation or overwrite operation.
7. WHEN `isEditing` is `false` and `isDirty` is `false`, THE `Daily_Reports_Page` SHALL allow date switching and report generation without showing any confirmation dialog.

---

### Requirement 7: 修复 useAssignmentsQuery 中空数组与 undefined 的歧义

**User Story:** 作为开发者，我希望 `useAssignmentsQuery` 中的 `getCurrentAssignments` 能正确区分「缓存为空数组」和「缓存未初始化」两种状态，避免在空数组时重复回退到磁盘加载。

#### Acceptance Criteria

1. THE `useAssignmentsQuery` hook's `getCurrentAssignments` function SHALL treat a cached value of `[]` as a valid loaded state and return it directly without calling `tryLocalApi`.
2. THE `useAssignmentsQuery` hook's `getCurrentAssignments` function SHALL call `tryLocalApi` only when the cached value is strictly `undefined`, not when it is `null` or `[]`.
3. WHEN a mutation runs while the cache holds `[]`, THE `useAssignmentsQuery` SHALL use `[]` as the current assignments and write back the mutation result, preserving the empty-means-no-items semantic.

---

### Requirement 8: 替换 AppShell 离线图标为 Lucide 组件

**User Story:** 作为开发者，我希望离线状态栏使用项目统一的 Lucide 图标系统，不再内联原始 SVG，以保持图标规范一致。

#### Acceptance Criteria

1. THE `AppShell` component SHALL replace the inline SVG wifi-off icon with the `WifiOff` Lucide component.
2. THE `AppShell` component's offline banner SHALL maintain the same visual size, color, and layout after the replacement.
3. THE `AppShell` component SHALL NOT contain any raw `<svg>` elements for iconography after this change.

---

### Requirement 9: 替换 Goals 页面硬编码颜色为 Design Token

**User Story:** 作为开发者和用户，我希望目标页面的颜色使用设计 token，使其在深色模式和不同主题下正确响应，而不是固定的十六进制颜色值。

#### Acceptance Criteria

1. THE `Goals_Page` SHALL replace all occurrences of `ring-[#3370FF]` with `ring-primary`.
2. THE `Goals_Page` SHALL replace all occurrences of `bg-[#F0F5FF]` with `bg-primary/10`.
3. THE `Goals_Page` SHALL replace all occurrences of `text-[#3370FF]` with `text-primary`.
4. THE `Goals_Page` SHALL replace all occurrences of `bg-[#E5E6EB]` with `bg-secondary` or `bg-muted` based on context.
5. THE `Goals_Page` SHALL replace `focus:border-[#3370FF]` and `focus:ring-[#3370FF]/20` with the standard `Input` component focus styles that use `focus-visible:ring-ring`.
6. WHEN the application theme changes, THE `Goals_Page` color elements SHALL visually reflect the new theme token values without requiring code changes.

---

### Requirement 10: 替换 Exams 页面硬编码颜色为 Design Token

**User Story:** 作为开发者，我希望考试页面的颜色统一使用设计 token，消除 `#3370FF` 等硬编码颜色。

#### Acceptance Criteria

1. THE `Exams_Page` SHALL replace `bg-[#3370FF] text-white` in the filter status badge with `bg-primary text-primary-foreground`.
2. WHEN the application theme changes, THE `Exams_Page` visual elements SHALL reflect the current theme token values.

---

### Requirement 11: 替换 Activity 页面硬编码颜色为 Design Token

**User Story:** 作为开发者，我希望屏幕时间页面消除所有硬编码颜色，统一使用设计 token，使图表在主题切换时保持一致。

#### Acceptance Criteria

1. THE `Activity_Page` SHALL replace `from-[#3370FF] to-[#3370FF]/70` in the app ranking progress bar with `from-primary to-primary/70`.
2. THE `Activity_Page` SHALL replace `from-[#3370FF] to-[#3370FF]/60` in the 7-day trend max bar with `from-primary to-primary/60`.
3. THE `Activity_Page` SHALL replace `bg-[#E5E6EB] dark:bg-muted` in the 7-day trend non-max bar with `bg-muted`.
4. THE `Activity_Page` SHALL replace `ring-[#3370FF]/30` in the today bar highlight with `ring-primary/30`.
5. THE `Activity_Page` SHALL replace `border-[#E5E6EB]` in the operations section divider with `border-border`.
6. WHEN the application theme changes, THE `Activity_Page` chart and progress elements SHALL visually reflect the new theme token values.

---

### Requirement 12: 统一卡片 hover 行为

**User Story:** 作为用户，我希望所有卡片的悬停行为保持一致，符合 AGENTS.md 规定的「卡片默认 hover 仅做边框色变化，不整体上浮/加阴影」原则。

#### Acceptance Criteria

1. THE `Goals_Page` 今日进度 card SHALL replace `hover:shadow-md transition-shadow duration-200` with a border-color-only hover transition, consistent with the design system card directive.
2. THE `Goals_Page` 连续天数 card SHALL retain `hover:translate-y-0` to prevent vertical uplift on hover.
3. THE `Goals_Page` 近 7 天 card SHALL retain `hover:shadow-sm hover:translate-y-0` to prevent uplift.
4. WHILE any card in `Goals_Page` is hovered, THE `Design_System` card hover behavior SHALL show only a border color change, not a translate transform or shadow increase beyond `shadow-sm`.

---

### Requirement 13: 移除 Flame 图标的纯装饰性动画

**User Story:** 作为用户，我希望界面动画均有明确意义，而非纯装饰性循环动画，符合 AGENTS.md「动画：解释状态，而非装饰」原则。

#### Acceptance Criteria

1. THE `Goals_Page` Flame icon SHALL have the `animate-pulse` class removed regardless of the value of `streak`.
2. WHERE the flame icon needs to communicate an active streak state, THE `Goals_Page` SHALL use a static visual treatment such as color change or increased opacity rather than a pulsing animation.
3. THE `Goals_Page` SHALL ensure any remaining micro-interactions respect `prefers-reduced-motion`.

---

### Requirement 14: 抽取 useIsClient Hook 消除重复 mounted 模式

**User Story:** 作为开发者，我希望 SSR 客户端挂载检测逻辑统一封装为 `useIsClient` hook，消除多个组件中完全相同的 `mounted` 模式重复。

#### Acceptance Criteria

1. THE `useIsClient` hook SHALL be created at `hooks/useIsClient.ts`, returning a boolean that is `false` during server render and becomes `true` after the first client-side render.
2. WHEN `useIsClient` is created, THE `AssignmentsCard` component SHALL replace its local `mounted` state pattern with the `useIsClient` hook.
3. WHEN `useIsClient` is created, THE `ScheduleCard` component SHALL replace its local `mounted` state pattern with the `useIsClient` hook.
4. WHEN `useIsClient` is created, THE `ScreenTimeCard` component SHALL replace its local `mounted` state pattern with the `useIsClient` hook.
5. WHEN `useIsClient` is created, THE `TodayTasks` component inside `MobileHome` SHALL replace its local `mounted` state pattern with the `useIsClient` hook.
6. THE `useIsClient` hook's hydration timing SHALL be identical to the original `useEffect(() => setMounted(true), [])` pattern in all replaced components.

---

### Requirement 15: 拆分 ActivityPage 为子组件

**User Story:** 作为开发者，我希望 `ActivityPage`（约 370 行）按职责拆分为清晰的子组件，使每个组件单一职责，提升可读性和可测试性。

#### Acceptance Criteria

1. THE `Activity_Page` SHALL extract the following sub-components into `components/activity/`: `ActivityStats`（核心指标卡片 + 状态指示器）, `CategoryBreakdown`（分类占比堆叠条 + 列表）, `AppRanking`（应用排行列表 + 展开/收起）, `TrendChart`（近 7 天柱状趋势图）, and `TrackingSettings`（暂停追踪 / 排除应用 / 分类覆盖 / 重新校正按钮）.
2. THE `Activity_Page` SHALL extract `ActivityActions`（导出 CSV / 清除数据按钮行）into `components/activity/` as well.
3. WHEN the refactoring is complete, THE `Activity_Page` main file SHALL contain no more than 150 lines, acting as a coordinator that owns top-level state and delegates rendering to the extracted sub-components via props and callbacks.
4. THE shared constants `CATEGORY_ICON`, `CATEGORY_CLASS`, and `CATEGORY_LABELS` SHALL be co-located in `components/activity/category-config.ts` and imported by any sub-component that requires them.
5. THE refactored `Activity_Page` SHALL maintain all existing user-visible functionality including date navigation, category breakdown, app ranking with categorize dropdown, 7-day trend, tracking settings, data export, and data clear confirmation.
6. WHEN `npm run typecheck` and `npm run lint` are executed after the refactoring, THE project SHALL report zero new errors compared to the baseline before the change.

---

### Requirement 16: MobileHome 任务列表补充查看更多入口

**User Story:** 作为移动端用户，我希望在今日任务区块能知道是否有更多被隐藏的作业，并能点击跳转查看全部作业，而不是默默只显示前 4 条。

#### Acceptance Criteria

1. WHEN the total number of pending assignments exceeds 4, THE `TodayTasks` component in `MobileHome` SHALL display a link below the task list showing the total pending count.
2. WHEN the user taps the more-tasks link, THE `TodayTasks` component SHALL navigate to `/assignments`.
3. WHEN the total number of pending assignments is 4 or fewer, THE `TodayTasks` component SHALL NOT display the more-tasks link.
4. THE more-tasks link SHALL be styled consistently with the existing `TodayTasks` visual language using project design tokens.

---

### Requirement 17: 消除 Chat 页面 CatAvatar 重复实现

**User Story:** 作为开发者，我希望 `CatAvatar` 组件只在一处定义，消除 `app/chat/page.tsx` 和 `components/ximi/MobileChat.tsx` 中各自定义同名但略有差异的实现。

#### Acceptance Criteria

1. THE `CatAvatar` component SHALL be extracted to `components/ximi/CatAvatar.tsx` as a shared component.
2. WHEN `CatAvatar` is extracted, THE `DesktopChat` in `app/chat/page.tsx` SHALL import and use the shared `CatAvatar`.
3. WHEN `CatAvatar` is extracted, THE `MobileChat` in `components/ximi/MobileChat.tsx` SHALL import and use the shared `CatAvatar`.
4. THE shared `CatAvatar` SHALL accept a `variant` or `className` prop to accommodate style differences between desktop and mobile contexts.
5. WHEN `npm run typecheck` is run after the extraction, THE project SHALL report zero new type errors.

---

### Requirement 18: 以 NAV_REGISTRY 为单一数据源驱动 more 页面

**User Story:** 作为开发者，我希望 `app/more/page.tsx` 中的功能列表从 `config/navigation.ts` 的 `NAV_REGISTRY` 派生，消除两套手动维护的导航数据，新增功能时只需在注册表修改一处。

#### Acceptance Criteria

1. THE `NavItemConfig` interface in `config/navigation.ts` SHALL include an optional `description?: string` field, with type `string` and no default value, so entries without a description are valid and simply render without a description in the more page.
2. THE `config/navigation.ts` SHALL export a `MORE_PAGE_GROUPS` constant of type `NavGroupConfig[]` that covers all groups and items currently in `FEATURE_GROUPS` in `app/more/page.tsx`, preserving the existing group labels (`"学业"`, `"成长"`, `"专注"`, `"生活与其他"`) exactly, and including `weekly`, `chat`, and `settings` entries even though they do not appear in `SIDE_NAV_GROUPS`.
3. THE `More_Page` SHALL replace its local `FEATURE_GROUPS` constant by importing and consuming `MORE_PAGE_GROUPS` from `config/navigation.ts`.
4. WHEN a new `NavItemConfig` entry with a `description` is added to `NAV_REGISTRY` and included in `MORE_PAGE_GROUPS`, THE `More_Page` SHALL render that entry without any code change to `app/more/page.tsx` itself.
5. THE `More_Page` visual output SHALL preserve all of the following for every item: `href` link target, `label` as the card title, `description` as the card subtitle, `icon` component, and group label. Any item with a missing `description` SHALL render with an empty subtitle rather than throwing an error.
6. WHEN `npm run typecheck` is run after the refactoring, THE project SHALL report zero new type errors.

---

### Requirement 19: Settings 页面桌面端增加皮肤提示

**User Story:** 作为桌面端用户，我希望在设置中有明确提示说明皮肤选项仅在移动端生效，避免因看不到皮肤选项而感到困惑。

#### Acceptance Criteria

1. THE `Settings_Page` skin selector SHALL remain visible only when `isMobile` is true, preserving the existing conditional-render behavior.
2. WHEN `isMobile` is false, THE `Settings_Page` SHALL display a note in the theme or appearance section informing the user that skin options are available in the mobile app.
3. THE informational note SHALL use `text-xs text-muted-foreground` styling, consistent with other helper text in the settings page.

---

### Requirement 20: Chat 页面快捷动作按钮使用 Design Token

**User Story:** 作为开发者，我希望 Chat 页面桌面端快捷动作按钮的 hover 颜色使用设计 token，消除硬编码颜色值。

#### Acceptance Criteria

1. THE `DesktopChat` quick action buttons SHALL replace `hover:bg-[#F0F5FF] hover:text-[#3370FF]` with `hover:bg-primary/10 hover:text-primary`.
2. WHEN the application theme changes, THE `DesktopChat` quick action button hover state SHALL reflect the current theme primary color.

---

### Requirement 21: 全局设计 Token 清理专项

**User Story:** 作为开发者，我希望全局扫描并消除所有违反 AGENTS.md 设计规范的任意颜色值，使代码库整体符合设计 token 约束。

#### Acceptance Criteria

1. THE `Design_System` cleanup SHALL replace all remaining `text-[#3370FF]` occurrences across `app/` and `components/` with `text-primary`.
2. THE `Design_System` cleanup SHALL replace all remaining `bg-[#3370FF]` occurrences with `bg-primary`.
3. THE `Design_System` cleanup SHALL replace all remaining `ring-[#3370FF]` occurrences with `ring-primary`.
4. THE `Design_System` cleanup SHALL replace all remaining `bg-[#F0F5FF]` occurrences with `bg-primary/10`.
5. THE `Design_System` cleanup SHALL replace all remaining `bg-[#E5E6EB]` occurrences with `bg-muted` or `bg-secondary` based on context.
6. WHEN the cleanup is complete, THE grep search for the hardcoded color values across `app/` and `components/` SHALL return zero matches excluding documentation and comment lines.
7. WHEN `npm run typecheck` and `npm run lint` are run after the cleanup, THE project SHALL report zero new errors.
