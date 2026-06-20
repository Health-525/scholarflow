import type { RunRecord, RunStats, HeatmapDay, RunType } from "@/types";

/** 跑步目标次数 */
export const RUNNING_GOAL = 50;

/**
 * 计算跑步统计数据
 */
export function calculateRunStats(records: RunRecord[]): RunStats {
  const total = records.length;
  const morning = records.filter((r) => r.type === "morning").length;
  const free = records.filter((r) => r.type === "free").length;
  const progressPercent = Math.min((total / RUNNING_GOAL) * 100, 100);

  return { total, morning, free, progressPercent };
}

/**
 * 检测是否存在重复跑步记录（相同日期和类型）
 */
export function isDuplicateRun(
  records: RunRecord[],
  date: string,
  type: RunType
): boolean {
  return records.some((r) => r.date === date && r.type === type);
}

/**
 * 构建热力图数据（按月）
 * 返回当月每天的跑步状态
 */
export function buildHeatmapData(
  records: RunRecord[],
  referenceDate: Date = new Date()
): HeatmapDay[] {
  const recordMap = new Map<string, { hasMorning: boolean; hasFree: boolean }>();

  for (const r of records) {
    const entry = recordMap.get(r.date) ?? { hasMorning: false, hasFree: false };
    if (r.type === "morning") entry.hasMorning = true;
    if (r.type === "free") entry.hasFree = true;
    recordMap.set(r.date, entry);
  }

  // Generate days for the reference month
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const result: HeatmapDay[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = recordMap.get(dateStr);
    result.push({
      date: dateStr,
      hasMorning: entry?.hasMorning ?? false,
      hasFree: entry?.hasFree ?? false,
    });
  }

  return result;
}
