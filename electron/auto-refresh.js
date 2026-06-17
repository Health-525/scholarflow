/**
 * AutoRefreshScheduler — Electron 主进程定时自动刷新调度器(CommonJS)。
 *
 * 关窗后仍可触发:通过内部 HTTP 调用 127.0.0.1:PORT 的 standalone server
 * (/api/auth/session 取登录态、/api/fetch/all 静默抓取),复用现有抓取逻辑。
 *
 * 设计参考 design.md §4(Electron 主进程 AutoRefreshScheduler)与调度时序图。
 *
 * 注意:主进程是 CommonJS,无法直接 require TS ESM 源
 * (lib/auto-refresh/schedule.ts、lib/auth/lifecycle.ts)。
 * 因此下面用等价的纯 JS 实现 computeNextRun/computeBackoffDelay/shouldStopRetrying,
 * 配置常量内联。**算法等价于 lib/auto-refresh/schedule.ts,见 design §4 / §"Components and Interfaces" 2。**
 *
 * 门控(canSilentRelogin 等价语义)由 /api/auth/session 的
 * `authenticated` 与 `forceReloginDue` 字段叠加运行形态(密码可取)共同决定,
 * 等价于 lib/auth/lifecycle.ts 的 canSilentRelogin(见 design §4)。
 */

'use strict';

const http = require('http');

// ── 调度配置(内联,等价于 lib/auto-refresh/schedule.ts DEFAULT_SCHEDULE_CONFIG)──
//   baseIntervalMs 12h、jitterWindowMs 6h、backoffBaseMs 60s、maxDelayMs 1h、maxRetries 5
const DEFAULT_SCHEDULE_CONFIG = {
  baseIntervalMs: 43_200_000, // 12 小时
  jitterWindowMs: 21_600_000, // 6 小时
  backoffBaseMs: 60_000, // 60 秒
  maxDelayMs: 3_600_000, // 1 小时
  maxRetries: 5,
};

// 强制重登间隔(内联,等价于 lib/auth/lifecycle.ts DEFAULT_FORCE_RELOGIN_INTERVAL_MS):30 天。
// 实际到期判定由 /api/auth/session 的 forceReloginDue 返回,这里仅作文档常量。
const DEFAULT_FORCE_RELOGIN_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 计算下一次自动刷新执行时间戳。
 * 等价于 lib/auto-refresh/schedule.ts computeNextRun:
 *   nextRun = now + baseInterval + floor(rand() * jitterWindow)
 * rand ∈ [0, 1) → 落在 [now + base, now + base + jitter) 区间。
 */
function computeNextRun(now, cfg, rand) {
  return now + cfg.baseIntervalMs + Math.floor(rand() * cfg.jitterWindowMs);
}

/**
 * 计算失败重试延迟(指数退避 + full jitter)。
 * 等价于 lib/auto-refresh/schedule.ts computeBackoffDelay:
 *   delay = min(maxDelay, backoffBase * 2^attempt) * (0.5 + rand())
 * rand ∈ [0, 1) → 抖动系数 ∈ [0.5, 1.5)。
 */
function computeBackoffDelay(attempt, cfg, rand) {
  const base = Math.min(cfg.maxDelayMs, cfg.backoffBaseMs * 2 ** attempt);
  return base * (0.5 + rand());
}

/**
 * 当且仅当 attempt >= maxRetries 时返回 true(停止本轮重试)。
 * 等价于 lib/auto-refresh/schedule.ts shouldStopRetrying。
 */
function shouldStopRetrying(attempt, cfg) {
  return attempt >= cfg.maxRetries;
}

// ── 内部 HTTP 工具 ───────────────────────────────────────────

/**
 * GET 127.0.0.1:{port}/api/auth/session。
 * 失败(网络/解析)返回 null,绝不抛出。
 */
function httpGetSession(port) {
  return new Promise((resolve) => {
    try {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/auth/session',
          method: 'GET',
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.setTimeout(8000, () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    } catch {
      resolve(null);
    }
  });
}

/**
 * POST 127.0.0.1:{port}/api/fetch/all,body { schoolId, username, password }。
 * 返回 { ok: boolean }。任何网络/HTTP/解析错误均视为失败(ok:false),绝不抛出。
 */
function httpPostFetchAll(port, payload) {
  return new Promise((resolve) => {
    try {
      const body = JSON.stringify(payload);
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/fetch/all',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            // 2xx 视为成功,其余(含 401 needsManualLogin)视为失败。
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300 });
          });
        }
      );
      req.on('error', () => resolve({ ok: false }));
      req.setTimeout(120_000, () => {
        req.destroy();
        resolve({ ok: false });
      });
      req.write(body);
      req.end();
    } catch {
      resolve({ ok: false });
    }
  });
}

// ── 调度器工厂 ───────────────────────────────────────────────

/**
 * 创建自动刷新调度器。
 *
 * @param {object} opts
 * @param {number} opts.port standalone server 端口
 * @param {() => (object|null)} [opts.getMainWindow] 取主窗口(预留:可用于推送刷新状态)
 * @param {() => (string|null)} opts.retrievePassword 取记住的(已解密)密码;无则返回 null。
 *        由 main.js 注入(复用 safeStorage 读 secure-credential.enc),保持本模块独立可测。
 * @param {object} [opts.config] 调度配置(默认 DEFAULT_SCHEDULE_CONFIG)
 * @param {() => number} [opts.rand] 随机源 [0,1)(默认 Math.random),便于测试
 * @param {(level: string, msg: string) => void} [opts.log] 日志兜底
 * @returns {{ start: () => void, stop: () => void }}
 */
function createAutoRefreshScheduler(opts) {
  const {
    port,
    getMainWindow = () => null,
    retrievePassword = () => null,
    config = DEFAULT_SCHEDULE_CONFIG,
    rand = Math.random,
    log = (level, msg) => {
      try {
        // eslint-disable-next-line no-console
        console.log(`[AutoRefresh][${level}] ${msg}`);
      } catch {
        /* 日志失败也绝不影响主流程 */
      }
    },
  } = opts || {};

  // 当前 attempt(连续失败次数)与定时器句柄。
  let attempt = 0;
  let timer = null;

  /** 清理当前定时器句柄。 */
  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  /** 安排 delayMs 后执行 fn(先清理旧句柄,避免悬挂)。 */
  function schedule(delayMs, fn) {
    clearTimer();
    // setTimeout 上限为 32-bit 有符号(~24.8 天),做个保护性下钳。
    const safeDelay = Math.max(0, Math.min(delayMs, 2_147_483_647));
    timer = setTimeout(() => {
      timer = null;
      Promise.resolve()
        .then(fn)
        .catch((err) => {
          log('error', `scheduled task threw: ${err && err.message ? err.message : err}`);
        });
    }, safeDelay);
  }

  /** 安排下一次常规(base + jitter)刷新。 */
  function scheduleNextRun() {
    const delay = computeNextRun(Date.now(), config, rand) - Date.now();
    log('info', `下次自动刷新约 ${Math.round(delay / 60000)} 分钟后`);
    schedule(delay, runRefresh);
  }

  /**
   * 读取登录态并判定是否可调度静默刷新。
   * @returns {Promise<object|null>} 可刷新时返回 session;否则返回 null。
   */
  async function evaluateGate() {
    const session = await httpGetSession(port);
    if (!session || !session.authenticated) {
      log('info', '未登录,跳过自动刷新调度');
      return null;
    }
    if (session.forceReloginDue) {
      log('info', '已超过强制重登间隔,跳过自动刷新调度');
      return null;
    }
    return session;
  }

  /** 到点执行一次刷新(再次校验门控 + 取密码 + 抓取 + 处理结果)。 */
  async function runRefresh() {
    try {
      const session = await evaluateGate();
      if (!session) {
        // 门控不通过 → 不再调度,等待外部状态变化后由下次 start() 重新调度。
        return;
      }

      const password = retrievePassword();
      if (!password) {
        // 无密码 → 跳过本轮,重排下一次常规刷新。
        log('info', '无可用记住密码,跳过本轮,重排下次刷新');
        scheduleNextRun();
        return;
      }

      const result = await httpPostFetchAll(port, {
        schoolId: session.schoolId,
        username: session.username,
        password,
      });

      if (result.ok) {
        attempt = 0;
        log('info', '自动刷新成功,重排下次刷新');
        scheduleNextRun();
      } else {
        attempt += 1;
        if (shouldStopRetrying(attempt, config)) {
          log('info', `连续失败达上限(${config.maxRetries}),等待下一轮常规刷新`);
          attempt = 0;
          scheduleNextRun();
        } else {
          const delay = computeBackoffDelay(attempt, config, rand);
          log('info', `自动刷新失败(第 ${attempt} 次),约 ${Math.round(delay / 1000)} 秒后退避重试`);
          schedule(delay, runRefresh);
        }
      }
    } catch (err) {
      // 兜底:任何意外错误都不允许 crash 主进程。
      log('error', `runRefresh 异常: ${err && err.message ? err.message : err}`);
      try {
        scheduleNextRun();
      } catch {
        /* 连重排都失败时静默放弃,绝不抛出 */
      }
    }
  }

  return {
    /** 启动调度:校验门控后安排首次刷新。可重复调用(会重置定时器)。 */
    start() {
      try {
        attempt = 0;
        evaluateGate()
          .then((session) => {
            if (session) {
              scheduleNextRun();
            }
            // 门控不通过时不 setTimeout(已在 evaluateGate 内记录日志)。
          })
          .catch((err) => {
            log('error', `start 评估门控异常: ${err && err.message ? err.message : err}`);
          });
      } catch (err) {
        log('error', `start 异常: ${err && err.message ? err.message : err}`);
      }
    },

    /** 停止调度:清理定时器句柄,避免悬挂。 */
    stop() {
      try {
        clearTimer();
        log('info', '调度器已停止');
      } catch (err) {
        log('error', `stop 异常: ${err && err.message ? err.message : err}`);
      }
    },
  };
}

module.exports = {
  createAutoRefreshScheduler,
  // 导出纯函数与常量,便于 main.js 复用或单元测试(等价于 schedule.ts / lifecycle.ts)。
  computeNextRun,
  computeBackoffDelay,
  shouldStopRetrying,
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_FORCE_RELOGIN_INTERVAL_MS,
};
