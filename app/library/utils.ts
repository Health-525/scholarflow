export const DEFAULT_SUMMARY = { rate: 0, avail: 0, used: 0, total: 0, has: 0 };

export function formatReserveDate(date: string | number | undefined): string {
  if (!date) return "";
  const ts = typeof date === "number" ? date * 1000 : Date.parse(date);
  if (Number.isNaN(ts)) return String(date);
  return new Date(ts).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
