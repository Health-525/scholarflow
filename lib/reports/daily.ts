/**
 * 日报生成器 — 纯函数，不依赖 I/O。
 *
 * 根据某一天的课表、作业、已有日报等数据，输出 Markdown 格式的日报内容。
 */
import type {
  JwcNewsItem,
  PomodoroSummary,
  ReportCourseItem,
  ReportDayItem,
  ReportExamItem,
  ReportGoalItem,
  ScreenTimeSummary,
} from "@/lib/reports/types";
import type { Assignment, RunRecord } from "@/types";

export interface DailyReportInput {
  /** 日期，格式 YYYY-MM-DD */
  date: string;
  /** 生成时刻的时间戳（ms，用于紧急度计算） */
  now: number;
  /** 当日实际生效的课程列表（已应用调课、周次过滤） */
  courses: ReportCourseItem[];
  /** 当日的特殊安排与节假日标记（调休、实验课、放假等） */
  dayItems: ReportDayItem[];
  /** 明日实际生效的课程列表 */
  tomorrowCourses: ReportCourseItem[];
  /** 明日的特殊安排与节假日标记 */
  tomorrowDayItems: ReportDayItem[];
  /** 当日相关作业列表 */
  assignments: Assignment[];
  /** 当天及近期的考试 */
  exams: ReportExamItem[];
  /** 当天的目标 */
  goals: ReportGoalItem[];
  /** 连续打卡天数 */
  goalStreak: number;
  /** 当天的跑步记录 */
  runningRecords: RunRecord[];
  /** 近期教务处公告 */
  jwcNews: JwcNewsItem[];
  /** 当天屏幕时间汇总（Electron / Web 客户端上传） */
  screenTime: ScreenTimeSummary | null;
  /** 当天番茄钟统计（客户端上传） */
  pomodoro: PomodoroSummary | null;
  /** 已有日报内容（AI 生成时作为参考，避免重复） */
  existingDaily?: string;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function getWeekdayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return ["日", "一", "二", "三", "四", "五", "六"][d.getDay()] ?? "";
}

function buildReportTitle(input: DailyReportInput): string {
  const { date, courses, assignments, exams, goals, goalStreak, runningRecords, screenTime, pomodoro } = input;
  const pending = assignments.filter((a) => !a.done);
  const todayExams = exams.filter((e) => e.date === date);
  const upcomingExams = exams.filter((e) => e.date !== date);
  const doneGoals = goals.filter((g) => g.done).length;

  // 考试日
  if (todayExams.length > 0) {
    return `考试日：${todayExams.map((e) => e.subject).join("、")}`;
  }

  // 有即将到期的考试
  if (upcomingExams.length > 0) {
    const nearest = upcomingExams.sort((a, b) => a.date.localeCompare(b.date))[0];
    const daysLeft = Math.ceil((new Date(`${nearest.date}T00:00:00`).getTime() - new Date(`${date}T00:00:00`).getTime()) / 86400000);
    return `备考倒计时：${nearest.subject} 还有 ${daysLeft} 天`;
  }

  // 作业截止日
  if (pending.length >= 3) {
    return `作业截止日：还有 ${pending.length} 项待交`;
  }

  // 无课日
  if (courses.length === 0) {
    if (screenTime && screenTime.totalActiveMinutes > 180) {
      return "无课日的屏幕时间反思";
    }
    if (pomodoro && pomodoro.todaySessions > 0) {
      return `自由学习日：${pomodoro.todaySessions} 次专注`;
    }
    return "自由学习日";
  }

  // 目标达成
  if (goals.length > 0 && doneGoals === goals.length && doneGoals > 0) {
    return `目标全达成：连续 ${goalStreak} 天`;
  }

  // 运动日
  if (runningRecords.length > 0) {
    return `运动打卡日：${runningRecords.map((r) => (r.type === "morning" ? "晨跑" : "自由跑")).join("、")}`;
  }

  // 专注日
  if (pomodoro && pomodoro.todaySessions >= 4) {
    return `高效专注日：${pomodoro.todaySessions} 个番茄钟`;
  }

  // 默认
  return `${formatDateLabel(date)} 日报`;
}

function formatCourseLine(c: ReportCourseItem): string {
  const timeText = c.timeText ? `（${c.timeText}）` : "";
  return `- 第 ${c.periods.join("、")} 节${timeText} · ${c.title}${c.teacher ? ` · ${c.teacher}` : ""}${c.location ? ` @ ${c.location}` : ""}`;
}

/**
 * 根据输入数据生成 Markdown 日报。
 */
export function buildDailyReportMarkdown(input: DailyReportInput): string {
  const {
    date,
    courses,
    dayItems,
    tomorrowCourses,
    tomorrowDayItems,
    assignments,
    exams,
    goals,
    goalStreak,
    runningRecords,
    jwcNews,
    screenTime,
    pomodoro,
  } = input;
  const completed = assignments.filter((a) => a.done);
  const pending = assignments.filter((a) => !a.done);

  const sortedCourses = [...courses].sort((a, b) => (a.periods[0] ?? 0) - (b.periods[0] ?? 0));
  const sortedTomorrow = [...tomorrowCourses].sort((a, b) => (a.periods[0] ?? 0) - (b.periods[0] ?? 0));

  const lines: string[] = [];
  lines.push(`# ${buildReportTitle(input)}`);
  lines.push("");
  lines.push(`> ${formatDateLabel(date)}`);
  lines.push("");
  lines.push("## 📋 今日概览");
  lines.push(`- 日期：${date} 周${getWeekdayLabel(date)}`);
  lines.push(`- 今日课程：${sortedCourses.length} 节`);
  lines.push(`- 作业完成：${completed.length}/${assignments.length}`);
  if (exams.length > 0) lines.push(`- 近期考试：${exams.length} 门`);
  if (screenTime) lines.push(`- 屏幕时间：${screenTime.totalActiveMinutes} 分钟`);
  if (pomodoro) lines.push(`- 番茄专注：${pomodoro.todaySessions} 次 / ${Math.round(pomodoro.todayFocusSeconds / 60)} 分钟`);
  lines.push("");

  if (dayItems.length > 0) {
    lines.push("## 📢 今日特殊安排");
    dayItems.forEach((item) => {
      const timeText = item.timeText ? `（${item.timeText}）` : "";
      lines.push(`- ${item.title}${timeText}${item.location ? ` @ ${item.location}` : ""}`);
    });
    lines.push("");
  }

  lines.push("## 📅 今日课表");
  if (sortedCourses.length === 0) {
    lines.push("今天没有课程，可以自由安排学习时间。");
  } else {
    sortedCourses.forEach(formatCourseLine);
  }
  lines.push("");

  lines.push("## ✅ 已完成作业");
  if (completed.length === 0) {
    lines.push("今天没有标记为已完成的作业。");
  } else {
    completed.forEach((a) => {
      lines.push(`- [x] ${a.subject || "未分类"} · ${a.title}`);
    });
  }
  lines.push("");

  lines.push("## 📝 待办作业");
  if (pending.length === 0) {
    lines.push("今天没有待办作业，继续保持！");
  } else {
    pending.forEach((a) => {
      lines.push(`- [ ] ${a.subject || "未分类"} · ${a.title}${a.deadline ? `（截止 ${a.deadline}）` : ""}`);
    });
  }
  lines.push("");

  if (exams.length > 0) {
    lines.push("## 📝 考试提醒");
    exams.forEach((e) => {
      const time = e.time ? ` ${e.time}` : "";
      const location = e.location ? ` @ ${e.location}` : "";
      const tag = e.date === date ? "今日" : e.date;
      lines.push(`- [${tag}] ${e.subject}${time}${location}`);
    });
    lines.push("");
  }

  if (goals.length > 0) {
    lines.push("## 🎯 每日目标");
    lines.push(`连续打卡：${goalStreak} 天`);
    goals.forEach((g) => lines.push(`- ${g.done ? "[x]" : "[ ]"} ${g.text}`));
    lines.push("");
  }

  if (runningRecords.length > 0) {
    lines.push("## 🏃 运动打卡");
    runningRecords.forEach((r) => lines.push(`- ${r.type === "morning" ? "晨跑" : "自由跑"}`));
    lines.push("");
  }

  if (screenTime || pomodoro) {
    lines.push("## ⏱️ 专注与屏幕时间");
    if (pomodoro) {
      lines.push(`- 番茄专注：${pomodoro.todaySessions} 次，共 ${Math.round(pomodoro.todayFocusSeconds / 60)} 分钟（连续 ${pomodoro.streak} 天）`);
    }
    if (screenTime) {
      lines.push(`- 屏幕活跃：${screenTime.totalActiveMinutes} 分钟`);
      if (screenTime.topApps.length > 0) {
        lines.push(`-  top 应用：${screenTime.topApps.slice(0, 3).map((a) => `${a.app} ${a.minutes}分钟`).join("、")}`);
      }
    }
    lines.push("");
  }

  if (jwcNews.length > 0) {
    lines.push("## 📰 教务公告");
    jwcNews.slice(0, 5).forEach((n) => {
      lines.push(`- [${n.date}] ${n.title}${n.category ? `（${n.category}）` : ""}`);
    });
    lines.push("");
  }

  lines.push("## 🔮 明日计划");
  if (tomorrowDayItems.length > 0) {
    tomorrowDayItems.forEach((item) => {
      const timeText = item.timeText ? `（${item.timeText}）` : "";
      lines.push(`- ${item.title}${timeText}${item.location ? ` @ ${item.location}` : ""}`);
    });
  }
  if (sortedTomorrow.length === 0) {
    lines.push("明天没有课程，记得提前规划自学任务。");
  } else {
    sortedTomorrow.forEach(formatCourseLine);
  }
  lines.push("");

  lines.push("## 💡 收获与反思");
  lines.push("> 在这里记录今天最重要的收获、遇到的问题，以及明天的改进方向。");
  lines.push("");
  lines.push("---");
  lines.push(`*由 ScholarFlow 自动生成于 ${new Date().toLocaleString("zh-CN")}*`);

  return lines.join("\n");
}
