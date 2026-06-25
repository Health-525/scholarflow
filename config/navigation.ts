import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  Calculator,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Flag,
  LayoutDashboard,
  Monitor,
  Newspaper,
  Percent,
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
}

export interface NavGroupConfig {
  label: string;
  items: NavItemConfig[];
}

// 侧边导航分组
export const SIDE_NAV_GROUPS: NavGroupConfig[] = [
  {
    label: "学业",
    items: [
      { id: "dashboard", href: "/", label: "仪表盘", icon: LayoutDashboard, keywords: ["首页", "home"] },
      { id: "schedule", href: "/schedule", label: "课表", icon: CalendarDays, keywords: ["课程", "课表"] },
      { id: "assignments", href: "/assignments", label: "作业", icon: ClipboardList, keywords: ["作业", "任务", "todo"] },
      { id: "exams", href: "/exams", label: "考试", icon: Clock, keywords: ["考试", "倒计时"] },
      { id: "gpa", href: "/gpa", label: "绩点", icon: Calculator, keywords: ["绩点", "GPA", "成绩"], searchTitle: "GPA" },
    ],
  },
  {
    label: "成长",
    items: [
      { id: "goals", href: "/goals", label: "目标", icon: Target, keywords: ["目标", "习惯"], searchTitle: "每日目标" },
      { id: "daily", href: "/reports/daily", label: "日报", icon: Newspaper, keywords: ["日报", "报告"] },
    ],
  },
  {
    label: "专注",
    items: [
      { id: "pomodoro", href: "/pomodoro", label: "番茄钟", icon: Timer, keywords: ["番茄钟", "专注", "计时器"] },
      { id: "notes", href: "/notes", label: "笔记", icon: FileText, keywords: ["笔记", "知识库"] },
    ],
  },
  {
    label: "生活",
    items: [
      { id: "running", href: "/running", label: "跑步", icon: Activity, keywords: ["跑步", "运动"], searchTitle: "阳光长跑" },
      { id: "activity", href: "/activity", label: "屏幕时间", icon: Monitor, keywords: ["屏幕时间", "使用统计"] },
    ],
  },
];

export const SIDE_NAV_SETTINGS: NavItemConfig = {
  id: "settings",
  href: "/settings",
  label: "设置",
  icon: Settings,
  keywords: ["设置", "配置"],
  searchTitle: "设置",
};

// 底部导航核心项
export const BOTTOM_NAV_CORE: NavItemConfig[] = [
  { id: "dashboard", href: "/", label: "仪表盘", icon: LayoutDashboard, keywords: ["首页", "home"], shortLabel: "首页" },
  { id: "schedule", href: "/schedule", label: "课表", icon: CalendarDays, keywords: ["课程", "课表"] },
  { id: "assignments", href: "/assignments", label: "作业", icon: ClipboardList, keywords: ["作业", "任务", "todo"] },
  { id: "running", href: "/running", label: "跑步", icon: Activity, keywords: ["跑步", "运动"], shortLabel: "跑步" },
  { id: "notes", href: "/notes", label: "笔记", icon: FileText, keywords: ["笔记", "知识库"] },
];

// 全局搜索条目（顺序即展示顺序）
export const GLOBAL_SEARCH_ITEMS: NavItemConfig[] = [
  { id: "dashboard", href: "/", label: "仪表盘", icon: LayoutDashboard, keywords: ["首页", "home"], searchTitle: "仪表板" },
  { id: "schedule", href: "/schedule", label: "课表", icon: CalendarDays, keywords: ["课程", "课表"] },
  { id: "assignments", href: "/assignments", label: "作业", icon: ClipboardList, keywords: ["作业", "任务", "todo"] },
  { id: "running", href: "/running", label: "跑步", icon: Activity, keywords: ["跑步", "运动"], searchTitle: "阳光长跑" },
  { id: "exams", href: "/exams", label: "考试", icon: Clock, keywords: ["考试", "倒计时"], searchTitle: "考试倒计时" },
  { id: "goals", href: "/goals", label: "目标", icon: Target, keywords: ["目标", "习惯"], searchTitle: "每日目标" },
  { id: "notes", href: "/notes", label: "笔记", icon: FileText, keywords: ["笔记", "知识库"] },
  { id: "daily", href: "/reports/daily", label: "日报", icon: Newspaper, keywords: ["日报", "报告"] },
  { id: "weekly", href: "/reports/weekly", label: "周报", icon: Flag, keywords: ["周报", "总结"], searchTitle: "周报" },
  { id: "pomodoro", href: "/pomodoro", label: "番茄钟", icon: Timer, keywords: ["番茄钟", "专注", "计时器"] },
  { id: "activity", href: "/activity", label: "屏幕时间", icon: Monitor, keywords: ["屏幕时间", "使用统计"] },
  { id: "chat", href: "/chat", label: "AI 助手", icon: Brain, keywords: ["AI", "助手", "聊天", "答疑"] },
  { id: "gpa", href: "/gpa", label: "绩点", icon: Percent, keywords: ["绩点", "GPA", "成绩"], searchTitle: "GPA" },
  { id: "settings", href: "/settings", label: "用户中心", icon: Settings, keywords: ["设置", "配置"], searchTitle: "设置" },
];
