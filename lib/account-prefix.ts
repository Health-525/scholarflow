/**
 * 统一的账号前缀 / userId / Data_Key 解析纯函数模块。
 *
 * 消除 `local-save`(静态 `njtech:default` 回退)、`local-data`
 * (`schoolId||"njtech"` / `userId||"default"`)、`login` / `fetch/all`
 * (`username||"default"`)之间的规则分歧,使读写两侧共用同一解析逻辑。
 *
 * 本模块为纯函数,不引入任何运行时依赖。
 */

/** 默认学校 ID,缺省时使用。 */
export const DEFAULT_SCHOOL_ID = "njtech";

/** 默认用户 ID,缺省时使用。 */
export const DEFAULT_USER_ID = "default";

/** 前缀解析上下文:来自请求显式提供的 schoolId / userId(均可缺省)。 */
export interface PrefixContext {
  schoolId?: string | null;
  userId?: string | null;
}

/**
 * 登录与抓取统一的 userId 解析规则:trim 后非空返回该值,否则回退 `"default"`。
 * (R1.5 / R6.1)
 */
export function resolveUserId(username?: string | null): string {
  const trimmed = (username ?? "").trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_USER_ID;
}

/**
 * 统一 Account_Prefix 解析,读写两侧共用。
 *   1. 显式 userId(+ 可选 schoolId,缺省 njtech)→ 直接用
 *   2. 缺 userId 但有 Active_Credentials → 用凭证 `<schoolId>:<userId>` (R6.2 / R6.4)
 *   3. 都没有 → DEFAULT `njtech:default` (R6.5)
 */
export function resolveAccountPrefix(
  ctx: PrefixContext,
  active: { schoolId: string; userId: string } | null
): string {
  if (ctx.userId && ctx.userId.trim()) {
    const school = (ctx.schoolId && ctx.schoolId.trim()) || DEFAULT_SCHOOL_ID;
    return `${school}:${ctx.userId.trim()}`;
  }
  if (active) {
    return `${active.schoolId}:${active.userId}`;
  }
  return `${DEFAULT_SCHOOL_ID}:${DEFAULT_USER_ID}`;
}

/**
 * 解析全校共享 key 用的 schoolId(供 `jwc-news` 等使用)。
 *   1. 显式 schoolId → 直接用
 *   2. 否则 Active_Credentials 的 schoolId
 *   3. 再否则默认 `njtech`
 */
export function resolveSchoolId(
  ctx: PrefixContext,
  active: { schoolId: string } | null
): string {
  if (ctx.schoolId && ctx.schoolId.trim()) return ctx.schoolId.trim();
  if (active) return active.schoolId;
  return DEFAULT_SCHOOL_ID;
}

/** 组装 Data_Key,保持既有格式 `<type>:<prefix>`(R1.3 / R3.9 / R6.6)。 */
export function buildDataKey(type: string, prefix: string): string {
  return `${type}:${prefix}`;
}
