/**
 * AI 日报生成 — prompt 构建与调用。
 */
import { classifyUrgency, formatDeadlineCountdown } from "@/lib/assignment-utils";
import { callDeepSeekCompletion } from "@/lib/chat/server-llm";
import type { DailyReportInput } from "@/lib/reports/daily";
import type { ReportCourseItem } from "@/lib/reports/types";

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatDeadline(dateStr: string, now: number): string {
  const ms = new Date(dateStr).getTime() - now;
  return formatDeadlineCountdown(ms);
}

function urgencyLabel(u: ReturnType<typeof classifyUrgency>): string {
  switch (u) {
    case "overdue":
      return "已逾期";
    case "urgent":
      return "24小时内截止";
    case "reminder":
      return "72小时内截止";
    default:
      return "时间充裕";
  }
}

/**
 * 根据日报输入数据构建 DeepSeek prompt。
 */
function formatCourseLine(c: ReportCourseItem): string {
  const timeText = c.timeText ? `（${c.timeText}）` : "";
  return `- 第 ${c.periods.join("、")} 节${timeText} · ${c.title}${c.teacher ? ` · ${c.teacher}` : ""}${c.location ? ` @ ${c.location}` : ""}`;
}

export function buildDailyReportPrompt(input: DailyReportInput): string {
  const {
    date,
    now,
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
    existingDaily,
  } = input;
  const completed = assignments.filter((a) => a.done);
  const pending = assignments.filter((a) => !a.done);

  const sortedCourses = [...courses].sort((a, b) => (a.periods[0] ?? 0) - (b.periods[0] ?? 0));
  const sortedTomorrow = [...tomorrowCourses].sort((a, b) => (a.periods[0] ?? 0) - (b.periods[0] ?? 0));

  const lines: string[] = [];
  lines.push("你是一位擅长学习规划和每日复盘的大学生学习助手。请根据以下当天的学习数据，生成一份结构清晰、有温度、有洞察的日报。");
  lines.push("");
  lines.push(`日期：${formatDateLabel(date)}，当前真实时间：${new Date(now).toLocaleString("zh-CN")}。`);
  lines.push("");

  if (dayItems.length > 0) {
    lines.push("【今日特殊安排】");
    dayItems.forEach((item) => {
      const timeText = item.timeText ? `（${item.timeText}）` : "";
      lines.push(`- ${item.title}${timeText}${item.location ? ` @ ${item.location}` : ""}`);
    });
    lines.push("");
  }

  lines.push("【今日课表】");
  if (sortedCourses.length === 0) {
    lines.push("今天没有课程。");
  } else {
    sortedCourses.forEach(formatCourseLine);
  }
  lines.push("");

  lines.push("【明日课表】");
  if (tomorrowDayItems.length > 0) {
    tomorrowDayItems.forEach((item) => {
      const timeText = item.timeText ? `（${item.timeText}）` : "";
      lines.push(`- ${item.title}${timeText}${item.location ? ` @ ${item.location}` : ""}`);
    });
  }
  if (sortedTomorrow.length === 0) {
    lines.push("明天没有课程。");
  } else {
    sortedTomorrow.forEach(formatCourseLine);
  }
  lines.push("");

  lines.push("【作业情况】");
  lines.push(`- 已完成：${completed.length} 项`);
  lines.push(`- 待办：${pending.length} 项`);
  if (completed.length > 0) {
    lines.push("- 已完成清单：");
    completed.forEach((a) => lines.push(`  - ${a.subject || "未分类"} · ${a.title}`));
  }
  if (pending.length > 0) {
    lines.push("- 待办清单（已按紧急度排序）：");
    pending
      .map((a) => ({
        ...a,
        urgency: classifyUrgency(a.deadline, new Date(now)),
      }))
      .sort((a, b) => {
        const order = { overdue: 0, urgent: 1, reminder: 2, normal: 3 };
        return order[a.urgency] - order[b.urgency];
      })
      .forEach((a) => {
        const note = a.note ? ` · 备注：${a.note}` : "";
        lines.push(
          `  - [${urgencyLabel(a.urgency)}] ${a.subject || "未分类"} · ${a.title}（${formatDeadline(a.deadline, now)}）${note}`
        );
      });
  }
  lines.push("");

  if (exams.length > 0) {
    lines.push("【考试提醒】");
    exams.forEach((e) => {
      const time = e.time ? ` ${e.time}` : "";
      const location = e.location ? ` @ ${e.location}` : "";
      const notes = e.notes ? ` · ${e.notes}` : "";
      const tag = e.date === date ? "今日" : `${e.date}`;
      lines.push(`- [${tag}] ${e.subject}${time}${location}${notes}`);
    });
    lines.push("");
  }

  if (goals.length > 0) {
    lines.push("【每日目标】");
    lines.push(`连续打卡：${goalStreak} 天`);
    goals.forEach((g) => lines.push(`- ${g.done ? "[x]" : "[ ]"} ${g.text}`));
    lines.push("");
  }

  if (runningRecords.length > 0) {
    lines.push("【运动打卡】");
    runningRecords.forEach((r) => lines.push(`- ${r.type === "morning" ? "晨跑" : "自由跑"}`));
    lines.push("");
  }

  if (pomodoro || screenTime) {
    lines.push("【专注与屏幕时间】");
    if (pomodoro) {
      lines.push(`- 番茄钟：今天完成 ${pomodoro.todaySessions} 次专注，共 ${Math.round(pomodoro.todayFocusSeconds / 60)} 分钟，连续打卡 ${pomodoro.streak} 天。`);
    }
    if (screenTime) {
      lines.push(`- 屏幕活跃：${screenTime.totalActiveMinutes} 分钟。`);
      if (screenTime.categoryBreakdown.length > 0) {
        lines.push(`  分类：${screenTime.categoryBreakdown.map((c) => `${c.category} ${c.minutes}分钟`).join("、")}。`);
      }
      if (screenTime.topApps.length > 0) {
        lines.push(`  主要应用：${screenTime.topApps.slice(0, 5).map((a) => `${a.app} ${a.minutes}分钟`).join("、")}。`);
      }
    }
    lines.push("");
  }

  if (jwcNews.length > 0) {
    lines.push("【教务处公告】");
    jwcNews.slice(0, 5).forEach((n) => {
      lines.push(`- [${n.date}] ${n.title}${n.category ? `（${n.category}）` : ""}`);
    });
    lines.push("");
  }

  if (existingDaily?.trim()) {
    lines.push("【用户已有记录】");
    lines.push(existingDaily.trim().slice(0, 2000));
    lines.push("");
    lines.push("请基于用户已有记录进行补充、润色或扩展，不要大段重复已有内容。如果已有记录已经完整，可以只生成简短的总结与明日计划。");
    lines.push("");
  }

  lines.push("【输出要求】");
  lines.push("1. 使用 Markdown 格式。主标题必须根据当天最核心的事件或状态生成一个简短主题（5-12 字），例如：`# 无课日的屏幕时间反思`、`# 备考冲刺：距高数考试还有 2 天`、`# 作业截止日：3 项待提交`、`# 高效专注日：6 个番茄钟`、`# 考试日：数据结构`。不要只用 `# 日报` 这种泛泛标题，也不要在标题里写日期；");
  lines.push("2. 包含以下几个小节：今日概览、课程回顾、作业进展、考试/目标/运动/专注（如适用）、收获与反思、明日计划；");
  lines.push("3. 结合数据给出具体、可执行的改进建议，不要泛泛而谈；");
  lines.push("4. 对即将截止的作业要给出明确的时间安排建议；");
  lines.push("5. 如果提供了明日课表，请根据课程安排给出具体的预习/准备建议；");
  lines.push("6. 如果提供了教务处公告，请提炼与学生相关的信息，必要时提醒办理或关注截止日期；");
  lines.push("7. 语言亲切自然，适合学生阅读；");
  lines.push("8. 在末尾标注 `*由 ScholarFlow AI 自动生成*`。");
  lines.push("");
  lines.push("请直接输出日报内容，不要有多余的寒暄。");

  return lines.join("\n");
}

/**
 * 调用 DeepSeek 生成 AI 日报。
 */
export async function generateDailyReportWithAI(
  apiKey: string,
  model: string,
  input: DailyReportInput
): Promise<string> {
  const prompt = buildDailyReportPrompt(input);
  const { content } = await callDeepSeekCompletion(apiKey, {
    model,
    messages: [
      { role: "system", content: "你是一位大学生学习管理助手，擅长根据学习数据生成日报。" },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });
  return content.trim();
}
