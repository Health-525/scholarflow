/**
 * 时区处理工具
 */

/**
 * 获取指定时区的当前时间
 */
export function getNowInTimeZone(tz: string): Date {
  try {
    return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  } catch {
    return new Date();
  }
}

/**
 * 将时间字符串解析为当天 Date 对象
 */
export function parseTimeToDate(today: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date(today);
  if (Number.isFinite(hours) && Number.isFinite(minutes)) {
    d.setHours(hours, minutes, 0, 0);
  }
  return d;
}

/**
 * 格式化倒计时
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "已开始";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}小时${minutes}分`;
  return `${minutes}分${seconds.toString().padStart(2, "0")}秒`;
}

/**
 * 标准化日期到 00:00:00
 */
export function normalizeDate(d: Date): Date {
  const normalized = new Date(d);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * 将 Date 按指定时区格式化为 YYYY-MM-DD
 */
export function formatDateInTimeZone(date: Date, tz: string): string {
  return date.toLocaleDateString("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
