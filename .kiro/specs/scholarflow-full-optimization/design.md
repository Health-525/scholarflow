# Design Document — ScholarFlow 全面优化

## Overview

本文档为 **ScholarFlow 全面优化** 的技术设计。需求范围：21 项优化，覆盖逻辑 Bug 修复（Req 3、7）、代码重构（Req 4、5、14、15、17、18）、UI 一致性（Req 1、8、9–11、20、21）、用户体验改进（Req 2、6、12、13、16、19）五个维度。

### 设计目标

- 消除「多处硬编码、逻辑分散、重复实现」，迁移到「设计 token 统一、单一数据源、行为可预期」
- 所有变更范围限定在已分析的 21 个问题点，**不引入新功能，不变更数据模型，不破坏现有用户数据**
- 全程遵循 `AGENTS.md` 设计系统方向（克制动画、统一 token、单一数据源）

### 技术约束

- Next.js 15 App Router + React 19 + TypeScript strict
- Tailwind CSS + shadcn/ui（`cn()` 工具函数）
- 每次变更后必须通过 `npm run typecheck` 和 `npm run lint`

---

## Architecture

### 改动分层

```
┌─────────────────────────────────────────────────────┐
│  Pages (app/)                                       │
│  goals/page.tsx · exams/page.tsx · activity/page.tsx│
│  reports/daily/page.tsx · chat/page.tsx             │
│  more/page.tsx · settings/page.tsx                  │
├─────────────────────────────────────────────────────┤
│  Shared Components (components/)                    │
│  activity/{ActivityStats,CategoryBreakdown,...}      │
│  ximi/CatAvatar.tsx                                 │
│  layout/AppShell.tsx                                │
│  dashboard/{AssignmentsCard,ScheduleCard,...}        │
├─────────────────────────────────────────────────────┤
│  Hooks (hooks/)                                     │
│  useIsClient.ts (新建)                              │
│  useGreeting.ts (新建)                              │
├─────────────────────────────────────────────────────┤
│  Utilities (lib/)                                   │
│  format-duration.ts (新建)                          │
├─────────────────────────────────────────────────────┤
│  Config (config/)                                   │
│  navigation.ts — 扩展 NavItemConfig + MORE_PAGE_GROUPS│
└─────────────────────────────────────────────────────┘
```

### 改动类别

| 类别 | 说明 | 涉及需求 |
|------|------|---------|
| **新建文件** | `hooks/useIsClient.ts`、`hooks/useGreeting.ts`、`lib/format-duration.ts`、`components/ximi/CatAvatar.tsx`、`components/activity/category-config.ts`、`components/activity/{6个子组件}` | 4, 5, 14, 15, 17 |
| **扩展已有文件** | `config/navigation.ts` 加字段+导出 | 18 |
| **重构页面** | `app/activity/page.tsx`（拆分子组件）、`app/more/page.tsx`（用 MORE_PAGE_GROUPS）| 15, 18 |
| **Bug 修复** | `app/exams/page.tsx`（竞态）、`hooks/useQueries.ts`（空数组歧义）| 3, 7 |
| **UI 修复** | `window.confirm` → `ConfirmDialog`、`animate-pulse` 移除、hover 统一、token 替换 | 2, 6, 9–13, 16, 19–21 |

---

## Components and Interfaces

### 新建：`hooks/useIsClient.ts` (Req 14)

```typescript
export function useIsClient(): boolean
```

- 服务端渲染时返回 `false`，首次客户端 effect 后变为 `true`
- 替换 `AssignmentsCard`、`ScheduleCard`、`ScreenTimeCard`、`MobileHome/TodayTasks` 中完全相同的 `mounted` 模式
- 实现：`useState(false)` + `useEffect(() => setIsClient(true), [])`，与原有模式时序严格等同

### 新建：`hooks/useGreeting.ts` (Req 5)

```typescript
export interface GreetingResult {
  text: string;   // "早安" | "上午好" | "中午好" | "下午好" | "晚上好" | "夜深了"
  date: string;   // toLocaleDateString("zh-CN", { month, day, weekday })
}

export function useGreeting(): GreetingResult
```

- 合并 `app/page.tsx` 中 `useGreeting()` 与 `components/ximi/MobileHome.tsx` 中 `useGreetingText()` 的逻辑
- 时段边界：`h<6 → 夜深了`、`h<9 → 早安`、`h<12 → 上午好`、`h<14 → 中午好`、`h<18 → 下午好`、`h<22 → 晚上好`、`≥22 → 夜深了`
- `MobileHome` 仅取 `.text` 字段，`DashboardPage` 取 `{ text, date }`
- 使用 `setInterval` 每分钟更新，`useEffect` 清理计时器

### 新建：`lib/format-duration.ts` (Req 4)

```typescript
/** 分钟数 → "X小时 Y分钟" / "Y分钟" (activity page 格式) */
export function formatDuration(totalMinutes: number): string

/** 秒数 → "Xm Ys" / "Xs" (app ranking 格式) */
export function formatAppDuration(seconds: number): string

/** 秒数 → "H:MM:SS" / "M:SS" (当前时长格式) */
export function formatSeconds(seconds: number): string
```

**注意**：`ScreenTimeCard` 中 `formatDuration` 格式为 `"Xh Ym"`，与 `activity/page.tsx` 的 `"X小时 Y分钟"` **不同**。设计决策：保留各自格式不变，`format-duration.ts` 导出 activity 格式版本供 `ActivityPage` 和 `ScreenTimeCard` 按需选用，或分别导出两个函数（`formatDurationLong` / `formatDurationShort`）。

> **决策**：导出两个具名函数：
> - `formatDuration(totalMinutes)` — 中文长格式（供 ActivityPage）
> - `formatDurationShort(totalMinutes)` — 英文短格式（供 ScreenTimeCard）
> - `formatAppDuration(seconds)` — 共用
> - `formatSeconds(seconds)` — 共用（两处格式相同）

### 新建：`components/ximi/CatAvatar.tsx` (Req 17)

```typescript
interface CatAvatarProps {
  className?: string;
  /** "desktop" | "mobile"，控制边框颜色和背景 token */
  variant?: "desktop" | "mobile";
}

export function CatAvatar({ className, variant = "desktop" }: CatAvatarProps): JSX.Element
```

- `desktop` 变体（当前 `app/chat/page.tsx`）：`border-border bg-secondary`
- `mobile` 变体（当前 `components/ximi/MobileChat.tsx`）：`border-white bg-surface-container shadow-sm`
- 两处各自传入对应 `variant`，或直接通过 `className` 覆盖

### 扩展：`config/navigation.ts` (Req 18)

**接口扩展：**
```typescript
export interface NavItemConfig {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;   // ← 新增，可选
  shortLabel?: string;
  searchTitle?: string;
  keywords?: string[];
  wip?: boolean;
}
```

**新导出：**
```typescript
export const MORE_PAGE_GROUPS: NavGroupConfig[]
```

- 包含与 `app/more/page.tsx` 当前 `FEATURE_GROUPS` 等价的 4 个分组
- 分组标签完全保留：`"学业"`、`"成长"`、`"专注"`、`"生活与其他"`
- 包含 `weekly`、`chat`、`settings` 条目（这些不在 `SIDE_NAV_GROUPS` 中）
- `NAV_REGISTRY` 各条目补充 `description` 字段，内容对应 `FEATURE_GROUPS` 中的描述文本
- `More_Page` 直接从 `config/navigation.ts` import `MORE_PAGE_GROUPS`，删除本地 `FEATURE_GROUPS` 和 `FeatureGroup`/`FeatureItem` 类型定义

### 新建：`components/activity/category-config.ts` (Req 15)

```typescript
import type { Category } from "@/lib/activity-tracker-v3";
import type { LucideIcon } from "lucide-react";

export const CATEGORY_ICON: Record<Category, LucideIcon>
export const CATEGORY_CLASS: Record<Category, { text: string; bg: string; bar: string }>
export const CATEGORY_LABELS: Record<Category, string>
```

从 `app/activity/page.tsx` 直接迁移，不变更内容。

### ActivityPage 子组件拆分（Req 15）

| 组件 | 路径 | 职责 | Props 来源 |
|------|------|------|-----------|
| `ActivityStats` | `components/activity/ActivityStats.tsx` | 核心指标卡片（总时长、空闲/离开、追踪状态、当前应用） | `state`, `settings`, `isToday`, `reducedMotion` |
| `CategoryBreakdown` | `components/activity/CategoryBreakdown.tsx` | 分类堆叠条 + 列表 | `categoryBreakdown`, `activeMinutes` |
| `AppRanking` | `components/activity/AppRanking.tsx` | 应用排行 + 展开/收起 + 分类 dropdown | `appBreakdown`, `settings`, `onCategorize`, `onAddOverride` |
| `TrendChart` | `components/activity/TrendChart.tsx` | 近 7 天柱状图 | `trendDays` |
| `TrackingSettings` | `components/activity/TrackingSettings.tsx` | 暂停/排除/覆盖/重新校正 | `settings`, `onUpdate`, `onTogglePaused`, `onRecategorize`, `loading` |
| `ActivityActions` | `components/activity/ActivityActions.tsx` | 导出 CSV + 清除数据按钮 | `onExport`, `onClear` |

**父页面 `app/activity/page.tsx` 改后职责**（≤150 行）：
- 持有所有顶层 state：`date`、`clearDialogOpen`、`appsExpanded`、`recategorizing`、settings/trend hooks
- 通过 props 向下传递给子组件
- 渲染 `<PageHeader>`、`<DateNavigator>`、各子组件、`<ConfirmDialog>`
- 处理 not-Electron 空状态

```tsx
// 父页面结构示意（伪代码）
export default function ActivityPage() {
  // ... state hooks
  return (
    <div>
      <PageHeader ... />
      <DateNavigator ... />
      <ActivityStats state={state} settings={settings} ... />
      {state.categoryBreakdown.length > 0 && <CategoryBreakdown ... />}
      {state.appBreakdown.length > 0 && <AppRanking ... />}
      {trendDays.length > 0 && <TrendChart trendDays={trendDays} />}
      <TrackingSettings ... />
      <ActivityActions ... />
      <ConfirmDialog ... />
    </div>
  );
}
```

---

## Data Models

### 考试删除竞态修复（Req 3）

**问题根因**：当前 `pendingDeleteRef` 和 `rollbackRef` 均为单值 `ref`，多次快速删除时后一次会覆盖前一次的快照，导致撤销/错误回滚指向错误状态。

**修复模型**：

```typescript
// 替换前
const rollbackRef = useRef<Exam[] | null>(null);
const pendingDeleteRef = useRef<{ exam: Exam; timer: ReturnType<typeof setTimeout> } | null>(null);

// 替换后
const rollbackMap = useRef<Map<string, Exam[]>>(new Map());
const pendingDeleteMap = useRef<Map<string, { exam: Exam; timer: ReturnType<typeof setTimeout> }>>(new Map());
```

**操作流程**：

1. 触发删除 → `opId = crypto.randomUUID()`
2. 快照当前 exams 列表 → `rollbackMap.current.set(opId, snapshot)`
3. 若 `pendingDeleteMap.current.size > 0`：
   - 迭代所有 pending，立即调用 `deleteExam()`，清除对应计时器
   - 若任意 flush 失败 → toast 显示对应 exam 名称
   - 清除 pendingDeleteMap
4. 设置新计时器（5000ms）→ 存入 `pendingDeleteMap.current.set(opId, { exam: target, timer })`
5. 计时器触发 → 调用 `deleteExam(target.id)` → `pendingDeleteMap.current.delete(opId)` → `rollbackMap.current.delete(opId)`
6. 操作出错（乐观更新失败）→ 用 `rollbackMap.current.get(opId)` 回滚 → `rollbackMap.current.delete(opId)`
7. 撤销按钮点击 → 检查 `pendingDeleteMap.current.has(opId)` → 清除计时器 → 还原 exam → 清除两个 map 中该 opId

**卸载清理**：

```typescript
useEffect(() => {
  return () => {
    pendingDeleteMap.current.forEach(({ exam, timer }) => {
      clearTimeout(timer);
      deleteExam(exam.id, schoolId, userId);
    });
    pendingDeleteMap.current.clear();
  };
}, [schoolId, userId]);
```

### 日报 ConfirmDialog 状态机（Req 6）

**问题根因**：当前两处 `window.confirm()` 是同步阻塞调用，`ConfirmDialog` 是异步弹窗，需要将确认逻辑从同步回调转为状态驱动。

**状态模型**：

```typescript
type ConfirmStateType =
  | { type: "discard-edit"; pendingDate: string }
  | { type: "overwrite-generate" }
  | null;

const [confirmState, setConfirmState] = useState<ConfirmStateType>(null);
```

**流程映射**：

| 触发点 | 操作 |
|--------|------|
| `handleSelectDate(newDate)` 且 `isDirty` | `setConfirmState({ type: "discard-edit", pendingDate: newDate })` |
| `handleGenerate()` 且 `isDirty` | `setConfirmState({ type: "overwrite-generate" })` |
| ConfirmDialog `onConfirm` | 按 `confirmState.type` 分支：执行日期切换或生成流程，然后 `setConfirmState(null)` |
| ConfirmDialog `onOpenChange(false)` | `setConfirmState(null)`（不做任何状态变更） |

**ConfirmDialog 渲染**：

```tsx
<ConfirmDialog
  open={confirmState !== null}
  onOpenChange={(open) => { if (!open) setConfirmState(null); }}
  title={
    confirmState?.type === "discard-edit"
      ? "放弃未保存的修改？"
      : "覆盖未保存的内容？"
  }
  description={
    confirmState?.type === "discard-edit"
      ? "当前日报有未保存的修改，确定要切换日期吗？"
      : "当前日报有未保存的修改，生成日报会覆盖它，是否继续？"
  }
  confirmText={
    confirmState?.type === "discard-edit" ? "放弃修改" : "生成并覆盖"
  }
  danger={true}
  onConfirm={handleConfirmDialogConfirm}
/>
```

### getCurrentAssignments 空数组歧义修复（Req 7）

**问题根因**：`queryClient.getQueryData()` 返回 `undefined` 表示缓存未初始化，`[]` 表示已加载但为空，但原代码用 `if (!cached)` 混淆了两者。

**修复**：

```typescript
// 修复前
const getCurrentAssignments = async (): Promise<Assignment[]> => {
  const cached = queryClient.getQueryData<Assignment[]>(assignmentsKey);
  if (cached !== undefined) return cached;  // 原代码已正确，但注释需澄清
  ...
};

// 确认修复后逻辑
const getCurrentAssignments = async (): Promise<Assignment[]> => {
  const cached = queryClient.getQueryData<Assignment[]>(assignmentsKey);
  // cached === undefined → 缓存未初始化，回退到磁盘
  // cached === [] → 有效空数组，直接返回
  // cached !== undefined（包含 []）→ 直接返回
  if (cached !== undefined) return cached;
  const local = await tryLocalApi("assignments");
  return parseLocalAssignments(local) ?? [];
};
```

该逻辑实际上已正确（`if (cached !== undefined)`），但原代码缺少注释导致可读性差。同时需要确认 `null` 的处理路径：若 `getQueryData` 返回 `null`（非标准但可能），也应回退磁盘，故修复为：

```typescript
if (cached !== undefined && cached !== null) return cached;
```

### UI 变更设计（Req 9–13、20–21）

#### 颜色 Token 替换映射

| 硬编码值 | 替换为 | 适用位置 |
|---------|--------|---------|
| `#3370FF`（text） | `text-primary` | goals, exams, chat |
| `#3370FF`（bg） | `bg-primary` | exams filter badge |
| `#3370FF`（ring） | `ring-primary` | goals week dot, input |
| `#3370FF`（from/to gradient） | `from-primary to-primary/70`、`from-primary to-primary/60` | activity bars |
| `#3370FF`（ring-[...]/30） | `ring-primary/30` | activity today bar |
| `#F0F5FF` | `bg-primary/10` | goals, chat quick actions |
| `#E5E6EB` | `bg-muted` | goals week dot inactive, activity non-max bar |
| `#E5E6EB`（border） | `border-border` | activity divider |

所有替换均为纯文本字符串替换，无颜色计算逻辑。

#### Goals 页面 hover 统一（Req 12）

- **今日进度卡**：移除 `hover:shadow-md transition-shadow duration-200`，替换为 `hover:border-border/80`（边框微变）
- **连续天数卡**：已有 `hover:shadow-sm hover:translate-y-0`，保留 `hover:translate-y-0`，移除 `hover:shadow-sm`（仅保留 translate 防止上浮）
- **近 7 天卡、添加目标卡、目标列表卡、空状态卡**：保持 `hover:shadow-sm hover:translate-y-0`
- 原则：所有卡片 hover 只允许 `border-color` 变化或 `shadow-sm` 作为上限，不允许 `shadow-md` 及以上

#### Flame 图标动画（Req 13）

```tsx
// 修复前
<Flame className={`w-8 h-8 ${streak > 0 ? "animate-pulse" : ""}`} />

// 修复后：用 opacity 区分有/无 streak，完全静态
<Flame className={`w-8 h-8 transition-opacity duration-300 ${streak > 0 ? "opacity-100 text-orange-500" : "opacity-60 text-orange-500/60"}`} />
```

移除 `animate-pulse`，通过 `opacity-100` vs `opacity-60` 区分状态，无运动动画，完全符合 `prefers-reduced-motion`。

#### MobileHome 更多任务入口（Req 16）

```tsx
// TodayTasks 底部添加（仅当 assignments.filter(!done).length > 4 时）
{mounted && !isLoading && !error && assignments.filter((a) => !a.done).length > 4 && (
  <Link
    href="/assignments"
    className="mt-1 flex items-center justify-center gap-1 rounded-2xl px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
  >
    还有 {assignments.filter((a) => !a.done).length - 4} 项待办
    <ChevronRight className="h-4 w-4" />
  </Link>
)}
```

注意 `pending` 变量已截取前 4 条，需用原始 `assignments.filter(!done)` 计算总数。

#### Settings 桌面端皮肤提示（Req 19）

```tsx
// 修复前：仅 isMobile 时渲染皮肤区域

// 修复后：isMobile 渲染选择器，桌面端渲染说明文字
{isMobile ? (
  <SettingsSection icon={<Palette />} title="配色">
    {/* 原有选择器 */}
  </SettingsSection>
) : (
  <SettingsSection icon={<Palette />} title="配色">
    <p className="text-xs text-muted-foreground">
      皮肤选项仅在移动端生效，请在手机端 ScholarFlow 中切换配色。
    </p>
  </SettingsSection>
)}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

本节列出适合通过属性测试验证的正确性属性，基于 prework 分析。此特性的改动主要是代码重构、token 替换和 UI 调整，多数验收标准属于代码结构检查（SMOKE/EXAMPLE）。以下属性覆盖了具有真正输入空间变化的行为逻辑。

---

### Property 1: 并发删除操作的唯一性与隔离性

*For any* 集合大小为 N（N ≥ 1）的并发考试删除操作序列，每个操作必须被分配唯一的 opId（与其他所有操作的 opId 不重复），且当操作 k 完成（成功或失败）时，只有操作 k 对应的回滚快照被移除，其他所有进行中操作的回滚快照保持不变。

**Validates: Requirements 3.1, 3.2**

---

### Property 2: 顺序删除的 deferred flush 时序不变量

*For any* 两次顺序发起的手动考试删除操作（第一次 opId_1，第二次 opId_2），在第二次操作初始化计时器之前，与 opId_1 关联的 deferred `deleteExam` 调用必须已被触发（计时器已清除）。

**Validates: Requirements 3.3**

---

### Property 3: deferred flush 失败的 toast 准确性

*For any* 考试名称字符串 `subject`，若该考试的 deferred `deleteExam` 调用抛出错误，则错误 toast 的内容必须包含该考试的 `subject` 字段值。

**Validates: Requirements 3.4**

---

### Property 4: 多次删除后可见列表的完整性

*For any* 初始考试列表 L 和其中任意子集 D（待删除），当所有 D 中的考试均已发起删除（未被撤销）后，可见列表中不应包含 D 中的任何考试，且 L 中不在 D 中的考试均应完整保留在可见列表中。

**Validates: Requirements 3.5**

---

### Property 5: formatDuration 系列函数输出等价性

*For any* 非负整数 `totalMinutes`，`lib/format-duration.ts` 中的 `formatDuration(n)` 的输出必须与原 `app/activity/page.tsx` 中被替换的本地实现完全相同。同样地，`formatAppDuration(seconds)` 和 `formatSeconds(seconds)` 对任意非负整数输入的输出必须与各自原始实现完全相同。

**Validates: Requirements 4.4**

---

### Property 6: useGreeting 时段边界与原始实现等价

*For any* 小时值 h（h ∈ [0, 23]），`hooks/useGreeting.ts` 返回的 `text` 字段必须与 `app/page.tsx` 原始 `useGreeting` 和 `components/ximi/MobileHome.tsx` 原始 `useGreetingText` 在相同小时值下返回的问候语完全相同。

**Validates: Requirements 5.4**

---

### Property 7: ConfirmDialog 确认操作的状态转换正确性

*For any* 有效的新日期字符串 `newDate`，在 `isDirty=true` 状态下用户确认「放弃修改」对话框后，`selectedDate` 必须等于 `newDate`，`isEditing` 必须为 `false`，`isDirty` 必须为 `false`，且不触发报告生成或任何网络请求。

**Validates: Requirements 6.3**

---

### Property 8: ConfirmDialog 取消操作保持状态不变

*For any* 页面状态组合（`isDirty` 为 true 或 false，`selectedDate` 为任意日期字符串，`isEditing` 为任意值），当用户关闭或取消任一 ConfirmDialog 而非确认时，`selectedDate`、`isEditing`、`isDirty` 均不得发生变化，也不得触发报告生成或覆盖操作。

**Validates: Requirements 6.6**

---

### Property 9: getCurrentAssignments 缓存语义正确性

*For any* React Query 缓存值 `cached`：当 `cached` 严格等于 `undefined` 时，`getCurrentAssignments` 必须调用 `tryLocalApi`；当 `cached` 为 `[]`（空数组）或非空数组时，`getCurrentAssignments` 必须直接返回该缓存值而不调用 `tryLocalApi`；当 `cached` 为 `null` 时，`getCurrentAssignments` 必须回退到 `tryLocalApi`。

**Validates: Requirements 7.1, 7.2, 7.3**

---

### Property 10: useIsClient 水合时序的正确性

*For any* 使用 `useIsClient` hook 的组件，在服务端渲染阶段（effect 未执行时）`useIsClient()` 必须返回 `false`；在客户端首次 `useEffect` 执行完毕后，`useIsClient()` 必须返回 `true`，且此后不再变为 `false`。

**Validates: Requirements 14.6**

---

### Property 11: TodayTasks 更多任务链接的显示不变量

*For any* 待办作业数量 n（n ≥ 0），当 n > 4 时 TodayTasks 组件必须渲染指向 `/assignments` 的「更多任务」链接；当 n ≤ 4 时不得渲染该链接。

**Validates: Requirements 16.1, 16.3**

---

### Property 12: MorePage 对任意 NavItemConfig 的渲染正确性

*For any* `NavItemConfig` 条目（无论是否含 `description` 字段），当其被包含在 `MORE_PAGE_GROUPS` 中时，MorePage 渲染的卡片必须包含正确的 `href` 目标、`label` 文本和 `icon` 组件；若 `description` 字段缺失，卡片副标题渲染为空字符串而非抛出错误；若 `description` 存在，卡片副标题必须显示其值。

**Validates: Requirements 18.4, 18.5**

---

## Error Handling

### 考试删除错误处理

| 场景 | 处理策略 |
|------|---------|
| 乐观更新后 `addExam`/`patchExam` 失败 | 用 `rollbackMap.current.get(opId)` 恢复状态，toast 显示错误信息，清除该 opId 的 rollback 条目 |
| deferred `deleteExam` 失败 | toast 显示 `"删除「${exam.subject}」失败，请稍后重试"`，`rollbackMap.current.delete(opId)` |
| 卸载时 flush 失败 | 组件已卸载，仅记录 console.error，不显示 UI 反馈 |

### 日报 ConfirmDialog 错误处理

- `handleGenerate` 已有完整的 try/catch，确认 dialog 后直接进入现有流程，无需额外处理
- `setConfirmState(null)` 应在 onConfirm 回调**执行完毕后**设置（或在 finally 中），避免中途关闭 dialog

### format-duration 边界值处理

```typescript
// formatDuration: totalMinutes = 0 → "0分钟"
// formatAppDuration: seconds = 0 → "0秒"
// formatSeconds: seconds = 0 → "0:00"
// 所有函数：输入负数视为 0（防御性处理）
```

### useIsClient 服务端安全

- 不访问 `window`/`document`，仅使用 `useState`/`useEffect`
- `useEffect` 在 SSR 时不执行，保证服务端返回 `false`

### ActivityPage 子组件错误隔离

- 各子组件只接收已处理过的数据 props，不直接调用 Electron API
- API 调用保留在父页面，错误处理保留在父页面现有逻辑中
- `ConfirmDialog` 清除数据的错误处理（`window.location.reload()`）保留在父页面

---

## Testing Strategy

### 测试分层

**单元测试**（Vitest）：
- `lib/format-duration.ts`：边界值（0、60、3600 等），与原始函数输出对比
- `hooks/useGreeting.ts`：mock `new Date()`，测试 24 个小时边界
- `hooks/useIsClient.ts`：测试 SSR 和 CSR 场景
- `config/navigation.ts`：验证 `MORE_PAGE_GROUPS` 包含所有必要条目和正确 description
- 考试删除竞态逻辑：mock timer/fetch，验证 Map 操作正确性
- `getCurrentAssignments`：mock `queryClient.getQueryData`，测试 undefined/null/[]/[...] 四种输入

**组件测试**（Vitest + React Testing Library）：
- `CatAvatar`：两种 variant 渲染正确
- `MorePage`：验证从 MORE_PAGE_GROUPS 渲染所有条目，无本地 FEATURE_GROUPS
- `TodayTasks`：pending=3 时无链接，pending=5 时有链接且显示正确数字
- `SettingsPage`：`isMobile=false` 时显示提示文案，`isMobile=true` 时显示选择器
- `DailyReportsPage`：无 window.confirm，isDirty=true 时点击切换日期触发 ConfirmDialog

**属性测试**（Vitest + fast-check）：

使用 **fast-check** 作为属性测试库（项目已有 Vitest，fast-check 作为开发依赖添加）。每个属性测试配置最少 100 次迭代（`numRuns: 100`）。

每个属性测试用 tag 注释标记：
```
// Feature: scholarflow-full-optimization, Property {N}: {property_text}
```

**集成测试**（Playwright）：
- `app/exams/page.tsx`：快速连续删除 3 场考试，验证可见列表正确
- `app/reports/daily/page.tsx`：dirty 状态下切换日期出现 ConfirmDialog
- `app/activity/page.tsx`：拆分后功能完整性（日期导航、分类展示、导出按钮）

### 属性测试配置示例

```typescript
import { describe, it } from "vitest";
import fc from "fast-check";

describe("formatDuration equivalence", () => {
  // Feature: scholarflow-full-optimization, Property 5: formatDuration equivalence
  it("matches original activity page implementation for any totalMinutes", () => {
    fc.assert(
      fc.property(fc.nat(10000), (totalMinutes) => {
        expect(formatDuration(totalMinutes)).toBe(
          originalFormatDuration(totalMinutes)
        );
      }),
      { numRuns: 200 }
    );
  });
});
```

### 验收流程

每个需求实现后按顺序执行：
1. `npm run typecheck` — 零新增错误
2. `npm run lint` — 零新增 lint 警告
3. `npm test` — 所有单元测试通过
4. `npx playwright test` — E2E 通过（涉及 UI 变更的需求）
