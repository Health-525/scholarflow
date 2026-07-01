/**
 * 统一时长格式化工具函数
 * Req 4: 消除 app/activity/page.tsx 与 components/dashboard/ScreenTimeCard.tsx 中的重复实现
 */

/**
 * 分钟数 → 中文长格式（供 ActivityPage）
 * - h > 0: "X小时 Y分钟"
 * - 否则:  "Y分钟"
 * - 边界:  0 → "0分钟"；负数视为 0
 */
export function formatDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}小时 ${m}分钟`;
  return `${m}分钟`;
}

/**
 * 分钟数 → 英文短格式（供 ScreenTimeCard）
 * - h > 0: "Xh Ym"
 * - 否则:  "Ym"
 * - 边界:  0 → "0m"；负数视为 0
 */
export function formatDurationShort(totalMinutes: number): string {
  const mins = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * 秒数 → 应用使用时长格式（供 AppRanking）
 * - seconds < 60: "Xs"（秒）
 * - 否则:          "Xm Ys"（如 "2m 30s"，注：原实现使用中文"分"/"秒"）
 * - 边界:          0 → "0秒"；负数视为 0
 *
 * 注：与 app/activity/page.tsx 原实现完全一致：
 *   if (seconds < 60) return `${seconds}秒`;
 *   return `${m}分${s}秒`;
 */
export function formatAppDuration(seconds: number): string {
  const secs = Math.max(0, Math.floor(seconds));
  if (secs < 60) return `${secs}秒`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}分${s}秒`;
}

/**
 * 秒数 → 时钟格式（供当前时长显示）
 * - h > 0: "H:MM:SS"
 * - 否则:  "M:SS"
 * - 边界:  0 → "0:00"；负数视为 0
 */
export function formatSeconds(seconds: number): string {
  const secs = Math.max(0, Math.floor(seconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
