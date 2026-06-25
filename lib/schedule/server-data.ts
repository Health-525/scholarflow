import { getAuthorizedAccount } from "@/lib/auth/account-access";
import {
  clearLegacyAdjustments,
  migrateLegacyAdjustments,
  normalizeAdjustments,
  type Adjustment,
} from "@/lib/schedule/adjustments";
import { parseSchedule, type RawScheduleData } from "@/lib/schedule/schedule";
import { getServerDB } from "@/lib/server-db";

export interface ScheduleServerData {
  schedule: RawScheduleData | null;
  adjustments: Adjustment[];
  account: { schoolId: string; userId: string } | null;
}

export async function getScheduleServerData(): Promise<ScheduleServerData> {
  const db = getServerDB();
  const account = getAuthorizedAccount({}, db);
  if (!account) {
    return { schedule: null, adjustments: [], account: null };
  }

  const prefix = `${account.schoolId}:${account.userId}`;
  db.seedFromTimetable(prefix);

  const rawSchedule = db.readData(`schedule:${prefix}`) || { courses: [] };
  const schedule = parseSchedule(rawSchedule);

  let adjustments: Adjustment[] = [];
  const rawAdjustments = db.readData(`adjustments:${prefix}`);
  if (Array.isArray(rawAdjustments)) {
    adjustments = normalizeAdjustments(rawAdjustments);
  }

  // 若 SQLite 为空，尝试迁移旧版 localStorage 数据（单次，写回后清空旧 key）
  if (adjustments.length === 0) {
    const legacy = migrateLegacyAdjustments(account.schoolId, account.userId);
    if (legacy.length > 0) {
      adjustments = normalizeAdjustments(legacy);
      if (adjustments.length > 0) {
        db.writeData(
          `adjustments:${prefix}`,
          JSON.stringify(adjustments, null, 2)
        );
        clearLegacyAdjustments(account.schoolId, account.userId);
      }
    }
  }

  return { schedule, adjustments, account };
}
