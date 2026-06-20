/**
 * 凭证生命周期判定 — 纯函数,无任何 I/O。
 *
 * 将三类生命周期解耦:
 * - Session_Marker:能否进入主界面(持久)。
 * - JWC_Cookie:能否直接抓取数据(短期,~30min)。
 * - Remembered_Password:能否静默重登(至清除/登出/强制重登)。
 *
 * 本模块提供:
 * - `isForceReloginDue`:自上次手动登录是否超过强制重登间隔。
 * - `canSilentRelogin`:是否允许静默重登(记住密码启用 且 未到强制重登;运行形态门控由调用方叠加)。
 * - `isCookieExpired`:JWC cookie 是否过期。
 */

export interface CredentialState {
  /** 本地会话标记 */
  sessionValid: boolean;
  /** JWC cookie 过期时间戳;null 视为无有效 cookie(即过期) */
  cookieExpiresAt: number | null;
  /** 上次手动登录时间戳;null 视为从未手动登录(即强制重登到期) */
  lastManualLoginAt: number | null;
  /** 是否启用记住密码 */
  rememberEnabled: boolean;
}

/** 默认强制重登间隔:30 天。超过此时长(自上次手动登录起算)停止静默重登。 */
export const DEFAULT_FORCE_RELOGIN_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 自上次手动登录是否已超过强制重登间隔。
 *
 * `lastManualLoginAt` 为 `null` 时视为到期返回 `true`;
 * 否则当且仅当 `now - lastManualLoginAt > intervalMs` 时返回 `true`。
 */
export function isForceReloginDue(state: CredentialState, now: number, intervalMs: number): boolean {
  if (state.lastManualLoginAt === null) {
    return true;
  }
  return now - state.lastManualLoginAt > intervalMs;
}

/**
 * 是否允许静默重登:记住密码已启用 且 未超过强制重登间隔。
 *
 * 运行形态门控(Electron + 加密可用)由调用方叠加。
 */
export function canSilentRelogin(state: CredentialState, now: number, intervalMs: number): boolean {
  return state.rememberEnabled && !isForceReloginDue(state, now, intervalMs);
}


