import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Calculator,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Flag,
  LayoutDashboard,
  Library,
  Monitor,
  Newspaper,
  Settings,
  Target,
  Timer,
} from "lucide-react";

export interface NavItemConfig {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** 底部导航核心区域显示的短标签（空间有限时使用） */
  shortLabel?: string;
  /** 全局搜索中显示的标题，默认使用 label */
  searchTitle?: string;
  /** 全局搜索关键词 */
  keywords?: string[];
  /** 标记为开发中，UI 可据此展示灰色状态 */
  wip?: boolean;
  /** 功能描述，用于 More 页面的卡片副标题 */
  description?: string;
}

export interface NavGroupConfig {
  label: string;
  items: NavItemConfig[];
}

// ── 主导航表（单一数据源，其他导航数组从此派生）──────────────────────
const NAV_REGISTRY = {
  dashboard:   { id: "dashboard",   href: "/",               label: "仪表盘",  icon: LayoutDashboard, keywords: ["首页", "home"],                shortLabel: "首页",  searchTitle: "仪表板",   description: "一屏掌握课表、作业、考试与状态" },
  schedule:    { id: "schedule",    href: "/schedule",        label: "课表",    icon: CalendarDays,    keywords: ["课程", "课表"],                                                          description: "本周网格、今日视图与调课管理" },
  assignments: { id: "assignments", href: "/assignments",     label: "作业",    icon: ClipboardList,   keywords: ["作业", "任务", "todo"],                                                  description: "快速录入、完成追踪与截止日期提醒" },
  exams:       { id: "exams",       href: "/exams",           label: "考试",    icon: Clock,           keywords: ["考试", "倒计时"],              searchTitle: "考试倒计时",               description: "考试安排与倒计时" },
  library:     { id: "library",     href: "/library",         label: "图书馆",  icon: Library,         keywords: ["图书馆", "座位", "选座"],                                                description: "座位查询、选座预约与通知消息" },
  gpa:         { id: "gpa",         href: "/gpa",             label: "绩点",    icon: Calculator,      keywords: ["绩点", "GPA", "成绩"],         searchTitle: "GPA",                      description: "GPA 统计与学期成绩趋势" },
  goals:       { id: "goals",       href: "/goals",           label: "目标",    icon: Target,          keywords: ["目标", "习惯"],                searchTitle: "每日目标",                 description: "每日目标与连续打卡" },
  daily:       { id: "daily",       href: "/reports/daily",   label: "日报",    icon: Newspaper,       keywords: ["日报", "报告"],                                                          description: "每日学习总结与反思" },
  weekly:      { id: "weekly",      href: "/reports/weekly",  label: "周报",    icon: Flag,            keywords: ["周报", "总结"],                searchTitle: "周报",                     description: "基于日报和作业自动生成周报" },
  pomodoro:    { id: "pomodoro",    href: "/pomodoro",        label: "番茄钟",  icon: Timer,           keywords: ["番茄钟", "专注", "计时器"],                                              description: "专注 / 休息循环计时" },
  notes:       { id: "notes",       href: "/notes",           label: "笔记",    icon: FileText,        keywords: ["笔记", "知识库"],                                                        description: "Markdown 笔记与全文搜索" },
  activity:    { id: "activity",    href: "/activity",        label: "屏幕时间", icon: Monitor,         keywords: ["屏幕时间", "使用统计"],                                                  description: "桌面端应用使用统计" },
  chat:        { id: "chat",        href: "/chat",            label: "AI 助手", icon: Brain,           keywords: ["AI", "助手", "聊天", "答疑"],                                            description: "整理笔记、检查作业与答疑" },
  settings:    { id: "settings",    href: "/settings",        label: "用户中心", icon: Settings,        keywords: ["设置", "配置"],                searchTitle: "设置",                     description: "账号、数据导出与主题" },
} satisfies Record<string, NavItemConfig>;

/** 按 id 列表从注册表中取出条目，保持顺序 */
function pick(...ids: (keyof typeof NAV_REGISTRY)[]): NavItemConfig[] {
  return ids.map((id) => NAV_REGISTRY[id]);
}

// 侧边导航分组
export const SIDE_NAV_GROUPS: NavGroupConfig[] = [
  {
    label: "学业",
    items: pick("dashboard", "schedule", "assignments", "exams", "gpa", "library"),
  },
  {
    label: "成长",
    items: pick("goals", "daily"),
  },
  {
    label: "工具",
    items: pick("pomodoro", "notes", "activity"),
  },
];

export const SIDE_NAV_SETTINGS: NavItemConfig = NAV_REGISTRY.settings;

// 底部导航核心项
export const BOTTOM_NAV_CORE: NavItemConfig[] = pick("dashboard", "schedule", "assignments", "notes");

// 全局搜索条目（顺序即展示顺序）
export const GLOBAL_SEARCH_ITEMS: NavItemConfig[] = pick(
  "dashboard", "schedule", "assignments", "exams",
  "goals", "notes", "daily", "weekly",
  "pomodoro", "activity", "chat", "gpa", "library", "settings",
);

// More 页面功能分组（单一数据源，替代 app/more/page.tsx 中的本地 FEATURE_GROUPS）
export const MORE_PAGE_GROUPS: NavGroupConfig[] = [
  {
    label: "学业",
    items: pick("dashboard", "schedule", "assignments", "exams", "gpa", "library"),
  },
  {
    label: "成长",
    items: pick("goals", "daily", "weekly"),
  },
  {
    label: "专注",
    items: pick("pomodoro", "notes", "activity"),
  },
  {
    label: "生活与其他",
    items: pick("chat", "settings"),
  },
];
