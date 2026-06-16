/**
 * 从考试日期字符串中提取 YYYY-MM-DD 格式的日期。
 * 兼容教务系统 kssj 字段（如 "2025-01-15(09:00-11:00)"）和普通 date 字段。
 */
export function parseExamDate(input: string | undefined | null): string {
  if (!input) return "";
  const match = input.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] || "";
}
