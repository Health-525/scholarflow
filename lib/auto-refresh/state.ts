/**
 * 自动刷新调度状态与「记住密码」偏好的本地持久化访问器。
 *
 * 复用 `lib/server-db.ts` 的 ServerDB `data_store` KV(SQLite)进行读写,
 * 跨进程(Electron 主进程 ↔ standalone server)与重启共享。
 *
 * Key 约定:
 *   - `auto-refresh-state:<schoolId>:<userId>` → AutoRefreshState
 *   - `remember-setting:<schoolId>:<userId>`   → RememberSetting
 *
 * 读取缺失 key 时返回安全默认值(enabled=false / attempt=0),绝不抛错。
 */

import { getServerDB } from "@/lib/server-db";

/** 自动刷新调度状态(key `auto-refresh-state:<schoolId>:<userId>`)。 */
export interface AutoRefreshState {
  /** 当前连续失败次数 */
  attempt: number;
  /** 下次计划执行时间戳(ms),未排程为 null */
  nextRunAt: number | null;
  /** 上次执行时间戳(ms),从未执行为 null */
  lastRunAt: number | null;
  /** 上次执行结果,从未执行为 null */
  lastResult: "success" | "failed" | null;
}

/** 「记住密码」用户偏好(key `remember-setting:<schoolId>:<userId>`)。 */
export interface RememberSetting {
  /** 是否启用记住密码,默认 false */
  enabled: boolean;
  /** 上次手动登录时间戳(ms),从未登录为 null */
  lastManualLoginAt: number | null;
}

const DEFAULT_REMEMBER_SETTING: RememberSetting = {
  enabled: false,
  lastManualLoginAt: null,
};

function rememberSettingKey(schoolId: string, userId: string): string {
  return `remember-setting:${schoolId}:${userId}`;
}

/**
 * 读取「记住密码」偏好。缺失时返回默认值
 * `{ enabled: false, lastManualLoginAt: null }`。
 */
export function getRememberSetting(schoolId: string, userId: string): RememberSetting {
  const raw = getServerDB().readData(rememberSettingKey(schoolId, userId));
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_REMEMBER_SETTING };
  }
  const value = raw as Partial<RememberSetting>;
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_REMEMBER_SETTING.enabled,
    lastManualLoginAt: typeof value.lastManualLoginAt === "number" ? value.lastManualLoginAt : null,
  };
}

/** 写入「记住密码」偏好。 */
export function setRememberSetting(
  schoolId: string,
  userId: string,
  setting: RememberSetting
): void {
  getServerDB().writeData(rememberSettingKey(schoolId, userId), setting);
}
