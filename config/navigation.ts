import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Calculator,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Flag,
  HeartPulse,
  LayoutDashboard,
  Library,
  Monitor,
  Newspaper,
  Percent,
  Settings,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
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
}

export interface NavGroupConfig {
  label: string;
  items: NavItemConfig[];
}

// 侧边导航分组
export const SIDE_NAV_GROUPS: NavGroupConfig[] = [
  {
    label: "学习",
    items: [
      { id: "dashboard", href: "/", label: "仪表盘", icon: LayoutDashboard, keywords: ["首页", "home"] },
      { id: "schedule", href: "/schedule", label: "课表", icon: CalendarDays, keywords: ["课程", "课表"] },
      { id: "assignments", href: "/assignments", label: "作业", icon: ClipboardList, keywords: ["作业", "任务", "todo"] },
      { id: "exams", href: "/exams", label: "考试", icon: Clock, keywords: ["考试", "倒计时"] },
    ],
  },
  {
    label: "成长",
    items: [
      { id: "gpa", href: "/gpa", label: "绩点", icon: Calculator, keywords: ["绩点", "GPA", "成绩"], searchTitle: "GPA" },
      { id: "goals", href: "/goals", label: "目标", icon: Target, keywords: ["目标", "习惯"], searchTitle: "每日目标" },
      { id: "knowledge", href: "/knowledge", label: "知识画像", icon: Brain, keywords: ["知识", "画像", "技能"] },
      { id: "roadmap", href: "/knowledge/roadmap", label: "学习路线", icon: BookOpen, keywords: ["路线图", "规划"] },
      { id: "progress", href: "/progress", label: "学习进度", icon: TrendingUp, keywords: ["进度", "统计"] },
    ],
  },
  {
    label: "工具",
    items: [
      { id: "pomodoro", href: "/pomodoro", label: "番茄钟", icon: Timer, keywords: ["番茄钟", "专注", "计时器"] },
      { id: "notes", href: "/notes", label: "笔记", icon: FileText, keywords: ["笔记", "知识库"] },
      { id: "daily", href: "/reports/daily", label: "日报", icon: Newspaper, keywords: ["日报", "报告"] },
      { id: "running", href: "/running", label: "跑步", icon: Activity, keywords: ["跑步", "运动"], searchTitle: "阳光长跑" },
      { id: "activity", href: "/activity", label: "屏幕时间", icon: Monitor, keywords: ["屏幕时间", "使用统计"] },
      { id: "library", href: "/library", label: "图书馆", icon: Library, keywords: ["图书馆", "座位", "选座"] },
      { id: "chat", href: "/chat", label: "AI 助手", icon: Bot, keywords: ["AI", "聊天", "助手"], shortLabel: "AI" },
      { id: "wrinkle", href: "/wrinkle", label: "皮肤检测", icon: Sparkles, keywords: ["皮肤", "检测"] },
      { id: "monitoring", href: "/monitoring", label: "Agent", icon: HeartPulse, keywords: ["Agent", "监控"] },
    ],
  },
];

export const SIDE_NAV_SETTINGS: NavItemConfig = {
  id: "settings",
  href: "/settings",
  label: "用户中心",
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
  { id: "library", href: "/library", label: "图书馆", icon: Library, keywords: ["图书馆", "座位", "选座"] },
  { id: "chat", href: "/chat", label: "AI 助手", icon: Bot, keywords: ["AI", "聊天", "助手"], shortLabel: "AI" },
];

// 底部导航“更多”抽屉分组
export const BOTTOM_NAV_MORE_GROUPS: NavGroupConfig[] = [
  {
    label: "学业",
    items: [
      { id: "exams", href: "/exams", label: "考试", icon: Clock, keywords: ["考试", "倒计时"] },
      { id: "goals", href: "/goals", label: "目标", icon: Target, keywords: ["目标", "习惯"] },
      { id: "gpa", href: "/gpa", label: "绩点", icon: Calculator, keywords: ["绩点", "GPA", "成绩"] },
    ],
  },
  {
    label: "工具",
    items: [
      { id: "pomodoro", href: "/pomodoro", label: "番茄钟", icon: Timer, keywords: ["番茄钟", "专注", "计时器"] },
      { id: "activity", href: "/activity", label: "屏幕时间", icon: Monitor, keywords: ["屏幕时间", "使用统计"] },
      { id: "daily", href: "/reports/daily", label: "日报", icon: Newspaper, keywords: ["日报", "报告"] },
    ],
  },
  {
    label: "知识",
    items: [
      { id: "knowledge", href: "/knowledge", label: "知识画像", icon: Brain, keywords: ["知识", "画像", "技能"] },
      { id: "roadmap", href: "/knowledge/roadmap", label: "学习路线", icon: BookOpen, keywords: ["路线图", "规划"] },
      { id: "progress", href: "/progress", label: "学习进度", icon: TrendingUp, keywords: ["进度", "统计"] },
    ],
  },
  {
    label: "更多",
    items: [
      { id: "wrinkle", href: "/wrinkle", label: "皮肤检测", icon: Sparkles, keywords: ["皮肤", "检测"] },
      { id: "monitoring", href: "/monitoring", label: "Agent", icon: HeartPulse, keywords: ["Agent", "监控"] },
    ],
  },
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
  { id: "library", href: "/library", label: "图书馆", icon: Library, keywords: ["图书馆", "座位", "选座"] },
  { id: "chat", href: "/chat", label: "AI 助手", icon: Bot, keywords: ["AI", "聊天", "助手"] },
  { id: "pomodoro", href: "/pomodoro", label: "番茄钟", icon: Timer, keywords: ["番茄钟", "专注", "计时器"] },
  { id: "progress", href: "/progress", label: "学习进度", icon: TrendingUp, keywords: ["进度", "统计"] },
  { id: "knowledge", href: "/knowledge", label: "知识画像", icon: Brain, keywords: ["知识", "画像", "技能"] },
  { id: "roadmap", href: "/knowledge/roadmap", label: "学习路线", icon: BookOpen, keywords: ["路线图", "规划"] },
  { id: "activity", href: "/activity", label: "屏幕时间", icon: Monitor, keywords: ["屏幕时间", "使用统计"] },
  { id: "stats", href: "/stats", label: "统计", icon: BarChart3, keywords: ["统计", "数据"], searchTitle: "统计" },
  { id: "gpa", href: "/gpa", label: "绩点", icon: Percent, keywords: ["绩点", "GPA", "成绩"], searchTitle: "GPA" },
  { id: "settings", href: "/settings", label: "用户中心", icon: Settings, keywords: ["设置", "配置"], searchTitle: "设置" },
];
