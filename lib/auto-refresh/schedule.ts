/**
 * 抖动调度与退避计算 — 纯函数,无任何 I/O。
 *
 * 用于对教务系统友好的定时自动刷新:
 * - `computeNextRun`:基准间隔 + 均匀分布随机抖动,分散多客户端请求时间窗。
 * - `computeBackoffDelay`:失败指数退避 + full-jitter,避免密集重试。
 * - `shouldStopRetrying`:达到最大重试次数即停止本轮重试。
 *
 * 随机源 `rand` 以可注入函数形式提供(返回 [0, 1)),便于属性测试覆盖整个区间。
 */

export interface ScheduleConfig {
  /** 自动刷新基准间隔,默认 12 小时 */
  baseIntervalMs: number;
  /** 随机抖动时间窗 */
  jitterWindowMs: number;
  /** 退避基数 */
  backoffBaseMs: number;
  /** 单次重试延迟上限 */
  maxDelayMs: number;
  /** 最大连续重试次数 */
  maxRetries: number;
}

/** 默认调度配置:基准间隔 12h、抖动窗 6h、退避基数 60s、上限 1h、最多重试 5 次。 */
export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  baseIntervalMs: 43_200_000, // 12 小时
  jitterWindowMs: 21_600_000, // 6 小时
  backoffBaseMs: 60_000, // 60 秒
  maxDelayMs: 3_600_000, // 1 小时
  maxRetries: 5,
};

/**
 * 计算下一次自动刷新的执行时间戳。
 *
 * `nextRun = now + baseInterval + floor(rand() * jitterWindow)`
 *
 * 当 `rand ∈ [0, 1)` 时,返回值落在
 * `[now + baseInterval, now + baseInterval + jitterWindow)` 区间内。
 */
export function computeNextRun(now: number, cfg: ScheduleConfig, rand: () => number): number {
  return now + cfg.baseIntervalMs + Math.floor(rand() * cfg.jitterWindowMs);
}

/**
 * 计算失败重试延迟(指数退避 + full jitter)。
 *
 * `delay = min(maxDelay, backoffBase * 2^attempt) * (0.5 + rand())`
 *
 * 当 `rand ∈ [0, 1)` 时,抖动系数 ∈ [0.5, 1.5);退避基数随 `attempt` 非递减并受 `maxDelay` 限制。
 */
export function computeBackoffDelay(attempt: number, cfg: ScheduleConfig, rand: () => number): number {
  const base = Math.min(cfg.maxDelayMs, cfg.backoffBaseMs * 2 ** attempt);
  return base * (0.5 + rand());
}

/**
 * 当且仅当 `attempt >= maxRetries` 时返回 `true`,表示停止本轮重试。
 */
export function shouldStopRetrying(attempt: number, cfg: ScheduleConfig): boolean {
  return attempt >= cfg.maxRetries;
}
