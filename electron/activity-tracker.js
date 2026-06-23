/**
 * Main-process screen-time tracker.
 *
 * Maintains an active/idle/away state machine, persists segments to SQLite,
 * and exposes query / migration helpers for the renderer process.
 *
 * Storage backends:
 * - sqlite: direct better-sqlite3 (production, ABI compatible)
 * - http:   internal Next.js API fallback for dev mode ABI conflicts
 */

'use strict';

const { activeWindow } = require('active-win');
const { powerMonitor } = require('electron');
const path = require('path');
const { app } = require('electron');
const { categorizeActivity } = require('./activity-categorize');

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERNAL_TOKEN_HEADER = 'x-scholarflow-internal-token';

/**
 * @typedef {object} TrackerOptions
 * @property {(channel: string, payload: unknown) => void} sendToRenderer
 * @property {(level: string, message: string) => void} [log]
 * @property {number} [idleThresholdMs]
 * @property {number} [activePollMs]
 * @property {number} [idlePollMs]
 * @property {number} [retentionDays]
 * @property {string} [internalToken]
 * @property {number} [port]
 */

/**
 * @param {TrackerOptions} options
 */
function createActivityTracker(options) {
  const {
    sendToRenderer,
    log = (_level, _msg) => {},
    idleThresholdMs = 5 * 60 * 1000,
    activePollMs = 2000,
    idlePollMs = 10000,
    retentionDays = 90,
    internalToken,
    port = process.env.PORT || 3000,
  } = options;

  /** @type {'sqlite' | 'http' | null} */
  let storageMode = null;

  /** @type {import('better-sqlite3').Database | null} */
  let db = null;
  /** @type {NodeJS.Timeout | null} */
  let timer = null;
  /** @type {'active' | 'idle' | 'away'} */
  let state = 'active';
  /** @type {number} */
  let currentBeginAt = Date.now();
  /** @type {string} */
  let currentDateStr = formatDate(new Date());

  // Current window cache
  let currentApp = '';
  let currentTitle = '';
  let currentCategory = '';
  let currentDomain = '';
  let currentProject = '';

  // Prepared statements
  /** @type {Record<string, import('better-sqlite3').Statement>} */
  let stmts = {};

  const baseUrl = `http://127.0.0.1:${port}`;

  function resolveDbPath() {
    const dataDir = process.env.SCHOLARFLOW_DATA_DIR || path.join(app.getPath('userData'), 'data');
    return path.join(dataDir, 'scholarflow.db');
  }

  function ensureSchema() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_segments (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('app','idle','away')),
        app TEXT,
        title TEXT,
        domain TEXT,
        category TEXT,
        project TEXT,
        begin_at INTEGER NOT NULL,
        end_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s','now')*1000)
      );
      CREATE INDEX IF NOT EXISTS idx_activity_begin_end ON activity_segments(begin_at, end_at);
      CREATE INDEX IF NOT EXISTS idx_activity_category ON activity_segments(category);
    `);
  }

  function prepareStatements() {
    stmts = {
      insert: db.prepare(
        `INSERT INTO activity_segments (type, app, title, domain, category, project, begin_at, end_at)
         VALUES (@type, @app, @title, @domain, @category, @project, @begin_at, @end_at)`
      ),
      closeOpen: db.prepare('UPDATE activity_segments SET end_at = ? WHERE end_at IS NULL'),
      count: db.prepare('SELECT COUNT(*) as c FROM activity_segments'),
      cleanup: db.prepare('DELETE FROM activity_segments WHERE begin_at < ?'),
      queryDay: db.prepare(
        `SELECT id, type, app, title, domain, category, project, begin_at, end_at
         FROM activity_segments
         WHERE begin_at < @end AND (end_at IS NULL OR end_at > @start)
         ORDER BY begin_at ASC`
      ),
      queryRange: db.prepare(
        `SELECT id, type, app, title, domain, category, project, begin_at, end_at
         FROM activity_segments
         WHERE begin_at < @end AND (end_at IS NULL OR end_at > @start)
         ORDER BY begin_at ASC`
      ),
    };
  }

  // ── HTTP backend helpers ─────────────────────────────────────

  async function httpRequest(urlPath, { method = 'GET', body } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      [INTERNAL_TOKEN_HEADER]: internalToken || globalThis.__scholarflowInternalToken || '',
    };
    const res = await fetch(`${baseUrl}${urlPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json().catch(() => ({}));
  }

  async function httpInsertSegment(type, fields = {}) {
    return httpRequest('/api/internal/activity?action=insert', {
      method: 'POST',
      body: {
        type,
        app: fields.app ?? null,
        title: fields.title ?? null,
        domain: fields.domain ?? null,
        category: fields.category ?? null,
        project: fields.project ?? null,
        beginAt: fields.beginAt,
        endAt: fields.endAt ?? null,
      },
    });
  }

  async function httpCloseOpenSegments(endAt) {
    return httpRequest('/api/internal/activity?action=close-open', {
      method: 'POST',
      body: { endAt },
    });
  }

  async function httpQueryDay(dateStr) {
    return httpRequest(`/api/internal/activity?action=query-day&date=${encodeURIComponent(dateStr)}`);
  }

  async function httpClearData() {
    return httpRequest('/api/internal/activity?action=clear', { method: 'POST' });
  }

  async function httpCleanupOldData(days) {
    return httpRequest('/api/internal/activity?action=cleanup', {
      method: 'POST',
      body: { retentionDays: days },
    });
  }

  // ── Storage-routed operations ────────────────────────────────

  /**
   * @param {string} type
   * @param {object} fields
   */
  function insertSegment(type, fields = {}) {
    if (storageMode === 'sqlite') {
      try {
        stmts.insert.run({
          type,
          app: fields.app ?? null,
          title: fields.title ?? null,
          domain: fields.domain ?? null,
          category: fields.category ?? null,
          project: fields.project ?? null,
          begin_at: fields.beginAt,
          end_at: fields.endAt ?? null,
        });
      } catch (err) {
        log('error', `[ActivityTracker] insertSegment failed: ${err.message}`);
      }
      return;
    }

    if (storageMode === 'http') {
      httpInsertSegment(type, fields).catch((err) => {
        log('error', `[ActivityTracker] httpInsertSegment failed: ${err.message}`);
      });
    }
  }

  function closeOpenSegments(endAt) {
    if (storageMode === 'sqlite') {
      try {
        stmts.closeOpen.run(endAt);
      } catch (err) {
        log('error', `[ActivityTracker] closeOpenSegments failed: ${err.message}`);
      }
      return;
    }

    if (storageMode === 'http') {
      httpCloseOpenSegments(endAt).catch((err) => {
        log('error', `[ActivityTracker] httpCloseOpenSegments failed: ${err.message}`);
      });
    }
  }

  function cleanupOldData() {
    const cutoff = Date.now() - retentionDays * DAY_MS;
    if (storageMode === 'sqlite') {
      try {
        const result = stmts.cleanup.run(cutoff);
        if (result.changes > 0) {
          log('info', `[ActivityTracker] cleaned up ${result.changes} old segments`);
        }
      } catch (err) {
        log('error', `[ActivityTracker] cleanupOldData failed: ${err.message}`);
      }
      return;
    }

    if (storageMode === 'http') {
      httpCleanupOldData(retentionDays)
        .then((res) => {
          if (res && res.deleted > 0) {
            log('info', `[ActivityTracker] cleaned up ${res.deleted} old segments`);
          }
        })
        .catch((err) => {
          log('error', `[ActivityTracker] httpCleanupOldData failed: ${err.message}`);
        });
    }
  }

  /**
   * @param {Date} d
   * @returns {string}
   */
  function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * @param {string} dateStr
   */
  function parseLocalDay(dateStr) {
    const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }

  /**
   * @param {number} beginAt
   * @param {number | null} endAt
   * @param {number} dayStart
   * @param {number} dayEnd
   * @returns {number}
   */
  function clipSegmentMinutes(beginAt, endAt, dayStart, dayEnd) {
    const effectiveEnd = endAt ?? Date.now();
    const clippedBegin = Math.max(beginAt, dayStart);
    const clippedEnd = Math.min(effectiveEnd, dayEnd);
    if (clippedEnd <= clippedBegin) return 0;
    return Math.round((clippedEnd - clippedBegin) / 60000);
  }

  function broadcastState() {
    sendToRenderer('activity-state-changed', getCurrentState());
  }

  function resetCurrentWindow() {
    currentApp = '';
    currentTitle = '';
    currentCategory = '';
    currentDomain = '';
    currentProject = '';
  }

  /**
   * @param {object} win
   */
  function startAppSegment(win) {
    const categorized = categorizeActivity(win.owner?.name || 'Unknown', win.title || '');
    currentApp = categorized.app;
    currentTitle = win.title || '';
    currentCategory = categorized.category;
    currentDomain = categorized.domain || '';
    currentProject = categorized.project || '';
    currentBeginAt = Date.now();
    log('info', `[ActivityTracker] window: app=${win.owner?.name}, title=${win.title?.slice(0, 60)}, category=${currentCategory}`);

    insertSegment('app', {
      app: currentApp,
      title: currentTitle,
      domain: currentDomain || null,
      category: currentCategory,
      project: currentProject || null,
      beginAt: currentBeginAt,
      endAt: null,
    });
  }

  /**
   * @param {object} win
   */
  function handleWindowChange(win) {
    const categorized = categorizeActivity(win.owner?.name || 'Unknown', win.title || '');
    log('info', `[ActivityTracker] window: app=${win.owner?.name}, title=${win.title?.slice(0, 60)}, category=${categorized.category}`);
    const sameApp = categorized.app === currentApp && win.title === currentTitle;
    if (sameApp) return;

    const now = Date.now();
    closeOpenSegments(now);
    startAppSegment(win);
    broadcastState();
  }

  function checkCrossDay() {
    const now = new Date();
    const todayStr = formatDate(now);
    if (todayStr === currentDateStr) return false;

    // Day changed: close current segment and start a new one for the new day.
    const nowMs = now.getTime();
    closeOpenSegments(nowMs);
    currentDateStr = todayStr;
    return true;
  }

  async function pollActive() {
    try {
      const win = await activeWindow();
      if (!win) return;

      const changedDay = checkCrossDay();
      if (changedDay) {
        startAppSegment(win);
        broadcastState();
        return;
      }

      if (currentApp) {
        handleWindowChange(win);
      } else {
        startAppSegment(win);
        broadcastState();
      }
    } catch (err) {
      log('error', `[ActivityTracker] pollActive error: ${err.message}`);
    }
  }

  function onSystemIdleDetected() {
    const now = Date.now();
    const idleMs = powerMonitor.getSystemIdleTime() * 1000;
    const idleStart = Math.max(currentBeginAt, now - idleMs);

    closeOpenSegments(idleStart);
    insertSegment('idle', { beginAt: idleStart, endAt: now });

    state = 'idle';
    resetCurrentWindow();
    currentBeginAt = idleStart;
    broadcastState();
    switchPolling(idlePollMs);
  }

  async function onSystemResumed() {
    const now = Date.now();
    closeOpenSegments(now);

    state = 'active';
    currentBeginAt = now;
    currentDateStr = formatDate(new Date());

    try {
      const win = await activeWindow();
      if (win) {
        startAppSegment(win);
      } else {
        resetCurrentWindow();
      }
    } catch (err) {
      resetCurrentWindow();
      log('error', `[ActivityTracker] resume activeWindow error: ${err.message}`);
    }

    broadcastState();
    switchPolling(activePollMs);
  }

  function onAwayDetected() {
    if (state === 'away') return;
    const now = Date.now();
    closeOpenSegments(now);
    insertSegment('away', { beginAt: now, endAt: null });

    state = 'away';
    resetCurrentWindow();
    currentBeginAt = now;
    broadcastState();
    switchPolling(idlePollMs);
  }

  async function tick() {
    try {
      const idleMs = powerMonitor.getSystemIdleTime() * 1000;

      if (state === 'active') {
        if (idleMs >= idleThresholdMs) {
          onSystemIdleDetected();
          return;
        }
        await pollActive();
        return;
      }

      if (state === 'idle') {
        if (idleMs < idleThresholdMs) {
          await onSystemResumed();
        }
        return;
      }

      // away state: only power events can resume; keep polling at idle rate
    } catch (err) {
      log('error', `[ActivityTracker] tick error: ${err.message}`);
    }
  }

  function switchPolling(intervalMs) {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    timer = setInterval(tick, intervalMs);
  }

  function setupPowerListeners() {
    powerMonitor.on('lock-screen', onAwayDetected);
    powerMonitor.on('suspend', onAwayDetected);
    powerMonitor.on('unlock-screen', onSystemResumed);
    powerMonitor.on('resume', onSystemResumed);
  }

  function removePowerListeners() {
    powerMonitor.off('lock-screen', onAwayDetected);
    powerMonitor.off('suspend', onAwayDetected);
    powerMonitor.off('unlock-screen', onSystemResumed);
    powerMonitor.off('resume', onSystemResumed);
  }

  function startInSqliteMode() {
    const Database = require('better-sqlite3');
    const dbPath = resolveDbPath();
    const fs = require('fs');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');

    ensureSchema();
    prepareStatements();
    cleanupOldData();

    // Close any dangling segments from a previous crash/quit
    const now = Date.now();
    closeOpenSegments(now);

    // Start from current window
    currentDateStr = formatDate(new Date());
    state = 'active';
    currentBeginAt = now;

    activeWindow()
      .then((win) => {
        if (win) startAppSegment(win);
        broadcastState();
      })
      .catch((err) => {
        log('error', `[ActivityTracker] initial activeWindow error: ${err.message}`);
        broadcastState();
      });

    setupPowerListeners();
    switchPolling(activePollMs);
    storageMode = 'sqlite';
    log('info', '[ActivityTracker] started (sqlite)');
  }

  function startInHttpMode(err) {
    storageMode = 'http';
    log('warn', `[ActivityTracker] better-sqlite3 load failed, falling back to HTTP: ${err.message}`);

    // Close any dangling segments from a previous crash/quit via HTTP
    const now = Date.now();
    closeOpenSegments(now);

    // Start from current window
    currentDateStr = formatDate(new Date());
    state = 'active';
    currentBeginAt = now;

    activeWindow()
      .then((win) => {
        if (win) startAppSegment(win);
        broadcastState();
      })
      .catch((err2) => {
        log('error', `[ActivityTracker] initial activeWindow error: ${err2.message}`);
        broadcastState();
      });

    setupPowerListeners();
    switchPolling(activePollMs);
    log('info', '[ActivityTracker] started (http)');
  }

  function start() {
    if (storageMode) return;

    try {
      startInSqliteMode();
    } catch (err) {
      log('warn', `[ActivityTracker] SQLite start failed: ${err.message}`);
      try {
        startInHttpMode(err);
      } catch (err2) {
        log('error', `[ActivityTracker] HTTP fallback start failed: ${err2.message}`);
      }
    }
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    removePowerListeners();
    if (storageMode === 'sqlite' && db) {
      try {
        closeOpenSegments(Date.now());
      } catch (err) {
        log('error', `[ActivityTracker] stop cleanup failed: ${err.message}`);
      }
      try {
        db.close();
      } catch (err) {
        log('error', `[ActivityTracker] db close failed: ${err.message}`);
      }
      db = null;
    }
    storageMode = null;
    log('info', '[ActivityTracker] stopped');
  }

  /**
   * @param {string} dateStr 'YYYY-MM-DD'
   */
  async function queryDay(dateStr) {
    if (storageMode === 'http') {
      try {
        const summary = await httpQueryDay(dateStr);
        return normalizeDaySummary(summary);
      } catch (err) {
        log('error', `[ActivityTracker] httpQueryDay failed: ${err.message}`);
        return emptyDaySummary();
      }
    }

    if (!db) {
      return emptyDaySummary();
    }

    const { startMs, endMs } = parseLocalDay(dateStr);
    const rows = /** @type {Array<Record<string, unknown>>} */ (
      stmts.queryDay.all({ start: startMs, end: endMs })
    );

    let totalMinutes = 0;
    let idleMinutes = 0;
    let awayMinutes = 0;
    const categoryMap = new Map();
    const appMap = new Map();

    const segments = rows.map((row) => {
      const seg = {
        id: typeof row.id === 'number' ? row.id : undefined,
        type: /** @type {'app'|'idle'|'away'} */ (row.type),
        app: row.app ? String(row.app) : null,
        title: row.title ? String(row.title) : null,
        domain: row.domain ? String(row.domain) : null,
        category: row.category ? String(row.category) : null,
        project: row.project ? String(row.project) : null,
        beginAt: Number(row.begin_at),
        endAt: row.end_at != null ? Number(row.end_at) : null,
      };

      const minutes = clipSegmentMinutes(seg.beginAt, seg.endAt, startMs, endMs);
      if (minutes > 0) {
        totalMinutes += minutes;
        if (seg.type === 'idle') idleMinutes += minutes;
        if (seg.type === 'away') awayMinutes += minutes;

        if (seg.type === 'app') {
          const cat = seg.category || '';
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + minutes);

          const appKey = seg.app || '';
          const entry = appMap.get(appKey);
          if (entry) {
            entry.minutes += minutes;
            entry.categoryCounts.set(cat, (entry.categoryCounts.get(cat) || 0) + 1);
          } else {
            const counts = new Map();
            counts.set(cat, 1);
            appMap.set(appKey, { minutes, categoryCounts: counts });
          }
        }
      }

      return seg;
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, minutes]) => ({ category, minutes }))
      .sort((a, b) => b.minutes - a.minutes);

    const appBreakdown = Array.from(appMap.entries())
      .map(([app, { minutes, categoryCounts }]) => {
        let topCategory = null;
        let topCount = 0;
        for (const [cat, count] of categoryCounts) {
          if (count > topCount) {
            topCount = count;
            topCategory = cat;
          }
        }
        return { app, minutes, category: topCategory };
      })
      .sort((a, b) => b.minutes - a.minutes);

    return {
      totalMinutes,
      idleMinutes,
      awayMinutes,
      categoryBreakdown,
      appBreakdown,
      segments,
    };
  }

  function emptyDaySummary() {
    return {
      totalMinutes: 0,
      idleMinutes: 0,
      awayMinutes: 0,
      categoryBreakdown: [],
      appBreakdown: [],
      segments: [],
    };
  }

  /**
   * Normalize a day summary returned by the HTTP backend so that it matches
   * the shape produced by the SQLite path.
   */
  function normalizeDaySummary(summary) {
    if (!summary || typeof summary !== 'object') {
      return emptyDaySummary();
    }
    return {
      totalMinutes: Number(summary.totalMinutes) || 0,
      idleMinutes: Number(summary.idleMinutes) || 0,
      awayMinutes: Number(summary.awayMinutes) || 0,
      categoryBreakdown: Array.isArray(summary.categoryBreakdown) ? summary.categoryBreakdown : [],
      appBreakdown: Array.isArray(summary.appBreakdown) ? summary.appBreakdown : [],
      segments: Array.isArray(summary.segments) ? summary.segments : [],
    };
  }

  /**
   * @param {string} startDateStr 'YYYY-MM-DD'
   * @param {string} endDateStr 'YYYY-MM-DD'
   */
  async function queryRange(startDateStr, endDateStr) {
    const start = parseLocalDay(startDateStr).startMs;
    const end = parseLocalDay(endDateStr).endMs;
    const days = [];

    for (let t = start; t < end; t += DAY_MS) {
      const d = new Date(t);
      const dateStr = formatDate(d);
      const summary = await queryDay(dateStr);
      days.push({
        date: dateStr,
        totalMinutes: summary.totalMinutes,
        idleMinutes: summary.idleMinutes,
        awayMinutes: summary.awayMinutes,
      });
    }

    return days;
  }

  async function clearData() {
    if (storageMode === 'sqlite') {
      if (!db) return;
      try {
        db.exec('DELETE FROM activity_segments');
        resetCurrentWindow();
        currentBeginAt = Date.now();
        state = 'active';
        broadcastState();
      } catch (err) {
        log('error', `[ActivityTracker] clearData failed: ${err.message}`);
        throw err;
      }
      return;
    }

    if (storageMode === 'http') {
      try {
        await httpClearData();
        resetCurrentWindow();
        currentBeginAt = Date.now();
        state = 'active';
        broadcastState();
      } catch (err) {
        log('error', `[ActivityTracker] httpClearData failed: ${err.message}`);
        throw err;
      }
    }
  }

  /**
   * @param {string} legacyRaw
   */
  function migrateLegacyData(legacyRaw) {
    if (storageMode !== 'sqlite' || !db) return 0;

    try {
      const countRow = stmts.count.get();
      const existing = countRow && typeof countRow.c === 'number' ? countRow.c : 0;
      if (existing > 0) {
        log('info', '[ActivityTracker] migrateLegacyData skipped: table already has data');
        return 0;
      }

      let parsed;
      try {
        parsed = JSON.parse(legacyRaw);
      } catch {
        log('warn', '[ActivityTracker] migrateLegacyData: invalid JSON');
        return 0;
      }
      if (!parsed || typeof parsed !== 'object') return 0;

      const insert = db.transaction((segments) => {
        for (const seg of segments) {
          stmts.insert.run(seg);
        }
      });

      const toInsert = [];
      for (const dayEntry of Object.values(parsed)) {
        if (!dayEntry || typeof dayEntry !== 'object') continue;
        const segments = dayEntry.segments;
        if (!Array.isArray(segments)) continue;

        for (const seg of segments) {
          if (!seg || typeof seg.start !== 'number') continue;
          toInsert.push({
            type: 'app',
            app: seg.app ?? null,
            title: seg.title ?? null,
            domain: seg.domain ?? null,
            category: seg.category ?? null,
            project: seg.project ?? null,
            begin_at: seg.start,
            end_at: seg.end === 0 || seg.end === undefined ? null : seg.end,
          });
        }
      }

      if (toInsert.length === 0) return 0;

      insert(toInsert);
      log('info', `[ActivityTracker] migrated ${toInsert.length} legacy segments`);
      return toInsert.length;
    } catch (err) {
      log('error', `[ActivityTracker] migrateLegacyData failed: ${err.message}`);
      return 0;
    }
  }

  function getCurrentState() {
    const now = Date.now();
    return {
      state,
      app: currentApp || undefined,
      title: currentTitle || undefined,
      category: currentCategory || undefined,
      since: currentBeginAt,
      durationSeconds: Math.max(0, Math.round((now - currentBeginAt) / 1000)),
    };
  }

  return {
    start,
    stop,
    queryDay,
    queryRange,
    clearData,
    getCurrentState,
    migrateLegacyData,
  };
}

module.exports = { createActivityTracker };
