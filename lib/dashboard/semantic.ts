/**
 * Dashboard 语义颜色映射
 *
 * 原则：颜色即语义，用户不用读文字就能判断模块类型。
 */
export const SEMANTIC_COLORS = {
  course: {
    icon: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    accent: "text-primary",
  },
  assignment: {
    icon: "text-statusWarning",
    bg: "bg-statusWarning/10",
    border: "border-statusWarning/20",
    accent: "text-statusWarning",
    urgent: "text-destructive",
    urgentBg: "bg-destructive/10",
  },
  exam: {
    icon: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    accent: "text-destructive",
  },
  gpa: {
    icon: "text-statusSuccess",
    bg: "bg-statusSuccess/10",
    border: "border-statusSuccess/20",
    accent: "text-statusSuccess",
  },
  news: {
    icon: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
    accent: "text-muted-foreground",
  },
  daily: {
    icon: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    accent: "text-violet-600 dark:text-violet-400",
  },
  screenTime: {
    icon: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    accent: "text-primary",
  },
} as const;
