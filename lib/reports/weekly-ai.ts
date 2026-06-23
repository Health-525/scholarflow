/**
 * AI 周报生成 — prompt 构建与调用。
 */
import { callDeepSeekCompletion } from "@/lib/chat/server-llm";
import type { WeeklyReportInput } from "@/lib/reports/weekly";

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

/**
 * 根据周报输入数据构建 DeepSeek prompt。
 */
export function buildWeeklyReportPrompt(input: WeeklyReportInput): string {
  const { weekStart, weekEnd, dailyReports, assignments, schedule } = input;

  const completed = assignments.filter((a) => a.done);
  const pending = assignments.filter((a) => !a.done);

  const lines: string[] = [];
  lines.push("你是一位擅长学习规划和复盘的大学生学习助手。请根据以下本周学习数据，生成一份结构清晰、有温度、有洞察的周报。");
  lines.push("");
  lines.push(`本周范围：${formatDateLabel(weekStart)} 至 ${formatDateLabel(weekEnd)}`);
  lines.push("");

  lines.push("【作业完成情况】");
  lines.push(`- 已完成：${completed.length} 项`);
  lines.push(`- 待办：${pending.length} 项`);
  if (completed.length > 0) {
    lines.push("- 已完成清单：");
    completed.forEach((a) => lines.push(`  - ${a.subject || "未分类"} · ${a.title}`));
  }
  if (pending.length > 0) {
    lines.push("- 待办清单：");
    pending.forEach((a) => lines.push(`  - ${a.subject || "未分类"} · ${a.title}（截止 ${formatDeadline(a.deadline)}）`));
  }
  lines.push("");

  lines.push("【日报记录】");
  if (dailyReports.length === 0) {
    lines.push("本周暂无日报记录。");
  } else {
    dailyReports.forEach((r) => {
      lines.push(`- ${formatDateLabel(r.date)}：`);
      r.content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#"))
        .slice(0, 5)
        .forEach((l) => lines.push(`  - ${l}`));
    });
  }
  lines.push("");

  if (schedule?.courses) {
    lines.push("【本周课程】");
    lines.push(`- 本周共有 ${schedule.courses.length} 门课程`);
    schedule.courses.slice(0, 10).forEach((c) => {
      lines.push(`  - 周${["日", "一", "二", "三", "四", "五", "六"][c.weekday]} 第 ${c.periods.join("、")} 节 · ${c.title}`);
    });
    lines.push("");
  }

  lines.push("【输出要求】");
  lines.push("1. 使用 Markdown 格式，主标题为 `# 周报`；");
  lines.push("2. 包含以下几个小节：本周概览、学习亮点、反思与不足、下周计划；");
  lines.push("3. 结合数据给出具体、可执行的改进建议，不要泛泛而谈；");
  lines.push("4. 语言亲切自然，适合学生阅读；");
  lines.push("5. 在末尾标注 `*由 ScholarFlow AI 自动生成*`。");
  lines.push("");
  lines.push("请直接输出周报内容，不要有多余的寒暄。");

  return lines.join("\n");
}

/**
 * 调用 DeepSeek 生成 AI 周报。
 */
export async function generateWeeklyReportWithAI(
  apiKey: string,
  model: string,
  input: WeeklyReportInput
): Promise<string> {
  const prompt = buildWeeklyReportPrompt(input);
  const { content } = await callDeepSeekCompletion(apiKey, {
    model,
    messages: [
      { role: "system", content: "你是一位大学生学习管理助手，擅长根据学习数据生成周报。" },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });
  return content.trim();
}
