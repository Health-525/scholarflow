/**
 * 周报生成器 — 纯函数,不依赖 I/O。
 *
 * 输入本周日报、作业、课表等数据,输出 Markdown 格式的周报内容。
 */
import type { RawScheduleData } from "@/lib/schedule/schedule";
import type { Assignment } from "@/types";

export interface WeeklyReportInput {
  /** 本周一,格式 YYYY-MM-DD */
  weekStart: string;
  /** 本周日,格式 YYYY-MM-DD */
  weekEnd: string;
  /** 本周日报列表 */
  dailyReports: { date: string; content: string }[];
  /** 本周作业列表 */
  assignments: Assignment[];
  /** 课表数据(可选) */
  schedule?: RawScheduleData | null;
}

function fmtIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 根据参考日期计算本周(周一到周日)的起止日期与 slug。
 */
export function getCurrentWeekRange(reference = new Date()): {
  start: string;
  end: string;
  slug: string;
} {
  const d = new Date(reference);
  const day = d.getDay(); // 0=周日,1=周一
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
 * 根据输入数据生成 Markdown 周报。
 */
export function buildWeeklyReportMarkdown(input: WeeklyReportInput): string {
  const { weekStart, weekEnd, dailyReports, assignments, schedule } = input;

  const completed = assignments.filter((a) => a.done).length;
  const total = assignments.length;
  const pending = assignments.filter((a) => !a.done);
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const lines: string[] = [];
  lines.push(`# ${formatDateLabel(weekStart)} — ${formatDateLabel(weekEnd)} 周报`);
  lines.push("");
  lines.push("## 📊 本周概览");
  lines.push(`- 作业完成：${completed}/${total}（${completionRate}%）`);
  lines.push(`- 日报记录：${dailyReports.length} 天`);
  if (schedule?.courses) {
    lines.push(`- 本周课程：${schedule.courses.length} 门`);
  }
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

  lines.push("## 💡 下周计划");
  lines.push("> 在这里写下你下周最重要的 1-3 个目标。");
  lines.push("");
  lines.push("---");
  lines.push(`*由 ScholarFlow 自动生成于 ${new Date().toLocaleString("zh-CN")}*`);

  return lines.join("\n");
}
