/**
 * Activity / Screen Time — SQLite 数据库层
 *
 * 所有函数通过 getServerDB() 获取 better-sqlite3 实例，使用 prepared statement，
 * 不拼接 SQL。
 */

import { getServerDB } from "../server-db";

import { normalizeSegments, type RawSegmentRow } from "./normalize-segments";

export interface ActivitySegment {
  id?: number;
  type: "app" | "idle" | "away";
  app?: string | null;
  title?: string | null;
  domain?: string | null;
  category?: string | null;
  project?: string | null;
  beginAt: number; // epoch ms
  endAt?: number | null;
}

export interface DaySummary {
  totalMinutes: number;
  idleMinutes: number;
  awayMinutes: number;
  categoryBreakdown: Array<{ category: string; minutes: number }>;
  appBreakdown: Array<{ app: string; minutes: number; category?: string | null }>;
  segments: ActivitySegment[];
}

interface LegacyDayEntry {
  date?: string;
  segments?: LegacySegment[];
  idleMs?: number;
  awayMs?: number;
}

interface LegacySegment {
  app?: string | null;
  title?: string | null;
  category?: string | null;
  domain?: string | null;
  project?: string | null;
  start?: number;
  end?: number;
}

// ── Helpers ───────────────────────────────────────────────────

function rowToSegment(row: import("./normalize-segments").NormalizedSegment): ActivitySegment {
  return {
    id: row.id,
    type: row.type as ActivitySegment["type"],
    app: row.app,
    title: row.title,
    domain: row.domain,
    category: row.category,
    project: row.project,
    beginAt: row.begin_at,
    endAt: row.end_at,
  };
}

function parseLocalDay(dateStr: string): { startMs: number; endMs: number } {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  if ([y, m, d].some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function clipSegmentMinutes(
  beginAt: number,
  endAt: number | null | undefined,
  dayStart: number,
  dayEnd: number,
  nowMs: number
): number {
  const effectiveEnd = endAt ?? nowMs;
  const clippedBegin = Math.max(beginAt, dayStart);
  const clippedEnd = Math.min(effectiveEnd, dayEnd);
  if (clippedEnd <= clippedBegin) return 0;
  return Math.round((clippedEnd - clippedBegin) / 60000);
}

// ── Core CRUD ─────────────────────────────────────────────────

export function insertSegment(seg: ActivitySegment): number {
  const db = getServerDB().getRawDB();
  const stmt = db.prepare<{ type: string; app: unknown; title: unknown; domain: unknown; category: unknown; project: unknown; begin_at: number; end_at: unknown }>(
    `INSERT INTO activity_segments (type, app, title, domain, category, project, begin_at, end_at)
     VALUES (@type, @app, @title, @domain, @category, @project, @begin_at, @end_at)`
  );
  const result = stmt.run({
    type: seg.type,
    app: seg.app ?? null,
    title: seg.title ?? null,
    domain: seg.domain ?? null,
    category: seg.category ?? null,
    project: seg.project ?? null,
    begin_at: seg.beginAt,
    end_at: seg.endAt ?? null,
  });
  return Number(result.lastInsertRowid);
}

export function closeOpenSegment(endAt: number): void {
  const db = getServerDB().getRawDB();
  const stmt = db.prepare<number>("UPDATE activity_segments SET end_at = ? WHERE end_at IS NULL");
  stmt.run(endAt);
}

export function clearActivityData(): void {
  const db = getServerDB().getRawDB();
  db.exec("DELETE FROM activity_segments");
}

export function cleanupOldSegments(retentionDays: number): number {
  const db = getServerDB().getRawDB();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const stmt = db.prepare<number>("DELETE FROM activity_segments WHERE begin_at < ?");
  return stmt.run(cutoff).changes;
}

// ── Query ─────────────────────────────────────────────────────

export function querySegmentsForDay(dateStr: string): ActivitySegment[] {
  const db = getServerDB().getRawDB();
  const { startMs, endMs } = parseLocalDay(dateStr);
  const stmt = db.prepare<{ start: number; end: number }>(
    `SELECT id, type, app, title, domain, category, project, begin_at, end_at
     FROM activity_segments
     WHERE begin_at < @end AND (end_at IS NULL OR end_at > @start)
     ORDER BY begin_at ASC`
  );
  const rows = stmt.all({ start: startMs, end: endMs }) as Record<string, unknown>[];
  return normalizeSegments(rows as RawSegmentRow[]).map(rowToSegment);
}

export function queryDaySummary(dateStr: string, nowMs: number): DaySummary {
  const segments = querySegmentsForDay(dateStr);
  const { startMs, endMs } = parseLocalDay(dateStr);

  let totalMinutes = 0;
  let idleMinutes = 0;
  let awayMinutes = 0;

  const categoryMap = new Map<string, number>();
  const appMap = new Map<string, { minutes: number; categoryCounts: Map<string | null, number> }>();

  for (const seg of segments) {
    const minutes = clipSegmentMinutes(seg.beginAt, seg.endAt, startMs, endMs, nowMs);
    if (minutes <= 0) continue;

    if (seg.type === "idle") {
      idleMinutes += minutes;
      continue;
    }
    if (seg.type === "away") {
      awayMinutes += minutes;
      continue;
    }

    // app segments only
    totalMinutes += minutes;

    const category = seg.category || "";
    categoryMap.set(category, (categoryMap.get(category) || 0) + minutes);

    const app = seg.app || "";
    const entry = appMap.get(app);
    if (entry) {
      entry.minutes += minutes;
      entry.categoryCounts.set(category, (entry.categoryCounts.get(category) || 0) + 1);
    } else {
      const counts = new Map<string | null, number>();
      counts.set(category, 1);
      appMap.set(app, { minutes, categoryCounts: counts });
    }
  }

  const categoryBreakdown = [...categoryMap.entries()]
    .map(([category, minutes]) => ({ category, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const appBreakdown = [...appMap.entries()]
    .map(([app, { minutes, categoryCounts }]) => {
      let topCategory: string | null = null;
      let topCount = 0;
      for (const [cat, count] of categoryCounts) {
        if (count > topCount) {
          topCount = count;
          topCategory = cat;
        }
      }
      return { app, minutes, category: topCategory ?? undefined };
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

// ── Legacy migration ──────────────────────────────────────────

export function parseLegacyActivityLog(raw: string): ActivitySegment[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];

  const result: ActivitySegment[] = [];
  for (const dayEntry of Object.values(parsed as Record<string, unknown>)) {
    if (!dayEntry || typeof dayEntry !== "object") continue;
    const entry = dayEntry as LegacyDayEntry;
    if (!Array.isArray(entry.segments)) continue;

    for (const seg of entry.segments) {
      if (!seg || typeof seg.start !== "number") continue;
      result.push({
        type: "app",
        app: seg.app ?? null,
        title: seg.title ?? null,
        domain: seg.domain ?? null,
        category: seg.category ?? null,
        project: seg.project ?? null,
        beginAt: seg.start,
        endAt: seg.end === 0 || seg.end === undefined ? null : seg.end,
      });
    }
  }
  return result;
}

export function migrateLegacyActivityData(): void {
  // 服务端无法访问 localStorage；真正的迁移由 Electron 主进程在启动时读取
  // secure-activity-data.enc 后调用 parseLegacyActivityLog + insertSegment 完成。
  // 这里仅作为占位入口，记录日志即可。
  // eslint-disable-next-line no-console
  console.log("[activity/db] migrateLegacyActivityData: migration handled by Electron main process");
}
