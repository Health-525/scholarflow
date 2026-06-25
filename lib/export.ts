/**
 * 数据导出工具
 * - ICS: 课表日历导出（iCalendar）
 * - CSV: 作业数据导出
 */

export { downloadICS, buildWeekICS } from "./ics";

// ── CSV 导出 ──────────────────────────────────────────────

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: mimeType }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 导出作业为CSV
 */
export function exportAssignmentsCSV(
  assignments: Array<{
    subject: string;
    title: string;
    deadline: string;
    done: boolean;
    note?: string;
  }>
): void {
  const headers = ["科目", "标题", "截止日期", "状态", "备注"];
  const rows = assignments.map((a) => [
    escapeCSV(a.subject),
    escapeCSV(a.title),
    a.deadline,
    a.done ? "已完成" : "待完成",
    escapeCSV(a.note || ""),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const date = new Date().toISOString().slice(0, 10);
  downloadFile(csv, `assignments-${date}.csv`, "text/csv;charset=utf-8");
}


