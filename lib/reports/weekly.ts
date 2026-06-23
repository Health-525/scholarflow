/**
 * 周报生成器 — 纯函数，不依赖 I/O。
 *
 * 输入本周日报、作业、课表等数据，输出 Markdown 格式的周报内容。
 */
import type { ReportCourseItem } from "@/lib/reports/types";
import type { Assignment } from "@/types";

export interface WeeklyReportInput {
  /** 本周一，格式 YYYY-MM-DD */
  weekStart: string;
  /** 本周日，格式 YYYY-MM-DD */
  weekEnd: string;
  /** 本周日报列表 */
  dailyReports: { date: string; content: string }[];
  /** 本周作业列表 */
  assignments: Assignment[];
  /** 本周每日实际生效的课程（已应用调课、周次过滤） */
  dayCourses: Record<string, ReportCourseItem[]>;
}

function fmtIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 根据参考日期计算本周（周一到周日）的起止日期与 slug。
 */
export function getCurrentWeekRange(reference = new Date()): {
  start: string;
  end: string;
  slug: string;
} {
  const d = new Date(reference);
  const day = d.getDay(); // 0=周日，1=周一
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = fmtIsoDate(monday);
  const end = fmtIsoDate(sunday);
  return { start, end, slug: `${start}_${end}` };
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatDeadline(deadline?: string): string {
  if (!deadline) return "未设置";
  try {
    return new Date(deadline).toLocaleDateString("zh-CN");
  } catch {
    return deadline;
  }
}

function parseDailyHighlights(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .slice(0, 5);
}

/**
 * 根据本周数据生成一个简短的主题/标题。
 * 优先基于完成率和日报密度，给出有情绪色彩的总结。
 */
export function generateWeeklyTheme(input: WeeklyReportInput): string {
  const { dailyReports, assignments, dayCourses } = input;

  const completed = assignments.filter((a) => a.done).length;
  const total = assignments.length;
  const completionRate = total > 0 ? completed / total : 0;

  let courseSessionCount = 0;
  Object.values(dayCourses).forEach((courses) => {
    courseSessionCount += courses.length;
  });

  // 有日报的天数
  const recordedDays = dailyReports.filter((r) => r.content.trim().length > 20).length;

  if (total === 0 && courseSessionCount === 0 && recordedDays === 0) {
    return "空白周 · 期待你的下一周";
  }

  if (completionRate >= 0.9 && recordedDays >= 5) {
    return "高效周 · 状态在线";
  }
  if (completionRate >= 0.7 && recordedDays >= 3) {
    return "稳步前进周 · 保持节奏";
  }
  if (completionRate >= 0.5 && recordedDays >= 3) {
    return "推进周 · 仍有空间";
  }
  if (completionRate < 0.5 && total > 0) {
    return "调整周 · 找回重心";
  }
  if (recordedDays <= 1 && total === 0 && courseSessionCount > 0) {
    return "课程密集周 · 记得复盘";
  }
  if (recordedDays >= 4) {
    return "记录周 · 沉淀正在发生";
  }
  return "起步周 · 慢慢来";
}

function getWeekdayShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()] ?? "";
}

/**
 * 根据输入数据生成 Markdown 周报。
 */
export function buildWeeklyReportMarkdown(input: WeeklyReportInput): string {
  const { weekStart, weekEnd, dailyReports, assignments, dayCourses } = input;

  const completed = assignments.filter((a) => a.done).length;
  const total = assignments.length;
  const pending = assignments.filter((a) => !a.done);
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 统计本周课程节数
  let courseSessionCount = 0;
  const uniqueCourses = new Set<string>();
  Object.values(dayCourses).forEach((courses) => {
    courseSessionCount += courses.length;
    courses.forEach((c) => uniqueCourses.add(c.title));
  });

  const theme = generateWeeklyTheme(input);

  const lines: string[] = [];
  lines.push(`# ${formatDateLabel(weekStart)} — ${formatDateLabel(weekEnd)} 周报`);
  lines.push("");
  lines.push(`## 本周主题：${theme}`);
  lines.push("");
  lines.push("## 📊 本周概览");
  lines.push(`- 作业完成：${completed}/${total}（${completionRate}%）`);
  lines.push(`- 日报记录：${dailyReports.length} 天`);
  lines.push(`- 本周课程：${uniqueCourses.size} 门，共 ${courseSessionCount} 节`);
  lines.push("");

  lines.push("## ✅ 已完成作业");
  if (completed === 0) {
    lines.push("本周暂无已完成的作业。");
  } else {
    assignments
      .filter((a) => a.done)
      .forEach((a) => {
        lines.push(`- [x] ${a.subject || "未分类"} · ${a.title}`);
      });
  }
  lines.push("");

  lines.push("## 📝 待办作业");
  if (pending.length === 0) {
    lines.push("本周暂无待办作业，继续保持！");
  } else {
    pending.forEach((a) => {
      lines.push(`- [ ] ${a.subject || "未分类"} · ${a.title}（截止 ${formatDeadline(a.deadline)}）`);
    });
  }
  lines.push("");

  lines.push("## 📅 每日回顾");
  if (dailyReports.length === 0) {
    lines.push("本周还没有日报记录，建议每天写一份日报沉淀学习过程。");
  } else {
    dailyReports.forEach((r) => {
      lines.push(`### ${formatDateLabel(r.date)}`);
      const highlights = parseDailyHighlights(r.content);
      if (highlights.length === 0) {
        lines.push("（日报内容为空）");
      } else {
        highlights.forEach((h) => lines.push(`- ${h}`));
      }
      lines.push("");
    });
  }

  lines.push("## 📚 本周课表");
  const weekDates: string[] = [];
  const cur = new Date(`${weekStart}T00:00:00`);
  const weekEndDate = new Date(`${weekEnd}T00:00:00`);
  while (cur <= weekEndDate) {
    weekDates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  let hasAnyCourse = false;
  for (const date of weekDates) {
    const courses = dayCourses[date] ?? [];
    if (courses.length === 0) continue;
    hasAnyCourse = true;
    lines.push(`**${getWeekdayShort(date)}**`);
    courses
      .sort((a, b) => (a.periods[0] ?? 0) - (b.periods[0] ?? 0))
      .forEach((c) => {
        const timeText = c.timeText ? `（${c.timeText}）` : "";
        lines.push(`- 第 ${c.periods.join("、")} 节${timeText} · ${c.title}${c.location ? ` @ ${c.location}` : ""}`);
      });
    lines.push("");
  }
  if (!hasAnyCourse) {
    lines.push("本周没有课程。");
    lines.push("");
  }

  lines.push("## 💡 下周计划");
  lines.push("> 在这里写下你下周最重要的 1-3 个目标。");
  lines.push("");
  lines.push("---");
  lines.push(`*由 ScholarFlow 自动生成于 ${new Date().toLocaleString("zh-CN")}*`);

  return lines.join("\n");
}
